// 批量重生成所有心得的 AI 总结（150字）和题目
// 用法：cd /www/wwwroot/xinya && npx tsx scripts/regenerate-all-summaries.ts

import { PrismaClient } from "@prisma/client"
import { generateQuestions } from "../lib/deepseek"

const prisma = new PrismaClient()

async function main() {
  console.log("[RegenerateAll] 查找所有非草稿心得...")

  const entries = await prisma.entry.findMany({
    where: { isDraft: false },
    orderBy: { createdAt: "asc" },
  })

  console.log(`[RegenerateAll] 共 ${entries.length} 篇心得需要处理`)

  if (entries.length === 0) {
    console.log("[RegenerateAll] 没有需要处理的心得")
    await prisma.$disconnect()
    return
  }

  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    console.log(`\n[${i + 1}/${entries.length}] 处理: ${entry.title}`)

    try {
      const result = await generateQuestions(entry.title, entry.content)

      if (!result.keyPoints && result.questions.length === 0) {
        console.log("  ️ DeepSeek 返回为空，跳过")
        skipped++
        continue
      }

      // 更新 AI 总结
      if (result.keyPoints) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { keyPoints: result.keyPoints },
        })
        console.log(`  总结: "${result.keyPoints.substring(0, 60)}..."`)
      }

      // 删除旧题目和答题记录（仅删除未答过的，保留有答题历史的记录）
      const oldQuestions = await prisma.quizQuestion.findMany({ where: { entryId: entry.id } })
      if (oldQuestions.length > 0) {
        const oldIds = oldQuestions.map(q => q.id)
        // 只删除未答题的记录，保留已答过的历史数据
        const deletedRecords = await prisma.quizRecord.deleteMany({ where: { questionId: { in: oldIds }, answeredAt: null } })
        // 只删除没有已答记录的旧题目
        const answeredRecords = await prisma.quizRecord.findMany({
          where: { questionId: { in: oldIds }, answeredAt: { not: null } },
          select: { questionId: true },
        })
        const answeredQIds = new Set(answeredRecords.map(r => r.questionId))
        const deletableIds = oldIds.filter(id => !answeredQIds.has(id))
        if (deletableIds.length > 0) {
          await prisma.quizQuestion.deleteMany({ where: { id: { in: deletableIds } } })
        }
        console.log(`  删除旧题目: ${deletableIds.length} 道（保留已答: ${answeredQIds.size} 道）`)
      }

      // 创建新题目和答题记录
      if (result.questions.length > 0) {
        for (let j = 0; j < result.questions.length; j++) {
          const q = result.questions[j]
          const question = await prisma.quizQuestion.create({
            data: {
              entryId: entry.id,
              question: q.question,
              type: q.type,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation,
              angle: j + 1,
            },
          })

          const nextReviewAt = new Date()
          nextReviewAt.setDate(nextReviewAt.getDate() + 1)

          await prisma.quizRecord.create({
            data: {
              userId: entry.userId,
              questionId: question.id,
              entryId: entry.id,
              correct: false,
              nextReviewAt,
              streak: 0,
            },
          })
        }
        console.log(`  ✅ 生成 ${result.questions.length} 道新题`)
      }

      success++

      // 避免 API 限流，每篇间隔 2 秒
      if (i < entries.length - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    } catch (e) {
      failed++
      console.log(`  ❌ 失败: ${e}`)
    }
  }

  console.log(`\n[RegenerateAll] 完成！成功: ${success}, 失败: ${failed}, 跳过: ${skipped}`)
  await prisma.$disconnect()
}

main().catch(console.error)
