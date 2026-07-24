import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAndSaveQuestions } from "@/lib/review-scheduler"
import { stripHtml } from "@/lib/utils"

// GET /api/entries?search=&favorite=&tagId=&from=&to=&page=1&limit=20&similarTitle=
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
  if (tagId) {
    // 先查该标签是否有子标签
    const childTags = await prisma.tag.findMany({
      where: { parentId: tagId },
      select: { id: true },
    })
    if (childTags.length > 0) {
      // 是父标签：查该父标签 + 所有子标签下的心得
      const allTagIds = [tagId, ...childTags.map(c => c.id)]
      where.tags = { some: { id: { in: allTagIds } } }
    } else {
      // 是普通标签或子标签：只查该标签
      where.tags = { some: { id: tagId } }
    }
  }

  // 多关键词搜索 + 相关度排序
  let searchKeywords: string[] = []
  if (search) {
    // 按空格拆分关键词，过滤空字符串
    searchKeywords = search.split(/\s+/).filter(k => k.trim().length > 0)
    if (searchKeywords.length > 0) {
      // 任一关键词匹配标题或正文即可
      where.OR = searchKeywords.flatMap(keyword => [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ])
    }
  }

  // 相似心得检测：只搜标题匹配，限制返回数量
  if (similarTitle) {
    const keywords = similarTitle.split(/\s+/).filter(k => k.trim().length > 0)
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

  // 排序：搜索时按相关度（标题命中优先），否则按时间
  const orderBy: any = searchKeywords.length > 0
    ? undefined  // Prisma 不直接支持 ts_rank，用应用层排序
    : [{ isTop: "desc" }, { recordTime: "desc" }]

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: { tags: { select: { id: true, name: true } } },
      ...(orderBy ? { orderBy } : {}),
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entry.count({ where }),
  ])

  // 搜索时做应用层相关度排序
  let resultEntries = entries
  if (searchKeywords.length > 0) {
    type ScoredEntry = typeof entries[number] & { _score: number }
    const scored: ScoredEntry[] = entries.map(e => {
      let score = 0
      const titleLower = e.title.toLowerCase()
      const contentLower = stripHtml(e.content, 500).toLowerCase()
      for (const kw of searchKeywords) {
        const kwLower = kw.toLowerCase()
        if (titleLower.includes(kwLower)) score += 3
        if (contentLower.includes(kwLower)) score += 1
      }
      return { ...e, _score: score }
    })
    scored.sort((a, b) => {
      if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
      return b._score - a._score
    })
    resultEntries = scored
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

  // 异步预生成题目（不阻塞响应）
  if (!isDraft && content) {
    generateAndSaveQuestions(userId, entry.id, title.trim(), content, "pre-generate").catch(e =>
      console.error("[PreGenerate] Error:", e)
    )
  }

  return NextResponse.json({ ok: true, data: entry })
}
