import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { theme } = await req.json()
  if (!["spring", "summer", "autumn", "winter", "night"].includes(theme))
    return NextResponse.json({ ok: false, error: "无效主题" }, { status: 400 })

  await prisma.user.update({ where: { id: userId }, data: { theme } })
  return NextResponse.json({ ok: true })
}