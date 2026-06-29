// 生成6位数字验证码
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 生成随机Token
export function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
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

// 计算连续记录天数
export function calcStreak(dates: Date[]): { streak: number; maxStreak: number } {
  if (!dates.length) return { streak: 0, maxStreak: 0 }
  const sorted = [...new Set(dates.map(d => formatDate(d)))].sort().reverse()
  let streak = 1, maxStreak = 1, cur = 1
  const today = formatDate(new Date())
  if (sorted[0] !== today) return { streak: 0, maxStreak: calcMaxStreak(sorted) }
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (Math.round(diff) === 1) { cur++; streak = cur }
    else cur = 1
    maxStreak = Math.max(maxStreak, cur)
  }
  return { streak, maxStreak }
}

function calcMaxStreak(sorted: string[]): number {
  let max = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diff === 1) { cur++; max = Math.max(max, cur) }
    else cur = 1
  }
  return max
}
