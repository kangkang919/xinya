import { randomBytes, randomInt } from "crypto"

// 开发环境专用日志（生产环境静默，避免泄漏调试信息）
export const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") console.log(...args)
}

// 生成6位数字验证码（密码学安全）
export function generateCode(): string {
  return randomInt(100000, 1000000).toString()
}

// 生成随机Token（密码学安全）
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

// 去掉HTML标签，得到纯文本预览
export function stripHtml(html: string, maxLen = 80): string {
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
}

// 格式化日期（如 2026-06-21）
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split("T")[0]
}

// 判断两个日期是否同一天
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ========== 北京时间工具函数 ==========
const BEIJING_TZ = "Asia/Shanghai"

export function getBeijingDateParts(d: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || "0")
  return { y: get("year"), m: get("month"), d: get("day") }
}

// 北京时间某天 0:00 对应的 UTC 时间点
export function beijingDayStart(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day, 16, 0, 0) - 86400000)
}

export function beijingTodayStart(d: Date): Date {
  const { y, m, d: day } = getBeijingDateParts(d)
  return beijingDayStart(y, m, day)
}

export function getBeijingDayOfWeek(y: number, m: number, day: number): number {
  return new Date(Date.UTC(y, m - 1, day, 4, 0, 0)).getUTCDay()
}

export function beijingWeekStart(d: Date): Date {
  const { y, m, d: day } = getBeijingDateParts(d)
  const dayOfWeek = getBeijingDayOfWeek(y, m, day)
  const daysFromMonday = (dayOfWeek + 6) % 7
  const todayStart = beijingDayStart(y, m, day)
  return new Date(todayStart.getTime() - daysFromMonday * 86400000)
}

export function beijingDateString(d: Date): string {
  const { y, m, d: day } = getBeijingDateParts(d)
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
