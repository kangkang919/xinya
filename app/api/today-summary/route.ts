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
  const { y, m, d: day } = getBeijingDateParts(d)
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
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
  const recordDates = [...new Set(allEntries.map(e => beijingDateString(new Date(e.recordTime))))].sort().reverse()
  const todayStr = beijingDateString(now)
  const yesterdayStr = beijingDateString(new Date(now.getTime() - 86400000))

  let streak = 0
  let maxStreak = 0
  let currentRun = 0
  let prevKey = ""

  for (let i = 0; i < recordDates.length; i++) {
    const curr = recordDates[i]
    if (i === 0) {
      // 当前连续段必须从"今天"或"昨天"开始，才算有效
      if (curr === todayStr || curr === yesterdayStr) {
        currentRun = 1
      }
    } else {
      const [py, pm, pd] = prevKey.split("-").map(Number)
      const [cy, cm, cd] = curr.split("-").map(Number)
      const prevMs = Date.UTC(py, pm - 1, pd)
      const currMs = Date.UTC(cy, cm - 1, cd)
      const diff = Math.round((prevMs - currMs) / 86400000)
      if (diff === 1) {
        currentRun++
      } else {
        // 历史段中断，计算最长连续
        maxStreak = Math.max(maxStreak, currentRun)
        currentRun = 1
      }
    }
    maxStreak = Math.max(maxStreak, currentRun)
    prevKey = curr
  }

  // streak：最近一次有效连续段（必须包含今天或昨天）
  streak = recordDates.length > 0 && (recordDates[0] === todayStr || recordDates[0] === yesterdayStr)
    ? currentRun
    : 0

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

