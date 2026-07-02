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
  { key: 'spring', label: '春日萌芽', sub: '嫩绿生机', color: '#8BC34A', bg: '#F4FBF0' },
  { key: 'summer', label: '夏日繁茂', sub: '蔚蓝清凉', color: '#2196F3', bg: '#EEF6FE' },
  { key: 'autumn', label: '秋日暖阳', sub: '暖橙丰收', color: '#FF8C42', bg: '#FAFAF5' },
  { key: 'winter', label: '冬日静谧', sub: '银灰沉静', color: '#90A4AE', bg: '#F5F5F7' },
  { key: 'night', label: '暗夜', sub: '深邃静谧', color: '#6B8F3C', bg: '#1E1E1E' },
]

const CHANGELOGS = [
  {
    version: 'v0.1.1',
    date: '2026年6月',
    prose: '如一株幼苗，在阳光与雨露中悄然舒展。这一次，我们为你带来了更丰富的登录方式、更沉浸的视觉体验，以及更多成长的痕迹。',
    items: [
      'Magic Link 邮箱链接登录，无需记忆密码',
      '15 个测试账号，一键体验完整功能',
      '暗夜主题上线，深邃中感受静谧',
      '新用户引导优化，每一步都可跳过',
    ],
  },
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

export default function RootPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [currentTheme, setCurrentTheme] = useState('autumn')
  const [saving, setSaving] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [savedTip, setSavedTip] = useState(false)

  // 标签管理
  const [tags, setTags] = useState<TagItem[]>([])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)
  const [tagActionLoading, setTagActionLoading] = useState(false)
  const [showTags, setShowTags] = useState(false)

  // 密码设置
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordTip, setPasswordTip] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 拾遗设置
  const [entryCount, setEntryCount] = useState(0)
  const [reviewEnabled, setReviewEnabled] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)

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

    // 获取拾遗设置
    fetch('/api/review/settings')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setEntryCount(data.data.entryCount)
          setReviewEnabled(data.data.reviewEnabled)
        }
      })
      .catch(() => {})
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

  async function handleSetPassword() {
    setPasswordError('')
    setPasswordTip('')

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('密码至少6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致')
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!data.ok) {
        setPasswordError(data.error || '设置失败')
        return
      }
      setPasswordTip('密码设置成功')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordTip('')
        setShowPasswordForm(false)
      }, 2000)
    } catch (_) {
      setPasswordError('网络问题，请稍后再试')
    }
    setPasswordLoading(false)
  }

  async function toggleReview() {
    if (entryCount < 20) return
    setReviewLoading(true)
    try {
      const res = await fetch('/api/review/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewEnabled: !reviewEnabled }),
      })
      const data = await res.json()
      if (data.ok) {
        setReviewEnabled(!reviewEnabled)
      }
    } catch (_) {}
    setReviewLoading(false)
  }

  const isDark = currentTheme === 'night'
  const cardBg = isDark ? '#2A2A2A' : '#fff'
  const cardBorder = isDark ? '#444' : '#eee'
  const titleColor = isDark ? '#E0E0E0' : '#333'
  const subColor = isDark ? '#999' : '#999'
  const dimColor = isDark ? '#666' : '#bbb'

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold" style={{ color: titleColor }}>
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}></span>根系
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: dimColor }}>此处是你的根，安静而深厚</p>

      {/* 账号 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: subColor }}>账号</p>
          <button
            onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordError(''); setPasswordTip('') }}
            className="text-xs"
            style={{ color: '#8BC34A' }}
          >
            {showPasswordForm ? '收起' : '设置密码'}
          </button>
        </div>
        <p className="text-sm font-medium" style={{ color: titleColor }}>
          {user?.email ?? '—'}
        </p>

        {showPasswordForm && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${isDark ? '#444' : '#f0f0f0'}` }}>
            {passwordTip && (
              <p className="text-xs mb-2" style={{ color: '#8BC34A' }}>{passwordTip}</p>
            )}
            {passwordError && (
              <p className="text-xs mb-2" style={{ color: '#e57373' }}>{passwordError}</p>
            )}
            <input
              type="password"
              placeholder="输入新密码（至少6位）"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-sketch w-full px-3 py-2 text-sm outline-none mb-2"
              style={{ border: `1.5px solid ${isDark ? '#555' : '#ccc'}`, background: isDark ? '#333' : '#fafaf5', color: titleColor }}
            />
            <input
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              className="input-sketch w-full px-3 py-2 text-sm outline-none mb-2"
              style={{ border: `1.5px solid ${isDark ? '#555' : '#ccc'}`, background: isDark ? '#333' : '#fafaf5', color: titleColor }}
            />
            <button
              onClick={handleSetPassword}
              disabled={passwordLoading}
              className="btn-sketch w-full py-2 text-sm font-medium text-white transition-opacity"
              style={{ background: passwordLoading ? '#aaa' : '#8BC34A' }}
            >
              {passwordLoading ? '设置中…' : '确认设置'}
            </button>
            <p className="text-xs mt-2" style={{ color: dimColor }}>
              设置后可使用「使用密码登陆」，忘记密码可通过邮箱链接登录后重新设置
            </p>
          </div>
        )}
      </div>

      {/* 主题风格 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: subColor }}>主题风格</p>
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
                  background: isSelected ? t.bg : (isDark ? '#333' : '#FAFAFA'),
                  border: `2px solid ${isSelected ? t.color : (isDark ? '#555' : '#eee')}`,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <span className="text-sm font-medium" style={{ color: titleColor }}>{t.label}</span>
                  {isSelected && <span className="ml-auto text-xs" style={{ color: t.color }}>✓</span>}
                </div>
                <p className="text-xs" style={{ color: subColor }}>{t.sub}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 标签管理 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowTags(!showTags)}
        >
          <p className="text-xs" style={{ color: subColor }}>标签管理</p>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke={subColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showTags ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {showTags && (
          <div className="mt-3">
            {tags.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: dimColor }}>还没有标签，播种心得时创建吧</p>
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
                      <span className="text-xs flex-shrink-0" style={{ color: dimColor }}>
                        {tag.entryCount} 篇
                      </span>
                      {tag.isDefault && (
                        <span className="text-xs flex-shrink-0" style={{ color: dimColor }}>默认</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      {/* 编辑 */}
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
                      style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent' }}
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
                      style={{ color: subColor, border: `1px solid ${cardBorder}` }}
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
                        style={{ color: subColor, border: `1px solid ${cardBorder}` }}
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
        )}
      </div>

      {/* 拾遗设置 */}
      <div className="p-4 rounded-xl mb-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: titleColor }}>拾遗</p>
            <p className="text-xs mt-1" style={{ color: dimColor }}>
              {entryCount < 20 ? `写满${20 - entryCount}篇心得，解锁AI回顾` : 'AI每日回顾，错题智能加强'}
            </p>
          </div>
          <button
            onClick={toggleReview}
            disabled={reviewLoading || entryCount < 20}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition"
            style={{
              background: reviewEnabled ? '#8BC34A' : (isDark ? '#333' : '#f0f0f0'),
              color: reviewEnabled ? '#fff' : (entryCount < 20 ? '#999' : (isDark ? '#aaa' : '#666')),
              opacity: entryCount < 20 ? 0.5 : 1,
            }}
          >
            {reviewEnabled ? '已开启' : '开启'}
          </button>
        </div>
      </div>

      {/* 版本 & 开打次数 */}
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
            <span className="text-sm" style={{ color: isDark ? '#aaa' : '#666' }}>版本更新</span>
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
                      <span style={{ color: '#8BC34A', flexShrink: 0 }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: `1px solid ${isDark ? '#444' : '#f0f0f0'}` }}>
          <span className="text-sm" style={{ color: isDark ? '#aaa' : '#666' }}>累计打开</span>
          <span className="text-sm" style={{ color: titleColor }}>{user?.openTimes ?? '—'} 次</span>
        </div>
      </div>

      {/* 退出登录 */}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ color: '#e57373', border: '1px solid rgba(229,115,115,0.2)', background: cardBg }}
        onClick={logout}
      >
        退出登录
      </button>
    </div>
  )
}
