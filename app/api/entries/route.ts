import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAndSaveQuestions } from "@/lib/review-scheduler"
import { stripHtml } from "@/lib/utils"
import { parseKeywords } from "@/lib/search"

// GET /api/entries?search=&favorite=&tagId=&from=&to=&page=1&limit=20&similarTitle=
// 注意：tagId 标签视图为全量返回（不做分页截断），page/limit 仅对搜索/筛选视图生效
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const favorite = searchParams.get("favorite") === "true"
  const tagId = searchParams.get("tagId") || ""
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const similarTitle = searchParams.get("similarTitle") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))

  const where: any = { userId, isDraft: false }
  if (favorite) where.isFavorite = true

  // 标签筛选：支持父标签 → 查所有子标签的心得
  // viewTagIds：当前标签视图包含的所有标签 id（父标签 + 子标签）
  let viewTagIds: string[] = []
  if (tagId) {
    // 先查该标签是否有子标签
    const childTags = await prisma.tag.findMany({
      where: { parentId: tagId },
      select: { id: true },
    })
    if (childTags.length > 0) {
      // 是父标签：查该父标签 + 所有子标签下的心得
      viewTagIds = [tagId, ...childTags.map(c => c.id)]
      where.tags = { some: { id: { in: viewTagIds } } }
    } else {
      // 是普通标签或子标签：只查该标签
      viewTagIds = [tagId]
      where.tags = { some: { id: tagId } }
    }
  }

  // 多关键词搜索：使用 ILIKE 模糊匹配（PostgreSQL 原生支持，无需分词）
  let hasSearch = false
  if (search) {
    const keywords = parseKeywords(search)
    if (keywords.length > 0) {
      hasSearch = true
      // 任一关键词匹配标题或正文即可（用 OR 连接）
      where.OR = keywords.flatMap(keyword => [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ])
    }
  }

  // 相似心得检测：只搜标题匹配，限制返回数量
  if (similarTitle) {
    const keywords = parseKeywords(similarTitle)
    if (keywords.length > 0) {
      where.OR = keywords.flatMap(keyword => [
        { title: { contains: keyword, mode: "insensitive" } },
      ])
      // 相似检测只需要少量结果
      const similarEntries = await prisma.entry.findMany({
        where,
        select: { id: true, title: true, recordTime: true },
        orderBy: { recordTime: "desc" },
        take: 5,
      })
      return NextResponse.json({ ok: true, data: { similar: similarEntries } })
    }
    return NextResponse.json({ ok: true, data: { similar: [] } })
  }

  if (from || to) {
    where.recordTime = {}
    if (from) where.recordTime.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      where.recordTime.lt = toDate
    }
  }

  // 标签视图自定义排序模式：有 tagId 且非搜索
  const isTagView = viewTagIds.length > 0 && !hasSearch

  let resultEntries: any[]
  let total: number
  // entryId -> { tagId -> sortOrder }，供前端分组视图按子标签排序
  const sortMap = new Map<string, Record<string, number>>()

  if (isTagView) {
    // 标签视图：取全部心得，应用层按 sortOrder 排序后再分页
    const allEntries = await prisma.entry.findMany({
      where,
      include: { tags: { select: { id: true, name: true } } },
    })
    total = allEntries.length

    // 查询这些心得在当前视图所有标签下的排序记录
    const entryIds = allEntries.map(e => e.id)
    const sortRecords = entryIds.length > 0
      ? await prisma.entryTagSort.findMany({
          where: { entryId: { in: entryIds }, tagId: { in: viewTagIds } },
        })
      : []
    for (const r of sortRecords) {
      if (!sortMap.has(r.entryId)) sortMap.set(r.entryId, {})
      sortMap.get(r.entryId)![r.tagId] = r.sortOrder
    }

    // 排序：置顶优先；未排序（无记录）按时间倒序排最前；已排序按 sortOrder 倒序
    resultEntries = [...allEntries].sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
      const sa = sortMap.get(a.id)?.[tagId] ?? 0
      const sb = sortMap.get(b.id)?.[tagId] ?? 0
      if (sa !== sb) return sb - sa  // 0 在最前，然后 -1、-2...
      return b.recordTime.getTime() - a.recordTime.getTime()
    })

    // 标签视图不做分页截断：枝叶页需展示该标签下全部心得
  } else {
    // 普通列表/搜索模式：按置顶 + 时间排序
    const [entries, count] = await Promise.all([
      prisma.entry.findMany({
        where,
        include: { tags: { select: { id: true, name: true } } },
        orderBy: [{ isTop: "desc" }, { recordTime: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.entry.count({ where }),
    ])
    resultEntries = entries
    total = count
  }

  const data = resultEntries.map(e => ({
    id: e.id,
    title: e.title,
    contentPreview: stripHtml(e.content, 80),
    tags: e.tags,
    mood: e.mood,
    recordTime: e.recordTime.toISOString(),
    isTop: e.isTop,
    isFavorite: e.isFavorite,
    isDraft: e.isDraft,
    // 标签视图返回各标签下的排序记录，供前端分组排序
    ...(isTagView ? { sortOrders: sortMap.get(e.id) || {} } : {}),
    // 搜索时返回匹配关键词数，供前端高亮
    ...(searchKeywords.length > 0 ? { matchCount: searchKeywords.filter(kw =>
      e.title.toLowerCase().includes(kw.toLowerCase()) ||
      stripHtml(e.content, 500).toLowerCase().includes(kw.toLowerCase())
    ).length } : {}),
  }))

  return NextResponse.json({ ok: true, data: { entries: data, total, page, limit } })
}

// POST /api/entries - 新建心得
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json()
  const { title, content, mood, tagIds, isDraft } = body

  if (!title?.trim())
    return NextResponse.json({ ok: false, error: "标题不能为空" }, { status: 400 })

  let finalTagIds: string[] = tagIds || []
  if (finalTagIds.length === 0) {
    const defaultTag = await prisma.tag.findFirst({ where: { userId, isDefault: true } })
    if (defaultTag) finalTagIds = [defaultTag.id]
  }

  const entry = await prisma.entry.create({
    data: {
      userId,
      title: title.trim(),
      content: content || "",
      mood: mood || null,
      isDraft: isDraft || false,
      tags: finalTagIds.length
        ? { connect: finalTagIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: { tags: { select: { id: true, name: true } } },
  })

  // 同步更新 searchVector（用于 PostgreSQL 全文搜索）
  await prisma.$executeRawUnsafe(
    `UPDATE "Entry" SET "searchVector" = 
      setweight(to_tsvector('simple', coalesce($1, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce($2, '')), 'D')
     WHERE "id" = $3`,
    title.trim(),
    stripHtml(content || "", 10000),
    entry.id
  )

  // 异步预生成题目（不阻塞响应）
  if (!isDraft && content) {
    generateAndSaveQuestions(userId, entry.id, title.trim(), content, "pre-generate").catch(e =>
      console.error("[PreGenerate] Error:", e)
    )
  }

  return NextResponse.json({ ok: true, data: entry })
}
