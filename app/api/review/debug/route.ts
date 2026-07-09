import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 1. 直接查记录总数
    const recordCount = await prisma.quizRecord.count({
      where: { userId, answeredAt: { not: null } },
    })

    // 2. 查所有记录，手动计算
    const records = await prisma.quizRecord.findMany({
      where: { userId, answeredAt: { not: null } },
      select: {
        id: true,
        correct: true,
        answerCount: true,
        answeredAt: true,
      },
    })

    // 3. 用 reduce 计算总数（和 profile API 同样的逻辑）
    const reduceTotal = records.reduce((sum, r) => sum + (r.answerCount || 1), 0)

    // 4. 查 answerCount 的分布
    const answerCountDistribution: Record<string, number> = {}
    records.forEach(r => {
      const key = String(r.answerCount || 'null')
      answerCountDistribution[key] = (answerCountDistribution[key] || 0) + 1
    })

    // 5. 按日期分组
    const dayMap: Record<string, { total: number; correct: number }> = {}
    records.forEach(r => {
      if (r.answeredAt) {
        const day = r.answeredAt.toISOString().split("T")[0]
        if (!dayMap[day]) dayMap[day] = { total: 0, correct: 0 }
        dayMap[day].total += (r.answerCount || 1)
        if (r.correct) dayMap[day].correct++
      }
    })

    return NextResponse.json({
      ok: true,
      data: {
        recordCount,
        reduceTotal,
        answerCountDistribution,
        dailyBreakdown: dayMap,
        sampleRecords: records.slice(0, 5).map(r => ({
          id: r.id,
          correct: r.correct,
          answerCount: r.answerCount,
        })),
      },
    })
  } catch (e) {
    console.error("[ReviewDebug]", e)
    return NextResponse.json({ error: "调试接口失败" }, { status: 500 })
  }
}
