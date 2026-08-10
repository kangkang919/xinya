// DELETE /api/shares/[id] - 撤销分享链接

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })
    }

    const { id } = await params

    // 查找分享链接，确保属于当前用户
    const share = await prisma.share.findFirst({
      where: { id, userId },
    })

    if (!share) {
      return NextResponse.json({ ok: false, error: "分享链接不存在" }, { status: 404 })
    }

    // 真正删除记录
    await prisma.share.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("撤销分享链接失败:", error)
    return NextResponse.json({ ok: false, error: "服务器错误" }, { status: 500 })
  }
}
