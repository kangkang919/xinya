import { NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { generateQuestions } from "../../../../lib/deepseek"
import { generateTemplateQuestions } from "../../../../lib/template-questions"
import { logReviewCall } from "../../../../lib/review-scheduler"

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 查找所有没有题目的心得
    const entriesWithoutQuestions = await prisma.entry.findMany({
      where: {
        userId,
        quizQuestions: { none: {} },
      },
    })

    if (entriesWithoutQuestions.length === 0) {
      return NextResponse.json({ ok: true, message: "所有心得已有题目，无需补生成", count: 0 })
    }

    console.log("[Backfill] Found", entriesWithoutQuestions.length, "entries without questions")

    let successCount = 0
    let failCount = 0
    const results: { entryId: string; title: string; status: string; questionCount: number }[] = []

    for (const entry of entriesWithoutQuestions) {
      try {
        console.log("[Backfill] Processing:", entry.id, entry.title)

        // 尝试 DeepSeek 生成
        let questions = await generateQuestions(entry.title, entry.content, 1)

        if (questions.length === 0) {
          // 降级到模板
          questions = generateTemplateQuestions(entry.title, entry.content)
        }

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

        await logReviewCall(userId, entry.id, "backfill", true, questions.length)
        successCount++
        results.push({ entryId: entry.id, title: entry.title, status: "success", questionCount: questions.length })
        console.log("[Backfill] Success:", entry.title, questions.length, "questions")
      } catch (e) {
        failCount++
        results.push({ entryId: entry.id, title: entry.title, status: "error", questionCount: 0 })
        console.error("[Backfill] Error for entry:", entry.id, e)
      }
    }

    return NextResponse.json({
      ok: true,
      total: entriesWithoutQuestions.length,
      success: successCount,
      failed: failCount,
      results,
    })
  } catch (e) {
    console.error("[Backfill]", e)
    return NextResponse.json({ error: "补生成失败" }, { status: 500 })
  }
}
