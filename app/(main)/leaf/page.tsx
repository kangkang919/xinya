"use client"
import { Suspense, useEffect, useState, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "@/lib/useTheme"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface TagChild {
  id: string
  name: string
}

interface Tag {
  id: string
  name: string
  parentId: string | null
  entryCount: number
  isDefault: boolean
  children: TagChild[]
}

interface Entry {
  id: string
  title: string
  contentPreview: string
  tags: { id: string; name: string }[]
  recordTime: string
  isTop: boolean
  isFavorite: boolean
  sortOrders?: Record<string, number>
}

interface EntryGroup {
  tagId: string
  tagName: string
  entries: Entry[]
}

// 标签云颜色
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
  return Math.round(12 + ratio * 8)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

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

// 按指定标签的 sortOrder 排序心得：
// 置顶优先；未排序（无记录，视为 0）按时间倒序排最前；已排序（负数）按 sortOrder 倒序
function sortEntriesByTag(entries: Entry[], tagId: string): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
    const sa = a.sortOrders?.[tagId] ?? 0
    const sb = b.sortOrders?.[tagId] ?? 0
    if (sa !== sb) return sb - sa
    return new Date(b.recordTime).getTime() - new Date(a.recordTime).getTime()
  })
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
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // 分离顶级标签和子标签
  const topLevelTags = useMemo(() => tags.filter(t => !t.parentId), [tags])

  useEffect(() => {
    const savedData = sessionStorage.getItem('leaf_saved')
    let tagChanged = false
    if (savedData) {
      sessionStorage.removeItem('leaf_saved')
      try {
        const parsed = JSON.parse(savedData)
        tagChanged = !!parsed.tagChanged
      } catch {}
    }

    fetch('/api/tags')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const sorted = [...data.data].sort((a: Tag, b: Tag) => b.entryCount - a.entryCount)
          setTags(sorted)
          const tagId = searchParams.get('tagId')
          if (tagId) {
            const tag = sorted.find((t: Tag) => t.id === tagId)
            if (tag) {
              setSelectedTag(tag)
              if (!tagChanged) {
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
        }
      })
      .catch(() => {})
  }, [])

  // 滚动位置恢复
  const scrollRestoreRef = useRef<number | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('leaf_scroll')
    if (saved) {
      sessionStorage.removeItem('leaf_scroll')
      scrollRestoreRef.current = parseInt(saved, 10)
    }
  }, [])

  useEffect(() => {
    if (scrollRestoreRef.current !== null && !loadingEntries) {
      const y = scrollRestoreRef.current
      scrollRestoreRef.current = null
      setTimeout(() => window.scrollTo(0, y), 50)
    }
  }, [loadingEntries])

  // 恢复展开的分组状态（从心得详情返回时，保持点击前的分组展开界面）
  useEffect(() => {
    const saved = sessionStorage.getItem('leaf_expanded')
    if (saved) {
      sessionStorage.removeItem('leaf_expanded')
      try {
        setExpandedGroups(new Set(JSON.parse(saved)))
      } catch {}
    }
  }, [])

  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        sessionStorage.setItem('leaf_scroll', String(window.scrollY))
      }, 150)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimer)
      sessionStorage.setItem('leaf_scroll', String(window.scrollY))
    }
  }, [])

  function selectTag(tag: Tag) {
    if (selectedTag?.id === tag.id) {
      setSelectedTag(null)
      setEntries([])
      setExpandedGroups(new Set())
      return
    }
    setSelectedTag(tag)
    setExpandedGroups(new Set())
    setLoadingEntries(true)
    fetch(`/api/entries?tagId=${tag.id}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setEntries(data.data.entries || [])
      })
      .catch(() => {})
      .finally(() => setLoadingEntries(false))
  }

  function toggleGroup(tagId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  // 保存排序到服务端
  function saveOrder(orderedEntryIds: string[], tagId: string) {
    fetch('/api/entries/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, orderedEntryIds }),
    }).catch(() => {})
  }

  // 平铺视图拖拽排序
  function handleFlatReorder(newEntries: Entry[], tagId: string) {
    // 同步更新各心得在当前标签下的 sortOrders，使本地立即呈现新顺序
    const updated = newEntries.map((e, i) => ({
      ...e,
      sortOrders: { ...(e.sortOrders || {}), [tagId]: -(i + 1) },
    }))
    setEntries(updated)
    saveOrder(updated.map(e => e.id), tagId)
  }

  // 分组视图组内拖拽排序
  function handleGroupReorder(group: EntryGroup, newGroupEntries: Entry[]) {
    const tagId = group.tagId === '__ungrouped__' ? selectedTag!.id : group.tagId
    // 同步更新本组心得在该标签下的 sortOrders
    const updatedGroupEntries = newGroupEntries.map((e, i) => ({
      ...e,
      sortOrders: { ...(e.sortOrders || {}), [tagId]: -(i + 1) },
    }))
    // 重建 entries：按分组顺序拼接，本组用新顺序
    const newEntries: Entry[] = []
    for (const g of entryGroups) {
      if (g.tagId === group.tagId) newEntries.push(...updatedGroupEntries)
      else newEntries.push(...g.entries)
    }
    setEntries(newEntries)
    saveOrder(updatedGroupEntries.map(e => e.id), tagId)
  }

  // 将心得按子标签分组（各组内按对应标签的 sortOrder 排序）
  const entryGroups = useMemo((): EntryGroup[] => {
    if (!selectedTag || entries.length === 0) return []

    const children = selectedTag.children || []
    if (children.length === 0) {
      // 没有子标签，全部作为单组
      return [{ tagId: selectedTag.id, tagName: selectedTag.name, entries: sortEntriesByTag(entries, selectedTag.id) }]
    }

    const childIds = new Set(children.map(c => c.id))
    const groups: EntryGroup[] = []
    const grouped = new Map<string, Entry[]>()

    // 初始化子标签分组
    for (const child of children) {
      grouped.set(child.id, [])
    }
    // 未归类（只挂在父标签、不在任何子标签下的心得）
    const ungrouped: Entry[] = []

    for (const entry of entries) {
      const entryChildTag = entry.tags.find(t => childIds.has(t.id))
      if (entryChildTag) {
        grouped.get(entryChildTag.id)!.push(entry)
      } else {
        ungrouped.push(entry)
      }
    }

    // 只保留有心得的分组（组内按该子标签的 sortOrder 排序）
    for (const child of children) {
      const groupEntries = grouped.get(child.id) || []
      if (groupEntries.length > 0) {
        groups.push({ tagId: child.id, tagName: child.name, entries: sortEntriesByTag(groupEntries, child.id) })
      }
    }

    // 未归类的放在最后（按父标签的 sortOrder 排序）
    if (ungrouped.length > 0) {
      groups.push({ tagId: '__ungrouped__', tagName: '未归类', entries: sortEntriesByTag(ungrouped, selectedTag.id) })
    }

    return groups
  }, [selectedTag, entries])

  // 平铺视图数据：仅一个分组时，用该组的排序后心得
  const flatEntries = entryGroups.length === 1 ? entryGroups[0].entries : entries
  const flatTagId = entryGroups.length === 1
    ? (entryGroups[0].tagId === '__ungrouped__' ? selectedTag?.id || '' : entryGroups[0].tagId)
    : (selectedTag?.id || '')

  const maxCount = topLevelTags.length > 0
    ? Math.max(...topLevelTags.map(t => t.entryCount))
    : 0

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: titleColor }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🍃</span>枝叶
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: dimColor }}>思绪的脉络，在此生枝蔓叶</p>

      {/* 标签云（仅顶级标签） */}
      <div className="flex flex-wrap gap-2 mb-6">
        {topLevelTags.map((tag, i) => {
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
        {topLevelTags.length === 0 && (
          <p className="text-sm" style={{ color: '#bbb' }}>还没有标签</p>
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
          ) : entryGroups.length > 1 ? (
            // 有子标签分组：可折叠/展开
            <div className="space-y-3">
              {entryGroups.map(group => {
                const isExpanded = expandedGroups.has(group.tagId)
                const isUngrouped = group.tagId === '__ungrouped__'
                return (
                  <div key={group.tagId}>
                    {/* 分组标题 */}
                    <button
                      onClick={() => toggleGroup(group.tagId)}
                      className="w-full flex items-center justify-between py-2 px-1 rounded-lg transition"
                      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs transition-transform"
                          style={{
                            display: 'inline-block',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            color: '#8BC34A',
                          }}
                        >
                          ▶
                        </span>
                        <span className="text-sm font-medium" style={{ color: titleColor }}>
                          {isUngrouped ? '📎 ' : '🏷️ '}{group.tagName}
                        </span>
                        <span className="text-xs" style={{ color: '#999' }}>
                          {group.entries.length} 篇
                        </span>
                      </div>
                    </button>

                    {/* 分组内的心得列表（支持拖拽排序） */}
                    {isExpanded && (
                      <div className="mt-2 ml-2">
                        <SortableEntryList
                          entries={group.entries}
                          tagId={group.tagId === '__ungrouped__' ? selectedTag!.id : group.tagId}
                          onReorder={(newOrder: Entry[]) => handleGroupReorder(group, newOrder)}
                          isDark={isDark}
                          cardBg={cardBg}
                          cardBorder={cardBorder}
                          titleColor={titleColor}
                          selectedTag={selectedTag}
                          router={router}
                          expandedGroups={[...expandedGroups]}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // 无子标签分组：直接平铺显示（支持拖拽排序）
            <SortableEntryList
              entries={flatEntries}
              tagId={flatTagId}
              onReorder={(newOrder: Entry[]) => handleFlatReorder(newOrder, flatTagId)}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              titleColor={titleColor}
              selectedTag={selectedTag}
              router={router}
              expandedGroups={[...expandedGroups]}
            />
          )}
        </div>
      )}
    </div>
  )
}

// 心得卡片子组件
function EntryCard({ entry, isDark, cardBg, cardBorder, titleColor, selectedTag, router, expandedGroups }: {
  entry: Entry
  isDark: boolean
  cardBg: string
  cardBorder: string
  titleColor: string
  selectedTag: Tag | null
  router: ReturnType<typeof useRouter>
  expandedGroups: string[]
}) {
  return (
    <div
      onClick={() => {
        sessionStorage.setItem('leaf_scroll', String(window.scrollY))
        sessionStorage.setItem('leaf_expanded', JSON.stringify(expandedGroups))
        router.push(`/entry/${entry.id}/view?from=leaf${selectedTag ? `&tagId=${selectedTag.id}` : ''}`)
      }}
      className="p-4 rounded-xl cursor-pointer transition-all active:scale-[0.98] flex-1 min-w-0"
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
  )
}

// 可拖拽的心得卡片：左侧拖拽手柄 + 心得卡片
function SortableEntryCard({ entry, isDark, cardBg, cardBorder, titleColor, selectedTag, router, expandedGroups }: {
  entry: Entry
  isDark: boolean
  cardBg: string
  cardBorder: string
  titleColor: string
  selectedTag: Tag | null
  router: ReturnType<typeof useRouter>
  expandedGroups: string[]
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-stretch gap-1.5"
    >
      {/* 拖拽手柄：仅手柄可拖拽，避免与点击打开心得混淆 */}
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="shrink-0 w-7 flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing touch-none select-none"
        style={{ color: isDragging ? '#8BC34A' : '#c4c4c4' }}
        aria-label="拖拽排序"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
      <EntryCard
        entry={entry}
        isDark={isDark}
        cardBg={cardBg}
        cardBorder={cardBorder}
        titleColor={titleColor}
        selectedTag={selectedTag}
        router={router}
        expandedGroups={expandedGroups}
      />
    </div>
  )
}

// 可拖拽排序的心得列表
function SortableEntryList({ entries, tagId, onReorder, isDark, cardBg, cardBorder, titleColor, selectedTag, router, expandedGroups }: {
  entries: Entry[]
  tagId: string
  onReorder: (newEntries: Entry[]) => void
  isDark: boolean
  cardBg: string
  cardBorder: string
  titleColor: string
  selectedTag: Tag | null
  router: ReturnType<typeof useRouter>
  expandedGroups: string[]
}) {
  const sensors = useSensors(
    // 拖动 5px 后才触发，避免与点击混淆
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = entries.findIndex(e => e.id === active.id)
    const newIndex = entries.findIndex(e => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(entries, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {entries.map(entry => (
            <SortableEntryCard
              key={entry.id}
              entry={entry}
              isDark={isDark}
              cardBg={cardBg}
              cardBorder={cardBorder}
              titleColor={titleColor}
              selectedTag={selectedTag}
              router={router}
              expandedGroups={expandedGroups}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
