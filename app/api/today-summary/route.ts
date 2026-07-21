import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBeijingDateParts, beijingDayStart, beijingTodayStart, beijingWeekStart, beijingDateString } from "@/lib/utils"

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
    prisma.entry.findMany({ where: { userId, isDraft: false, recordTime: { gte: new Date(Date.now() - 90 * 86400000) } }, select: { recordTime: true }, orderBy: { recordTime: "desc" } }),
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

