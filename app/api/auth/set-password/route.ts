import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { hashPassword, getCurrentUserId } from "../../../../lib/auth"

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { password } = await req.json()

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[SetPassword]", e)
    return NextResponse.json({ error: "设置失败，请稍后再试" }, { status: 500 })
  }
}
