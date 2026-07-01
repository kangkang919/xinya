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

const THEMES = [
  { key: 'spring', label: '鏄ユ棩钀岃娊', sub: '瀚╃豢鐢熸満', color: '#8BC34A', bg: '#F4FBF0' },
  { key: 'summer', label: '澶忔棩绻佽寕', sub: '钄氳摑娓呭噳', color: '#2196F3', bg: '#EEF6FE' },
  { key: 'autumn', label: '绉嬫棩鏆栭槼', sub: '鏆栨涓版敹', color: '#FF8C42', bg: '#FAFAF5' },
  { key: 'winter', label: '鍐棩闈欒哀', sub: '閾剁伆娌夐潤', color: '#90A4AE', bg: '#F5F5F7' },
  { key: 'night', label: '鏆楀', sub: '娣遍們闈欒哀', color: '#6B8F3C', bg: '#1E1E1E' },
]

const CHANGELOGS = [
  {
    version: 'v0.1.0',
    date: '2026骞?鏈?,
    prose: '蹇冭娊锛屼簬姝ゆ墡鏍广€傚涓€绮掔瀛愶紝鍦ㄩ潤榛樹腑绉搫鍔涢噺锛岀瓑寰呬竴鍦哄睘浜庤嚜宸辩殑鑺辨湡銆傛瘡涓€琛屾枃瀛楋紝鐨嗘槸鍐呭績钀屽姩鐨勫嵃璁般€?,
    items: [
      '蹇冨緱鐨勬挱绉嶃€佺紪杈戜笌鏀惰棌',
      '鏍囩鐨勫垎闂ㄥ埆绫伙紝鎬濈华鏈変簡褰掑',
      '缃《蹇冨緱锛岃閲嶈鐨勫康澶存诞鍑烘按闈?,
      '鍥涘涓婚椋庢牸锛岄殢蹇冭€屽彉',
      '骞磋疆鐑姏鍥撅紝璁板綍鏃ョН鏈堢疮鐨勭敓闀?,
    ],
  },
]

function applyTheme(themeKey: string) {
  localStorage.setItem('xinya-theme', themeKey)
  window.dispatchEvent(new Event('xinya-theme-change'))
}

export default function RootPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [currentTheme, setCurrentTheme] = useState('autumn')
  const [saving, setSaving] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [savedTip, setSavedTip] = useState(false)

  // 鏍囩绠＄悊
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

  const isDark = currentTheme === 'night'
  const cardBg = isDark ? '#2A2A2A' : '#fff'
  const cardBorder = isDark ? '#444' : '#eee'
  const titleColor = isDark ? '#E0E0E0' : '#333'
  const subColor = isDark ? '#999' : '#999'
  const dimColor = isDark ? '#666' : '#bbb'

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 椤甸潰鏍囬 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: titleColor }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}></span>鏍圭郴
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: dimColor }}>姝ゅ鏄綘鐨勬牴锛屽畨闈欒€屾繁鍘?/p>

      {/* 璐﹀彿 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <p className="text-xs mb-2" style={{ color: subColor }}>璐﹀彿</p>
        <p className="text-sm font-medium" style={{ color: titleColor }}>
          {user?.email ?? '鈥?}
        </p>
      </div>

      {/* 涓婚椋庢牸 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: subColor }}>涓婚椋庢牸</p>
          {savedTip && (
            <span className="text-xs" style={{ color: '#8BC34A' }}>鉁?宸插垏鎹?/span>
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
                  background: isSelected ? t.bg : (isDark ? '#333' : '#FAFAFA'),
                  border: `2px solid ${isSelected ? t.color : (isDark ? '#555' : '#eee')}`,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-sm font-medium" style={{ color: titleColor }}>{t.label}</span>
                  {isSelected && <span className="ml-auto text-xs" style={{ color: t.color }}>鉁?/span>}
                </div>
                <p className="text-xs" style={{ color: subColor }}>{t.sub}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 鏍囩绠＄悊 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <p className="text-xs mb-3" style={{ color: subColor }}>鏍囩绠＄悊</p>
        {tags.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: dimColor }}>杩樻病鏈夋爣绛撅紝鎾蹇冨緱鏃跺垱寤哄惂</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id}>
                {/* 姝ｅ父琛?*/}
                {editingTagId !== tag.id && deletingTagId !== tag.id && (
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(139,195,74,0.1)', color: '#5a8a2f' }}>
                        # {tag.name}
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: dimColor }}>
                        {tag.entryCount} 绡?
                      </span>
                      {tag.isDefault && (
                        <span className="text-xs flex-shrink-0" style={{ color: dimColor }}>榛樿</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      {/* 缂栬緫 */}
                      <button
                        onClick={() => startEditTag(tag)}
                        className="text-xs transition"
                        style={{ color: dimColor }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                        </svg>
                      </button>
                      {/* 鍒犻櫎锛堥粯璁ゆ爣绛句笉鍙垹锛?*/}
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

                {/* 缂栬緫琛?*/}
                {editingTagId === tag.id && (
                  <div className="flex items-center gap-2 py-1">
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTagName(tag.id); if (e.key === 'Escape') setEditingTagId(null) }}
                      className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                      style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent' }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveTagName(tag.id)}
                      disabled={tagActionLoading}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: '#8BC34A', color: '#fff' }}
                    >
                      淇濆瓨
                    </button>
                    <button
                      onClick={() => setEditingTagId(null)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: subColor, border: `1px solid ${cardBorder}` }}
                    >
                      鍙栨秷
                    </button>
                  </div>
                )}

                {/* 鍒犻櫎纭琛?*/}
                {deletingTagId === tag.id && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                    style={{ background: 'rgba(229,115,115,0.06)', border: '1px solid rgba(229,115,115,0.2)' }}>
                    <p className="text-xs" style={{ color: '#e57373' }}>
                      銆寋tag.name}銆嶅彾鑴夊皢闅忛鑰屾暎锛岀‘璁ょЩ闄わ紵
                    </p>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => deleteTag(tag.id)}
                        disabled={tagActionLoading}
                        className="text-xs px-3 py-1 rounded-lg"
                        style={{ background: '#e57373', color: '#fff' }}
                      >
                        绉婚櫎
                      </button>
                      <button
                        onClick={() => setDeletingTagId(null)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ color: subColor, border: `1px solid ${cardBorder}` }}
                      >
                        鍙栨秷
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 鐗堟湰 & 寮€鎵撴鏁?*/}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowChangelog(!showChangelog)}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke={subColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="text-sm" style={{ color: isDark ? '#aaa' : '#666' }}>鐗堟湰 v0.1.0</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke={subColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
                  <span className="text-xs" style={{ color: dimColor }}>{log.date}</span>
                </div>
                <p className="text-xs leading-relaxed mb-3 italic"
                  style={{ color: isDark ? '#888' : '#888', borderLeft: `2px solid ${isDark ? '#444' : '#e0e0e0'}`, paddingLeft: '8px' }}>
                  {log.prose}
                </p>
                <ul className="space-y-1.5">
                  {log.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: isDark ? '#aaa' : '#666' }}>
                      <span style={{ color: '#8BC34A', flexShrink: 0 }}>路</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: `1px solid ${isDark ? '#444' : '#f0f0f0'}` }}>
          <span className="text-sm" style={{ color: isDark ? '#aaa' : '#666' }}>绱鎵撳紑</span>
          <span className="text-sm" style={{ color: titleColor }}>{user?.openTimes ?? '鈥?} 娆?/span>
        </div>
      </div>

      {/* 閫€鍑虹櫥褰?*/}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ color: '#e57373', border: '1px solid rgba(229,115,115,0.2)', background: cardBg }}
        onClick={logout}
      >
        閫€鍑虹櫥褰?
      </button>
    </div>
  )
}
