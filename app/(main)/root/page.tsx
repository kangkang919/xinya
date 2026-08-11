"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toMarkdown, downloadBlob } from "@/lib/export-utils"
import { DeleteDialog } from "@/components/DeleteDialog"
import { Sprout, Link, User as UserIcon, RotateCcw, Tags, Palette, Download, Info, ChevronDown } from "lucide-react"

interface User {
  email: string
  theme: string
  openTimes: number
}

interface TagItem {
  id: string
  name: string
  parentId: string | null
  isDefault: boolean
  entryCount: number
  children?: { id: string; name: string }[]
}

interface ExportEntry {
  title: string
  content: string
  tags: { name: string }[]
  createdAt: string
}

const THEMES = [
  { key: 'spring', label: '春日萌芽', sub: '嫩绿生机', color: '#8BC34A', bg: '#F4FBF0' },
  { key: 'night', label: '墨色幽微', sub: '深邃静谧', color: '#6B8F3C', bg: '#1E1E1E' },
]

const CHANGELOGS = [
  {
    version: 'v0.1.2',
    date: '2026年7月',
    prose: '根扎得更深，才能长得更稳。这一次，我们在你看不见的地方默默加固，让每一次记录都更安心、更流畅。',
    items: [
      '登录安全加固，守护你的每一篇心得',
      '页面加载更快，翻阅不再等待',
      '操作菜单轻触即收，界面更清爽',
      '多处细节修复，体验更顺滑',
    ],
  },
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
  const [currentTheme, setCurrentTheme] = useState('spring')
  const [saving, setSaving] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [savedTip, setSavedTip] = useState(false)

  // 标签管理
  const [tags, setTags] = useState<TagItem[]>([])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingParentId, setEditingParentId] = useState<string>('')
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)
  const [tagActionLoading, setTagActionLoading] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagParentId, setNewTagParentId] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

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

  // 学习画像
  const [profile, setProfile] = useState<{
    daysStudied: number
    totalQuestions: number
    accuracy: number
    recentDays: { date: string; correct: number; total: number }[]
    weakAreas: { tag: string; accuracy: number; count: number }[]
    strongAreas: { tag: string; accuracy: number; count: number }[]
  } | null>(null)

  // 重新播种（重置学习画像）
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetTip, setResetTip] = useState(false)

  // 数据导出
  const [exporting, setExporting] = useState(false)
  const [exportTip, setExportTip] = useState(false)

  // 分享管理
  const [showShareSection, setShowShareSection] = useState(false)
  const [shares, setShares] = useState<{
    id: string
    token: string
    url: string
    scope: string
    tagIds: string[]
    tagNames: string[]
    isActive: boolean
    isExpired: boolean
    daysRemaining: number
    expiresAt: string
    createdAt: string
  }[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [showCreateShare, setShowCreateShare] = useState(false)
  const [shareExpiresIn, setShareExpiresIn] = useState(7)
  const [shareScope, setShareScope] = useState<'all' | 'tags'>('all')
  const [shareTagIds, setShareTagIds] = useState<string[]>([])
  const [creatingShare, setCreatingShare] = useState(false)
  const [shareTip, setShareTip] = useState('')
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null)

  useEffect(() => {
    const localTheme = localStorage.getItem('xinya-theme')

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data) {
          setUser(data.data)
          const serverTheme = data.data.theme || 'spring'

          if (localTheme) {
            // localStorage 有值（用户可能在其他页面切换了主题），以本地为准
            setCurrentTheme(localTheme)
            applyTheme(localTheme)
          } else {
            // localStorage 为空（新用户首次登录），使用服务端主题
            setCurrentTheme(serverTheme)
            applyTheme(serverTheme)
            localStorage.setItem('xinya-theme', serverTheme)
          }
        }
      })
      .catch(() => {})

    // 如果 /api/auth/me 失败，回退到本地已有主题
    if (localTheme) {
      setCurrentTheme(localTheme)
      applyTheme(localTheme)
    }

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

    // 获取学习画像
    fetch('/api/review/profile')
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data) setProfile(data.data)
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

  function fetchShares() {
    setSharesLoading(true)
    fetch('/api/shares')
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) setShares(data.data)
      })
      .catch(() => {})
      .finally(() => setSharesLoading(false))
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
    setEditingParentId(tag.parentId || '')
    setDeletingTagId(null)
  }

  async function saveTagName(id: string) {
    if (!editingName.trim() || tagActionLoading) return
    setTagActionLoading(true)
    try {
      const body: { name: string; parentId?: string | null } = { name: editingName.trim() }
      // 只有当 parentId 实际变化时才发送
      const originalTag = tags.find(t => t.id === id)
      if (editingParentId !== (originalTag?.parentId || '')) {
        body.parentId = editingParentId || null
      }
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        fetchTags() // 重新拉取以获取正确的层级
        setEditingTagId(null)
      }
    } catch (_) {}
    setTagActionLoading(false)
  }

  async function createTag() {
    if (!newTagName.trim() || creatingTag) return
    setCreatingTag(true)
    try {
      const body: { name: string; parentId?: string } = { name: newTagName.trim() }
      if (newTagParentId) body.parentId = newTagParentId
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setNewTagName('')
        setNewTagParentId('')
        fetchTags()
      }
    } catch (_) {}
    setCreatingTag(false)
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

  async function handleResetProfile() {
    if (resetLoading) return
    setResetLoading(true)
    try {
      const res = await fetch('/api/review/reset', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setShowResetDialog(false)
        setProfile(null) // 画像已清零，答题后重新生长
        setResetTip(true)
        setTimeout(() => setResetTip(false), 3000)
      }
    } catch (_) {}
    setResetLoading(false)
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      const json = await res.json()
      if (!json.ok) throw new Error('导出失败')
      const entries: ExportEntry[] = json.data
      const now = new Date().toISOString().slice(0, 10)
      downloadBlob(toMarkdown(entries), `xinya-export-${now}.md`, 'text/markdown')
      setExportTip(true)
      setTimeout(() => setExportTip(false), 2000)
    } catch (_) {}
    setExporting(false)
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
          <span style={{ color: '#8BC34A', display: 'inline-block', width: '1.4em', textAlign: 'center' }}>🌿</span>根系
        </h1>
      </div>
      <p className="text-xs mb-5" style={{ color: dimColor }}>此处是你的根，安静而深厚</p>

      {/* ═══ 组1：身份与安全 ═══ */}
      <p className="text-[11px] mb-2" style={{ color: dimColor, letterSpacing: '2px' }}>身份与安全</p>

      {/* 账户信息 */}
      <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserIcon size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>账户信息</span>
          </div>
          <button
            onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordError(''); setPasswordTip('') }}
            className="text-xs"
            style={{ color: '#8BC34A' }}
          >
            {showPasswordForm ? '收起' : '设置密码'}
          </button>
        </div>
        <p className="text-sm font-medium mt-2.5" style={{ color: titleColor }}>
          {user?.email ?? '—'}
        </p>
        {!showPasswordForm && (
          <p className="text-[11px] mt-1" style={{ color: dimColor }}>设置后可使用密码登录</p>
        )}

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
              设置后可使用「密码登录」，忘记密码可通过邮箱链接登录后重新设置
            </p>
          </div>
        )}
      </div>


      {/* ═══ 组2：学习与成长 ═══ */}
      <div className="flex items-center gap-2 my-5">
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
        <span className="text-[11px]" style={{ color: dimColor, letterSpacing: '2px' }}>学习与成长</span>
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
      </div>

      {/* 拾遗 */}
      <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RotateCcw size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>拾遗</span>
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

      {/* 学习画像 */}
      {profile && (
        <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sprout size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
              <span className="text-sm font-medium" style={{ color: titleColor }}>学习画像</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetDialog(true)}
                className="text-xs transition"
                style={{ color: dimColor, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                重新播种
              </button>
              <ChevronDown size={16} style={{ color: subColor, transform: 'rotate(180deg)', transition: '0.3s' }} />
            </div>
          </div>

          {/* 概览统计 */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg" style={{ background: isDark ? '#333' : '#f9f9f9' }}>
              <p className="text-lg font-bold" style={{ color: '#8BC34A' }}>{profile.daysStudied}</p>
              <p className="text-xs" style={{ color: dimColor }}>学习天数</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: isDark ? '#333' : '#f9f9f9' }}>
              <p className="text-lg font-bold" style={{ color: '#2196F3' }}>{profile.totalQuestions}</p>
              <p className="text-xs" style={{ color: dimColor }}>答题总数</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: isDark ? '#333' : '#f9f9f9' }}>
              <p className="text-lg font-bold" style={{ color: '#FF8C42' }}>{profile.accuracy}%</p>
              <p className="text-xs" style={{ color: dimColor }}>准确率</p>
            </div>
          </div>

          {/* 近5日记录 */}
          {profile.recentDays.length > 0 && (
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: dimColor }}>近5日答题</p>
              <div className="space-y-1.5">
                {profile.recentDays.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: titleColor }}>{d.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: isDark ? '#444' : '#eee' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(d.correct / d.total) * 100}%`,
                            background: d.correct === d.total ? '#8BC34A' : '#FF8C42',
                          }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: dimColor }}>{d.correct}/{d.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 薄弱领域 */}
          {profile.weakAreas.length > 0 && (
            <div className="mb-3">
              <p className="text-xs mb-2" style={{ color: '#e57373' }}>⚠ 薄弱领域</p>
              <div className="space-y-1.5">
                {profile.weakAreas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(229,115,115,0.08)', border: '1px solid rgba(229,115,115,0.2)' }}>
                    <span className="text-xs" style={{ color: '#C62828' }}>#{a.tag}</span>
                    <span className="text-xs" style={{ color: '#e57373' }}>准确率 {a.accuracy}% · {a.count}题</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 掌握良好 */}
          {profile.strongAreas.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: '#8BC34A' }}>✓ 掌握良好</p>
              <div className="space-y-1.5">
                {profile.strongAreas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(139,195,74,0.08)', border: '1px solid rgba(139,195,74,0.2)' }}>
                    <span className="text-xs" style={{ color: '#2E7D32' }}>#{a.tag}</span>
                    <span className="text-xs" style={{ color: '#8BC34A' }}>准确率 {a.accuracy}% · {a.count}题</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 组3：内容管理 ═══ */}
      <div className="flex items-center gap-2 my-5">
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
        <span className="text-[11px]" style={{ color: dimColor, letterSpacing: '2px' }}>内容管理</span>
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
      </div>

      {/* 主题风格 */}
      <div className="rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}`, padding: 0 }}>
        <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Palette size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>主题风格</span>
          </div>
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

        {/* 分隔线 */}
        <div className="mx-4 h-px" style={{ background: isDark ? '#444' : '#f0f0f0' }} />

        {/* 标签管理 */}
        <div className="p-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowTags(!showTags)}
          >
          <div className="flex items-center gap-1.5">
            <Tags size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>标签管理</span>
          </div>
          <ChevronDown size={16} style={{ color: subColor, transform: showTags ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
        </button>
        {showTags && (
          <div className="mt-3">
            {/* 新建标签区域 */}
            <div className="mb-3 p-3 rounded-lg" style={{ background: isDark ? '#333' : '#f9f9f4', border: `1px dashed ${isDark ? '#555' : '#ddd'}` }}>
              <p className="text-xs mb-2" style={{ color: subColor }}>新建标签</p>
              <div className="flex items-center gap-2">
                <input
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createTag() }}
                  maxLength={8}
                  placeholder="标签名"
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                  style={{ border: `1.5px solid ${isDark ? '#555' : '#ccc'}`, background: 'transparent', color: titleColor }}
                />
                <select
                  value={newTagParentId}
                  onChange={e => setNewTagParentId(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg outline-none"
                  style={{ border: `1.5px solid ${isDark ? '#555' : '#ccc'}`, background: 'transparent', color: titleColor, maxWidth: '90px' }}
                >
                  <option value="">无父级</option>
                  {tags.filter(t => !t.parentId).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={createTag}
                  disabled={creatingTag || !newTagName.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                  style={{ background: (!newTagName.trim() || creatingTag) ? '#aaa' : '#8BC34A' }}
                >
                  添加
                </button>
              </div>
            </div>

            {tags.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: dimColor }}>还没有标签，在上方创建吧</p>
            ) : (
              <div className="space-y-1">
            {/* 顶级标签（包括有子标签的父标签） */}
            {tags.filter(t => !t.parentId).map(tag => (
              <div key={tag.id}>
                {/* 父标签正常行 */}
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
                      <button onClick={() => startEditTag(tag)} className="text-xs transition" style={{ color: dimColor }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                        </svg>
                      </button>
                      {!tag.isDefault && (
                        <button onClick={() => { setDeletingTagId(tag.id); setEditingTagId(null) }} className="text-xs transition" style={{ color: '#e57373' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 父标签编辑行 */}
                {editingTagId === tag.id && (
                  <div className="flex items-center gap-2 py-1 flex-wrap">
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTagName(tag.id); if (e.key === 'Escape') setEditingTagId(null) }}
                      className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                      style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent', minWidth: '80px' }}
                      autoFocus
                    />
                    <select
                      value={editingParentId}
                      onChange={e => setEditingParentId(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg outline-none"
                      style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent' }}
                    >
                      <option value="">无父级</option>
                      {tags.filter(t => !t.parentId && t.id !== tag.id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button onClick={() => saveTagName(tag.id)} disabled={tagActionLoading} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#8BC34A', color: '#fff' }}>保存</button>
                    <button onClick={() => setEditingTagId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: subColor, border: `1px solid ${cardBorder}` }}>取消</button>
                  </div>
                )}

                {/* 父标签删除确认行 */}
                {deletingTagId === tag.id && (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                    style={{ background: 'rgba(229,115,115,0.06)', border: '1px solid rgba(229,115,115,0.2)' }}>
                    <p className="text-xs" style={{ color: '#e57373' }}>
                      「{tag.name}」叶脉将随风而散，确认移除？
                    </p>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button onClick={() => deleteTag(tag.id)} disabled={tagActionLoading} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#e57373', color: '#fff' }}>移除</button>
                      <button onClick={() => setDeletingTagId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: subColor, border: `1px solid ${cardBorder}` }}>取消</button>
                    </div>
                  </div>
                )}

                {/* 子标签列表 */}
                {tag.children && tag.children.length > 0 && (
                  <div className="ml-4 pl-3 space-y-1" style={{ borderLeft: `1.5px solid ${isDark ? '#444' : '#e0e0e0'}` }}>
                    {tag.children.map(child => {
                      const childTag = tags.find(t => t.id === child.id)
                      if (!childTag) return null
                      return (
                        <div key={child.id}>
                          {editingTagId !== child.id && deletingTagId !== child.id && (
                            <div className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: 'rgba(139,195,74,0.06)', color: isDark ? '#8a8' : '#6a9a4f' }}>
                                  · {child.name}
                                </span>
                                <span className="text-xs flex-shrink-0" style={{ color: dimColor }}>
                                  {childTag.entryCount} 篇
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <button onClick={() => startEditTag(childTag)} className="text-xs transition" style={{ color: dimColor }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                                  </svg>
                                </button>
                                {!childTag.isDefault && (
                                  <button onClick={() => { setDeletingTagId(child.id); setEditingTagId(null) }} className="text-xs transition" style={{ color: '#e57373' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {editingTagId === child.id && (
                            <div className="flex items-center gap-2 py-1 flex-wrap">
                              <input
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveTagName(child.id); if (e.key === 'Escape') setEditingTagId(null) }}
                                className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
                                style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent', minWidth: '80px' }}
                                autoFocus
                              />
                              <select
                                value={editingParentId}
                                onChange={e => setEditingParentId(e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg outline-none"
                                style={{ border: '1.5px solid #8BC34A', color: titleColor, background: 'transparent' }}
                              >
                                <option value="">无父级</option>
                                {tags.filter(t => !t.parentId && t.id !== child.id).map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <button onClick={() => saveTagName(child.id)} disabled={tagActionLoading} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#8BC34A', color: '#fff' }}>保存</button>
                              <button onClick={() => setEditingTagId(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: subColor, border: `1px solid ${cardBorder}` }}>取消</button>
                            </div>
                          )}
                          {deletingTagId === child.id && (
                            <div className="flex items-center justify-between py-1 px-2 rounded-lg"
                              style={{ background: 'rgba(229,115,115,0.06)', border: '1px solid rgba(229,115,115,0.15)' }}>
                              <p className="text-xs" style={{ color: '#e57373' }}>确认移除「{child.name}」？</p>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                <button onClick={() => deleteTag(child.id)} disabled={tagActionLoading} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#e57373', color: '#fff' }}>移除</button>
                                <button onClick={() => setDeletingTagId(null)} className="text-xs px-2 py-0.5 rounded-lg" style={{ color: subColor, border: `1px solid ${cardBorder}` }}>取消</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
              </div>
            )}
          </div>
        )}
      </div>

        {/* 分隔线 */}
        <div className="mx-4 h-px" style={{ background: isDark ? '#444' : '#f0f0f0' }} />

        {/* 数据导出 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Download size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>导出心得</span>
          </div>
          {exportTip && (
            <span className="text-xs" style={{ color: '#8BC34A' }}>✓ 已开始下载</span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition"
          style={{
            background: 'rgba(139,195,74,0.08)',
            color: '#5a8a2f',
            border: '1px solid rgba(139,195,74,0.3)',
            opacity: exporting ? 0.6 : 1,
          }}
        >
          {exporting ? '导出中...' : '导出为 Markdown'}
        </button>
        </div>
      </div>

      {/* 分享管理 */}
      <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => {
            setShowShareSection(!showShareSection)
            if (!showShareSection) fetchShares()
          }}
        >
          <div className="flex items-center gap-1.5">
            <Link size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>分享管理</span>
          </div>
          <ChevronDown size={16} style={{ color: subColor, transform: showShareSection ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
        </button>
        {showShareSection && (
          <div className="mt-3">
            {/* 创建分享按钮 */}
            {!showCreateShare && (
              <button
                onClick={() => setShowCreateShare(true)}
                className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition"
                style={{
                  background: 'rgba(139,195,74,0.08)',
                  color: '#5a8a2f',
                  border: '1px solid rgba(139,195,74,0.3)',
                }}
              >
                + 创建分享链接
              </button>
            )}

            {/* 创建分享表单 */}
            {showCreateShare && (
              <div className="p-3 rounded-lg mb-3" style={{ background: isDark ? '#333' : '#f9f9f4', border: `1px dashed ${isDark ? '#555' : '#ddd'}` }}>
                <p className="text-xs mb-2" style={{ color: subColor }}>创建分享链接</p>
                
                {/* 有效期选择 */}
                <div className="mb-2">
                  <p className="text-xs mb-1" style={{ color: dimColor }}>有效期</p>
                  <div className="flex gap-2">
                    {[7, 30, 90].map(days => (
                      <button
                        key={days}
                        onClick={() => setShareExpiresIn(days)}
                        className="flex-1 py-1.5 rounded-lg text-xs transition"
                        style={{
                          background: shareExpiresIn === days ? '#8BC34A' : (isDark ? '#444' : '#fff'),
                          color: shareExpiresIn === days ? '#fff' : titleColor,
                          border: `1px solid ${shareExpiresIn === days ? '#8BC34A' : (isDark ? '#555' : '#ddd')}`,
                        }}
                      >
                        {days}天
                      </button>
                    ))}
                  </div>
                </div>

                {/* 分享范围 */}
                <div className="mb-3">
                  <p className="text-xs mb-1" style={{ color: dimColor }}>分享范围</p>
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => { setShareScope('all'); setShareTagIds([]) }}
                      className="flex-1 py-1.5 rounded-lg text-xs transition"
                      style={{
                        background: shareScope === 'all' ? '#8BC34A' : (isDark ? '#444' : '#fff'),
                        color: shareScope === 'all' ? '#fff' : titleColor,
                        border: `1px solid ${shareScope === 'all' ? '#8BC34A' : (isDark ? '#555' : '#ddd')}`,
                      }}
                    >
                      全部心得
                    </button>
                    <button
                      onClick={() => setShareScope('tags')}
                      className="flex-1 py-1.5 rounded-lg text-xs transition"
                      style={{
                        background: shareScope === 'tags' ? '#8BC34A' : (isDark ? '#444' : '#fff'),
                        color: shareScope === 'tags' ? '#fff' : titleColor,
                        border: `1px solid ${shareScope === 'tags' ? '#8BC34A' : (isDark ? '#555' : '#ddd')}`,
                      }}
                    >
                      指定标签
                    </button>
                  </div>
                  {shareScope === 'tags' && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg" style={{ background: isDark ? '#2a2a2a' : '#fff', border: `1px solid ${isDark ? '#555' : '#eee'}` }}>
                      {tags.filter(t => !t.parentId).map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setShareTagIds(prev => 
                              prev.includes(tag.id) 
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            )
                          }}
                          className="text-xs px-2 py-1 rounded-full transition"
                          style={{
                            background: shareTagIds.includes(tag.id) ? '#8BC34A' : 'transparent',
                            color: shareTagIds.includes(tag.id) ? '#fff' : titleColor,
                            border: `1px solid ${shareTagIds.includes(tag.id) ? '#8BC34A' : (isDark ? '#555' : '#ddd')}`,
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (creatingShare) return
                      if (shareScope === 'tags' && shareTagIds.length === 0) {
                        setShareTip('请至少选择一个标签')
                        return
                      }
                      setCreatingShare(true)
                      setShareTip('')
                      try {
                        const res = await fetch('/api/shares', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            expiresInDays: shareExpiresIn,
                            scope: shareScope,
                            tagIds: shareTagIds,
                          }),
                        })
                        const data = await res.json()
                        if (data.ok) {
                          setShowCreateShare(false)
                          setShareTip('')
                          // 重置表单状态
                          setShareExpiresIn(7)
                          setShareScope('all')
                          setShareTagIds([])
                          fetchShares()
                          // 复制链接
                          navigator.clipboard.writeText(data.data.url).catch(() => {})
                          setShareTip('链接已创建并复制 ')
                          setTimeout(() => setShareTip(''), 3000)
                        } else {
                          setShareTip(data.error || '创建失败')
                        }
                      } catch (_) {
                        setShareTip('网络错误')
                      }
                      setCreatingShare(false)
                    }}
                    disabled={creatingShare}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition"
                    style={{ background: creatingShare ? '#aaa' : '#8BC34A' }}
                  >
                    {creatingShare ? '创建中…' : '确认创建'}
                  </button>
                  <button
                    onClick={() => { setShowCreateShare(false); setShareTip('') }}
                    className="px-4 py-2 rounded-lg text-xs transition"
                    style={{ color: subColor, border: `1px solid ${cardBorder}` }}
                  >
                    取消
                  </button>
                </div>
                {shareTip && (
                  <p className="text-xs mt-2" style={{ color: shareTip.includes('已') ? '#8BC34A' : '#e57373' }}>
                    {shareTip}
                  </p>
                )}
              </div>
            )}

            {/* 分享链接列表 */}
            {sharesLoading ? (
              <p className="text-xs text-center py-3" style={{ color: dimColor }}>加载中…</p>
            ) : shares.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: dimColor }}>还没有分享链接</p>
            ) : (
              <div className="space-y-2">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="p-3 rounded-lg"
                    style={{ 
                      background: isDark ? '#333' : '#fafafa', 
                      border: `1px solid ${share.isActive ? (isDark ? '#555' : '#eee') : (isDark ? '#444' : '#f0f0f0')}`,
                      opacity: share.isActive ? 1 : 0.6,
                    }}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: titleColor }}>
                          {share.scope === 'all' ? '全部心得' : share.tagNames.join('、')}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: dimColor }}>
                          创建于 {new Date(share.createdAt).toLocaleDateString('zh-CN')} · 
                          {share.isActive 
                            ? `剩余 ${share.daysRemaining} 天`
                            : share.isExpired ? '已过期' : '已撤销'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {share.isActive ? (
                        <>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(share.url).catch(() => {})
                              setShareTip('链接已复制 🌿')
                              setTimeout(() => setShareTip(''), 2000)
                            }}
                            className="flex-1 py-1.5 rounded-lg text-xs transition"
                            style={{ 
                              background: 'rgba(139,195,74,0.1)', 
                              color: '#5a8a2f',
                              border: '1px solid rgba(139,195,74,0.2)',
                            }}
                          >
                            复制链接
                          </button>
                          {deletingShareId === share.id ? (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/shares/${share.id}`, { method: 'DELETE' })
                                    // 从列表中彻底移除
                                    setShares(prev => prev.filter(s => s.id !== share.id))
                                  } catch (_) {}
                                  setDeletingShareId(null)
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs text-white"
                                style={{ background: '#e57373' }}
                              >
                                确认删除
                              </button>
                              <button
                                onClick={() => setDeletingShareId(null)}
                                className="px-2 py-1.5 rounded-lg text-xs"
                                style={{ color: subColor, border: `1px solid ${cardBorder}` }}
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeletingShareId(share.id)}
                              className="px-3 py-1.5 rounded-lg text-xs transition"
                              style={{ color: '#e57373', border: '1px solid rgba(229,115,115,0.3)' }}
                            >
                              撤销
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/shares/${share.id}`, { method: 'DELETE' })
                              setShares(prev => prev.filter(s => s.id !== share.id))
                            } catch (_) {}
                          }}
                          className="flex-1 py-1.5 rounded-lg text-xs transition"
                          style={{ color: dimColor, border: `1px solid ${cardBorder}` }}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {shareTip && !showCreateShare && (
              <p className="text-xs mt-2 text-center" style={{ color: '#8BC34A' }}>{shareTip}</p>
            )}
          </div>
        )}
      </div>

      {/* ═══ 组4：关于 ═══ */}
      <div className="flex items-center gap-2 my-5">
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
        <span className="text-[11px]" style={{ color: dimColor, letterSpacing: '2px' }}>关于</span>
        <div className="flex-1 h-px" style={{ background: cardBorder }} />
      </div>

      <div className="p-4 rounded-xl mb-3" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setShowChangelog(!showChangelog)}
        >
          <div className="flex items-center gap-1.5">
            <Info size={14} strokeWidth={2} style={{ color: '#8BC34A' }} />
            <span className="text-sm font-medium" style={{ color: titleColor }}>版本更新</span>
          </div>
          <ChevronDown size={16} style={{ color: subColor, transform: showChangelog ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
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

      </div>

      {/* 累计打开 */}
      <div className="p-4 rounded-xl mb-3 flex justify-between" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
        <span className="text-sm font-medium" style={{ color: titleColor }}>累计打开</span>
        <span className="text-sm" style={{ color: titleColor }}>{user?.openTimes ?? '—'} 次</span>
      </div>

      {/* 退出登录 */}
      <button
        className="w-full py-3 rounded-xl text-sm font-medium"
        style={{ color: '#e57373', border: '1px solid rgba(229,115,115,0.2)', background: cardBg }}
        onClick={logout}
      >
        退出登录
      </button>

      {/* 重新播种确认弹窗 */}
      <DeleteDialog
        open={showResetDialog}
        heading="重新播种"
        description="过往的答题痕迹将如落叶归根，化作春泥。学习画像将清零，今天会重新为你出一道题。确认要重新开始吗？"
        confirmText="确认播种"
        loadingText="播种中…"
        confirmColor="#8BC34A"
        loading={resetLoading}
        onConfirm={handleResetProfile}
        onCancel={() => setShowResetDialog(false)}
      />

      {/* 重新播种成功提示 */}
      {resetTip && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs text-white animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.75)', whiteSpace: 'nowrap' }}>
          已重新播种，去萌芽页领取今日的第一道题吧 🌱
        </div>
      )}
    </div>
  )
}
