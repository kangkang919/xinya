export const dynamic = "force-dynamic"
﻿import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, theme: true, onboardDone: true, openTimes: true }
  })
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  return NextResponse.json({ ok: true, data: user })
}
