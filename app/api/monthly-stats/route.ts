import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TIMEZONE = "Asia/Shanghai"

function getBeijingDateParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || "0")
  return { y: get("year"), m: get("month"), d: get("day") }
}

function beijingDayStart(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day, 16, 0, 0) - 86400000)
}

export async function GET(req: Request) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get("year")
  const monthParam = searchParams.get("month")

  const now = new Date()
  const { y: nowY, m: nowM } = getBeijingDateParts(now)

  const year = yearParam ? parseInt(yearParam) : nowY
  const month = monthParam ? parseInt(monthParam) : nowM

  // 当月第一天和最后一天（北京时间）
  const monthStart = beijingDayStart(year, month, 1)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthEnd = beijingDayStart(year, month, daysInMonth)
  // 下个月第一天 0:00 作为 exclusive 边界
  const nextMonthStart = beijingDayStart(year, month + 1, 1)

  // 查询当月所有非草稿心得
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      isDraft: false,
      recordTime: { gte: monthStart, lt: nextMonthStart },
    },
    select: { recordTime: true },
  })

  // 按天统计
  const dayCounts: Record<number, number> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    dayCounts[d] = 0
  }

  entries.forEach(e => {
    const { d } = getBeijingDateParts(new Date(e.recordTime))
    if (dayCounts[d] !== undefined) {
      dayCounts[d]++
    }
  })

  // 构建每日数据
  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      count: dayCounts[d],
      isToday: year === nowY && month === nowM && d === nowM ? false : false,
    })
  }

  // 标记今天
  if (year === nowY && month === nowM) {
    const { d: todayDay } = getBeijingDateParts(now)
    const todayEntry = days.find(e => e.day === todayDay)
    if (todayEntry) todayEntry.isToday = true
  }

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

  return NextResponse.json({
    ok: true,
    data: {
      year,
      month,
      label: `${year}年${monthNames[month - 1]}`,
      days,
      total: entries.length,
    },
  })
}
