import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/links/[id] — 删除一条关联
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  // 查找关联，验证源心得归属当前用户
  const link = await prisma.entryLink.findUnique({
    where: { id },
    include: { fromEntry: { select: { userId: true } } },
  })
  if (!link) return NextResponse.json({ ok: false, error: "未找到该关联" }, { status: 404 })
  if (link.fromEntry.userId !== userId) return NextResponse.json({ ok: false }, { status: 403 })

  await prisma.entryLink.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
