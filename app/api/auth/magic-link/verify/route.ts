import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_CONFIG } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.redirect(new URL("/login?error=链接无效", req.url))
    }

    // 查找 token
    const magicLink = await prisma.magicLink.findFirst({
      where: { token, used: false },
    })

    if (!magicLink) {
      return NextResponse.redirect(new URL("/login?error=链接无效或已使用", req.url))
    }

    if (new Date() > magicLink.expiresAt) {
      await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })
      return NextResponse.redirect(new URL("/login?error=链接已过期", req.url))
    }

    // 标记已使用
    await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })

    const email = magicLink.email
    let user = await prisma.user.findUnique({ where: { email } })

    // 新用户：自动创建账号
    if (!user) {
      // 邀请码账号有预置密码，新用户通过 Magic Link 注册也需要密码
      // 生成一个随机密码（用户后续可修改）
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
      new URL(user.onboardDone ? "/" : "/onboard", req.url)
    )
    response.cookies.set(COOKIE_CONFIG.name, jwtToken, COOKIE_CONFIG.options)

    return response
  } catch (e) {
    console.error("[magic-link/verify]", e)
    return NextResponse.redirect(new URL("/login?error=验证失败", req.url))
  }
}
