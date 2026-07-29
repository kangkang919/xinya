// 一次性修复：重新生成被30字硬截断的断句题目（A+B1方案，2026-07-28）
// 筛选条件：题干长度=30 且结尾无标点（真截断），对所属心得重新出题
// 数据安全（规则8）：只删未答记录，保留已答历史；执行前需 pg_dump 备份
// 用法：cd /www/wwwroot/xinya && node --env-file=.env.production node_modules/.bin/tsx scripts/fix-truncated-questions.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1") + "/chat/completions"

if (!DEEPSEEK_API_KEY) {
  console.error("[FixTruncated] 错误: DEEPSEEK_API_KEY 未设置，请在 .env.production 中配置")
  process.exit(1)
}
console.log("[FixTruncated] API URL:", DEEPSEEK_API_URL)

async function generateQuestions(title: string, content: string) {
  const prompt = `请根据以下心得内容，生成复习用的题目和要点总结。

心得标题：${title}
心得内容：${content.substring(0, 1000)}

要求：
1. 题干简洁明了：单选/多选题≤30字；判断题为完整陈述句，≤50字。题干必须是完整的句子，禁止半句截断
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
    questions: (result.questions || []).map((q: any) => ({
      question: String(q.question || "").substring(0, 100), // 100字安全上限，不再30字硬截断
      type: ["single", "multiple", "truefalse"].includes(q.type) ? q.type : "single",
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
      answer: Array.isArray(q.answer) ? q.answer : [0],
      explanation: q.explanation || "",
    })),
  }
}

async function main() {
  console.log("[FixTruncated] 查找被截断的题目（长度=30 且结尾无标点）...")

  const allQuestions = await prisma.quizQuestion.findMany({
    select: { id: true, entryId: true, question: true },
  })
  const truncated = allQuestions.filter(
    q => q.question.length === 30 && !/[。？！?!]$/.test(q.question)
  )
  const entryIds = Array.from(new Set(truncated.map(q => q.entryId)))

  console.log(`[FixTruncated] 断句题目 ${truncated.length} 道，涉及心得 ${entryIds.length} 篇`)
  truncated.forEach(q => console.log(`  - ${q.question}`))

  if (entryIds.length === 0) {
    console.log("[FixTruncated] 没有需要修复的题目")
    await prisma.$disconnect()
    return
  }

  const entries = await prisma.entry.findMany({ where: { id: { in: entryIds } } })

  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    console.log(`\n[${i + 1}/${entries.length}] 处理: ${entry.title}`)

    try {
      const result = await generateQuestions(entry.title, entry.content)

      if (result.questions.length === 0) {
        console.log("  ⚠️ DeepSeek 返回为空，跳过（保留原题目）")
        skipped++
        continue
      }

      // 更新 AI 总结
      if (result.keyPoints) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { keyPoints: result.keyPoints },
        })
      }

      // 删除旧题目和答题记录（仅删除未答过的，保留有答题历史的记录）
      const oldQuestions = await prisma.quizQuestion.findMany({ where: { entryId: entry.id } })
      if (oldQuestions.length > 0) {
        const oldIds = oldQuestions.map(q => q.id)
        // 只删除未答题的记录，保留已答过的历史数据
        await prisma.quizRecord.deleteMany({ where: { questionId: { in: oldIds }, answeredAt: null } })
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
      console.log(`  ✅ 生成 ${result.questions.length} 道新题: ${result.questions.map((q: any) => `"${q.question}"`).join(" / ")}`)

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

  // 收尾验证：还有多少断句题
  const after = await prisma.quizQuestion.findMany({ select: { question: true } })
  const remain = after.filter(q => q.question.length === 30 && !/[。？！?!]$/.test(q.question))
  console.log(`\n[FixTruncated] 完成！成功: ${success}, 失败: ${failed}, 跳过: ${skipped}`)
  console.log(`[FixTruncated] 剩余断句题目: ${remain.length} 道`)
  remain.forEach(q => console.log(`  - ${q.question}`))
  await prisma.$disconnect()
}

main().catch(console.error)
