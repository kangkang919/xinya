import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tags - 获取标签列表（含层级信息）
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const tags = await prisma.tag.findMany({
    where: { userId },
    include: {
      _count: { select: { entries: true } },
      children: {
        select: { id: true, name: true, _count: { select: { entries: true } } },
        // 与心得排序约定一致：未排序（0）按名称排最前，已手动排序（-1,-2…）依次在后
        orderBy: [{ sortOrder: "desc" }, { name: "asc" }],
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })

  return NextResponse.json({
    ok: true,
    data: tags.map(t => {
      // 父标签的心得数 = 自身心得数 + 所有子标签心得数
      const childCounts = t.children.reduce((sum, c) => sum + c._count.entries, 0)
      return {
        id: t.id,
        name: t.name,
        parentId: t.parentId,
        isDefault: t.isDefault,
        entryCount: t._count.entries + childCounts,
        children: t.children.map(c => ({ id: c.id, name: c.name })),
      }
    }),
  })
}

// POST /api/tags - 新建标签（支持 parentId 指定父标签）
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { name, parentId } = await req.json()
  if (!name?.trim())
    return NextResponse.json({ ok: false, error: "标签名不能为空" }, { status: 400 })

  const trimmed = name.trim()
  if (trimmed.length > 8)
    return NextResponse.json({ ok: false, error: "标签名最多8个字" }, { status: 400 })

  const existing = await prisma.tag.findFirst({ where: { userId, name: trimmed } })
  if (existing)
    return NextResponse.json({ ok: false, error: "该标签已存在" }, { status: 400 })

  // 验证父标签存在且属于当前用户
  let finalParentId: string | null = null
  let isFirst = false
  if (parentId) {
    const parent = await prisma.tag.findFirst({
      where: { id: parentId, userId },
      include: { _count: { select: { children: true } } },
    })
    if (!parent)
      return NextResponse.json({ ok: false, error: "父标签不存在" }, { status: 400 })
    // 限制最多 2 级：父标签不能再有父标签
    if (parent.parentId)
      return NextResponse.json({ ok: false, error: "最多支持两级标签" }, { status: 400 })
    finalParentId = parentId
    // 判断是否是第一个子标签（用于迁移）
    isFirst = parent._count.children === 0
  }

  const tag = await prisma.tag.create({
    data: { userId, name: trimmed, parentId: finalParentId },
  })

  // 如果是父标签的第一个子标签，把直接关联父标签的心得转移到该子标签
  if (isFirst && finalParentId) {
    const entries = await prisma.entry.findMany({
      where: { userId, tags: { some: { id: finalParentId } } },
      select: { id: true },
    })
    for (const entry of entries) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: {
          tags: {
            disconnect: { id: finalParentId },
            connect: { id: tag.id },
          },
        },
      })
    }
  }

  return NextResponse.json({ ok: true, data: tag })
}
