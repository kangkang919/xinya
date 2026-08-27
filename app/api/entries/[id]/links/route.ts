import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripHtml } from "@/lib/utils"

const VALID_TYPES = ["related"]

// GET /api/entries/[id]/links — 获取某心得的所有关联（出向 + 入向）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  // 验证心得归属
  const entry = await prisma.entry.findFirst({ where: { id, userId } })
  if (!entry) return NextResponse.json({ ok: false, error: "未找到该心得" }, { status: 404 })

  const [outgoing, incoming] = await Promise.all([
    prisma.entryLink.findMany({
      where: { fromEntryId: id },
      include: {
        toEntry: {
          select: {
            id: true,
            title: true,
            content: true,
            recordTime: true,
            tags: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entryLink.findMany({
      where: { toEntryId: id },
      include: {
        fromEntry: {
          select: {
            id: true,
            title: true,
            content: true,
            recordTime: true,
            tags: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const formatLink = (link: any, direction: "outgoing" | "incoming") => ({
    id: link.id,
    relationType: link.relationType,
    note: link.note,
    source: link.source,
    createdAt: link.createdAt.toISOString(),
    ...(direction === "outgoing"
      ? {
          targetEntry: {
            id: link.toEntry.id,
            title: link.toEntry.title,
            contentPreview: stripHtml(link.toEntry.content, 60),
            tags: link.toEntry.tags,
            recordTime: link.toEntry.recordTime.toISOString(),
          },
        }
      : {
          sourceEntry: {
            id: link.fromEntry.id,
            title: link.fromEntry.title,
            contentPreview: stripHtml(link.fromEntry.content, 60),
            tags: link.fromEntry.tags,
            recordTime: link.fromEntry.recordTime.toISOString(),
          },
        }),
  })

  return NextResponse.json({
    ok: true,
    data: {
      outgoing: outgoing.map(l => formatLink(l, "outgoing")),
      incoming: incoming.map(l => formatLink(l, "incoming")),
    },
  })
}

// POST /api/entries/[id]/links — 创建关联
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  // 验证源心得归属
  const entry = await prisma.entry.findFirst({ where: { id, userId } })
  if (!entry) return NextResponse.json({ ok: false, error: "未找到该心得" }, { status: 404 })

  const body = await req.json()
  const { toEntryId, note } = body

  if (!toEntryId) return NextResponse.json({ ok: false, error: "请选择关联的心得" }, { status: 400 })
  if (toEntryId === id) return NextResponse.json({ ok: false, error: "不能关联自己" }, { status: 400 })
  if (note && note.length > 50) return NextResponse.json({ ok: false, error: "备注不超过50字" }, { status: 400 })

  // 验证目标心得归属
  const targetEntry = await prisma.entry.findFirst({ where: { id: toEntryId, userId } })
  if (!targetEntry) return NextResponse.json({ ok: false, error: "未找到目标心得" }, { status: 404 })

  // 检查是否已存在关联（双向：A→B 或 B→A）
  const existing = await prisma.entryLink.findFirst({
    where: {
      OR: [
        { fromEntryId: id, toEntryId: toEntryId },
        { fromEntryId: toEntryId, toEntryId: id },
      ],
    },
  })
  if (existing) return NextResponse.json({ ok: false, error: "这两篇心得已有关联" }, { status: 409 })

  const link = await prisma.entryLink.create({
    data: {
      fromEntryId: id,
      toEntryId,
      relationType: "related",
      note: note?.trim() || null,
    },
  })

  return NextResponse.json({
    ok: true,
    data: {
      id: link.id,
      relationType: link.relationType,
      note: link.note,
      targetEntry: {
        id: targetEntry.id,
        title: targetEntry.title,
        contentPreview: stripHtml(targetEntry.content, 60),
        tags: [],
        recordTime: targetEntry.recordTime.toISOString(),
      },
    },
  })
}
