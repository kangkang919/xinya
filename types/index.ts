// 心情类型
export type MoodType = "happy" | "sad" | "calm" | "excited" | "worried"

// 主题类型
export type ThemeType = "spring" | "summer" | "autumn" | "winter"

// 心得卡片（列表展示用）
export interface EntryCard {
  id: string
  title: string
  contentPreview: string  // 纯文本预览，去掉HTML标签
  tags: { id: string; name: string }[]
  mood: MoodType | null
  recordTime: string
  isTop: boolean
  isFavorite: boolean
  isDraft: boolean
}

// 心得详情（编辑用）
export interface EntryDetail extends EntryCard {
  content: string  // 完整HTML富文本
}

// 标签
export interface TagItem {
  id: string
  name: string
  isDefault: boolean
  entryCount: number
}

// 今日速览数据
export interface TodaySummary {
  todayCount: number
  weekCount: number
  streak: number       // 连续天数
  maxStreak: number    // 历史最长连续
  lastEntry: { title: string } | null
}

// API 通用响应
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
