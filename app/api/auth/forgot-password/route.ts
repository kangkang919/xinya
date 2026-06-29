import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendResetEmail } from "@/lib/mailer"
import { generateToken } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: "请输入邮箱" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    // 不透露用户是否存在
    if (!user || !user.isVerified)
      return NextResponse.json({ ok: true })

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30分钟

    await prisma.emailToken.deleteMany({ where: { userId: user.id, type: "reset" } })
    await prisma.emailToken.create({
      data: { userId: user.id, token, type: "reset", expiresAt }
    })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`
    await sendResetEmail(email, resetUrl)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[forgot-password]", e)
    return NextResponse.json({ ok: false, error: "发送失败，请稍后再试" }, { status: 500 })
  }
}
