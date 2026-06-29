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
        <div className="flex items-start justify-between mb-1">
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
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: '#333' }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌀</span>年轮
        </h1>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: '#8BC34A' }}>{total}</p>
          <p className="text-xs" style={{ color: '#bbb' }}>篇心得</p>
        </div>
      </div>
      <p className="text-xs mb-5" style={{ color: '#bbb' }}>岁月如轮，每一天都留下印记</p>

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
