import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

interface TagStat {
  tag: string
  correct: number
  total: number
  accuracy: number
}

async function analyzeWithDeepSeek(tagStats: TagStat[]): Promise<{ weak: TagStat[], strong: TagStat[] }> {
  if (tagStats.length === 0) return { weak: [], strong: [] }

  const prompt = `根据以下学习数据，分析用户的薄弱领域和掌握良好的领域。

数据（按标签分组）：
${tagStats.map(t => `- ${t.tag}: 答对${t.correct}题/共${t.total}题, 准确率${t.accuracy}%`).join('\n')}

要求：
1. 薄弱领域：准确率低于60%的标签
2. 掌握良好：准确率高于80%的标签
3. 每个分类最多返回5个
4. 按准确率排序（薄弱从低到高，掌握从高到低）

返回JSON格式：
{
  "weak": [{"tag": "标签名", "accuracy": 数字, "count": 题目数}],
  "strong": [{"tag": "标签名", "accuracy": 数字, "count": 题目数}]
}

只返回JSON，不要其他内容。`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return { weak: [], strong: [] }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ""
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { weak: [], strong: [] }

    const result = JSON.parse(jsonMatch[0])
    return {
      weak: (result.weak || []).slice(0, 5),
      strong: (result.strong || []).slice(0, 5),
    }
  } catch (e) {
    console.error("[ReviewProfile] DeepSeek error:", e)
    // 降级：本地计算
    const weak = tagStats.filter(t => t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5)
    const strong = tagStats.filter(t => t.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5)
    return { weak, strong }
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 查询所有已答题的记录
    const records = await prisma.quizRecord.findMany({
      where: {
        userId,
        answeredAt: { not: null },
      },
      include: {
        question: {
          include: {
            entry: {
              include: {
                tags: true,
              },
            },
          },
        },
      },
      orderBy: { answeredAt: "asc" },
    })

    if (records.length === 0) {
      return NextResponse.json({ ok: true, data: null })
    }

    // 计算学习天数（按answeredAt日期去重）
    const daysSet = new Set<string>()
    records.forEach(r => {
      if (r.answeredAt) {
        daysSet.add(r.answeredAt.toISOString().split("T")[0])
      }
    })
    const daysStudied = daysSet.size

    // 总答题次数和正确次数（每条记录代表最近一次答题结果）
    const totalQuestions = records.length
    const correctCount = records.filter(r => r.correct).length
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

    // 近5日记录
    const recentDays: { date: string; correct: number; total: number }[] = []
    const dayMap = new Map<string, { correct: number; total: number }>()
    records.forEach(r => {
      if (r.answeredAt) {
        const day = r.answeredAt.toISOString().split("T")[0]
        if (!dayMap.has(day)) dayMap.set(day, { correct: 0, total: 0 })
        const stat = dayMap.get(day)!
        stat.total++
        if (r.correct) stat.correct++
      }
    })
    const sortedDays = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).reverse()
    sortedDays.forEach(([date, stat]) => {
      recentDays.push({ date: date.slice(5).replace("-", "/"), ...stat })
    })

    // 按标签分组统计
    const tagMap = new Map<string, { correct: number; total: number }>()
    records.forEach(r => {
      const tags = r.question.entry.tags
      tags.forEach(tag => {
        if (!tagMap.has(tag.name)) tagMap.set(tag.name, { correct: 0, total: 0 })
        const stat = tagMap.get(tag.name)!
        stat.total++
        if (r.correct) stat.correct++
      })
    })

    const tagStats: TagStat[] = Array.from(tagMap.entries()).map(([tag, stat]) => ({
      tag,
      correct: stat.correct,
      total: stat.total,
      accuracy: Math.round((stat.correct / stat.total) * 100),
    }))

    // 调用DeepSeek分析
    const analysis = await analyzeWithDeepSeek(tagStats)

    return NextResponse.json({
      ok: true,
      data: {
        daysStudied,
        totalQuestions,
        accuracy,
        recentDays,
        weakAreas: analysis.weak,
        strongAreas: analysis.strong,
      },
    })
  } catch (e) {
    console.error("[ReviewProfile]", e)
    return NextResponse.json({ error: "获取学习画像失败" }, { status: 500 })
  }
}
