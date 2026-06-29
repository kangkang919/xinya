"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface User {
  email: string
  theme: string
  openTimes: number
}

interface TagItem {
  id: string
  name: string
  isDefault: boolean
  entryCount: number
}

interface ExportEntry {
  id: string
  title: string
  content: string
  tags: string[]
  mood: string | null
  recordTime: string
  createdAt: string
  isTop: boolean
  isFavorite: boolean
}

const THEMES = [
  { key: 'spring', label: '春日萌芽', sub: '嫩绿生机', color: '#8BC34A', bg: '#F4FBF0' },
  { key: 'summer', label: '夏日繁茂', sub: '蔚蓝清凉', color: '#2196F3', bg: '#EEF6FE' },
  { key: 'autumn', label: '秋日暖阳', sub: '暖橙丰收', color: '#FF8C42', bg: '#FAFAF5' },
  { key: 'winter', label: '冬日静谧', sub: '银灰沉静', color: '#90A4AE', bg: '#F5F5F7' },
]

const CHANGELOGS = [
  {
    version: 'v0.1.0',
    date: '2026年6月',
    prose: '心芽，于此扎根。如一粒种子，在静默中积蓄力量，等待一场属于自己的花期。每一行文字，皆是内心萌动的印记。',
    items: [
      '心得的播种、编辑与收藏',
      '标签的分门别类，思绪有了归处',
      '置顶心得，让重要的念头浮出水面',
      '四季主题风格，随心而变',
      '年轮热力图，记录日积月累的生长',
    ],
  },
]

function applyTheme(themeKey: string) {
  localStorage.setItem('xinya-theme', themeKey)
  window.dispatchEvent(new Event('xinya-theme-change'))
}

function formatExportDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toMarkdown(entries: ExportEntry[]): string {
  const lines: string[] = [`# 心芽心得导出`, ``, `共 ${entries.length} 篇心得`, ``]
  entries.forEach((e, i) => {
    lines.push(`## ${i + 1}. ${e.title}${e.isFavorite ? ' ⭐' : ''}`)
    lines.push(`- 标签：${e.tags.map(t => `#${t}`).join(' ') || '无'}`)
    lines.push(`- 心情：${e.mood || '—'}`)
    lines.push(`- 记录时间：${formatExportDate(e.recordTime)}`)
    lines.push(`- 创建时间：${formatExportDate(e.createdAt)}`)
    lines.push('')
    lines.push(htmlToPlainText(e.content) || '（无内容）')
    lines.push('')
    lines.push('---')
    lines.push('')
  })
  return lines.join('\n')
}

function toHtml(entries: ExportEntry[]): string {
  const items = entries.map((e, i) => `
    <article style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #eee;">
      <h2 style="font-size:18px;color:#333;margin-bottom:12px;">${i + 1}. ${escapeHtml(e.title)}${e.isFavorite ? ' ⭐' : ''}</h2>
      <div style="font-size:13px;color:#666;margin-bottom:12px;line-height:1.8;">
        <div style="margin-bottom:4px;">标签：${e.tags.map(t => `<span style="display:inline-block;color:#5a8a2f;background:rgba(139,195,74,0.1);padding:2px 8px;border-radius:12px;margin-right:6px;">#${escapeHtml(t)}</span>`).join('') || '无'}</div>
        <div style="margin-bottom:4px;">心情：${e.mood ? escapeHtml(e.mood) : '—'}</div>
        <div style="margin-bottom:4px;">记录时间：${formatExportDate(e.recordTime)}</div>
        <div>创建时间：${formatExportDate(e.createdAt)}</div>
      </div>
      <div style="font-size:14px;color:#333;line-height:1.8;">${e.content || '（无内容）'}</div>
    </article>
  `).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>心芽心得导出</title>
</head>
<body style="max-width:720px;margin:40px auto;padding:0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#fafafa;">
  <h1 style="font-size:22px;color:#333;text-align:center;margin-bottom:8px;">心芽心得导出</h1>
  <p style="text-align:center;color:#999;font-size:13px;margin-bottom:32px;">共 ${entries.length} 篇心得</p>
  ${items}
</body>
</html>`
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function RootPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [currentTheme, setCurrentTheme] = useState('autumn')
  const [saving, setSaving] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [savedTip, setSavedTip] = useState(false)
  const [exporting, setExporting] = useState<'md' | 'html' | null>(null)
  const [exportTip, setExportTip] = useState(false)

  // 标签管理
  const [tags, setTags] = useState<TagItem[]>([])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)
  const [tagActionLoading, setTagActionLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('xinya-theme') || 'autumn'
    setCurrentTheme(saved)
    applyTheme(saved)

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data) {
          setUser(data.data)
          const serverTheme = data.data.theme || 'autumn'
          setCurrentTheme(serverTheme)
          applyTheme(serverTheme)
          localStorage.setItem('xinya-theme', serverTheme)
        }
      })
      .catch(() => {})

    fetchTags()
  }, [])

  function fetchTags() {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) setTags(data.data)
      })
      .catch(() => {})
  }

  async function changeTheme(themeKey: string) {
    if (saving || themeKey === currentTheme) return
    setSaving(true)
    setCurrentTheme(themeKey)
    applyTheme(themeKey)

    try {
      await fetch('/api/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeKey }),
      })
      setSavedTip(true)
      setTimeout(() => setSavedTip(false), 2000)
    } catch (_) {}

    setSaving(false)
  }

  function startEditTag(tag: TagItem) {
    setEditingTagId(tag.id)
    setEditingName(tag.name)
    setDeletingTagId(null)
  }

  async function saveTagName(id: string) {
    if (!editingName.trim() || tagActionLoading) return
    setTagActionLoading(true)
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      })
      if (res.ok) {
        setTags(prev => prev.map(t => t.id === id ? { ...t, name: editingName.trim() } : t))
        setEditingTagId(null)
      }
    } catch (_) {}
    setTagActionLoading(false)
  }

  async function deleteTag(id: string) {
    if (tagActionLoading) return
    setTagActionLoading(true)
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTags(prev => prev.filter(t => t.id !== id))
        setDeletingTagId(null)
      }
    } catch (_) {}
    setTagActionLoading(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  async function handleExport(format: 'md' | 'html') {
    if (exporting) return
    setExporting(format)
    try {
      const res = await fetch('/api/export')
      const json = await res.json()
      if (!json.ok) throw new Error('导出失败')
      const entries: ExportEntry[] = json.data
      const now = new Date().toISOString().slice(0, 10)
      if (format === 'md') {
        downloadBlob(toMarkdown(entries), `xinya-export-${now}.md`, 'text/markdown')
      } else {
        downloadBlob(toHtml(entries), `xinya-export-${now}.html`, 'text/html')
      }
      setExportTip(true)
      setTimeout(() => setExportTip(false), 2000)
    } catch (_) {}
    setExporting(null)
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: '#333' }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌿</span>根系
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: '#bbb' }}>此处是你的根，安静而深厚</p>

      {/* 账号 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #eee' }}>
        <p className="text-xs mb-2" style={{ color: '#999' }}>账号</p>
        <p className="text-sm font-medium" style={{ color: '#333' }}>
          {user?.email ?? '—'}
        </p>
      </div>

      {/* 主题风格 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #eee' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: '#999' }}>主题风格</p>
          {savedTip && (
            <span className="text-xs" style={{ color: '#8BC34A' }}>✓ 已切换</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(t => {
            const isSelected = currentTheme === t.key
            return (
              <button
                key={t.key}
                onClick={() => changeTheme(t.key)}
                disabled={saving}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: isSelected ? t.bg : '#FAFAFA',
                  border: `2px solid ${isSelected ? t.color : '#eee'}`,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-sm font-medium" style={{ color: '#333' }}>{t.label}</span>
                  {isSelected && <span className="ml-auto text-xs" style={{ color: t.color }}>✓</span>}
                </div>
                <p className="text-xs" style={{ color: '#999' }}>{t.sub}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 标签管理 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #eee' }}>
        <p className="text-xs mb-3" style={{ color: '#999' }}>标签管理</p>
        {tags.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: '#ddd' }}>还没有标签，播种心得时创建吧</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id}>
                {/* 正常行 */}
                {editingTagId !== tag.id && deletingTagId !== tag.id && (
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(139,195,74,0.1)', color: '#5a8a2f' }}>
                        # {tag.name}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#ccc' }}>
                        {tag.entryCount} 篇
                      </span>
                      {tag.isDefault && (
                        <span className="text-xs flex-shrink-0" style={{ color: '#ddd' }}>默认</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      {/* 编辑 */}
                      <button
                        onClick={() => startEditTag(tag)}
                        className="text-xs transition"
                        style={{ color: '#bbb' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                        </svg>
                      </button>
                      {/* 删除（默认标签不可删） */}
                      {!tag.isDefault && (
                        <button
                          onClick={() => { setDeletingTagId(tag.id); setEditingTagId(null) }}
                          className="text-xs transition"
                          style={{ color: '#e57373' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 编辑行 */}
                {editingTagId === tag.id && (
                  <div className="flex items-center gap-2 py-1">
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTagName(tag.id); if (e.key === 'Escape') setEditingTagId(null) }}
                      className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                      style={{ border: '1.5px solid #8BC34A', color: '#333' }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveTagName(tag.id)}
                      disabled={tagActionLoading}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: '#8BC34A', color: '#fff' }}
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingTagId(null)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: '#999', border: '1px solid #eee' }}
                    >
                      取消
                    </button>
                  </div>
                )}

                {/* 删除确认行 */}
                {deletingTagId === tag.id && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                    style={{ background: 'rgba(229,115,115,0.06)', border: '1px solid rgba(229,115,115,0.2)' }}>
                    <p className="text-xs" style={{ color: '#e57373' }}>
                      「{tag.name}」叶脉将随风而散，确认移除？
                    </p>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => deleteTag(tag.id)}
                        disabled={tagActionLoading}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: '#e57373', color: '#fff' }}
                      >
                        移除
                      </button>
                      <button
                        onClick={() => setDeletingTagId(null)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ color: '#999', border: '1px solid #eee' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 版本 & 开打次数 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #eee' }}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowChangelog(!showChangelog)}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="text-sm" style={{ color: '#666' }}>版本 v0.1.0</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showChangelog ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {showChangelog && (
          <div className="mt-4">
            {CHANGELOGS.map(log => (
              <div key={log.version} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,195,74,0.12)', color: '#5a8a2f' }}>
                    {log.version}
                  </span>
                  <span className="text-xs" style={{ color: '#bbb' }}>{log.date}</span>
                </div>
                <p className="text-xs leading-relaxed mb-3 italic"
                  style={{ color: '#888', borderLeft: '2px solid #e0e0e0', paddingLeft: '8px' }}>
                  {log.prose}
                </p>
                <ul className="space-y-1.5">
                  {log.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#666' }}>
                      <span style={{ color: '#8BC34A', flexShrink: 0 }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: '1px solid #f0f0f0' }}>
          <span className="text-sm" style={{ color: '#666' }}>累计打开</span>
          <span className="text-sm" style={{ color: '#333' }}>{user?.openTimes ?? '—'} 次</span>
        </div>
      </div>

      {/* 数据导出 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: '#fff', border: '1px solid #eee' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: '#999' }}>导出心得</p>
          {exportTip && (
            <span className="text-xs" style={{ color: '#8BC34A' }}>✓ 已开始下载</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleExport('md')}
            disabled={exporting !== null}
            className="py-2.5 rounded-xl text-sm font-medium transition"
            style={{
              background: exporting === 'md' ? '#f0f0f0' : 'rgba(139,195,74,0.08)',
              color: '#5a8a2f',
              border: '1px solid rgba(139,195,74,0.3)',
              opacity: exporting !== null ? 0.6 : 1,
            }}
          >
            {exporting === 'md' ? '导出中...' : 'Markdown'}
          </button>
          <button
            onClick={() => handleExport('html')}
            disabled={exporting !== null}
            className="py-2.5 rounded-xl text-sm font-medium transition"
            style={{
              background: exporting === 'html' ? '#f0f0f0' : 'rgba(139,195,74,0.08)',
              color: '#5a8a2f',
              border: '1px solid rgba(139,195,74,0.3)',
              opacity: exporting !== null ? 0.6 : 1,
            }}
          >
            {exporting === 'html' ? '导出中...' : 'HTML'}
          </button>
        </div>
      </div>

      {/* 退出登录 */}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ color: '#e57373', border: '1px solid rgba(229,115,115,0.2)', background: '#fff' }}
        onClick={logout}
      >
        退出登录
      </button>
    </div>
  )
}

