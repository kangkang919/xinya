import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateQuestions } from "@/lib/deepseek"
import { logReviewCall } from "@/lib/review-scheduler"

// GET /api/entries?search=&favorite=&tagId=&from=&to=&page=1&limit=20
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const favorite = searchParams.get("favorite") === "true"
  const tagId = searchParams.get("tagId") || ""
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "20")))

  const where: any = { userId, isDraft: false }
  if (favorite) where.isFavorite = true
  if (tagId) where.tags = { some: { id: tagId } }
  if (search) where.OR = [
    { title: { contains: search, mode: "insensitive" } },
    { content: { contains: search, mode: "insensitive" } },
  ]
  if (from || to) {
    where.recordTime = {}
    if (from) where.recordTime.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      where.recordTime.lt = toDate
    }
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: { tags: { select: { id: true, name: true } } },
      orderBy: [{ isTop: "desc" }, { recordTime: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entry.count({ where }),
  ])

  // 去掉HTML标签生成预览
  const data = entries.map(e => ({
    id: e.id,
    title: e.title,
    contentPreview: e.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80),
    tags: e.tags,
    mood: e.mood,
    recordTime: e.recordTime.toISOString(),
    isTop: e.isTop,
    isFavorite: e.isFavorite,
    isDraft: e.isDraft,
  }))

  return NextResponse.json({ ok: true, data: { entries: data, total, page, limit } })
}

// POST /api/entries - 新建心得
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json()
  const { title, content, mood, tagIds, isDraft } = body

  if (!title?.trim())
    return NextResponse.json({ ok: false, error: "标题不能为空" }, { status: 400 })

  let finalTagIds: string[] = tagIds || []
  if (finalTagIds.length === 0) {
    const defaultTag = await prisma.tag.findFirst({ where: { userId, isDefault: true } })
    if (defaultTag) finalTagIds = [defaultTag.id]
  }

  const entry = await prisma.entry.create({
    data: {
      userId,
      title: title.trim(),
      content: content || "",
      mood: mood || null,
      isDraft: isDraft || false,
      tags: finalTagIds.length
        ? { connect: finalTagIds.map((id: string) => ({ id })) }
        : undefined,
    },
    include: { tags: { select: { id: true, name: true } } },
  })

  // 异步预生成题目（不阻塞响应）
  console.log("[Entries] Creating entry, isDraft:", isDraft, "content length:", content?.length)
  if (!isDraft && content) {
    console.log("[Entries] Triggering pre-generation for entry:", entry.id)
    preGenerateQuestions(userId, entry.id, title.trim(), content).catch(e =>
      console.error("[PreGenerate] Error:", e)
    )
  }

  return NextResponse.json({ ok: true, data: entry })
}

// 异步预生成题目
async function preGenerateQuestions(
  userId: string,
  entryId: string,
  title: string,
  content: string
) {
  console.log("[PreGenerate] Starting, entryId:", entryId, "title:", title)
  const result = await generateQuestions(title, content, 1)
  const questions = result.questions
  console.log("[PreGenerate] generateQuestions returned:", questions.length, "questions")

  // 保存 AI 生成的要点
  if (result.keyPoints) {
    await prisma.entry.update({
      where: { id: entryId },
      data: { keyPoints: result.keyPoints },
    })
  }

  if (questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const question = await prisma.quizQuestion.create({
        data: {
          entryId,
          question: q.question,
          type: q.type,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          angle: i + 1,
        },
      })

      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + 1)

      await prisma.quizRecord.create({
        data: {
          userId,
          questionId: question.id,
          entryId,
          correct: false,
          nextReviewAt,
          streak: 0,
        },
      })
    }
    await logReviewCall(userId, entryId, "pre-generate", true, questions.length)
  } else {
    await logReviewCall(userId, entryId, "pre-generate", false, 0, "DeepSeek returned empty")
  }
}

