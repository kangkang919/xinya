"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
  const [selectedTag, setSelectedTag] = useState<ShareTag | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 顶级标签（按心得数量从多到少排序）
  const topTags = tags.filter(t => !t.parentId).sort((a, b) => b.entryCount - a.entryCount)
  
  // 根据标签大小计算气泡尺寸
  const maxCount = topTags.length > 0 ? Math.max(...topTags.map(t => t.entryCount)) : 0
  const getTagSize = (count: number) => {
    if (maxCount === 0) return { fontSize: 12, padding: '6px 12px' }
    const ratio = count / maxCount
    const fontSize = Math.round(12 + ratio * 8)
    return {
      fontSize,
      padding: fontSize >= 16 ? '10px 18px' : '6px 12px',
    }
  }

  // 选中标签下的子标签
  const childTags = selectedTag ? tags.filter(t => t.parentId === selectedTag.id) : []
  
  // 按子标签分组心得
  const entryGroups = (() => {
    if (!selectedTag || entries.length === 0) return []
    
    if (childTags.length === 0) {
      // 没有子标签，全部作为单组
      const groupEntries = entries.filter(e => e.tags.some(t => t.id === selectedTag.id))
      return [{ tagId: selectedTag.id, tagName: selectedTag.name, entries: groupEntries }]
    }
    
    const childIds = new Set(childTags.map(c => c.id))
    const groups: { tagId: string; tagName: string; entries: ShareEntry[] }[] = []
    const grouped = new Map<string, ShareEntry[]>()
    
    // 初始化子标签分组
    for (const child of childTags) {
      grouped.set(child.id, [])
    }
    // 未归类（只挂在父标签、不在任何子标签下的心得）
    const ungrouped: ShareEntry[] = []
    
    for (const entry of entries) {
      const entryChildTag = entry.tags.find(t => childIds.has(t.id))
      if (entryChildTag) {
        grouped.get(entryChildTag.id)!.push(entry)
      } else if (entry.tags.some(t => t.id === selectedTag.id)) {
        ungrouped.push(entry)
      }
    }
    
    // 只保留有心得的分组
    for (const child of childTags) {
      const groupEntries = grouped.get(child.id) || []
      if (groupEntries.length > 0) {
        groups.push({ tagId: child.id, tagName: child.name, entries: groupEntries })
      }
    }
    
    // 未归类的放在最后
    if (ungrouped.length > 0) {
      groups.push({ tagId: '__ungrouped__', tagName: '未归类', entries: ungrouped })
    }
    
    return groups
  })()

  function selectTag(tag: ShareTag) {
    if (selectedTag?.id === tag.id) {
      setSelectedTag(null)
      setExpandedGroups(new Set())
      return
    }
    setSelectedTag(tag)
    // 默认展开所有分组
    setExpandedGroups(new Set(entryGroups.map(g => g.tagId)))
  }

  function toggleGroup(tagId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  return (
    <div>
      {/* 标签云 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {topTags.map((tag, i) => {
          const size = getTagSize(tag.entryCount)
          const isSelected = selectedTag?.id === tag.id
          const colors = [
            { border: '#8BC34A', text: '#5a8a2f', bg: 'rgba(139,195,74,0.12)' },
            { border: '#42A5F5', text: '#2b7ac2', bg: 'rgba(66,165,245,0.12)' },
            { border: '#FF8C42', text: '#c46a20', bg: 'rgba(255,140,66,0.12)' },
            { border: '#e57373', text: '#c44545', bg: 'rgba(229,115,115,0.12)' },
            { border: '#BA68C8', text: '#7b3fa0', bg: 'rgba(186,104,200,0.12)' },
          ]
          const c = colors[i % colors.length]
          
          return (
            <button
              key={tag.id}
              onClick={() => selectTag(tag)}
              style={{
                background: isSelected ? c.border : c.bg,
                border: `2px solid ${c.border}`,
                color: isSelected ? '#fff' : c.text,
                fontSize: `${size.fontSize}px`,
                padding: size.padding,
                fontWeight: size.fontSize >= 16 ? 'bold' : 'normal',
                borderRadius: '999px',
                transition: '0.2s',
              }}
            >
              {tag.name}
              {tag.entryCount > 0 && (
                <span className="ml-1 opacity-60 text-xs">{tag.entryCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 选中标签下的心得列表 */}
      {selectedTag && (
        <div>
          <p className="text-xs mb-3" style={{ color: '#999' }}>
            「{selectedTag.name}」共 {selectedTag.entryCount} 篇
          </p>
          
          {entryGroups.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: '#bbb' }}>该标签下暂无心得</p>
          ) : entryGroups.length === 1 ? (
            // 单组：直接显示心得列表
            <div className="space-y-3">
              {entryGroups[0].entries.map(entry => (
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
          ) : (
            // 多组：分组显示
            <div className="space-y-4">
              {entryGroups.map(group => {
                const isExpanded = expandedGroups.has(group.tagId)
                return (
                  <div key={group.tagId}>
                    <button
                      onClick={() => toggleGroup(group.tagId)}
                      className="w-full flex items-center justify-between py-2 px-3 rounded-lg mb-2"
                      style={{ background: "#F5F5F0", border: "1px solid #E8E8E0" }}
                    >
                      <span className="text-sm font-medium" style={{ color: "#333" }}>
                        {group.tagName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#999" }}>
                          {group.entries.length} 篇
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="#999" strokeWidth="2"
                          style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: '0.2s'
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="space-y-3">
                        {group.entries.map(entry => (
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
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!selectedTag && (
        <div className="text-center py-8">
          <p className="text-[13px]" style={{ color: "#999" }}>
            👆 点击标签查看心得
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
  const params = useParams()
  const router = useRouter()
  const token = (params.token as string) || ""
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [view, setView] = useState<"timeline" | "tags">("timeline")
  const [selectedEntry, setSelectedEntry] = useState<ShareEntry | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [scrollRestored, setScrollRestored] = useState(false)

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

  // 恢复滚动位置（从心得详情返回时）
  useEffect(() => {
    if (scrollRestored && contentRef.current) {
      const saved = sessionStorage.getItem('share_scroll')
      if (saved) {
        sessionStorage.removeItem('share_scroll')
        const y = parseInt(saved, 10)
        setTimeout(() => {
          contentRef.current?.scrollTo(0, y)
        }, 50)
      }
      setScrollRestored(false)
    }
  }, [selectedEntry, scrollRestored])

  const handleViewSwitch = (newView: "timeline" | "tags") => {
    if (newView === view) return
    setTransitioning(true)
    setTimeout(() => {
      setView(newView)
      setTransitioning(false)
    }, 150)
  }

  const handleEntryClick = (entry: ShareEntry) => {
    // 保存当前滚动位置
    if (contentRef.current) {
      sessionStorage.setItem('share_scroll', String(contentRef.current.scrollTop))
    }
    setSelectedEntry(entry)
  }

  const handleBack = () => {
    setSelectedEntry(null)
    setScrollRestored(true)
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
          onBack={handleBack} 
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
        ref={contentRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ 
          opacity: transitioning ? 0 : 1, 
          transition: "opacity 0.15s ease" 
        }}
      >
        {view === "timeline" ? (
          <TimelineView 
            entries={shareData.entries} 
            onEntryClick={handleEntryClick} 
          />
        ) : (
          <TagsView 
            tags={shareData.tags} 
            entries={shareData.entries} 
            onEntryClick={handleEntryClick} 
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
