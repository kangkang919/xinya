import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/tags/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  const tag = await prisma.tag.findFirst({ where: { id, userId } })
  if (!tag) return NextResponse.json({ ok: false, error: "未找到标签" }, { status: 404 })
  if (tag.isDefault) return NextResponse.json({ ok: false, error: "默认标签不可删除" }, { status: 400 })

  // 删除前，给关联该标签的心得补上默认标签
  const defaultTag = await prisma.tag.findFirst({ where: { userId, isDefault: true } })
  if (defaultTag && defaultTag.id !== id) {
    const entries = await prisma.entry.findMany({
      where: { userId, tags: { some: { id } }, NOT: { tags: { some: { id: defaultTag.id } } } },
      select: { id: true },
    })
    await Promise.all(
      entries.map(e =>
        prisma.entry.update({
          where: { id: e.id },
          data: { tags: { connect: { id: defaultTag.id } } },
        })
      )
    )
  }

  // 如果是父标签，将其子标签提升为顶级标签
  await prisma.tag.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  })

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
// PATCH /api/tags/[id] - 重命名标签 / 移动标签层级
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, parentId } = body

  const tag = await prisma.tag.findFirst({ where: { id, userId } })
  if (!tag) return NextResponse.json({ ok: false, error: "未找到标签" }, { status: 404 })

  // 构建更新数据
  const updateData: any = {}

  if (name !== undefined) {
    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: "标签名不能为空" }, { status: 400 })
    }
    updateData.name = name.trim()
  }

  if (parentId !== undefined) {
    if (parentId === null) {
      // 移动到顶级
      updateData.parentId = null
    } else {
      // 验证父标签存在且属于当前用户
      const parent = await prisma.tag.findFirst({ where: { id: parentId, userId } })
      if (!parent)
        return NextResponse.json({ ok: false, error: "父标签不存在" }, { status: 400 })
      // 不能把自己设为自己的父标签
      if (parent.id === id)
        return NextResponse.json({ ok: false, error: "不能将标签设为自己的子标签" }, { status: 400 })
      // 限制最多 2 级
      if (parent.parentId)
        return NextResponse.json({ ok: false, error: "最多支持两级标签" }, { status: 400 })
      // 如果当前标签已有子标签，不能再挂到别人下面（否则变成 3 级）
      const existingChildren = await prisma.tag.findFirst({ where: { parentId: id } })
      if (existingChildren)
        return NextResponse.json({ ok: false, error: "该标签下已有子标签，不能再移动" }, { status: 400 })
      updateData.parentId = parentId
    }
  }

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ ok: false, error: "没有需要更新的内容" }, { status: 400 })

  try {
    const updated = await prisma.tag.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "标签名已存在" }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: "操作失败" }, { status: 500 })
  }
}
