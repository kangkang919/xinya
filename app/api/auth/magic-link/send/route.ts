import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMagicLinkEmail } from "@/lib/mailer"
import { randomBytes } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ ok: false, error: "请输入邮箱" }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "邮箱格式不正确" }, { status: 400 })
    }

    // 生成一次性 token
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分钟

    // 清理该邮箱的旧 token
    await prisma.magicLink.deleteMany({ where: { email } })

    // 创建新 token
    await prisma.magicLink.create({
      data: { email, token, expiresAt },
    })

    // 判断是否新用户
    const existingUser = await prisma.user.findUnique({ where: { email } })
    const isNewUser = !existingUser

    // 构建 magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shuxiangnote.top"
    const magicUrl = `${baseUrl}/api/auth/magic-link/verify?token=${token}`

    // 发送邮件
    await sendMagicLinkEmail(email, magicUrl, isNewUser)

    return NextResponse.json({ ok: true, data: { email } })
  } catch (e) {
    console.error("[magic-link/send]", e)
    return NextResponse.json({ ok: false, error: "发送失败，请稍后再试" }, { status: 500 })
  }
}
