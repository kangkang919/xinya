"use client"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "@/lib/useTheme"

interface Tag {
  id: string
  name: string
  entryCount: number
  isDefault: boolean
}

interface Entry {
  id: string
  title: string
  contentPreview: string
  tags: { id: string; name: string }[]
  recordTime: string
  isTop: boolean
  isFavorite: boolean
}

// 根据使用量生成标签样式
const TAG_COLORS = [
  { border: '#8BC34A', text: '#5a8a2f', bg: 'rgba(139,195,74,0.12)' },
  { border: '#42A5F5', text: '#2b7ac2', bg: 'rgba(66,165,245,0.12)' },
  { border: '#FF8C42', text: '#c46a20', bg: 'rgba(255,140,66,0.12)' },
  { border: '#e57373', text: '#c44545', bg: 'rgba(229,115,115,0.12)' },
  { border: '#BA68C8', text: '#7b3fa0', bg: 'rgba(186,104,200,0.12)' },
]

function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length]
}

function tagFontSize(count: number, maxCount: number): number {
  if (maxCount === 0) return 12
  const ratio = count / maxCount
  return Math.round(12 + ratio * 8) // 12px ~ 20px
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

// 暗色模式辅助函数
function adjustAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function lightenColor(hex: string): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 60)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 60)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 60)
  return `rgb(${r},${g},${b})`
}

export default function LeafPage() {
  return (
    <Suspense fallback={<div className="p-4 max-w-lg mx-auto"><p className="text-sm text-center" style={{ color: '#999' }}>加载中…</p></div>}>
      <LeafPageContent />
    </Suspense>
  )
}

function LeafPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDark, cardBg, cardBorder, titleColor, dimColor, inputBg, inputBorder } = useTheme()
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const sorted = [...data.data].sort((a: Tag, b: Tag) => b.entryCount - a.entryCount)
          setTags(sorted)
          // 从URL恢复选中的标签（从阅读页返回时）
          const tagId = searchParams.get('tagId')
          if (tagId) {
            const tag = sorted.find((t: Tag) => t.id === tagId)
            if (tag) {
              setSelectedTag(tag)
              setLoadingEntries(true)
              fetch(`/api/entries?tagId=${tag.id}&limit=50`)
                .then(r => r.json())
                .then(data => {
                  if (data.ok) setEntries(data.data.entries || [])
                })
                .catch(() => {})
                .finally(() => setLoadingEntries(false))
            }
          }
        }
      })
      .catch(() => {})
  }, [])

  function selectTag(tag: Tag) {
    if (selectedTag?.id === tag.id) {
      setSelectedTag(null)
      setEntries([])
      return
    }
    setSelectedTag(tag)
    setLoadingEntries(true)
    fetch(`/api/entries?tagId=${tag.id}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setEntries(data.data.entries || [])
      })
      .catch(() => {})
      .finally(() => setLoadingEntries(false))
  }

  const filteredTags = search.trim()
    ? tags.filter(t => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tags

  const maxCount = tags.length > 0 ? Math.max(...tags.map(t => t.entryCount)) : 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: titleColor }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🍃</span>枝叶
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: dimColor }}>思绪的脉络，在此生枝蔓叶</p>

      {/* 搜索框 */}
      <div className="relative mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <path d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
        </svg>
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-full outline-none text-sm"
          style={{ border: `1.5px solid ${inputBorder}`, background: inputBg, color: titleColor }}
          placeholder="搜索标签…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filteredTags.map((tag, i) => {
          const c = getTagColor(i)
          const isSelected = selectedTag?.id === tag.id
          const fs = tagFontSize(tag.entryCount, maxCount)
          return (
            <button
              key={tag.id}
              onClick={() => selectTag(tag)}
              style={{
                background: isSelected ? c.border : (isDark ? adjustAlpha(c.border, 0.2) : c.bg),
                border: `2px solid ${c.border}`,
                color: isSelected ? '#fff' : (isDark ? lightenColor(c.text) : c.text),
                fontSize: `${fs}px`,
                padding: fs >= 16 ? '10px 18px' : '6px 12px',
                fontWeight: fs >= 16 ? 'bold' : 'normal',
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
        {filteredTags.length === 0 && (
          <p className="text-sm" style={{ color: '#bbb' }}>没有找到相关标签</p>
        )}
      </div>

      {/* 心得列表（点击标签后展示） */}
      {selectedTag && (
        <div>
          <p className="text-xs mb-3" style={{ color: '#999' }}>
            「{selectedTag.name}」共 {selectedTag.entryCount} 篇
          </p>

          {loadingEntries ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🌱</div>
              <p className="text-sm" style={{ color: '#bbb' }}>萌发中…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🍂</div>
              <p className="text-sm" style={{ color: '#bbb' }}>还没有这个标签的心得</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => router.push(`/entry/${entry.id}/view?from=leaf${selectedTag ? `&tagId=${selectedTag.id}` : ''}`)}
                  className="p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                >
                  {entry.title ? (
                    <h3 className="text-sm font-medium mb-1 line-clamp-1" style={{ color: titleColor }}>
                      {entry.title}
                    </h3>
                  ) : null}
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: '#999' }}>
                    {entry.contentPreview || '空空如也…'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: isDark ? 'rgba(139,195,74,0.2)' : 'rgba(139,195,74,0.1)', color: isDark ? '#AED581' : '#5a8a2f' }}>
                          #{t.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px]" style={{ color: '#bbb' }}>
                      {formatDate(entry.recordTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

