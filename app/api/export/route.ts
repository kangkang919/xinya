import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    include: { tags: { select: { id: true, name: true } } },
    orderBy: { recordTime: "desc" },
  })

  const data = entries.map(e => ({
    id: e.id,
    title: e.title,
    content: e.content,
    tags: e.tags.map(t => t.name),
    mood: e.mood,
    recordTime: e.recordTime.toISOString(),
    createdAt: e.createdAt.toISOString(),
    isTop: e.isTop,
    isFavorite: e.isFavorite,
  }))

  return NextResponse.json({ ok: true, data })
}
