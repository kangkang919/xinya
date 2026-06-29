import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password)
      return NextResponse.json({ ok: false, error: "参数缺失" }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ ok: false, error: "密码至少需要6位" }, { status: 400 })

    const emailToken = await prisma.emailToken.findUnique({ where: { token } })
    if (!emailToken || emailToken.type !== "reset" || emailToken.used)
      return NextResponse.json({ ok: false, error: "链接无效或已使用" }, { status: 400 })

    if (new Date() > emailToken.expiresAt)
      return NextResponse.json({ ok: false, error: "链接已过期，请重新申请" }, { status: 400 })

    const passwordHash = await hashPassword(password)
    await prisma.user.update({ where: { id: emailToken.userId }, data: { passwordHash } })
    await prisma.emailToken.update({ where: { id: emailToken.id }, data: { used: true } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[reset-password]", e)
    return NextResponse.json({ ok: false, error: "重置失败，请稍后再试" }, { status: 500 })
  }
}
