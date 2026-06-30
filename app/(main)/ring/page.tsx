"use client"
import { useEffect, useState } from "react"

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

function cellColor(count: number): string {
  if (count === 0) return "transparent"
  if (count === 1) return "#C5E1A5"
  if (count === 2) return "#8BC34A"
  return "#558B2F"
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// 获取某月第一天是星期几（周一=0, 周日=6）
function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(Date.UTC(year, month - 1, 1, 4, 0, 0)).getUTCDay()
  return (d + 6) % 7
}

// 构建月历网格：7行 x N列
function buildMonthGrid(days: DayData[], year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = getFirstDayOfWeek(year, month) // 0=Mon, 6=Sun
  const totalCells = firstDow + daysInMonth
  const weeks = Math.ceil(totalCells / 7)

  // 创建 day 索引 map
  const dayMap = new Map(days.map(d => [d.day, d]))

  const grid: (DayData | null)[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: (DayData | null)[] = []
    for (let r = 0; r < 7; r++) {
      const cellIndex = w * 7 + r
      const dayNum = cellIndex - firstDow + 1
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        col.push(dayMap.get(dayNum) || { day: dayNum, count: 0, isToday: false })
      } else {
        col.push(null)
      }
    }
    grid.push(col)
  }
  return grid
}

export default function RingPage() {
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
  const [hoveredDay, setHoveredDay] = useState<{ day: number; count: number; x: number; y: number } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/monthly-stats?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setStats(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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

  if (loading || !stats) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold" style={{ color: "#333" }}>
            <span style={{ color: "#8BC34A", display: "inline-block", width: "1.4em", textAlign: "center" }}>🌀</span>年轮
          </h1>
        </div>
        <p className="text-xs mb-5" style={{ color: "#bbb" }}>感受心得生长的节律</p>
        <div className="text-center py-16">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm" style={{ color: "#bbb" }}>加载中…</p>
        </div>
      </div>
    )
  }

  const grid = buildMonthGrid(stats.days, year, month)
  const hasRecords = stats.total > 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: "#333" }}>
          <span style={{ color: "#8BC34A", display: "inline-block", width: "1.4em", textAlign: "center" }}>🌀</span>年轮
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: "#bbb" }}>感受心得生长的节律</p>

      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={goPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ color: "#8BC34A", background: "rgba(139,195,74,0.08)" }}
        >
          ‹
        </button>
        <span className="text-sm font-medium" style={{ color: "#333" }}>
          {stats.label}
          {isCurrentMonth && (
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(139,195,74,0.15)", color: "#8BC34A" }}>
              今
            </span>
          )}
        </span>
        <button
          onClick={goNext}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ color: "#8BC34A", background: "rgba(139,195,74,0.08)" }}
        >
          ›
        </button>
      </div>

      {/* 热力图 */}
      <div
        className="p-4 rounded-xl mb-4 relative"
        style={{ background: "#fff", border: "1px solid #eee" }}
      >
        {!hasRecords ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm" style={{ color: "#bbb" }}>这个月还没有种下任何心得</p>
          </div>
        ) : (
          <>
            {/* 星期标签 */}
            <div className="flex mb-1">
              <div style={{ width: "20px" }} />
              {grid.map((_, wi) => (
                <div key={wi} style={{ width: "14px" }} />
              ))}
            </div>

            {/* 热力格子 + 行标签 */}
            <div className="flex">
              {/* 星期行标签 */}
              <div className="flex flex-col mr-1" style={{ width: "20px" }}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <div key={i} className="flex items-center justify-end text-xs" style={{ height: "14px", color: "#bbb", fontSize: "10px" }}>
                    {i % 2 === 0 ? label : ""}
                  </div>
                ))}
              </div>

              {/* 格子区域 */}
              <div className="flex gap-[3px]">
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => {
                      if (!day) {
                        return <div key={di} style={{ width: "14px", height: "14px" }} />
                      }
                      const isToday = day.isToday
                      return (
                        <div
                          key={di}
                          className="rounded-sm relative"
                          style={{
                            width: "14px",
                            height: "14px",
                            background: isToday ? "#8BC34A" : cellColor(day.count),
                            border: isToday ? "1.5px solid #558B2F" : "none",
                            cursor: day.count > 0 ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) => {
                            if (day.count > 0 || isToday) {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setHoveredDay({
                                day: day.day,
                                count: day.count,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              })
                            }
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          {isToday && (
                            <span
                              className="absolute -top-4 left-1/2 -translate-x-1/2 text-center"
                              style={{ fontSize: "8px", color: "#558B2F", fontWeight: "bold", whiteSpace: "nowrap" }}
                            >
                              今
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-end gap-1 mt-3">
              <span className="text-xs" style={{ color: "#bbb", fontSize: "10px" }}>少</span>
              {["transparent", "#C5E1A5", "#8BC34A", "#558B2F"].map((c, i) => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{
                    width: "12px",
                    height: "12px",
                    background: c,
                    border: c === "transparent" ? "1px solid #eee" : "none",
                  }}
                />
              ))}
              <span className="text-xs" style={{ color: "#bbb", fontSize: "10px" }}>多</span>
            </div>
          </>
        )}

        {/* 悬浮气泡 */}
        {hoveredDay && (
          <div
            className="fixed z-50 px-2 py-1 rounded text-xs pointer-events-none"
            style={{
              left: `${hoveredDay.x}px`,
              top: `${hoveredDay.y - 28}px`,
              transform: "translateX(-50%)",
              background: "#333",
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            {stats.year}年{stats.month}月{hoveredDay.day}日 · {hoveredDay.count}篇
          </div>
        )}
      </div>

      {/* 月度统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: "rgba(139,195,74,0.08)" }}
        >
          <p className="text-xl font-bold" style={{ color: "#8BC34A" }}>{stats.total}</p>
          <p className="text-xs" style={{ color: "#999" }}>本月篇数</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: "rgba(66,165,245,0.08)" }}
        >
          <p className="text-xl font-bold" style={{ color: "#42A5F5" }}>
            {stats.days.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs" style={{ color: "#999" }}>记录天数</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: "rgba(255,140,66,0.08)" }}
        >
          <p className="text-xl font-bold" style={{ color: "#FF8C42" }}>
            {stats.days.filter(d => d.count > 0).length > 0
              ? (stats.total / stats.days.filter(d => d.count > 0).length).toFixed(1)
              : "0"}
          </p>
          <p className="text-xs" style={{ color: "#999" }}>日均篇数</p>
        </div>
      </div>
    </div>
  )
}
"use client"
import { useEffect, useRef, useState } from "react"

interface DayData {
  date: string   // 'YYYY-MM-DD'
  count: number
}

function cellColor(count: number): string {
  if (count === 0) return '#f0f0f0'
  if (count <= 2) return '#c5e1a5'
  if (count <= 5) return '#8BC34A'
  return '#558b2f'
}

function buildHeatmap(entries: { recordTime: string }[]): { weeks: DayData[][]; months: { label: string; weekIndex: number }[] } {
  const today = new Date()
  const start = new Date(today)
  start.setFullYear(today.getFullYear() - 1)
  start.setDate(start.getDate() + 1)

  // 统计每天的数量
  const countMap: Record<string, number> = {}
  entries.forEach(e => {
    const d = new Date(e.recordTime)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    countMap[key] = (countMap[key] || 0) + 1
  })

  const weeks: DayData[][] = []
  const months: { label: string; weekIndex: number }[] = []

  // 从 start 开始按周构建
  const cur = new Date(start)
  // 对齐到当周起始（周日）
  const startDow = cur.getDay() // 0=Sun
  cur.setDate(cur.getDate() - startDow)

  let weekIdx = 0
  let lastMonth = -1

  while (cur <= today) {
    const week: DayData[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      const inRange = cur >= start && cur <= today
      week.push({
        date: inRange ? dateStr : '',
        count: inRange ? (countMap[dateStr] || 0) : -1,
      })
      if (inRange && cur.getDate() <= 7 && cur.getMonth() !== lastMonth) {
        months.push({ label: `${cur.getMonth() + 1}月`, weekIndex: weekIdx })
        lastMonth = cur.getMonth()
      }
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    weekIdx++
  }

  return { weeks, months }
}

export default function RingPage() {
  const [entries, setEntries] = useState<{ recordTime: string }[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const heatmapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && heatmapRef.current) {
      heatmapRef.current.scrollLeft = heatmapRef.current.scrollWidth
    }
  }, [loading])

  useEffect(() => {
    // 获取全部心得（只需 recordTime）
    fetch('/api/entries?limit=1000')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setEntries(data.data.entries || [])
          if (data.data.total !== undefined) setTotal(data.data.total)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const { weeks, months } = buildHeatmap(entries)

  const activeDays = new Set(entries.map(e => {
    const d = new Date(e.recordTime)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size
  const avgPerDay = activeDays > 0 ? (total / activeDays).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold" style={{ color: '#333' }}>
            <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌀</span>年轮
          </h1>
        </div>
        <p className="text-xs mb-5" style={{ color: '#bbb' }}>岁月如轮，每一天都留下印记</p>
        <div className="text-center py-16">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm" style={{ color: '#bbb' }}>加载中…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: '#333' }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌀</span>年轮
        </h1>
      </div>
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs" style={{ color: '#bbb' }}>岁月如轮，每一天都留下印记</p>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none" style={{ color: '#8BC34A' }}>{total}</p>
          <p className="text-xs" style={{ color: '#bbb' }}>篇心得</p>
        </div>
      </div>

      {/* 热力图 */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{ background: '#fff', border: '1px solid #eee' }}
      >
        {/* 月份标签 */}
        <div className="flex gap-1 text-xs mb-2 overflow-hidden" style={{ color: '#bbb' }}>
          {months.map((m, i) => (
            <span
              key={i}
              className="text-center"
              style={{ flex: '1 0 auto', minWidth: '24px' }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* 热力格子 */}
        <div className="flex gap-0.5 overflow-x-auto" ref={heatmapRef}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="rounded-sm"
                  title={day.date ? `${day.date}: ${day.count}篇` : ''}
                  style={{
                    width: '11px',
                    height: '11px',
                    background: day.count < 0 ? 'transparent' : cellColor(day.count),
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-xs" style={{ color: '#bbb' }}>少</span>
          {['#f0f0f0', '#c5e1a5', '#8BC34A', '#558b2f'].map(c => (
            <div key={c} className="rounded-sm" style={{ width: '11px', height: '11px', background: c }} />
          ))}
          <span className="text-xs" style={{ color: '#bbb' }}>多</span>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'rgba(139,195,74,0.08)' }}
        >
          <p className="text-xl font-bold" style={{ color: '#8BC34A' }}>{activeDays}</p>
          <p className="text-xs" style={{ color: '#999' }}>记录天数</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'rgba(66,165,245,0.08)' }}
        >
          <p className="text-xl font-bold" style={{ color: '#42A5F5' }}>{total}</p>
          <p className="text-xs" style={{ color: '#999' }}>心得总数</p>
        </div>
        <div
          className="p-3 rounded-xl text-center"
          style={{ background: 'rgba(255,140,66,0.08)' }}
        >
          <p className="text-xl font-bold" style={{ color: '#FF8C42' }}>{avgPerDay}</p>
          <p className="text-xs" style={{ color: '#999' }}>日均篇数</p>
        </div>
      </div>
    </div>
  )
}

