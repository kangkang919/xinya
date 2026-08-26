import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/entries/graph — 获取知识图谱数据（所有心得节点 + 所有关联边）
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const [entries, links] = await Promise.all([
    prisma.entry.findMany({
      where: { userId, isDraft: false },
      select: {
        id: true,
        title: true,
        tags: { select: { id: true, name: true } },
        recordTime: true,
      },
    }),
    prisma.entryLink.findMany({
      where: {
        fromEntry: { userId },
      },
      select: {
        id: true,
        fromEntryId: true,
        toEntryId: true,
        relationType: true,
        note: true,
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    data: {
      nodes: entries.map(e => ({
        id: e.id,
        title: e.title,
        tags: e.tags,
        recordTime: e.recordTime.toISOString(),
      })),
      edges: links.map(l => ({
        id: l.id,
        source: l.fromEntryId,
        target: l.toEntryId,
        relationType: l.relationType,
        note: l.note,
      })),
    },
  })
}
