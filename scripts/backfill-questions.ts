// 补生成脚本：直接在服务器运行，绕过 HTTP 超时
// 用法：cd /www/wwwroot/xinya && npx tsx scripts/backfill-questions.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = process.env.DEEPSEEK_BASE_URL + "/chat/completions"

async function generateQuestions(title: string, content: string) {
  const prompt = `你是学习顾问。请根据以下心得内容，生成2道选择题帮助复习。

心得标题：${title}
心得内容：${content}

要求：
- 生成2道题，类型从 single/multiple/truefalse 中选择
- 题干简洁，不超过30字
- 每题4个选项，有迷惑性但不歧义
- 解析引用原文重点

严格按以下JSON格式返回，不要其他内容：
[{"question":"题干","type":"single","options":["A","B","C","D"],"answer":[0],"explanation":"解析"}]`

  try {
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

    if (!res.ok) return []
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ""
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

function generateTemplateQuestions(title: string, content: string) {
  return [
    {
      question: "这篇心得的核心主题是什么？",
      type: "single",
      options: [title.substring(0, 30), "与主题相关的其他观点", "完全不同的领域知识", "以上都不是"],
      answer: [0],
      explanation: `这篇心得的标题是「${title}」，核心内容围绕此主题展开。`,
    },
    {
      question: "这篇心得的内容篇幅属于？",
      type: "truefalse",
      options: ["较长（详细阐述）", "较短（简要记录）"],
      answer: [content.length > 200 ? 0 : 1],
      explanation: `这篇心得共有${content.length}字，属于${content.length > 200 ? "详细阐述" : "简要记录"}类型。`,
    },
  ]
}

async function main() {
  console.log("[Backfill] 查找没有题目的心得...")

  const entries = await prisma.entry.findMany({
    where: { quizQuestions: { none: {} } },
  })

  console.log(`[Backfill] 找到 ${entries.length} 篇需要补生成的心得`)

  if (entries.length === 0) {
    console.log("[Backfill] 所有心得已有题目，无需补生成")
    await prisma.$disconnect()
    return
  }

  let success = 0
  let failed = 0

  for (const entry of entries) {
    console.log(`\n[Backfill] 处理: ${entry.title}`)
    try {
      let questions = await generateQuestions(entry.title, entry.content)
      let source = "deepseek"

      if (questions.length === 0) {
        console.log("  DeepSeek 失败，使用模板降级")
        questions = generateTemplateQuestions(entry.title, entry.content)
        source = "template"
      }

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
            userId: entry.userId,
            questionId: question.id,
            entryId: entry.id,
            correct: false,
            nextReviewAt,
            streak: 0,
          },
        })
      }

      success++
      console.log(`  ✅ ${source} 生成 ${questions.length} 道题`)
    } catch (e) {
      failed++
      console.log(`  ❌ 失败: ${e}`)
    }
  }

  console.log(`\n[Backfill] 完成！成功: ${success}, 失败: ${failed}`)
  await prisma.$disconnect()
}

main().catch(console.error)
