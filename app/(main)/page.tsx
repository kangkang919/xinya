"use client"
import { useState, useEffect, useCallback } from "react"
import { Search, Bookmark, Filter, ChevronDown, Sprout as SproutIcon, X } from "lucide-react"
import { EntryCard } from "@/components/EntryCard"
import { DeleteDialog } from "@/components/DeleteDialog"
import ReviewCard from "@/components/review-card"
import { useTheme } from "@/lib/useTheme"
import toast from "react-hot-toast"

interface Entry {
  id: string
  title: string
  contentPreview: string
  tags: { id: string; name: string }[]
  mood: string | null
  recordTime: string
  isTop: boolean
  isFavorite: boolean
  isDraft: boolean
}

interface Summary {
  todayCount: number
  weekCount: number
  streak: number
  maxStreak: number
  lastEntry: { title: string } | null
}

// 时间快捷选项
const TIME_SHORTCUTS = [
  { label: "今天",   from: () => { const d = new Date(); return d.toISOString().split("T")[0] }, to: () => { const d = new Date(); return d.toISOString().split("T")[0] } },
  { label: "昨天",   from: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split("T")[0] }, to: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split("T")[0] } },
  { label: "本周",   from: () => { const d = new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().split("T")[0] }, to: () => new Date().toISOString().split("T")[0] },
  { label: "本月",   from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0] }, to: () => new Date().toISOString().split("T")[0] },
  { label: "近30天", from: () => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split("T")[0] }, to: () => new Date().toISOString().split("T")[0] },
]

export default function SproutPage() {
  const { isDark, cardBg, cardBorder, titleColor, dimColor, inputBg, inputBorder } = useTheme()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // 搜索和筛选
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")

  // 删除弹窗
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 今日速览折叠状态
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  // 拾遗卡片
  const [reviewCard, setReviewCard] = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(true)

  // 加载速览数据
  useEffect(() => {
    fetch("/api/today-summary")
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setSummary(d.data)
          // 如果今天已有记录，默认折叠速览
          if (d.data.todayCount > 0) setSummaryExpanded(false)
        }
      })
  }, [])

  // 加载拾遗卡片
  useEffect(() => {
    fetch('/api/review/today')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data) {
          setReviewCard(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setReviewLoading(false))
  }, [])

  // 加载心得列表
  const loadEntries = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({ page: String(pageNum), limit: "20" })
    if (search) params.set("search", search)
    if (favOnly) params.set("favorite", "true")
    if (timeFrom) params.set("from", timeFrom)
    if (timeTo) params.set("to", timeTo)

    try {
      const res = await fetch(`/api/entries?${params}`)
      const data = await res.json()
      if (data.ok) {
        if (append) {
          setEntries(prev => [...prev, ...data.data.entries])
        } else {
          setEntries(data.data.entries)
        }
        setTotal(data.data.total)
      }
    } catch {
      toast.error("加载失败")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, favOnly, timeFrom, timeTo])

  useEffect(() => {
    setPage(1)
    loadEntries(1)
  }, [loadEntries])

  function loadMore() {
    const next = page + 1
    setPage(next)
    loadEntries(next, true)
  }

  // 搜索提交
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setShowSearch(false)
    setPage(1)
    loadEntries(1)
  }

  // 清除时间筛选
  function clearTime() {
    setTimeFrom("")
    setTimeTo("")
  }

  // 删除心得
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/entries/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.ok) {
        toast.success("叶子已飘落 🍂")
        setEntries(prev => prev.filter(e => e.id !== deleteTarget.id))
        setTotal(prev => prev - 1)
        setDeleteTarget(null)
      } else {
        toast.error(data.error || "删除失败")
      }
    } catch {
      toast.error("删除失败")
    } finally {
      setDeleting(false)
    }
  }

  // 置顶/取消置顶
  async function handleTogglePin(id: string) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    try {
      await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTop: !entry.isTop }),
      })
      setEntries(prev => prev.map(e =>
        e.id === id ? { ...e, isTop: !e.isTop } : e
      ))
      toast.success(entry.isTop ? "已取消置顶" : "已置顶")
    } catch {
      toast.error("操作失败")
    }
  }

  // 收藏切换（从卡片组件回调）
  function handleToggleFavorite(id: string) {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
    ))
  }

  const hasActiveFilter = favOnly || timeFrom || timeTo

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* ===== 顶部标题栏 ===== */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: titleColor }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌱</span>萌芽
        </h1>
      </div>
      <div className="flex items-start justify-between mb-5">
        <p className="text-xs" style={{ color: dimColor }}>心之所向，芽之所生</p>
        <div className="flex items-center gap-2">
          {/* 收藏筛选 */}
          <button onClick={() => { setFavOnly(!favOnly); setPage(1) }}
            className="p-2 rounded-full transition"
            style={{ background: favOnly ? (isDark ? "rgba(255,183,77,0.2)" : "#FFF3E0") : "transparent" }}>
            <Bookmark size={20} color={favOnly ? "#FFB74D" : "#999"}
              fill={favOnly ? "#FFB74D" : "none"} />
          </button>
          {/* 搜索 */}
          <button onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full">
            <Search size={20} color={showSearch ? "#8BC34A" : "#999"} />
          </button>
          {/* 筛选 */}
          <button onClick={() => setShowFilter(!showFilter)}
            className="p-2 rounded-full relative">
            <Filter size={20} color={hasActiveFilter ? "#8BC34A" : "#999"} />
            {hasActiveFilter && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#8BC34A" }} />
            )}
          </button>
        </div>
      </div>
      {/* ===== 搜索栏 ===== */}
      {showSearch && (
        <form onSubmit={handleSearch} className="mb-4 animate-fade-in">
          <div className="flex gap-2">
            <input
              autoFocus
              className="input-sketch flex-1 px-4 py-2.5 text-sm outline-none"
              style={{ border: "1.5px solid #8BC34A", background: inputBg, color: titleColor }}
              placeholder="搜索心得标题或内容…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-sketch px-4 py-2.5 text-sm font-medium text-white"
              style={{ background: "#8BC34A" }}>
              搜索
            </button>
          </div>
        </form>
      )}

      {/* ===== 时间筛选栏 ===== */}
      {showFilter && (
        <div className="mb-4 animate-fade-in">
          <div className="flex gap-2 flex-wrap mb-2">
            {TIME_SHORTCUTS.map(s => (
              <button key={s.label}
                onClick={() => { setTimeFrom(s.from()); setTimeTo(s.to()); setPage(1); setShowFilter(false) }}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                style={{
                  borderColor: timeFrom === s.from() ? "#8BC34A" : inputBorder,
                  background: timeFrom === s.from() ? (isDark ? "rgba(139,195,74,0.2)" : "#e8f5e9") : (isDark ? "#333" : "#fff"),
                  color: timeFrom === s.from() ? "#8BC34A" : (isDark ? "#aaa" : "#666"),
                }}>
                {s.label}
              </button>
            ))}
          </div>
          {(timeFrom || timeTo) && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "#999" }}>
              <span>已选：{timeFrom || "…"} 至 {timeTo || "…"}</span>
              <button onClick={() => { clearTime(); setPage(1) }} className="underline"
                style={{ color: "#8BC34A" }}>
                清除
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== 今日速览 ===== */}
      {summary && (
        <div className="mb-4 card-sketch overflow-hidden"
          style={{ background: summaryExpanded ? (isDark ? "#1e3a1e" : "#e8f5e9") : "transparent", border: `1.5px solid ${isDark ? "#2d5a2d" : "#c8e6c9"}` }}>
          {summary.todayCount > 0 ? (
            // 已折叠为一行小字
            <button onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm">
              <span style={{ color: "#8BC34A" }}>
                今日已播种 🌱
                {summaryExpanded && <span className="text-xs ml-2" style={{ color: "#aaa" }}>
                  （{summary.todayCount}条 · 本周{summary.weekCount}条 · 连续{summary.streak}天）
                </span>}
              </span>
              <ChevronDown size={16} color="#8BC34A"
                style={{ transform: summaryExpanded ? "rotate(180deg)" : "rotate(0)", transition: "0.3s" }} />
            </button>
          ) : (
            // 今天还没记录，展开显示
            <button onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm">
              <span style={{ color: "#8BC34A" }}>
                今日速览
              </span>
              <ChevronDown size={16} color="#8BC34A"
                style={{ transform: summaryExpanded ? "rotate(180deg)" : "rotate(0)", transition: "0.3s" }} />
            </button>
          )}

          {summaryExpanded && (
            <div className="px-4 pb-4 animate-scroll-unfurl">
              {summary.todayCount === 0 ? (
                <p className="text-sm" style={{ color: "#8BC34A" }}>
                  今天的种子还没有落地，快来写第一条心得吧 🌿
                </p>
              ) : null}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#8BC34A" }}>{summary.todayCount}</div>
                  <div className="text-[10px]" style={{ color: "#999" }}>今日</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#8BC34A" }}>{summary.weekCount}</div>
                  <div className="text-[10px]" style={{ color: "#999" }}>本周</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#FF8C42" }}>{summary.streak}</div>
                  <div className="text-[10px]" style={{ color: "#999" }}>连续</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#795548" }}>{summary.maxStreak}</div>
                  <div className="text-[10px]" style={{ color: "#999" }}>最长</div>
                </div>
              </div>
              {summary.lastEntry && (
                <p className="text-xs mt-3 truncate" style={{ color: "#888" }}>
                  最近一篇：「{summary.lastEntry.title}」
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 心得列表 ===== */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl animate-bounce-gentle inline-block">🌱</div>
          <p className="text-sm mt-3" style={{ color: "#999" }}>正在生长…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-base font-bold mb-2" style={{ color: titleColor }}>
            {hasActiveFilter || search ? "没有找到匹配的叶子" : "这里还是一片空旷的土壤"}
          </h3>
          <p className="text-sm" style={{ color: isDark ? "#888" : "#999" }}>
            {hasActiveFilter || search ? "换个关键词试试？" : "点击底部的 + 按钮，播下第一颗种子吧"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <EntryCard key={entry.id} {...entry}
              isDark={isDark}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
            />
          ))}

          {/* 加载更多 */}
          {entries.length < total && (
            <button onClick={loadMore} disabled={loadingMore}
              className="w-full py-3 text-sm font-medium rounded-full border transition"
              style={{ borderColor: isDark ? "#444" : "#e0e0e0", color: "#8BC34A" }}>
              {loadingMore ? "加载中…" : `查看更多（还有${total - entries.length}条）`}
            </button>
          )}
        </div>
      )}

      {/* ===== 删除弹窗 ===== */}
      <DeleteDialog
        open={!!deleteTarget}
        title={deleteTarget?.title}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* ===== 拾遗卡片 ===== */}
      {reviewCard && (
        <ReviewCard
          card={reviewCard}
          onClose={() => setReviewCard(null)}
          onSkip={async () => {
            await fetch('/api/review/skip', { method: 'POST' })
            setReviewCard(null)
          }}
        />
      )}
    </div>
  )
}
