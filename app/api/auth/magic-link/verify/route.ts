import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_CONFIG } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://shuxiangnote.top"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.redirect(`${APP_URL}/login?error=链接无效`)
    }

    // 查找 token
    const magicLink = await prisma.magicLink.findFirst({
      where: { token, used: false },
    })

    if (!magicLink) {
      return NextResponse.redirect(`${APP_URL}/login?error=链接无效或已使用`)
    }

    if (new Date() > magicLink.expiresAt) {
      await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })
      return NextResponse.redirect(`${APP_URL}/login?error=链接已过期`)
    }

    // 标记已使用
    await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })

    const email = magicLink.email
    let user = await prisma.user.findUnique({ where: { email } })

    // 新用户：自动创建账号
    if (!user) {
      const randomPwd = Math.random().toString(36).slice(2, 10)
      const passwordHash = await hashPassword(randomPwd)

      user = await prisma.user.create({
        data: { email, passwordHash, isVerified: true },
      })

      // 自动创建默认标签
      await prisma.tag.create({
        data: { userId: user.id, name: "随笔", isDefault: true },
      })
    }

    // 如果是老用户但未验证，自动验证
    if (!user.isVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } })
    }

    // 登录：设置 JWT cookie
    const jwtToken = signToken(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { openTimes: { increment: 1 } } })

    const response = NextResponse.redirect(
      `${APP_URL}${user.onboardDone ? "/" : "/onboard"}?theme=${user.theme}`
    )
    response.cookies.set(COOKIE_CONFIG.name, jwtToken, COOKIE_CONFIG.options)

    return response
  } catch (e) {
    console.error("[magic-link/verify]", e)
    return NextResponse.redirect(`${APP_URL}/login?error=验证失败`)
  }
}
