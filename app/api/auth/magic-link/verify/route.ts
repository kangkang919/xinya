import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_CONFIG } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://shuxiangnote.top"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.redirect(`${APP_URL}/login?error=閾炬帴鏃犳晥`)
    }

    // 鏌ユ壘 token
    const magicLink = await prisma.magicLink.findFirst({
      where: { token, used: false },
    })

    if (!magicLink) {
      return NextResponse.redirect(`${APP_URL}/login?error=閾炬帴鏃犳晥鎴栧凡浣跨敤`)
    }

    if (new Date() > magicLink.expiresAt) {
      await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })
      return NextResponse.redirect(`${APP_URL}/login?error=閾炬帴宸茶繃鏈焋)
    }

    // 鏍囪宸蹭娇鐢?
    await prisma.magicLink.update({ where: { id: magicLink.id }, data: { used: true } })

    const email = magicLink.email
    let user = await prisma.user.findUnique({ where: { email } })

    // 鏂扮敤鎴凤細鑷姩鍒涘缓璐﹀彿
    if (!user) {
      const randomPwd = Math.random().toString(36).slice(2, 10)
      const passwordHash = await hashPassword(randomPwd)

      user = await prisma.user.create({
        data: { email, passwordHash, isVerified: true },
      })

      // 鑷姩鍒涘缓榛樿鏍囩
      await prisma.tag.create({
        data: { userId: user.id, name: "闅忕瑪", isDefault: true },
      })
    }

    // 濡傛灉鏄€佺敤鎴蜂絾鏈獙璇侊紝鑷姩楠岃瘉
    if (!user.isVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } })
    }

    // 鐧诲綍锛氳缃?JWT cookie
    const jwtToken = signToken(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { openTimes: { increment: 1 } } })

    const response = NextResponse.redirect(
      `${APP_URL}${user.onboardDone ? "/" : "/onboard"}`
    )
    response.cookies.set(COOKIE_CONFIG.name, jwtToken, COOKIE_CONFIG.options)

    return response
  } catch (e) {
    console.error("[magic-link/verify]", e)
    return NextResponse.redirect(`${APP_URL}/login?error=楠岃瘉澶辫触`)
  }
}
