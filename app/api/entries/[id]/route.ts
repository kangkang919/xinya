import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/entries/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  const entry = await prisma.entry.findFirst({
    where: { id, userId },
    include: { tags: { select: { id: true, name: true } } },
  })
  if (!entry) return NextResponse.json({ ok: false, error: "未找到该心得" }, { status: 404 })

  return NextResponse.json({
    ok: true,
    data: {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      contentPreview: entry.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80),
      tags: entry.tags,
      mood: entry.mood,
      recordTime: entry.recordTime.toISOString(),
      isTop: entry.isTop,
      isFavorite: entry.isFavorite,
      isDraft: entry.isDraft,
    }
  })
}

// PUT /api/entries/[id] - 编辑心得
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { title, content, mood, tagIds, isDraft } = body

  if (!title?.trim())
    return NextResponse.json({ ok: false, error: "标题不能为空" }, { status: 400 })

  const entry = await prisma.entry.update({
    where: { id, userId },
    data: {
      title: title.trim(),
      content,
      mood: mood || null,
      isDraft: isDraft ?? false,
      tags: tagIds
        ? { set: tagIds.map((tid: string) => ({ id: tid })) }
        : undefined,
    },
    include: { tags: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ ok: true, data: entry })
}

// DELETE /api/entries/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params

  await prisma.entry.delete({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}

// PATCH /api/entries/[id] - 部分更新（置顶/收藏）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const allowed: Record<string, unknown> = {}
  if ("isTop" in body) allowed.isTop = body.isTop
  if ("isFavorite" in body) allowed.isFavorite = body.isFavorite

  const entry = await prisma.entry.update({
    where: { id, userId },
    data: allowed,
    include: { tags: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ ok: true, data: entry })
}