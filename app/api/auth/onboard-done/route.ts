import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  // 测试账号始终不标记引导完成，每次登录都走 onboarding
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (user?.email?.includes('@shuxiangnote.top')) {
    return NextResponse.json({ ok: true })
  }

  await prisma.user.update({ where: { id: userId }, data: { onboardDone: true } })
  return NextResponse.json({ ok: true })
}
