import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// 统一按北京时间统计
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

// 北京时间某天 0:00 对应的 UTC 时间点
function beijingDayStart(y: number, m: number, day: number): Date {
  // 北京时间 = UTC + 8，所以北京时间 0:00 等于 UTC 前一天 16:00
  return new Date(Date.UTC(y, m - 1, day, 16, 0, 0) - 86400000)
}

function beijingTodayStart(d: Date): Date {
  const { y, m, d: day } = getBeijingDateParts(d)
  return beijingDayStart(y, m, day)
}

function getBeijingDayOfWeek(y: number, m: number, day: number): number {
  // 用北京时间中午12点对应的 UTC 时刻取星期几，避免跨日边界误差
  // 北京时间 12:00 = UTC 当日 04:00
  return new Date(Date.UTC(y, m - 1, day, 4, 0, 0)).getUTCDay()
}

function beijingWeekStart(d: Date): Date {
  const { y, m, d: day } = getBeijingDateParts(d)
  const dayOfWeek = getBeijingDayOfWeek(y, m, day)
  // 周一为本周第一天：周日 -> 回退 6 天，周一 -> 0
  const daysFromMonday = (dayOfWeek + 6) % 7
  const todayStart = beijingDayStart(y, m, day)
  return new Date(todayStart.getTime() - daysFromMonday * 86400000)
}

function beijingDateString(d: Date): string {
  return d.toLocaleDateString("zh-CN", { timeZone: TIMEZONE })
}

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const now = new Date()
  const todayStart = beijingTodayStart(now)
  const weekStart = beijingWeekStart(now)

  // 并行查询
  const [todayEntries, weekEntries, allEntries, lastEntry] = await Promise.all([
    prisma.entry.findMany({ where: { userId, isDraft: false, recordTime: { gte: todayStart } }, select: { id: true } }),
    prisma.entry.findMany({ where: { userId, isDraft: false, recordTime: { gte: weekStart } }, select: { id: true } }),
    prisma.entry.findMany({ where: { userId, isDraft: false }, select: { recordTime: true }, orderBy: { recordTime: "desc" } }),
    prisma.entry.findFirst({ where: { userId, isDraft: false }, select: { title: true }, orderBy: { recordTime: "desc" } }),
  ])

  // 计算连续天数（基于北京日期）
  const sortedDates = [...new Set(allEntries.map(e => beijingDateString(new Date(e.recordTime))))]
    .sort()
    .reverse()

  let streak = 0
  let maxStreak = 0
  let cur = 0
  const todayStr = beijingDateString(now)
  for (let i = 0; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]
    const curr = sortedDates[i]
    if (i === 0 && curr === todayStr) { cur = 1 }
    else if (i > 0) {
      const [py, pm, pd] = prev.split(/[-/]/).map(Number)
      const [cy, cm, cd] = curr.split(/[-/]/).map(Number)
      const pMs = Date.UTC(py, pm - 1, pd)
      const cMs = Date.UTC(cy, cm - 1, cd)
      const diff = Math.round((pMs - cMs) / 86400000)
      if (diff === 1) { cur++; streak = Math.max(streak, cur) }
      else cur = 1
    }
    maxStreak = Math.max(maxStreak, cur)
  }
  streak = cur

  return NextResponse.json({
    ok: true,
    data: {
      todayCount: todayEntries.length,
      weekCount: weekEntries.length,
      streak,
      maxStreak,
      lastEntry,
    }
  })
}
