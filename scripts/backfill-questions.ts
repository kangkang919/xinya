// 补生成脚本：直接在服务器运行，绕过 HTTP 超时
// 用法：cd /www/wwwroot/xinya && npx tsx scripts/backfill-questions.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = process.env.DEEPSEEK_BASE_URL + "/chat/completions"

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
6. 同时生成要点总结（keyPoints）：请你以老师的角色，对这篇心得的核心内容做1-2段总结叙述，不要发散，不要用1、2、3、4、5这样的列举，字数控制在200字以内

请返回JSON格式：
{
  "keyPoints": "3-5行要点总结...",
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
  } catch {
    return { keyPoints: "", questions: [] }
  }
}

function generateTemplateQuestions(title: string, content: string) {
  const questions = [
    {
      question: "这篇心得的核心主题是什么？",
      type: "single",
      options: [title.substring(0, 30), "与主题相关的其他观点", "完全不同的领域知识", "以上都不是"],
      answer: [0],
      explanation: `这篇心得的标题是「${title}」，核心内容围绕此主题展开。`,
    },
    {
      question: `这篇心得的内容篇幅属于？`,
      type: "truefalse",
      options: ["较长（详细阐述）", "较短（简要记录）"],
      answer: [content.length > 200 ? 0 : 1],
      explanation: `这篇心得共有${content.length}字，属于${content.length > 200 ? "详细阐述" : "简要记录"}类型。`,
    },
  ]

  const plainText = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  const keyPoints = plainText.length > 200 ? plainText.substring(0, 200) + "…" : plainText

  return { keyPoints, questions }
}

async function main() {
  console.log("[Backfill] 查找没有题目或没有要点的心得...")

  // 查找没有题目的心得
  const entriesWithoutQuestions = await prisma.entry.findMany({
    where: { quizQuestions: { none: {} } },
  })

  // 查找有题目但没有要点的心得
  const entriesWithoutKeyPoints = await prisma.entry.findMany({
    where: {
      quizQuestions: { some: {} },
      keyPoints: null,
    },
  })

  const entries = [...entriesWithoutQuestions, ...entriesWithoutKeyPoints]

  console.log(`[Backfill] 找到 ${entries.length} 篇需要补生成的心得`)
  console.log(`  - 没有题目：${entriesWithoutQuestions.length} 篇`)
  console.log(`  - 没有要点：${entriesWithoutKeyPoints.length} 篇`)

  if (entries.length === 0) {
    console.log("[Backfill] 所有心得已有题目和要点，无需补生成")
    await prisma.$disconnect()
    return
  }

  let success = 0
  let failed = 0

  for (const entry of entries) {
    console.log(`\n[Backfill] 处理: ${entry.title}`)
    try {
      // 检查是否已有题目
      const existingQuestions = await prisma.quizQuestion.count({
        where: { entryId: entry.id },
      })

      if (existingQuestions === 0) {
        // 没有题目，需要生成题目和要点
        console.log("  生成题目和要点...")
        const result = await generateQuestions(entry.title, entry.content)
        let questions = result.questions
        let source = "deepseek"

        // 保存 AI 生成的要点
        if (result.keyPoints) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { keyPoints: result.keyPoints },
          })
        }

        if (questions.length === 0) {
          console.log("  DeepSeek 失败，使用模板降级")
          const templateResult = generateTemplateQuestions(entry.title, entry.content)
          questions = templateResult.questions
          source = "template"

          // 保存模板要点
          if (templateResult.keyPoints) {
            await prisma.entry.update({
              where: { id: entry.id },
              data: { keyPoints: templateResult.keyPoints },
            })
          }
        }

        // 创建题目和答题记录
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
      } else {
        // 已有题目，只生成要点
        console.log("  仅生成要点...")
        const result = await generateQuestions(entry.title, entry.content)
        console.log("  DeepSeek 返回 keyPoints:", result.keyPoints ? `"${result.keyPoints.substring(0, 50)}..."` : "(空)")

        if (result.keyPoints) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { keyPoints: result.keyPoints },
          })
          success++
          console.log(`  ✅ AI 生成要点成功`)
        } else {
          // 降级到模板要点
          console.log("  DeepSeek 要点为空，使用模板降级")
          const templateResult = generateTemplateQuestions(entry.title, entry.content)
          console.log("  模板 keyPoints:", templateResult.keyPoints ? `"${templateResult.keyPoints.substring(0, 50)}..."` : "(空)")
          if (templateResult.keyPoints) {
            await prisma.entry.update({
              where: { id: entry.id },
              data: { keyPoints: templateResult.keyPoints },
            })
            success++
            console.log(`  ✅ 模板生成要点成功`)
          } else {
            console.log("  ⚠️ 模板要点也为空")
          }
        }
      }
    } catch (e) {
      failed++
      console.log(`  ❌ 失败: ${e}`)
    }
  }

  console.log(`\n[Backfill] 完成！成功: ${success}, 失败: ${failed}`)
  await prisma.$disconnect()
}

main().catch(console.error)
