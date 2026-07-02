import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { getTodayCard } from "../../../../lib/review-scheduler"
import { generateQuestions } from "../../../../lib/deepseek"
import { prisma } from "../../../../lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    let card = await getTodayCard(userId)

    // 若返回的是无题目的心得，触发出题
    if (card && !card.questionId) {
      const entry = await prisma.entry.findUnique({ where: { id: card.entryId } })
      if (entry) {
        const questions = await generateQuestions(entry.title, entry.content)

        // 缓存题目
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i]
          const question = await prisma.quizQuestion.create({
            data: {
              entryId: entry.id,
              question: q.question,
              type: q.type,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation,
              angle: i + 1,
            },
          })

          // 创建答题记录
          const nextReviewAt = new Date()
          nextReviewAt.setDate(nextReviewAt.getDate() + 1)

          await prisma.quizRecord.create({
            data: {
              userId,
              questionId: question.id,
              entryId: entry.id,
              correct: false,
              nextReviewAt,
              streak: 0,
            },
          })
        }

        // 重新获取卡片（现在有题目了）
        card = await getTodayCard(userId)
      }
    }

    if (!card) {
      return NextResponse.json({ ok: true, data: null })
    }

    // 更新 lastCardDate
    const today = new Date().toISOString().split("T")[0]
    await prisma.userSetting.upsert({
      where: { userId },
      update: { lastCardDate: today, lastQuestionId: card.questionId },
      create: { userId, lastCardDate: today, lastQuestionId: card.questionId },
    })

    return NextResponse.json({ ok: true, data: card })
  } catch (e) {
    console.error("[ReviewToday]", e)
    return NextResponse.json({ error: "获取卡片失败" }, { status: 500 })
  }
}
