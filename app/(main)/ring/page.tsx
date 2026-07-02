"use client"
import { useEffect, useState } from "react"
import { useTheme } from "@/lib/useTheme"

interface DayData {
  day: number
  count: number
  isToday: boolean
}

interface MonthStats {
  year: number
  month: number
  label: string
  days: DayData[]
  total: number
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"]

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// 获取某月第一天是星期几（周一=0, 周日=6）
function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0)).getUTCDay()
  return (d + 6) % 7
}

function cellLevel(count: number): string {
  if (count === 0) return "empty"
  if (count === 1) return "level-1"
  if (count === 2) return "level-2"
  return "level-3"
}

export default function RingPage() {
  const { isDark, cardBg, cardBorder, titleColor, dimColor } = useTheme()
  const now = new Date()
  const nowParts = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now)
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || "0")
    return { y: get("year"), m: get("month"), d: get("day") }
  })()

  const [year, setYear] = useState(nowParts.y)
  const [month, setMonth] = useState(nowParts.m)
  const [stats, setStats] = useState<MonthStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [entryCount, setEntryCount] = useState(0)
  const [reviewEnabled, setReviewEnabled] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setTooltip(null)
    fetch(`/api/monthly-stats?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setStats(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // 获取拾遗设置和累计篇数
    fetch('/api/review/settings')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setEntryCount(data.data.entryCount)
          setReviewEnabled(data.data.reviewEnabled)
        }
      })
      .catch(() => {})
  }, [year, month])

  const goPrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const goNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === nowParts.y && month === nowParts.m

  // 构建日历网格数据
  const buildCalendarDays = (): { day: number; count: number; isToday: boolean; isCurrentMonth: boolean }[] => {
    if (!stats) return []
    const daysInMonth = getDaysInMonth(year, month)
    const firstDow = getFirstDayOfWeek(year, month) // 0=Mon
    const dayMap = new Map(stats.days.map(d => [d.day, d]))

    const cells: { day: number; count: number; isToday: boolean; isCurrentMonth: boolean }[] = []

    // 上月补位
    const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1)
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, count: 0, isToday: false, isCurrentMonth: false })
    }

    // 当月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = dayMap.get(d)
      cells.push({
        day: d,
        count: dayData?.count ?? 0,
        isToday: dayData?.isToday ?? false,
        isCurrentMonth: true,
      })
    }

    // 下月补位（补齐到整周）
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, count: 0, isToday: false, isCurrentMonth: false })
      }
    }

    return cells
  }

  if (loading || !stats) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold" style={{ color: titleColor }}>
            <span style={{ color: "#8BC34A", display: "inline-block", width: "1.4em", textAlign: "center" }}>🌀</span>年轮
          </h1>
        </div>
        <p className="text-xs mb-5" style={{ color: dimColor }}>感受心得生长的节律</p>
        <div className="text-center py-16">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm" style={{ color: "#bbb" }}>加载中…</p>
        </div>
      </div>
    )
  }

  async function toggleReview() {
    if (entryCount < 20) return
    setReviewLoading(true)
    try {
      const res = await fetch('/api/review/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewEnabled: !reviewEnabled }),
      })
      const data = await res.json()
      if (data.ok) {
        setReviewEnabled(!reviewEnabled)
      }
    } catch (_) {}
    setReviewLoading(false)
  }

  const calendarDays = buildCalendarDays()
  const hasRecords = stats.total > 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <h1 className="text-xl font-bold mb-1" style={{ color: titleColor }}>
        <span style={{ color: "#8BC34A", display: "inline-block", width: "1.4em", textAlign: "center" }}>🌀</span>年轮
      </h1>
      <p className="text-xs mb-5" style={{ color: dimColor }}>感受心得生长的节律</p>

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={goPrev}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ color: "#8BC34A", background: "rgba(139,195,74,0.1)", border: "none", fontSize: "20px", cursor: "pointer" }}
        >
          ‹
        </button>
        <span className="text-base font-semibold" style={{ color: titleColor, display: "flex", alignItems: "center", gap: "8px" }}>
          {stats.label}
          {isCurrentMonth && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,195,74,0.12)", color: "#8BC34A", fontWeight: 500 }}>
              今
            </span>
          )}
        </span>
        <button
          onClick={goNext}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ color: "#8BC34A", background: "rgba(139,195,74,0.1)", border: "none", fontSize: "20px", cursor: "pointer" }}
        >
          ›
        </button>
      </div>

      {/* 日历卡片 */}
      <div className="rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}`, padding: "16px 12px 12px" }}>
        {/* 星期标题 */}
        <div className="grid mb-2" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-xs" style={{ color: "#bbb", fontWeight: 500, fontSize: "12px" }}>
              {label}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
              {calendarDays.map((cell, idx) => {
                const level = cellLevel(cell.count)
                const isToday = cell.isToday

                let cellClass = "day-cell relative flex items-center justify-center rounded-md"
                let cellStyle: React.CSSProperties = {
                  aspectRatio: "1",
                  cursor: "default",
                  transition: "transform 0.15s",
                }

                if (!cell.isCurrentMonth) {
                  // 非当月 - 灰色
                  cellStyle.background = isDark ? "#252525" : "#f8f8f8"
                  cellStyle.color = isDark ? "#444" : "#ddd"
                } else if (cell.count === 0) {
                  // 当月无记录
                  cellStyle.background = isDark ? "#333" : "#fff"
                  cellStyle.border = `1.5px solid ${isDark ? "#555" : "#ddd"}`
                  cellStyle.color = isDark ? "#666" : "#999"
                } else {
                  // 当月有记录 - 颜色框
                  cellStyle.cursor = "pointer"
                  const colors: Record<string, string> = { "level-1": "#C5E1A5", "level-2": "#8BC34A", "level-3": "#558B2F" }
                  cellStyle.background = colors[level] || "#8BC34A"
                  cellStyle.color = "#fff"
                  cellStyle.fontWeight = 600
                }

                if (isToday) {
                  cellStyle.border = "2px solid #558B2F"
                }

                const handleClick = () => {
                  if (!cell.isCurrentMonth) return
                  if (cell.count === 0 && !isToday) return
                  setTooltip({
                    text: `${cell.day}日 · ${cell.count} 篇心得`,
                    x: 0,
                    y: 0,
                  })
                  // 2秒后自动消失
                  setTimeout(() => setTooltip(null), 2000)
                }

                return (
                  <div
                    key={idx}
                    className={cellClass}
                    style={cellStyle}
                    onClick={handleClick}
                  >
                    <span style={{ fontSize: "14px", lineHeight: 1, fontWeight: cell.isCurrentMonth && cell.count > 0 ? 600 : 400 }}>
                      {cell.day}
                    </span>
                    {isToday && (
                      <span
                        className="absolute"
                        style={{
                          top: "-2px",
                          right: "-2px",
                          fontSize: "8px",
                          color: "#558B2F",
                          fontWeight: 700,
                          background: isDark ? "#2A2A2A" : "#fff",
                          borderRadius: "50%",
                          width: "14px",
                          height: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        今
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-end gap-1 mt-3" style={{ padding: "0 4px" }}>
              <span style={{ fontSize: "11px", color: "#bbb" }}>少</span>
              <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: isDark ? "#333" : "#fff", border: `1.5px solid ${isDark ? "#555" : "#ddd"}` }} />
              <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#C5E1A5" }} />
              <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#8BC34A" }} />
              <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#558B2F" }} />
              <span style={{ fontSize: "11px", color: "#bbb" }}>多</span>
            </div>
      </div>

      {/* 点击气泡 */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded-lg text-sm pointer-events-none"
          style={{
            left: "50%",
            top: "45%",
            transform: "translate(-50%, -50%)",
            background: "#333",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* 月度统计 */}
      <div className="grid grid-cols-3 gap-3 mb-3" style={{ minHeight: "80px" }}>
        <div className="p-4 rounded-xl text-center" style={{ background: "rgba(139,195,74,0.08)" }}>
          <p className="text-2xl font-bold" style={{ color: "#8BC34A" }}>{stats.total}</p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>本月篇数</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: "rgba(66,165,245,0.08)" }}>
          <p className="text-2xl font-bold" style={{ color: "#42A5F5" }}>
            {stats.days.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>记录天数</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: "rgba(255,140,66,0.08)" }}>
          <p className="text-2xl font-bold" style={{ color: "#FF8C42" }}>
            {stats.days.filter(d => d.count > 0).length > 0
              ? (stats.total / stats.days.filter(d => d.count > 0).length).toFixed(1)
              : "0"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>日均篇数</p>
        </div>
      </div>

      {/* 累计篇数 */}
      <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: isDark ? '#aaa' : '#666' }}>累计篇数</span>
          <span className="text-lg font-bold" style={{ color: titleColor }}>{entryCount}</span>
        </div>
      </div>

      {/* 拾遗设置 */}
      <div className="p-4 rounded-xl" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: titleColor }}>拾遗</p>
            <p className="text-xs mt-1" style={{ color: dimColor }}>
              {entryCount < 20 ? `累计 ${20 - entryCount} 篇心得后可开启` : '每日回顾，温故知新'}
            </p>
          </div>
          <button
            onClick={toggleReview}
            disabled={reviewLoading || entryCount < 20}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition"
            style={{
              background: reviewEnabled ? '#8BC34A' : (isDark ? '#333' : '#f0f0f0'),
              color: reviewEnabled ? '#fff' : (entryCount < 20 ? '#999' : (isDark ? '#aaa' : '#666')),
              opacity: entryCount < 20 ? 0.5 : 1,
            }}
          >
            {reviewEnabled ? '已开启' : '开启'}
          </button>
        </div>
      </div>
    </div>
  )
}
