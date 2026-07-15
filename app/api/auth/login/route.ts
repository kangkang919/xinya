import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { verifyPassword, signToken, COOKIE_CONFIG } from "../../../../lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })
    }

    if (!user.isVerified) {
      return NextResponse.json({ error: "邮箱未验证，请先完成验证", userId: user.id, needVerify: true }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })
    }

    const token = signToken(user.id)

    await prisma.user.update({ where: { id: user.id }, data: { openTimes: { increment: 1 } } })

    const response = NextResponse.json({ ok: true, data: { onboardDone: user.onboardDone, theme: user.theme } })
    response.cookies.set(COOKIE_CONFIG.name, token, COOKIE_CONFIG.options)
    return response
  } catch (e) {
    console.error("[Login]", e)
    return NextResponse.json({ error: "登录失败，请稍后再试" }, { status: 500 })
  }
}
