// 豆苗学习助手：用户统计概览（连续记录/记录习惯/标签分布）
import { prisma } from "@/lib/prisma"
import { getBeijingDateParts, beijingDayStart } from "@/lib/utils"

export interface UserStats {
  totalEntries: number
  monthlyEntries: number
  maxStreakDays: number
  avgWeeklyEntries: number
  peakHour: number // 0-23，最常记录的小时
  timeDistribution: { period: string; count: number }[] // 早/中/晚/夜
  tagDistribution: { tag: string; count: number }[] // Top 10
}

// 计算最长连续记录天数
async function calcMaxStreak(userId: string): Promise<number> {
  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    select: { recordTime: true },
    orderBy: { recordTime: "asc" },
  })
  if (entries.length === 0) return 0

  // 按北京时间日期去重
  const days = new Set<string>()
  entries.forEach(e => {
    const { y, m, d } = getBeijingDateParts(new Date(e.recordTime))
    days.add(`${y}-${m}-${d}`)
  })

  const sortedDays = Array.from(days).sort()
  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1])
    const curr = new Date(sortedDays[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

// 计算平均每周篇数
async function calcAvgWeekly(userId: string, totalEntries: number): Promise<number> {
  if (totalEntries === 0) return 0

  const firstEntry = await prisma.entry.findFirst({
    where: { userId, isDraft: false },
    select: { recordTime: true },
    orderBy: { recordTime: "asc" },
  })
  if (!firstEntry) return 0

  const now = new Date()
  const daysSinceFirst = Math.ceil((now.getTime() - new Date(firstEntry.recordTime).getTime()) / 86400000)
  const weeks = Math.max(1, Math.ceil(daysSinceFirst / 7))
  return Math.round((totalEntries / weeks) * 10) / 10
}

// 计算最常记录时间段
async function calcPeakHour(userId: string): Promise<number> {
  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    select: { recordTime: true },
  })
  if (entries.length === 0) return 9 // 默认上午 9 点

  const hourCounts = new Array(24).fill(0)
  entries.forEach(e => {
    const hour = new Date(e.recordTime).getHours() // 用服务器时间（通常与北京时间一致）
    hourCounts[hour]++
  })

  let peakHour = 0
  let maxCount = 0
  hourCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count
      peakHour = hour
    }
  })

  return peakHour
}

// 计算记录时间分布（早/中/晚/夜）
async function calcTimeDistribution(userId: string): Promise<{ period: string; count: number }[]> {
  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    select: { recordTime: true },
  })
  if (entries.length === 0) return []

  const dist = { 早: 0, 中: 0, 晚: 0, 夜: 0 }
  entries.forEach(e => {
    const hour = new Date(e.recordTime).getHours()
    if (hour >= 6 && hour < 12) dist.早++
    else if (hour >= 12 && hour < 18) dist.中++
    else if (hour >= 18 && hour < 22) dist.晚++
    else dist.夜++
  })

  return Object.entries(dist).map(([period, count]) => ({ period, count }))
}

// 计算标签分布 Top 10
async function calcTagDistribution(userId: string): Promise<{ tag: string; count: number }[]> {
  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    include: { tags: true },
  })

  const tagMap = new Map<string, number>()
  entries.forEach(e => {
    e.tags.forEach(t => {
      tagMap.set(t.name, (tagMap.get(t.name) || 0) + 1)
    })
  })

  return Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// 获取用户统计概览
export async function getUserStats(userId: string): Promise<UserStats> {
  const totalEntries = await prisma.entry.count({ where: { userId, isDraft: false } })

  // 本月篇数
  const now = new Date()
  const { y, m } = getBeijingDateParts(now)
  const monthStart = beijingDayStart(y, m, 1)
  const nextMonthStart = beijingDayStart(y, m + 1, 1)
  const monthlyEntries = await prisma.entry.count({
    where: { userId, isDraft: false, recordTime: { gte: monthStart, lt: nextMonthStart } },
  })

  const [maxStreakDays, avgWeeklyEntries, peakHour, timeDistribution, tagDistribution] = await Promise.all([
    calcMaxStreak(userId),
    calcAvgWeekly(userId, totalEntries),
    calcPeakHour(userId),
    calcTimeDistribution(userId),
    calcTagDistribution(userId),
  ])

  return {
    totalEntries,
    monthlyEntries,
    maxStreakDays,
    avgWeeklyEntries,
    peakHour,
    timeDistribution,
    tagDistribution,
  }
}
