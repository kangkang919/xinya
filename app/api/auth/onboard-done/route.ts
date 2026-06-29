import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  await prisma.user.update({ where: { id: userId }, data: { onboardDone: true } })
  return NextResponse.json({ ok: true })
}
