"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"

interface ShareEntry {
  id: string
  title: string
  content: string
  mood: string | null
  recordTime: string
  tags: { id: string; name: string }[]
}

interface ShareTag {
  id: string
  name: string
  parentId: string | null
  entryCount: number
}

interface ShareData {
  owner: string
  scope: string
  expiresAt: string
  tags: ShareTag[]
  entries: ShareEntry[]
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "今天"
  if (diffDays === 1) return "昨天"
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  return `${Math.floor(diffDays / 30)}个月前`
}

function stripHtml(html: string, maxLen: number = 100): string {
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
}

// 时间轴视图
function TimelineView({ 
  entries, 
  onEntryClick 
}: { 
  entries: ShareEntry[]
  onEntryClick: (entry: ShareEntry) => void 
}) {
  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div
          key={entry.id}
          onClick={() => onEntryClick(entry)}
          className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
          style={{ 
            background: "#fff", 
            border: "1px solid #E8E8E0" 
          }}
        >
          <div className="flex items-start justify-between mb-1.5">
            <h3 className="text-[15px] font-semibold flex-1" style={{ color: "#333" }}>
              {entry.title}
            </h3>
            {entry.mood && <span className="text-lg ml-2">{entry.mood}</span>}
          </div>
          <p className="text-[13px] leading-relaxed mb-2.5 line-clamp-2" style={{ color: "#666" }}>
            {stripHtml(entry.content)}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {entry.tags.map(tag => (
                <span
                  key={tag.id}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "#F0F5E8", color: "#5a8a2f" }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <span className="text-[11px]" style={{ color: "#999" }}>
              {formatTimeAgo(entry.recordTime)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// 标签视图
function TagsView({ 
  tags, 
  entries, 
  onEntryClick 
}: { 
  tags: ShareTag[]
  entries: ShareEntry[]
  onEntryClick: (entry: ShareEntry) => void 
}) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [expandedParent, setExpandedParent] = useState<string | null>(null)

  // 顶级标签
  const topTags = tags.filter(t => !t.parentId)
  
  // 根据标签大小计算气泡尺寸
  const getTagSize = (count: number) => {
    if (count >= 10) return { width: 140, height: 48, fontSize: 15 }
    if (count >= 5) return { width: 110, height: 40, fontSize: 13 }
    return { width: 90, height: 34, fontSize: 12 }
  }

  // 选中标签下的心得
  const filteredEntries = selectedTagId
    ? entries.filter(e => e.tags.some(t => t.id === selectedTagId))
    : []

  const selectedTag = tags.find(t => t.id === selectedTagId)

  return (
    <div>
      {/* 标签云 */}
      <div className="flex flex-wrap gap-2 items-center justify-center py-3">
        {topTags.map(tag => {
          const size = getTagSize(tag.entryCount)
          const isSelected = selectedTagId === tag.id
          const isExpanded = expandedParent === tag.id
          const hasChildren = tags.some(t => t.parentId === tag.id)
          
          return (
            <div key={tag.id} className="relative">
              <button
                onClick={() => {
                  if (hasChildren) {
                    setExpandedParent(isExpanded ? null : tag.id)
                  }
                  setSelectedTagId(isSelected ? null : tag.id)
                }}
                className="rounded-full flex items-center justify-center transition-all"
                style={{
                  width: size.width,
                  height: size.height,
                  fontSize: size.fontSize,
                  fontWeight: 500,
                  background: isSelected ? "#8BC34A" : "#F0F5E8",
                  color: isSelected ? "#fff" : "#333",
                  border: isSelected ? "2px solid #558B2F" : "1.5px dashed #E8E8E0",
                }}
              >
                {tag.name}
                {hasChildren && (
                  <span className="ml-1 text-[10px]">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                )}
              </button>
              
              {/* 子标签 */}
              {hasChildren && isExpanded && (
                <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1.5 z-10">
                  {tags
                    .filter(t => t.parentId === tag.id)
                    .map(child => {
                      const childSelected = selectedTagId === child.id
                      return (
                        <button
                          key={child.id}
                          onClick={() => setSelectedTagId(childSelected ? null : child.id)}
                          className="rounded-full text-xs px-3 py-1.5 transition-all"
                          style={{
                            background: childSelected ? "#C5E1A5" : "#fff",
                            color: "#333",
                            border: childSelected ? "2px solid #8BC34A" : "1.5px dashed #E8E8E0",
                          }}
                        >
                          ↳ {child.name}
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 选中标签下的心得列表 */}
      {selectedTagId && selectedTag && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E8E8E0" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "#333" }}>
              {selectedTag.name}
            </span>
            <span className="text-xs" style={{ color: "#999" }}>
              {filteredEntries.length} 篇心得
            </span>
          </div>
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                onClick={() => onEntryClick(entry)}
                className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                style={{ background: "#fff", border: "1px solid #E8E8E0" }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-[15px] font-semibold flex-1" style={{ color: "#333" }}>
                    {entry.title}
                  </h3>
                  {entry.mood && <span className="text-lg ml-2">{entry.mood}</span>}
                </div>
                <p className="text-[13px] leading-relaxed mb-2 line-clamp-2" style={{ color: "#666" }}>
                  {stripHtml(entry.content)}
                </p>
                <span className="text-[11px]" style={{ color: "#999" }}>
                  {formatTimeAgo(entry.recordTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedTagId && (
        <div className="text-center py-8">
          <p className="text-[13px]" style={{ color: "#999" }}>
            👆 点击标签查看心得
          </p>
          <p className="text-xs mt-1" style={{ color: "#bbb" }}>
            带 ▸ 的标签可展开查看子标签
          </p>
        </div>
      )}
    </div>
  )
}

// 心得详情只读页
function EntryDetail({ 
  entry, 
  onBack 
}: { 
  entry: ShareEntry
  onBack: () => void 
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E8E8E0", background: "#fff" }}>
        <button 
          onClick={onBack}
          className="text-sm font-medium"
          style={{ color: "#8BC34A" }}
        >
          ← 返回
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#999", background: "#F5F5F0", border: "1px solid #E8E8E0" }}>
          只读
        </span>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "#999" }}>
            {formatTimeAgo(entry.recordTime)}
          </span>
          {entry.mood && <span className="text-lg">{entry.mood}</span>}
        </div>
        
        <h1 className="text-xl font-semibold mb-3 leading-snug" style={{ color: "#333" }}>
          {entry.title}
        </h1>
        
        <div className="flex gap-1.5 mb-4">
          {entry.tags.map(tag => (
            <span
              key={tag.id}
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: "#F0F5E8", color: "#5a8a2f" }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* 正文内容 */}
        <div 
          className="share-content text-sm leading-relaxed"
          style={{ color: "#333" }}
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
      </div>

      {/* 底部引导 */}
      <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid #E8E8E0", background: "#fff" }}>
        <p className="text-xs mb-1" style={{ color: "#999" }}>觉得好用？</p>
        <a href="/login" className="text-sm font-medium" style={{ color: "#8BC34A" }}>
          创建自己的心芽账户 →
        </a>
      </div>
    </div>
  )
}

// 链接失效页
function ExpiredPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-5xl mb-4">🍂</div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: "#333" }}>
        该分享链接已失效
      </h2>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        这片叶子已经随风飘落了
      </p>
      <a 
        href="/login" 
        className="text-sm font-medium px-6 py-2.5 rounded-full"
        style={{ background: "#8BC34A", color: "#fff" }}
      >
        创建自己的心芽账户
      </a>
    </div>
  )
}

// 主页面
function SharePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [view, setView] = useState<"timeline" | "tags">("timeline")
  const [selectedEntry, setSelectedEntry] = useState<ShareEntry | null>(null)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("链接无效")
      setLoading(false)
      return
    }

    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setShareData(data.data)
        } else {
          if (data.expired) {
            setIsExpired(true)
          } else {
            setError(data.error || "链接不存在")
          }
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false))
  }, [token])

  const handleViewSwitch = (newView: "timeline" | "tags") => {
    if (newView === view) return
    setTransitioning(true)
    setTimeout(() => {
      setView(newView)
      setTransitioning(false)
    }, 150)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#FAFAF5" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌱</div>
          <p className="text-sm" style={{ color: "#999" }}>加载中…</p>
        </div>
      </div>
    )
  }

  if (isExpired || error) {
    return (
      <div className="h-screen" style={{ background: "#FAFAF5" }}>
        <ExpiredPage />
      </div>
    )
  }

  if (!shareData) return null

  // 心得详情视图
  if (selectedEntry) {
    return (
      <div className="h-screen flex flex-col" style={{ background: "#FAFAF5" }}>
        <EntryDetail 
          entry={selectedEntry} 
          onBack={() => setSelectedEntry(null)} 
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "#FAFAF5" }}>
      {/* 顶部区域 */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid #E8E8E0", background: "#fff" }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold" style={{ color: "#333" }}>
            {shareData.owner.split("@")[0]}的心芽花园 🌱
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#999", background: "#F5F5F0", border: "1px solid #E8E8E0" }}>
            只读
          </span>
        </div>
        <p className="text-xs italic mb-3" style={{ color: "#999" }}>
          记录内心的每一次萌发
        </p>

        {/* 视图切换 */}
        <div className="flex rounded-xl p-0.5" style={{ background: "#F5F5F0" }}>
          <button
            onClick={() => handleViewSwitch("timeline")}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: view === "timeline" ? "#fff" : "transparent",
              color: view === "timeline" ? "#558B2F" : "#666",
              boxShadow: view === "timeline" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🌿 时间轴
          </button>
          <button
            onClick={() => handleViewSwitch("tags")}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: view === "tags" ? "#fff" : "transparent",
              color: view === "tags" ? "#558B2F" : "#666",
              boxShadow: view === "tags" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            🏷️ 标签
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ 
          opacity: transitioning ? 0 : 1, 
          transition: "opacity 0.15s ease" 
        }}
      >
        {view === "timeline" ? (
          <TimelineView 
            entries={shareData.entries} 
            onEntryClick={setSelectedEntry} 
          />
        ) : (
          <TagsView 
            tags={shareData.tags} 
            entries={shareData.entries} 
            onEntryClick={setSelectedEntry} 
          />
        )}
      </div>

      {/* 底部引导 */}
      <div className="px-5 py-3 text-center" style={{ borderTop: "1px solid #E8E8E0", background: "#fff" }}>
        <p className="text-xs mb-1" style={{ color: "#999" }}>觉得好用？</p>
        <a href="/login" className="text-sm font-medium" style={{ color: "#8BC34A" }}>
          创建自己的心芽账户 →
        </a>
      </div>

      {/* 富文本样式 */}
      <style jsx>{`
        .share-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .share-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .share-content li { margin: 0.2em 0; }
        .share-content b, .share-content strong { font-weight: 600; }
        .share-content i, .share-content em { font-style: italic; }
      `}</style>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen" style={{ background: "#FAFAF5" }}>
        <div className="text-4xl animate-pulse">🌱</div>
      </div>
    }>
      <SharePageContent />
    </Suspense>
  )
}
