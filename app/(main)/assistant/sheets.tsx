// 豆苗：记忆清单 / 设置 弹层（需求文档 §9.3）
// MemorySheet：🧠 记忆清单（可逐条删除）；SettingSheet：⚙️ 三维设置（对话中不可改的说明见底部规则）
// 注意：两个弹层均由父级「打开时挂载、关闭时卸载」，故组件内部直接用挂载时机初始化数据
"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useTheme } from "@/lib/useTheme"
import { DIMS } from "./dims"

// ============ 弹层外壳（居中卡片，移动端/桌面通用） ============
function SheetShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const { cardBg, cardBorder, titleColor, subColor } = useTheme()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col animate-fade-in"
        style={{ background: cardBg, border: `1px solid ${cardBorder}`, maxHeight: "82vh" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${cardBorder}` }}
        >
          <span className="text-sm font-semibold" style={{ color: titleColor }}>
            {title}
          </span>
          <button
            className="text-xs px-2 py-1 rounded-lg hover:opacity-70"
            style={{ color: subColor }}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}

// ============ 记忆条目 ============
export interface MemoryItem {
  id: string
  type: "interest" | "weak"
  title: string
  description: string | null
  source: string
  createdAt: string
}

// 记忆类型徽章配色（兴趣=绿 / 薄弱=橙）
const TYPE_BADGE: Record<MemoryItem["type"], { text: string; bg: string }> = {
  interest: { text: "#4a7a2a", bg: "rgba(139,195,74,0.16)" },
  weak: { text: "#c46a20", bg: "rgba(255,140,66,0.16)" },
}
const SOURCE_TEXT: Record<string, string> = {
  dialogue: "对话中了解",
  quiz: "答题中发现",
  user_specified: "你告诉我的",
}

// ============ 🧠 记忆清单弹层 ============
export function MemorySheet({ onClose }: { onClose: () => void }) {
  const { cardBg, cardBorder, titleColor, subColor, dimColor } = useTheme()
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 挂载即拉取最新清单
  useEffect(() => {
    let cancelled = false
    fetch("/api/assistant/memories")
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d.ok) setMemories(d.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/assistant/memories/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (d.ok) {
        setMemories(prev => prev.filter(m => m.id !== id))
        toast.success("已忘记这条记忆")
      } else {
        toast.error(d.error || "删除失败")
      }
    } catch {
      toast.error("网络错误")
    }
    setDeletingId(null)
  }

  return (
    <SheetShell title="🧠 豆苗的记忆" onClose={onClose}>
      <div className="overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-xs text-center py-6" style={{ color: dimColor }}>
            加载中…
          </p>
        ) : memories.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-2xl mb-2">🌱</p>
            <p className="text-xs leading-relaxed" style={{ color: subColor }}>
              还没有记忆～和豆苗多聊聊，或完成几轮答题，
              <br />
              它会慢慢了解你的兴趣和薄弱点
            </p>
          </div>
        ) : (
          memories.map(m => {
            const badge = TYPE_BADGE[m.type] || TYPE_BADGE.interest
            return (
              <div
                key={m.id}
                className="flex items-start gap-2 rounded-xl p-3"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{ color: badge.text, background: badge.bg }}
                >
                  {m.type === "interest" ? "兴趣" : "薄弱"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-snug" style={{ color: titleColor }}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="text-[11px] mt-1 leading-relaxed break-words" style={{ color: subColor }}>
                      {m.description}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: dimColor }}>
                    {SOURCE_TEXT[m.source] || m.source}
                  </p>
                </div>
                <button
                  className="text-[11px] flex-shrink-0 px-1.5 py-0.5 rounded-lg hover:opacity-60 disabled:opacity-40"
                  style={{ color: "#e57373" }}
                  disabled={deletingId === m.id}
                  title="删除这条记忆"
                  onClick={() => handleDelete(m.id)}
                >
                  删除
                </button>
              </div>
            )
          })
        )}
      </div>
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${cardBorder}` }}
      >
        <p className="text-[10.5px] leading-relaxed" style={{ color: dimColor }}>
          豆苗只记录心得相关的兴趣与薄弱点；删除后立即生效，之后不再使用这条记忆。
        </p>
      </div>
    </SheetShell>
  )
}

// ============ 设置弹层 ============
// 维度单选组（模块级组件，避免渲染期创建）
function DimGroup({
  label,
  value,
  options,
  onPick,
  theme,
}: {
  label: string
  value: string
  options: { t: string; d: string }[]
  onPick: (t: string) => void
  theme: { titleColor: string; subColor: string; cardBorder: string }
}) {
  return (
    <div className="mb-4">
      <div className="text-[13px] font-semibold mb-1.5" style={{ color: theme.titleColor }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o.t}
            title={o.d}
            className="text-xs px-2.5 py-1.5 rounded-full border transition-all"
            style={{
              color: value === o.t ? "#fff" : theme.subColor,
              background: value === o.t ? "var(--color-primary)" : "transparent",
              borderColor: value === o.t ? "var(--color-primary)" : theme.cardBorder,
            }}
            onClick={() => onPick(o.t)}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SettingSheetProps {
  profile: { tone: string; teach: string; call: string; freeDesc: string }
  onClose: () => void
  onSaved: (p: { tone: string; teach: string; call: string; freeDesc: string }) => void
}

export function SettingSheet({ profile, onClose, onSaved }: SettingSheetProps) {
  const { cardBorder, titleColor, subColor, dimColor, inputBg, inputBorder } = useTheme()
  const [tone, setTone] = useState(profile.tone)
  const [teach, setTeach] = useState(profile.teach)
  const [call, setCall] = useState(profile.call)
  const [free, setFree] = useState(profile.freeDesc)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/assistant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, teach, call, freeDesc: free.trim().slice(0, 200) }),
      })
      const d = await res.json()
      if (d.ok) {
        toast.success("人设已更新，下次对话生效")
        onSaved({ tone, teach, call, freeDesc: free.trim().slice(0, 200) })
        onClose()
      } else {
        toast.error(d.error || "保存失败")
      }
    } catch {
      toast.error("网络错误")
    }
    setSaving(false)
  }

  const theme = { titleColor, subColor, cardBorder }

  return (
    <SheetShell
      title="⚙️ 豆苗设置"
      onClose={onClose}
      footer={
        <div
          className="px-4 pt-3 pb-4 flex-shrink-0 space-y-2.5"
          style={{ borderTop: `1px solid ${cardBorder}` }}
        >
          <p className="text-[10.5px] leading-relaxed" style={{ color: dimColor }}>
            💡 预设选项是豆苗性格的骨架，自由描述只做局部润色、不会覆盖选项；
            改动仅影响之后的对话（对话中的豆苗保持不变）。
          </p>
          <button
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      }
    >
      <div className="overflow-y-auto px-4 py-3">
        <DimGroup label="语气风格" value={tone} options={DIMS.tone.options} onPick={setTone} theme={theme} />
        <DimGroup label="指导方式" value={teach} options={DIMS.teach.options} onPick={setTeach} theme={theme} />
        <DimGroup label="角色称呼" value={call} options={DIMS.call.options} onPick={setCall} theme={theme} />

        <div className="text-[13px] font-semibold mb-1.5" style={{ color: titleColor }}>
          自由描述（可选）
          <span className="font-normal text-[10.5px] ml-1" style={{ color: dimColor }}>
            · 仅做局部润色 · ≤200 字
          </span>
        </div>
        <textarea
          className="w-full rounded-xl border px-3 py-2 text-[13px] resize-none outline-none"
          style={{ borderColor: inputBorder, background: inputBg, color: titleColor, minHeight: 64 }}
          placeholder="给豆苗加点独特的语气细节……"
          value={free}
          onChange={e => setFree(e.target.value.slice(0, 200))}
        />
      </div>
    </SheetShell>
  )
}
