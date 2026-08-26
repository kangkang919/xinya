"use client"
import { useState, useEffect, useRef } from "react"

interface Tag { id: string; name: string }
interface SearchResult {
  id: string
  title: string
  contentPreview: string
  tags: Tag[]
  recordTime: string
}

const RELATION_TYPES = [
  { type: "sequence", label: "串行", icon: "→", color: "#42A5F5", desc: "先理解A再看B" },
  { type: "hierarchy", label: "总分", icon: "⑂", color: "#8BC34A", desc: "A是B的子话题" },
  { type: "related", label: "关联", icon: "↔", color: "#FF8C42", desc: "有联系无层级" },
  { type: "insight", label: "启发", icon: "💡", color: "#AB47BC", desc: "读A时想到了B" },
]

interface Props {
  currentEntryId: string
  isDark: boolean
  onClose: () => void
  onCreated: () => void
}

export default function LinkSearchModal({ currentEntryId, isDark, onClose, onCreated }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<SearchResult | null>(null)
  const [selectedType, setSelectedType] = useState<string>("")
  const [note, setNote] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const bgColor = isDark ? "#1E1E1E" : "#FAFAF5"
  const cardBg = isDark ? "#2A2A2A" : "#fff"
  const titleColor = isDark ? "#E0E0E0" : "#333"
  const subColor = isDark ? "#999" : "#999"
  const dimColor = isDark ? "#666" : "#bbb"
  const borderColor = isDark ? "#444" : "#eee"

  // 自动聚焦
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 搜索防抖
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/entries?search=${encodeURIComponent(query.trim())}&limit=10`)
        const data = await res.json()
        if (data.ok) {
          // 排除当前心得
          setResults(data.data.entries.filter((e: SearchResult) => e.id !== currentEntryId))
        }
      } catch { /* ignore */ }
      setSearching(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, currentEntryId])

  async function handleCreate() {
    if (!selectedEntry || !selectedType || creating) return
    setCreating(true)
    setError("")
    try {
      const res = await fetch(`/api/entries/${currentEntryId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEntryId: selectedEntry.id,
          relationType: selectedType,
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        onCreated()
        onClose()
      } else {
        setError(data.error || "创建失败")
      }
    } catch {
      setError("网络错误")
    }
    setCreating(false)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.5)" }}>
      {/* 点击遮罩关闭 */}
      <div className="flex-1" onClick={onClose} />

      {/* 底部面板 */}
      <div
        className="rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden"
        style={{ background: bgColor, borderTop: `1px solid ${borderColor}` }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span className="text-sm font-medium" style={{ color: titleColor }}>联想关联</span>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg" style={{ color: subColor }}>
            收起
          </button>
        </div>

        {/* 已选心得 → 显示关系选择 */}
        {selectedEntry ? (
          <div className="p-4 flex-1 overflow-y-auto">
            {/* 已选心得 */}
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: titleColor }}>{selectedEntry.title}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: subColor }}>{selectedEntry.contentPreview}</p>
              </div>
              <button onClick={() => { setSelectedEntry(null); setSelectedType(""); setNote("") }} className="text-xs flex-shrink-0" style={{ color: "#e57373" }}>
                重选
              </button>
            </div>

            {/* 关系类型选择 */}
            <p className="text-xs mb-2" style={{ color: subColor }}>选择关系类型</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {RELATION_TYPES.map(rt => (
                <button
                  key={rt.type}
                  onClick={() => setSelectedType(rt.type)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: selectedType === rt.type ? `${rt.color}15` : cardBg,
                    border: `2px solid ${selectedType === rt.type ? rt.color : borderColor}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span style={{ color: rt.color, fontSize: 16 }}>{rt.icon}</span>
                    <span className="text-sm font-medium" style={{ color: titleColor }}>{rt.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: subColor }}>{rt.desc}</p>
                </button>
              ))}
            </div>

            {/* 备注 */}
            <input
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 50))}
              placeholder="备注（可选，≤50字）"
              className="w-full px-3 py-2 text-sm rounded-xl outline-none mb-3"
              style={{ border: `1.5px solid ${borderColor}`, background: "transparent", color: titleColor }}
            />

            {error && <p className="text-xs mb-2" style={{ color: "#e57373" }}>{error}</p>}

            {/* 确认按钮 */}
            <button
              onClick={handleCreate}
              disabled={!selectedType || creating}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition"
              style={{ background: (!selectedType || creating) ? "#aaa" : "#8BC34A" }}
            >
              {creating ? "创建中…" : "确认关联"}
            </button>
          </div>
        ) : (
          /* 搜索阶段 */
          <div className="flex-1 overflow-y-auto">
            {/* 搜索框 */}
            <div className="p-4 pb-2">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索心得标题或内容…"
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{ border: `1.5px solid ${borderColor}`, background: isDark ? "#333" : "#fafaf5", color: titleColor }}
              />
            </div>

            {/* 搜索结果 */}
            <div className="px-4 pb-4">
              {searching ? (
                <p className="text-xs text-center py-6" style={{ color: dimColor }}>搜索中…</p>
              ) : results.length === 0 && query.trim() ? (
                <p className="text-xs text-center py-6" style={{ color: dimColor }}>没有找到相关心得</p>
              ) : !query.trim() ? (
                <p className="text-xs text-center py-6" style={{ color: dimColor }}>输入关键词搜索心得</p>
              ) : (
                <div className="space-y-2">
                  {results.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="w-full text-left p-3 rounded-xl transition"
                      style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                    >
                      <p className="text-sm font-medium truncate" style={{ color: titleColor }}>{entry.title}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: subColor }}>{entry.contentPreview}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {entry.tags.map(t => (
                          <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,195,74,0.1)", color: "#5a8a2f" }}>
                            {t.name}
                          </span>
                        ))}
                        <span className="text-[10px]" style={{ color: dimColor }}>{formatDate(entry.recordTime)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
