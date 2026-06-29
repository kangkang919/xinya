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

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
// PATCH /api/tags/[id] - 重命名标签
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  const { name } = await req.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ ok: false, error: "标签名不能为空" }, { status: 400 })
  }

  const tag = await prisma.tag.findFirst({ where: { id, userId } })
  if (!tag) return NextResponse.json({ ok: false, error: "未找到标签" }, { status: 404 })

  try {
    const updated = await prisma.tag.update({
      where: { id },
      data: { name: name.trim() },
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "标签名已存在" }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: "操作失败" }, { status: 500 })
  }
}