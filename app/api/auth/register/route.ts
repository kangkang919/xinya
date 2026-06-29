import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { sendVerifyEmail } from "@/lib/mailer"
import { generateCode } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return NextResponse.json({ ok: false, error: "邮箱和密码不能为空" }, { status: 400 })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ ok: false, error: "邮箱格式不正确" }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ ok: false, error: "密码至少需要6位" }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.isVerified)
        return NextResponse.json({ ok: false, error: "该邮箱已注册" }, { status: 400 })
      // 未验证的账号允许重新发送验证码
    }

    const passwordHash = await hashPassword(password)
    const user = existing
      ? await prisma.user.update({ where: { email }, data: { passwordHash } })
      : await prisma.user.create({ data: { email, passwordHash } })

    // 自动创建"随笔"默认标签
    if (!existing) {
      await prisma.tag.create({
        data: { userId: user.id, name: "随笔", isDefault: true }
      })
    }

    // 生成6位验证码，10分钟有效
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.emailToken.deleteMany({ where: { userId: user.id, type: "verify" } })
    await prisma.emailToken.create({
      data: { userId: user.id, token: code, type: "verify", expiresAt }
    })

    await sendVerifyEmail(email, code)

    return NextResponse.json({ ok: true, data: { userId: user.id } })
  } catch (e) {
    console.error("[register]", e)
    return NextResponse.json({ ok: false, error: "注册失败，请稍后再试" }, { status: 500 })
  }
}
