import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tags
export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const tags = await prisma.tag.findMany({
    where: { userId },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })

  return NextResponse.json({
    ok: true,
    data: tags.map(t => ({
      id: t.id,
      name: t.name,
      isDefault: t.isDefault,
      entryCount: t._count.entries,
    })),
  })
}

// POST /api/tags - 新建标签
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim())
    return NextResponse.json({ ok: false, error: "标签名不能为空" }, { status: 400 })

  const trimmed = name.trim()
  if (trimmed.length > 20)
    return NextResponse.json({ ok: false, error: "标签名最多20个字" }, { status: 400 })

  const existing = await prisma.tag.findFirst({ where: { userId, name: trimmed } })
  if (existing)
    return NextResponse.json({ ok: false, error: "该标签已存在" }, { status: 400 })

  const tag = await prisma.tag.create({ data: { userId, name: trimmed } })
  return NextResponse.json({ ok: true, data: tag })
}