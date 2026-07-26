import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBeijingDateParts, beijingDayStart, stripHtml } from "@/lib/utils"
import { generateMonthlyInsight } from "@/lib/deepseek"

// 生成月度洞察的最少心得篇数
const MIN_ENTRIES = 3

// GET /api/insight/monthly?year=&month=
// 三态返回：ongoing（当月进行中）/ insufficient（不足3篇）/ ready（洞察内容）
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const { y: nowY, m: nowM } = getBeijingDateParts(now)
    const year = parseInt(searchParams.get("year") || String(nowY))
    const month = parseInt(searchParams.get("month") || String(nowM))

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ ok: false, error: "参数错误" }, { status: 400 })
    }

    // 月末结算：仅已结束的自然月才生成（北京时间跨入次月 00:00:00 后该月才算结束）
    // 当前月或未来月 → 进行中
    if (year > nowY || (year === nowY && month >= nowM)) {
      return NextResponse.json({ ok: true, data: { status: "ongoing" } })
    }

    const monthStart = beijingDayStart(year, month, 1)
    const nextMonthStart = beijingDayStart(year, month + 1, 1)

    // 命中缓存 → 直接返回（每月每用户仅一条）
    const cached = await prisma.insightReport.findUnique({
      where: {
        userId_type_periodStart: { userId, type: "monthly", periodStart: monthStart },
      },
    })
    if (cached) {
      return NextResponse.json({
        ok: true,
        data: { status: "ready", content: cached.content, cached: true },
      })
    }

    // 查询当月全部非草稿心得（按记录时间正序）
    const entries = await prisma.entry.findMany({
      where: {
        userId,
        isDraft: false,
        recordTime: { gte: monthStart, lt: nextMonthStart },
      },
      select: { title: true, content: true, keyPoints: true },
      orderBy: { recordTime: "asc" },
    })

    // 不足 3 篇 → 不生成
    if (entries.length < MIN_ENTRIES) {
      return NextResponse.json({
        ok: true,
        data: { status: "insufficient", count: entries.length, threshold: MIN_ENTRIES },
      })
    }

    // 组装输入源：优先用 AI 总结（keyPoints），缺失时用标题+正文前50字兜底
    const summaries = entries.map(e => ({
      title: e.title,
      keyPoints: e.keyPoints || stripHtml(e.content, 50),
    }))

    const monthLabel = `${year}年${month}月`
    const insight = await generateMonthlyInsight(monthLabel, summaries)
    if (!insight) {
      return NextResponse.json(
        { ok: false, error: "洞察生成失败，请稍后再试" },
        { status: 500 }
      )
    }

    // 写入缓存（失败时不缓存，用户可重试）
    const contentJson = insight as unknown as Prisma.InputJsonValue
    await prisma.insightReport.upsert({
      where: {
        userId_type_periodStart: { userId, type: "monthly", periodStart: monthStart },
      },
      create: {
        userId,
        type: "monthly",
        periodStart: monthStart,
        periodEnd: nextMonthStart,
        content: contentJson,
      },
      update: { content: contentJson },
    })

    return NextResponse.json({
      ok: true,
      data: { status: "ready", content: insight, cached: false },
    })
  } catch (e) {
    console.error("[MonthlyInsight]", e)
    return NextResponse.json({ ok: false, error: "获取洞察失败" }, { status: 500 })
  }
}
