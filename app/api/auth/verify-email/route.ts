import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_CONFIG } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()
    if (!userId || !code)
      return NextResponse.json({ ok: false, error: "参数缺失" }, { status: 400 })

    const token = await prisma.emailToken.findFirst({
      where: { userId, token: code, type: "verify", used: false }
    })

    if (!token)
      return NextResponse.json({ ok: false, error: "验证码不正确" }, { status: 400 })

    if (new Date() > token.expiresAt)
      return NextResponse.json({ ok: false, error: "验证码已过期，请重新注册获取" }, { status: 400 })

    // 标记已使用
    await prisma.emailToken.update({ where: { id: token.id }, data: { used: true } })
    // 标记用户已验证
    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } })

    // 自动登录，设置cookie
    const jwtToken = signToken(userId)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_CONFIG.name, jwtToken, COOKIE_CONFIG.options)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[verify-email]", e)
    return NextResponse.json({ ok: false, error: "验证失败，请稍后再试" }, { status: 500 })
  }
}
