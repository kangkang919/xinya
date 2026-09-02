// 豆苗：主页面（需求文档 §9 + PRD §5）
// 状态机：loading → wizard（向导未完成）→ chat / empty（知识库 0 篇）
// 聊天采用「单一会话」：无会话列表，历史消息同一列表内向上翻看
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Brain, Loader2, Send, Settings } from "lucide-react"
import { useTheme } from "@/lib/useTheme"
import { beijingDateString, getBeijingDateParts } from "@/lib/utils"
import { Avatar, type ProfileState } from "./dims"
import Wizard from "./wizard"
import { MemorySheet, SettingSheet } from "./sheets"
import { DeleteDialog } from "@/components/DeleteDialog"

// ============ 常量 ============
// 快捷提问（提问后整条隐藏）
const CHIPS = [
  { emoji: "💪", text: "我哪里比较薄弱？" },
  { emoji: "🌱", text: "我最近学习状态怎么样？" },
  { emoji: "☀️", text: "今天天气怎么样？" },
]
// 无历史消息时豆苗的虚拟打招呼（不落库，仅本地展示；清空历史后重新出现）
const GREETING_TEXT = "我是豆苗～你的学习心得小助手 🌱\n有什么想聊的？可以问我写过什么、哪里薄弱，或者让我考考你。"

interface Msg {
  id: string
  role: "user" | "assistant"
  content: string
  retrievedTag: string | null
  createdAt: string
}

interface ProfileResp extends ProfileState {
  entryCount: number
}

// 北京时间日期分隔标签（今天/昨天/具体日期）
function dateLabel(iso: string): string {
  const { y, m, d } = getBeijingDateParts(new Date(iso))
  const now = new Date()
  const today = getBeijingDateParts(now)
  const yesterday = getBeijingDateParts(new Date(now.getTime() - 86400000))
  if (y === today.y && m === today.m && d === today.d) return "今天"
  if (y === yesterday.y && m === yesterday.m && d === yesterday.d) return "昨天"
  return y === now.getFullYear() ? `${m}月${d}日` : `${y}年${m}月${d}日`
}

const isLocal = (id: string) => id.startsWith("local-")

// 本地临时消息的 id/时间（不入库；id 带自增序号避免同毫秒冲突）
let localSeq = 0
function localMsgId(prefix: "u" | "a"): string {
  localSeq += 1
  return `local-${prefix}-${Date.now()}-${localSeq}`
}
function nowIso(): string {
  return new Date().toISOString()
}

// ============ 主页面 ============
export default function AssistantPage() {
  const router = useRouter()
  const { isDark, cardBg, cardBorder, titleColor, dimColor, inputBg, inputBorder } = useTheme()
  const [stage, setStage] = useState<"loading" | "wizard" | "chat" | "empty">("loading")
  const [profile, setProfile] = useState<ProfileResp | null>(null)

  // 初始化：加载配置（向导未完成 → 向导；向导已完成但知识库 0 篇 → 空态；否则进入聊天）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/assistant/profile")
        const d = await res.json()
        if (cancelled || !d.ok) return
        setProfile(d.data)
        if (!d.data.wizardDone) setStage("wizard")
        else setStage(d.data.entryCount === 0 ? "empty" : "chat")
      } catch {
        if (!cancelled) toast.error("网络错误")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 向导完成：保存人设 + wizardDone=true，然后回到状态判定
  async function handleWizardFinish(p: { tone: string; teach: string; call: string; freeDesc: string }) {
    try {
      const res = await fetch("/api/assistant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, wizardDone: true }),
      })
      const d = await res.json()
      if (!d.ok) {
        toast.error(d.error || "保存失败")
        return
      }
      setProfile(prev => (prev ? { ...prev, ...p, wizardDone: true } : prev))
      setStage((profile?.entryCount ?? 0) > 0 ? "chat" : "empty")
    } catch {
      toast.error("网络错误")
    }
  }

  return (
    <div className="h-[calc(100dvh-6rem)] max-w-[760px] mx-auto flex flex-col min-h-0">
      {stage === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: dimColor }}>
            加载中…
          </p>
        </div>
      )}

      {stage === "wizard" && <Wizard onFinish={handleWizardFinish} />}

      {stage === "empty" && profile && (
        <EmptyView entryCount={profile.entryCount} onGoWrite={() => router.push("/entry/new")} />
      )}

      {stage === "chat" && profile && (
        <ChatView profile={profile} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} titleColor={titleColor} dimColor={dimColor} inputBg={inputBg} inputBorder={inputBorder} />
      )}
    </div>
  )
}

// ============ 0 心得空态 ============
// TODO 提示文案待定稿（需求文档 §13 待确认 #1，当前为原型候选版）
function EmptyView({ entryCount, onGoWrite }: { entryCount: number; onGoWrite: () => void }) {
  const { isDark, cardBg, cardBorder, dimColor } = useTheme()
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 顶栏 */}
      <header
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}` }}
      >
        <Avatar size={34} gray />
        <div className="flex-1 min-w-0 px-0.5">
          <div className="text-[15px] font-bold truncate" style={{ color: "var(--color-brown)" }}>
            豆苗
          </div>
          <div className="text-[11px] truncate" style={{ color: "#999" }}>
            知识库 {entryCount} 篇
          </div>
        </div>
        <span
          className="text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0"
          style={{ color: "#5a8a2a", background: "rgba(139,195,74,0.14)", border: "1px solid rgba(174,213,129,0.6)" }}
        >
          学习助手
        </span>
      </header>

      {/* 空态主体 */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center px-8 gap-3 pb-10">
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid var(--color-primary-light)",
            background: "#fff",
            filter: "grayscale(1) opacity(0.5)",
            boxShadow: "0 6px 18px rgba(139,195,74,0.2)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assistant/doumiao-avatar.png"
            alt="豆苗"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
          />
        </div>
        <h3 className="text-base font-bold" style={{ color: "var(--color-brown)" }}>
          豆苗还在等你写第一篇心得 🌱
        </h3>
        <p className="text-[13px] leading-relaxed" style={{ color: isDark ? "#999" : "#666", maxWidth: 300 }}>
          我了解的知识都来自你写下的心得。现在知识库还是空的，我能帮你的还很有限——先去写一篇心得吧，写下的每一篇都会让我更懂你。
        </p>
        <button
          className="px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 mt-1"
          style={{ background: "var(--color-primary)" }}
          onClick={onGoWrite}
        >
          ✍️ 去写心得
        </button>
        <p className="text-[11.5px]" style={{ color: dimColor }}>
          · 心得达到一定数量后，我能回答的问题会越来越多 ·
        </p>
      </div>
    </div>
  )
}

// ============ 聊天视图 ============
interface ChatProps {
  profile: ProfileResp
  isDark: boolean
  cardBg: string
  cardBorder: string
  titleColor: string
  dimColor: string
  inputBg: string
  inputBorder: string
}

function ChatView({ profile, isDark, cardBg, cardBorder, titleColor, dimColor, inputBg, inputBorder }: ChatProps) {
  const [cur, setCur] = useState<ProfileResp>(profile)
  const [messages, setMessages] = useState<Msg[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState("")
  const [showMemory, setShowMemory] = useState(false)
  const [showSetting, setShowSetting] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickBottom = useRef(true) // 用户上翻历史时停止自动滚底

  // 首次进入：加载最近 30 轮
  useEffect(() => {
    let cancelled = false
    fetch("/api/assistant/messages?limit=30")
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.ok) return
        setMessages(d.data.messages)
        setHasMore(d.data.hasMore)
        stickBottom.current = true
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // 消息/输入状态变化 → 若停留在底部则跟随滚动
  useEffect(() => {
    if (!stickBottom.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    // 是否粘底
    stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    // 滚动到顶部 → 加载更早历史
    if (el.scrollTop < 30 && hasMore && !loadingMore && messages.length > 0) {
      loadEarlier(el)
    }
  }

  // 向上翻更早历史（before 取最早一条服务端消息 id，本地临时消息不参与游标）
  async function loadEarlier(el: HTMLDivElement) {
    const before = messages.find(m => !isLocal(m.id))?.id
    if (!before) return
    setLoadingMore(true)
    const prevHeight = el.scrollHeight
    try {
      const res = await fetch(`/api/assistant/messages?limit=30&before=${before}`)
      const d = await res.json()
      if (d.ok && d.data.messages.length > 0) {
        setMessages(prev => [...d.data.messages, ...prev])
        setHasMore(d.data.hasMore)
        // 保持首屏内容不跳动：滚动到「新插入的旧消息」之后
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight
        })
      } else {
        setHasMore(false)
      }
    } catch {
      /* 静默 */
    }
    setLoadingMore(false)
  }

  // 发送消息
  async function handleSend(text?: string) {
    const q = (text ?? input).trim()
    if (!q || sending) return
    setInput("")
    setSending(true)
    stickBottom.current = true
    const uid = localMsgId("u")
    setMessages(prev => [...prev, { id: uid, role: "user", content: q, retrievedTag: null, createdAt: nowIso() }])
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const d = await res.json()
      if (d.ok && d.data?.reply) {
        setMessages(prev => [
          ...prev,
          { id: localMsgId("a"), role: "assistant", content: d.data.reply, retrievedTag: d.data.retrievedTag || null, createdAt: nowIso() },
        ])
      } else {
        toast.error(d.error || "豆苗走神了，请稍后再试")
        // 服务端未落库 → 回滚本地临时消息
        setMessages(prev => prev.filter(m => m.id !== uid))
      }
    } catch {
      toast.error("网络错误，请稍后再试")
      setMessages(prev => prev.filter(m => m.id !== uid))
    }
    setSending(false)
  }

  // 清空对话历史（配置与记忆保留）
  async function handleClear() {
    if (clearing) return
    setClearing(true)
    try {
      const res = await fetch("/api/assistant/messages", { method: "DELETE" })
      const d = await res.json()
      if (d.ok) {
        setMessages([])
        setHasMore(false)
        setShowClear(false)
        toast.success("已清空，豆苗重新打招呼啦")
      } else {
        toast.error(d.error || "清空失败")
      }
    } catch {
      toast.error("网络错误")
    }
    setClearing(false)
  }

  // 无历史消息时用虚拟打招呼补位（清空历史/首次进入均出现；createdAt 挂载时固定一次）
  const [greetAt] = useState(() => new Date().toISOString())
  const renderMsgs: Msg[] =
    messages.length === 0
      ? [{ id: "greet", role: "assistant", content: GREETING_TEXT, retrievedTag: null, createdAt: greetAt }]
      : messages

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ===== 顶栏（§9.4：中间 flex-1+min-width-0 省略号，两侧 flex-shrink:0；sticky 固定不随滚动消失） ===== */}
      <header
        className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}` }}
      >
        <Avatar size={34} />
        <div className="flex-1 min-w-0 px-0.5">
          <div className="text-[15px] font-bold truncate" style={{ color: "var(--color-brown)" }}>
            豆苗
          </div>
          <div className="text-[11px] truncate" style={{ color: "#999" }}>
            知识库 {cur.entryCount} 篇 · 在线
          </div>
        </div>
        <span
          className="text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0"
          style={{ color: "#5a8a2a", background: "rgba(139,195,74,0.14)", border: "1px solid rgba(174,213,129,0.6)" }}
        >
          学习助手
        </span>
        <button
          className="flex-shrink-0 flex items-center justify-center rounded-[10px] transition-colors"
          style={{ width: 32, height: 32, background: isDark ? "#333" : "#fafaf5", border: `1px solid ${cardBorder}` }}
          title="记忆清单"
          onClick={() => setShowMemory(true)}
        >
          <Brain size={15} color={isDark ? "#ccc" : "#666"} />
        </button>
        <button
          className="flex-shrink-0 flex items-center justify-center rounded-[10px] transition-colors"
          style={{ width: 32, height: 32, background: isDark ? "#333" : "#fafaf5", border: `1px solid ${cardBorder}` }}
          title="豆苗设置"
          onClick={() => setShowSetting(true)}
        >
          <Settings size={15} color={isDark ? "#ccc" : "#666"} />
        </button>
      </header>

      {/* ===== 消息区 ===== */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-3 pb-2"
      >
        {loadingMore && (
          <p className="text-center text-[10.5px] py-1" style={{ color: dimColor }}>
            加载更早对话…
          </p>
        )}

        <div className="flex flex-col gap-2.5 max-w-[760px] mx-auto">
          {renderMsgs.map((m, i) => {
            const prev = i > 0 ? renderMsgs[i - 1] : null
            const showDate = !prev || beijingDateString(new Date(m.createdAt)) !== beijingDateString(new Date(prev.createdAt))
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="text-center text-[11px] my-1" style={{ color: "#999" }}>
                    {dateLabel(m.createdAt)}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <div className="flex items-start gap-2 max-w-[86%]">
                    <Avatar size={30} />
                    <div className="min-w-0">
                      {m.retrievedTag && (
                        <div
                          className="inline-flex items-center gap-1.5 text-[10.5px] rounded-full px-2 py-0.5 mb-1"
                          style={{ color: "#5a8a2a", background: "rgba(139,195,74,0.12)", border: "1px solid rgba(174,213,129,0.55)" }}
                        >
                          <span className="inline-block" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-primary)" }} />
                          {m.retrievedTag}
                        </div>
                      )}
                      <div
                        className="text-[14px] leading-relaxed whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5"
                        style={{
                          background: isDark ? "#2A2A2A" : "#fff",
                          border: `1px solid ${cardBorder}`,
                          borderTopLeftRadius: 4,
                          color: titleColor,
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div
                      className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-white rounded-2xl px-3.5 py-2.5 max-w-[86%]"
                      style={{ background: "var(--color-primary)", borderTopRightRadius: 4 }}
                    >
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* 正在输入指示 */}
          {sending && (
            <div className="flex items-start gap-2 max-w-[86%]">
              <Avatar size={30} />
              <div
                className="flex items-center gap-1.5 rounded-2xl px-4 py-3"
                style={{ background: isDark ? "#2A2A2A" : "#fff", border: `1px solid ${cardBorder}`, borderTopLeftRadius: 4 }}
              >
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="inline-block rounded-full animate-pulse"
                    style={{ width: 6, height: 6, background: dimColor, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 清空历史入口（交互形式待确认：需求文档 §13 #5，暂放消息区底部小字） */}
        {messages.length > 0 && !sending && (
          <div className="text-center pt-3 pb-1">
            <button
              className="text-[10.5px] underline hover:opacity-60"
              style={{ color: "#bbb" }}
              onClick={() => setShowClear(true)}
            >
              🗑 清空对话历史
            </button>
          </div>
        )}
      </div>

      {/* ===== 快捷提问条（提问一次后隐藏） ===== */}
      {messages.length === 0 && !sending && (
        <div className="flex flex-wrap gap-2 px-4 pt-1 pb-2 flex-shrink-0">
          {CHIPS.map(c => (
            <button
              key={c.text}
              className="text-xs rounded-full px-3 py-1.5 transition-colors hover:opacity-75"
              style={{
                color: "#5a8a2a",
                background: isDark ? "#2a3320" : "#fff",
                border: "1.5px dashed rgba(174,213,129,0.8)",
              }}
              onClick={() => handleSend(c.text)}
            >
              {c.emoji} {c.text}
            </button>
          ))}
        </div>
      )}

      {/* ===== 输入区 ===== */}
      <div
        className="flex items-center gap-2 px-3 pt-2 pb-3 flex-shrink-0"
        style={{ background: cardBg, borderTop: `1px solid ${cardBorder}` }}
      >
        <input
          className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-base outline-none transition-colors disabled:opacity-60"
          style={{ border: `1.5px solid ${inputBorder}`, background: inputBg, color: titleColor }}
          placeholder="和我聊聊你的心得吧…"
          value={input}
          maxLength={500}
          disabled={sending}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend()
          }}
        />
        <button
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white transition-opacity disabled:opacity-50"
          style={{ width: 38, height: 38, background: sending ? "#a5d67a" : "var(--color-primary)" }}
          disabled={sending || !input.trim()}
          title="发送"
          onClick={() => handleSend()}
        >
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* ===== 弹层（打开时挂载、关闭时卸载，内部以挂载时机初始化） ===== */}
      {showMemory && <MemorySheet onClose={() => setShowMemory(false)} />}
      {showSetting && (
        <SettingSheet
          profile={cur}
          onClose={() => setShowSetting(false)}
          onSaved={p => setCur(prev => ({ ...prev, ...p }))}
        />
      )}
      <DeleteDialog
        open={showClear}
        onCancel={() => setShowClear(false)}
        onConfirm={handleClear}
        loading={clearing}
        heading="确定要清空与豆苗的对话吗？"
        description="清空后豆苗会重新打招呼，记忆清单不受影响。"
        confirmText="清空对话"
        loadingText="清空中…"
      />
    </div>
  )
}
