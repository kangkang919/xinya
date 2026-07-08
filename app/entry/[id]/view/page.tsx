"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTheme } from "@/lib/useTheme"

interface Tag { id: string; name: string }
interface Entry {
  id: string
  title: string
  content: string
  contentPreview: string
  tags: Tag[]
  isTop: boolean
  isFavorite: boolean
  recordTime: string
  mood: string | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

export default function ViewEntryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { isDark, cardBg, titleColor } = useTheme()

  const bgColor = isDark ? "#1E1E1E" : "#FAFAF5"
  const navBg = isDark ? "rgba(30,30,30,0.95)" : "rgba(250,250,245,0.95)"
  const navBorder = isDark ? "#333" : "#e8e8e0"
  const contentColor = isDark ? "#E0E0E0" : "#333"

  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/entries/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("心得不见了")
        return r.json()
      })
      .then(data => setEntry(data.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm" style={{ color: '#bbb' }}>正在萌发中…</p>
        </div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
        <div className="text-center p-8">
          <div className="text-3xl mb-2">🍂</div>
          <p className="text-sm mb-4" style={{ color: '#bbb' }}>这篇心得不见了</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-full text-sm"
            style={{ background: '#8BC34A', color: '#fff' }}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor }}>
      {/* 顶部导航栏 */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: navBg,
          borderBottom: `1px solid ${navBorder}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm rounded-full px-3 py-1.5 transition"
          style={{ color: isDark ? '#aaa' : '#666', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回
        </button>

        <button
          onClick={() => router.push(`/entry/${id}`)}
          className="flex items-center gap-1 text-sm rounded-full px-3 py-1.5 transition"
          style={{ color: '#8BC34A', background: 'rgba(139,195,74,0.1)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
          编辑
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {/* 标签 */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {entry.tags.map(tag => (
              <span
                key={tag.id}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: isDark ? 'rgba(139,195,74,0.2)' : 'rgba(139,195,74,0.12)', color: isDark ? '#AED581' : '#5a8a2f' }}
              >
                # {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 标题 */}
        {entry.title && (
          <h2 className="text-base font-semibold mb-2 leading-snug" style={{ color: titleColor }}>
            {entry.title}
          </h2>
        )}

        {/* 日期 */}
        <p className="text-xs mb-5" style={{ color: '#bbb' }}>
          {formatDate(entry.recordTime)}
        </p>

        {/* 正文 */}
        <div
          className="text-sm leading-relaxed view-content"
          style={{ color: contentColor, wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: entry.content || `<p style="color:${isDark ? '#666' : '#bbb'}">空空如也…</p>` }}
        />
      </div>

      {/* 底部操作栏 */}
      <div
        className="sticky bottom-0 px-4 py-3 flex items-center justify-between"
        style={{
          background: navBg,
          borderTop: `1px solid ${navBorder}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          {entry.isTop && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,140,66,0.12)', color: '#e87835' }}>
              置顶
            </span>
          )}
          {entry.isFavorite && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,195,74,0.12)', color: '#5a8a2f' }}>
              收藏
            </span>
          )}
        </div>
        <button
          onClick={() => router.push(`/entry/${id}`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition"
          style={{ background: 'linear-gradient(135deg, #8BC34A, #AED581)', color: '#fff' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
          编辑此篇
        </button>
      </div>

      {/* contentEditable 内容样式 */}
      <style>{`
        [dangerouslySetInnerHTML] ul, div[dangerouslySetInnerHTML] ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        [dangerouslySetInnerHTML] ol, div[dangerouslySetInnerHTML] ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        [dangerouslySetInnerHTML] li, div[dangerouslySetInnerHTML] li { margin: 0.2em 0; }
        .view-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .view-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .view-content li { margin: 0.2em 0; }
        .view-content b, .view-content strong { font-weight: bold; }
        .view-content i, .view-content em { font-style: italic; }
        .view-content u { text-decoration: underline; }
      `}</style>
    </div>
  )
}
