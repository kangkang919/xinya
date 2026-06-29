import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  // 并行查询
  const [todayEntries, weekEntries, allEntries, lastEntry] = await Promise.all([
    prisma.entry.findMany({ where: { userId, isDraft: false, recordTime: { gte: todayStart } }, select: { id: true } }),
    prisma.entry.findMany({ where: { userId, isDraft: false, recordTime: { gte: weekStart } }, select: { id: true } }),
    prisma.entry.findMany({ where: { userId, isDraft: false }, select: { recordTime: true }, orderBy: { recordTime: "desc" } }),
    prisma.entry.findFirst({ where: { userId, isDraft: false }, select: { title: true }, orderBy: { recordTime: "desc" } }),
  ])

  // 计算连续天数
  const dates = [...new Set(allEntries.map(e => {
    const d = new Date(e.recordTime)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))]
  const sortedDates = [...new Set(allEntries.map(e => {
    const d = new Date(e.recordTime)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  }))].sort().reverse()

  let streak = 0
  let maxStreak = 0
  let cur = 0
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  for (let i = 0; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]
    const curr = sortedDates[i]
    if (i === 0 && curr === todayStr) { cur = 1 }
    else if (i > 0) {
      const pd = new Date(prev)
      const cd = new Date(curr)
      const diff = Math.round((pd.getTime() - cd.getTime()) / 86400000)
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