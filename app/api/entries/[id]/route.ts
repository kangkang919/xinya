import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateQuestions } from "@/lib/deepseek"
import { logReviewCall } from "@/lib/review-scheduler"

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

  let finalTagIds: string[] = tagIds || []
  if (finalTagIds.length === 0) {
    const defaultTag = await prisma.tag.findFirst({ where: { userId, isDefault: true } })
    if (defaultTag) finalTagIds = [defaultTag.id]
  }

  const entry = await prisma.entry.update({
    where: { id, userId },
    data: {
      title: title.trim(),
      content,
      mood: mood || null,
      isDraft: isDraft ?? false,
      tags: { set: finalTagIds.map((tid: string) => ({ id: tid })) },
    },
    include: { tags: { select: { id: true, name: true } } },
  })

  // 编辑后异步重新生成 AI 总结和题目
  if (!isDraft && content) {
    console.log("[Entries] Entry updated, triggering AI regeneration for entry:", entry.id)
    regenerateQuestions(userId, entry.id, title.trim(), content).catch(e =>
      console.error("[Regenerate] Error:", e)
    )
  }

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

// 异步重新生成题目（编辑后调用）
async function regenerateQuestions(
  userId: string,
  entryId: string,
  title: string,
  content: string
) {
  console.log("[Regenerate] Starting, entryId:", entryId, "title:", title)
  const result = await generateQuestions(title, content, 1)
  const questions = result.questions
  console.log("[Regenerate] generateQuestions returned:", questions.length, "questions")

  // 更新 AI 生成的要点
  if (result.keyPoints) {
    await prisma.entry.update({
      where: { id: entryId },
      data: { keyPoints: result.keyPoints },
    })
  }

  // 删除旧题目和答题记录，重新生成
  const oldQuestions = await prisma.quizQuestion.findMany({ where: { entryId } })
  if (oldQuestions.length > 0) {
    const oldQuestionIds = oldQuestions.map(q => q.id)
    await prisma.quizRecord.deleteMany({ where: { questionId: { in: oldQuestionIds } } })
    await prisma.quizQuestion.deleteMany({ where: { id: { in: oldQuestionIds } } })
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
    await logReviewCall(userId, entryId, "regenerate", true, questions.length)
  } else {
    await logReviewCall(userId, entryId, "regenerate", false, 0, "DeepSeek returned empty")
  }
}
