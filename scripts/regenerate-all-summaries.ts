// 批量重生成所有心得的 AI 总结（150字）和题目
// 用法：cd /www/wwwroot/xinya && npx tsx scripts/regenerate-all-summaries.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1") + "/chat/completions"

if (!DEEPSEEK_API_KEY) {
  console.error("[RegenerateAll] 错误: DEEPSEEK_API_KEY 未设置，请在 .env.production 中配置")
  process.exit(1)
}
console.log("[RegenerateAll] API URL:", DEEPSEEK_API_URL)

async function generateQuestions(title: string, content: string) {
  const prompt = `请根据以下心得内容，生成复习用的题目和要点总结。

心得标题：${title}
心得内容：${content.substring(0, 1000)}

要求：
1. 题干≤30字，简洁明了
2. 题型自动适配：概念辨析→单选，关系匹配→多选，对比→判断
3. 选项数量：单选/多选4个选项，判断题只有2个选项（正确/错误）
4. 答案用选项索引表示（单选[0]，多选[0,2]，判断[0]为对[1]为错）
5. 解析引用原文重点
6. 同时生成要点总结（keyPoints）：请你以老师的角色，对这篇心得的核心内容做 1-2 句总结叙述，不要发散，不要用 1、2、3、4、5 这样的列举，总字数（含标点）控制在 150 字以内

请返回 JSON 格式：
{
  "keyPoints": "1-2 句要点总结，150 字以内",
  "questions": [
    {
      "question": "题干",
      "type": "single/multiple/truefalse",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": [0],
      "explanation": "解析..."
    }
  ]
}
注意：判断题的options只有2个元素，如["正确", "错误"]

只返回JSON，不要其他内容。`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    }),
    signal: controller.signal,
  })
  clearTimeout(timeoutId)

  if (!res.ok) return { keyPoints: "", questions: [] }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ""
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { keyPoints: "", questions: [] }
  const result = JSON.parse(match[0])
  return {
    keyPoints: result.keyPoints || "",
    questions: result.questions || [],
  }
}

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

      // 删除旧题目和答题记录
      const oldQuestions = await prisma.quizQuestion.findMany({ where: { entryId: entry.id } })
      if (oldQuestions.length > 0) {
        const oldIds = oldQuestions.map(q => q.id)
        await prisma.quizRecord.deleteMany({ where: { questionId: { in: oldIds } } })
        await prisma.quizQuestion.deleteMany({ where: { id: { in: oldIds } } })
        console.log(`  删除旧题目: ${oldIds.length} 道`)
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
