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
    console.log("[Login-DEBUG] token生成成功, userId:", user.id)

    await prisma.user.update({ where: { id: user.id }, data: { openTimes: { increment: 1 } } })

    // 直接返回redirect响应，由服务器设置cookie并跳转（避免客户端fetch后cookie丢失）
    const redirectUrl = user.onboardDone ? "/" : "/onboard"
    console.log("[Login-DEBUG] 返回redirect到:", redirectUrl)
    const response = NextResponse.redirect(new URL(redirectUrl, req.url), 303)
    response.cookies.set(COOKIE_CONFIG.name, token, {
      ...COOKIE_CONFIG.options,
      secure: req.url.startsWith("https"),
    })
    console.log("[Login-DEBUG] redirect响应headers:", JSON.stringify(Object.fromEntries(response.headers.entries())))
    return response
  } catch (e) {
    console.error("[Login]", e)
    return NextResponse.json({ error: "登录失败，请稍后再试" }, { status: 500 })
  }
}
