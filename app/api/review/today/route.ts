import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { getTodayCard, logReviewCall } from "../../../../lib/review-scheduler"
import { generateQuestions } from "../../../../lib/deepseek"
import { generateTemplateQuestions } from "../../../../lib/template-questions"
import { prisma } from "../../../../lib/prisma"

async function cacheQuestions(
  userId: string,
  entryId: string,
  questions: any[]
) {
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
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    let card = await getTodayCard(userId)

    // 若返回的是无题目的心得，按组合方案出题
    if (card && !card.questionId) {
      const entry = await prisma.entry.findUnique({ where: { id: card.entryId } })
      if (entry) {
        // 步骤1：尝试在线生成（30秒超时 + 1次重试）
        let questions = await generateQuestions(entry.title, entry.content, 1)

        if (questions.length > 0) {
          // 在线生成成功
          await cacheQuestions(userId, entry.id, questions)
          await logReviewCall(userId, entry.id, "online-retry", true, questions.length)
        } else {
          // 步骤2：降级到模板题目
          const templateQs = generateTemplateQuestions(entry.title, entry.content)
          await cacheQuestions(userId, entry.id, templateQs)
          await logReviewCall(userId, entry.id, "template-fallback", true, templateQs.length)
        }

        // 重新获取卡片（现在有题目了）
        card = await getTodayCard(userId)
      }
    } else if (card && card.questionId) {
      // 缓存命中
      await logReviewCall(userId, card.entryId, "cache-hit", true, 1)
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
