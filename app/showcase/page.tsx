"use client"

import { useState, useEffect } from "react"
import {
  Sprout, Leaf, Sun, TreePine,
  Plus, Search, Star, Bookmark,
  Smile, Frown, Meh, Zap, CloudRain,
  ChevronDown, ChevronUp, Trash2, Pin
} from "lucide-react"

/* ============================================================
   心情配置
============================================================ */
const MOODS = [
  { key: "happy",   label: "开心", icon: Smile,     color: "#8BC34A" },
  { key: "sad",     label: "难过", icon: Frown,     color: "#42A5F5" },
  { key: "calm",    label: "平静", icon: Meh,       color: "#795548" },
  { key: "excited", label: "激动", icon: Zap,       color: "#FF9800" },
  { key: "worried", label: "忧虑", icon: CloudRain, color: "#9E9E9E" },
]

/* ============================================================
   样本数据
============================================================ */
const SAMPLE_ENTRIES = [
  {
    id: "1",
    title: "今日读书心得",
    preview: "读完了《活着》，内心久久不能平静。福贵的一生充满了苦难，但他依然坚韧地活着……",
    tags: ["读书笔记", "文学"],
    mood: "calm",
    time: "2026-06-21 09:30",
    isTop: true,
    isFavorite: true,
  },
  {
    id: "2",
    title: "工作复盘",
    preview: "这周完成了三个重要项目的交付，团队配合很顺畅，但在沟通环节还有一些可以改进的地方……",
    tags: ["工作复盘"],
    mood: "happy",
    time: "2026-06-20 18:45",
    isTop: false,
    isFavorite: false,
  },
  {
    id: "3",
    title: "一点小感悟",
    preview: "今天路过公园，看到一棵大树在风中摇曳，突然想到人生也如这棵树，根扎得越深，才能在风雨中屹立不倒……",
    tags: ["随笔", "生活"],
    mood: "excited",
    time: "2026-06-19 21:00",
    isTop: false,
    isFavorite: true,
  },
]

/* ============================================================
   嫩芽 SVG 插画
============================================================ */
function SproutIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="none">
      <ellipse cx="60" cy="128" rx="40" ry="5" fill="#333" opacity="0.06" />
      <path d="M60 125 Q58 108 59 92 Q60 76 59 60 Q58 44 60 28 Q62 44 61 60 Q60 76 61 92 Q62 108 60 125"
        stroke="#8BC34A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M59 28 Q44 16 34 10" stroke="#8BC34A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M59 28 Q76 16 86 10" stroke="#8BC34A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M59 52 Q48 44 42 40" stroke="#AED581" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 70 Q72 62 78 58" stroke="#AED581" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ============================================================
   生长动画 SVG（用 CSS animation 触发）
============================================================ */
function GrowingsproutAnim() {
  const [key, setKey] = useState(0)
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => setKey(k => k + 1)}
        className="text-[10px] text-[#8BC34A] border border-[#8BC34A] px-2 py-0.5 rounded-full mb-1"
      >
        点击重播 ↺
      </button>
      <svg
        key={key}
        viewBox="0 0 60 70"
        className="w-12 h-14 text-[#8BC34A] animate-sprout"
        fill="none"
        style={{ transformOrigin: "bottom center" }}
      >
        <path d="M30 65 Q28 52 29 42 Q30 32 29 20 Q28 10 30 4"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M29 4 Q22 0 17 -1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 4 Q38 0 43 -1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 22 Q22 18 17 16" stroke="#AED581" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 38 Q38 34 43 32" stroke="#AED581" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] text-[#666]">正在生长中...</span>
    </div>
  )
}

/* ============================================================
   心得卡片
============================================================ */
function EntryCard({ entry }: { entry: typeof SAMPLE_ENTRIES[0] }) {
  const [bookmarked, setBookmarked] = useState(entry.isFavorite)
  const [bookmarkAnim, setBookmarkAnim] = useState(false)
  const mood = MOODS.find(m => m.key === entry.mood)
  const MoodIcon = mood?.icon || Meh

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
    setBookmarkAnim(true)
    setTimeout(() => setBookmarkAnim(false), 350)
  }

  return (
    <div className="bg-white card-sketch border border-[#E8E8E3] p-4 relative shadow-sm hover:shadow-md transition-shadow animate-fade-in">
      {entry.isTop && (
        <div className="absolute top-3 left-3 flex items-center gap-1">
          <Pin className="w-3 h-3 text-[#8BC34A]" />
          <span className="text-[10px] text-[#8BC34A] font-medium">置顶</span>
        </div>
      )}
      <button
        onClick={handleBookmark}
        className={`absolute top-3 right-3 ${bookmarkAnim ? "animate-bookmark-pop" : ""}`}
      >
        <Bookmark
          className="w-5 h-5"
          fill={bookmarked ? "#8BC34A" : "none"}
          stroke={bookmarked ? "#8BC34A" : "#CCCCCC"}
        />
      </button>
      <h3 className={`font-semibold text-[#333] text-sm pr-8 ${entry.isTop ? "pl-10" : ""}`}>
        {entry.title}
      </h3>
      <p className="text-xs text-[#666] mt-1.5 leading-relaxed line-clamp-2">{entry.preview}</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-[#F0F7E6] text-[#6A9A3A] text-[10px] rounded-full border border-[#C5E09A]">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MoodIcon className="w-4 h-4" style={{ color: mood?.color }} />
          <span className="text-[10px] text-[#999]">{entry.time.split(" ")[0]}</span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   今日速览
============================================================ */
function TodaySummary() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="bg-gradient-to-r from-[#F0F7E6] to-[#F5FAF0] card-sketch border border-[#C5E09A] mb-4 overflow-hidden">
      {collapsed ? (
        <button onClick={() => setCollapsed(false)} className="w-full px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-[#6A9A3A]">今日已播种 🌱</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#6A9A3A]" />
        </button>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6A9A3A]">今日速览</span>
            <button onClick={() => setCollapsed(true)}>
              <ChevronUp className="w-3.5 h-3.5 text-[#6A9A3A]" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["1", "今日记录"], ["5", "本周频率"], ["12", "连续天数"]].map(([val, lbl]) => (
              <div key={lbl}>
                <div className="text-lg font-bold text-[#8BC34A]">{val}</div>
                <div className="text-[10px] text-[#666]">{lbl}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#C5E09A]">
            <p className="text-[11px] text-[#666] line-clamp-1">最近一篇：今日读书心得</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   删除弹窗
============================================================ */
function DeleteDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5">
      <div className="bg-white dialog-sketch p-6 w-full max-w-xs shadow-xl animate-fade-in">
        <div className="text-center mb-2 text-3xl">🍂</div>
        <h3 className="text-center font-semibold text-[#333] mb-2 text-sm">
          确定要让这片叶子飘落吗？
        </h3>
        <p className="text-center text-xs text-[#999] mb-5">一旦飘落，便无法追回。</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border-2 border-[#E8E8E3] text-[#666] text-sm btn-sketch hover:bg-[#F5F5F0] transition-colors">
            再想想
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-[#E57373] text-white text-sm btn-sketch hover:bg-[#EF5350] transition-colors">
            让它飘落
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   底部导航 — 修复：4个Tab全部显示，统一图标风格
   萌芽→Sprout  枝叶→Leaf  年轮→Sun（年轮圆形）  根系→TreePine
============================================================ */
function TabBar({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const leftTabs  = [
    { key: "sprout", label: "萌芽", Icon: Sprout },
    { key: "leaf",   label: "枝叶", Icon: Leaf   },
  ]
  const rightTabs = [
    { key: "ring", label: "年轮", Icon: Sun      },
    { key: "root", label: "根系", Icon: TreePine },
  ]

  const TabBtn = ({ k, label, Icon }: { k: string; label: string; Icon: React.ElementType }) => (
    <button onClick={() => onChange(k)}
      className="flex flex-col items-center gap-0.5 flex-1 py-2">
      <Icon className={`w-5 h-5 ${active === k ? "text-[#8BC34A]" : "text-[#AAAAAA]"}`} />
      <span className={`text-[10px] ${active === k ? "text-[#8BC34A] font-semibold" : "text-[#AAAAAA]"}`}>{label}</span>
    </button>
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E8E3] flex items-center pb-safe z-50"
      style={{ height: "64px" }}>
      {leftTabs.map(t => <TabBtn key={t.key} k={t.key} label={t.label} Icon={t.Icon} />)}

      {/* 中央 + 按钮 */}
      <div className="flex flex-col items-center flex-1">
        <button
          onClick={() => {}}
          className="w-12 h-12 -mt-5 bg-gradient-to-br from-[#8BC34A] to-[#AED581] rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-105 transition-transform">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {rightTabs.map(t => <TabBtn key={t.key} k={t.key} label={t.label} Icon={t.Icon} />)}
    </nav>
  )
}

/* ============================================================
   主页面
============================================================ */
export default function StyleGuide() {
  const [activeTab, setActiveTab]           = useState("sprout")
  const [showDelete, setShowDelete]         = useState(false)
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false)
  const [timeFilter, setTimeFilter]         = useState("全部")
  const timeOptions = ["最近7天", "最近30天", "最近3个月", "全部"]
  const displayEntries = showFavoriteOnly
    ? SAMPLE_ENTRIES.filter(e => e.isFavorite)
    : SAMPLE_ENTRIES

  /* 4套主题（已去除夜间模式）
     说明：切换主题后，整个页面的背景色、强调色都会跟着变，
     不只是导航栏或某个区块。 */
  const THEMES = [
    { name: "🌱 春日萌芽（默认）", bg: "#FAFAF5", accent: "#8BC34A", text: "#333333", desc: "暖白底 · 嫩绿强调色" },
    { name: "🌿 夏日繁茂",         bg: "#1B3A2B", accent: "#4CAF50", text: "#E8F5E9", desc: "深绿底色 · 整页变暗绿" },
    { name: "🍂 秋日暖阳",         bg: "#FFF8F0", accent: "#FF8C42", text: "#4A2E00", desc: "暖米白底 · 橙色强调色" },
    { name: "❄️ 冬日静谧",         bg: "#F8F9FA", accent: "#90A4AE", text: "#37474F", desc: "冷白底 · 蓝灰强调色"  },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF5]">

      {/* 顶部提示条 */}
      <div className="bg-[#8BC34A] text-white text-center py-2.5 text-xs font-medium tracking-wider sticky top-0 z-40">
        🌱 视觉样板页 — 请确认整体风格是否满意
      </div>

      <div className="max-w-md mx-auto pb-24">

        {/* ---- 品牌色彩 ---- */}
        <section className="px-4 pt-5 pb-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">品牌色彩</h2>
          <div className="flex gap-2 flex-wrap">
            {[
              ["#8BC34A","主绿"],["#AED581","浅绿"],["#FAFAF5","暖白底"],
              ["#795548","大地棕"],["#42A5F5","天空蓝"],
              ["#333333","正文黑"],["#666666","辅助灰"],["#999999","淡色字"],
            ].map(([color, name]) => (
              <div key={color} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border border-[#E8E8E3]" style={{ background: color }} />
                <span className="text-[9px] text-[#666]">{name}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 字体排版 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">字体排版</h2>
          <div className="space-y-2">
            <div className="text-xl font-bold text-[#333]">心芽 — 记录内心的每一次萌发</div>
            <div className="text-base font-semibold text-[#333]">萌芽页标题文字样例</div>
            <div className="text-sm text-[#333]">正文内容，默认字体微软雅黑，清晰易读</div>
            <div className="text-xs text-[#666]">辅助说明文字，用于时间、标签等次要信息</div>
            <div className="text-xs text-[#8BC34A] italic">每一颗灵感的种子，都在此刻破土而出，迎接第一缕晨光 🌿</div>
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 按钮样式 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">按钮样式</h2>
          <div className="space-y-3">
            <button className="w-full py-3.5 bg-gradient-to-br from-[#8BC34A] to-[#AED581] text-white font-medium btn-sketch shadow-md text-sm">
              主操作按钮（去播种第一颗心芽 →）
            </button>
            <button className="w-full py-3.5 border-2 border-[#8BC34A] text-[#8BC34A] font-medium btn-sketch hover:bg-[#8BC34A] hover:text-white transition-all text-sm">
              次要操作按钮（登录 / 注册）
            </button>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border-2 border-[#E8E8E3] text-[#666] text-sm btn-sketch">再想想</button>
              <button className="flex-1 py-2.5 bg-[#E57373] text-white text-sm btn-sketch">让它飘落</button>
            </div>
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 搜索栏 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">搜索栏 + 筛选</h2>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
              <input type="text" placeholder="搜索标题、内容或标签..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-[#E8E8E3] input-sketch bg-white text-sm placeholder:text-[#999] focus:border-[#8BC34A] outline-none transition-colors" />
            </div>
            <button onClick={() => setShowFavoriteOnly(!showFavoriteOnly)}
              className={`p-2.5 rounded-xl border-2 transition-all ${showFavoriteOnly ? "border-[#8BC34A] bg-[#F0F7E6]" : "border-[#E8E8E3] bg-white"}`}>
              <Star className={`w-4 h-4 ${showFavoriteOnly ? "fill-[#8BC34A] text-[#8BC34A]" : "text-[#AAAAAA]"}`} />
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {timeOptions.map(opt => (
              <button key={opt} onClick={() => setTimeFilter(opt)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${timeFilter === opt ? "bg-[#8BC34A] text-white border-[#8BC34A]" : "bg-white text-[#666] border-[#E8E8E3]"}`}>
                {opt}
              </button>
            ))}
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 今日速览 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">今日速览卡片（可折叠）</h2>
          <TodaySummary />
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 心得卡片 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-1">
            心得卡片（点右上角书签收藏）
          </h2>
          {showFavoriteOnly && <p className="text-xs text-[#8BC34A] mb-2">⭐ 已筛选收藏内容</p>}
          <div className="space-y-3">
            {displayEntries.map(entry => <EntryCard key={entry.id} entry={entry} />)}
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 标签气泡 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">标签气泡（枝叶页）</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "读书笔记", size: "large",  count: 18 },
              { name: "工作复盘", size: "medium", count: 10 },
              { name: "灵感碎片", size: "medium", count: 7  },
              { name: "今日反思", size: "small",  count: 3  },
              { name: "旅行",     size: "small",  count: 2  },
              { name: "随笔",     size: "bottom", count: 42 },
            ].map(({ name, size, count }) => {
              const cls: Record<string, string> = {
                large:  "text-base px-5 py-2.5 border-2",
                medium: "text-sm px-4 py-2 border-2",
                small:  "text-xs px-3 py-1.5 border",
                bottom: "text-xs px-3 py-1.5 border border-dashed opacity-60",
              }
              return (
                <div key={name}
                  className={`${cls[size]} bg-[#F0F7E6] text-[#6A9A3A] border-[#C5E09A] rounded-full cursor-pointer hover:bg-[#E0F0C8] transition-colors`}>
                  {name}<span className="ml-1 text-[#AAA] text-[9px]">{count}</span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-[#999] mt-2">"随笔"固定置底，虚线边框与其他标签区分</p>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 心情标记 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">心情标记</h2>
          <div className="flex gap-3 flex-wrap">
            {MOODS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border-2 border-[#E8E8E3] flex items-center justify-center bg-white hover:border-[#8BC34A] transition-colors cursor-pointer">
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-[10px] text-[#666]">{label}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 加载动画 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">加载动画</h2>
          <div className="flex items-start gap-8">
            <div className="flex flex-col items-center gap-1">
              <SproutIllustration className="w-14 h-14 animate-bounce-gentle" />
              <span className="text-[10px] text-[#666]">弹跳（循环）</span>
            </div>
            <GrowingsproutAnim />
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- AI洞察卡片（修复字体大小）---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">AI洞察卡片（年轮页底部）</h2>
          <div className="bg-gradient-to-br from-[#F0F7E6] to-[#E8F5D8] card-sketch border border-[#C5E09A] p-4 animate-scroll-unfurl overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <SproutIllustration className="w-6 h-6" />
              <span className="text-sm font-semibold text-[#6A9A3A]">心芽洞察</span>
              {/* 修复：标签字体从 10px 改为 12px，加粗，确保手机可读 */}
              <span className="text-xs font-medium text-white bg-[#8BC34A] px-2.5 py-1 rounded-full ml-auto leading-tight">
                新的洞察已生长 🌱
              </span>
            </div>
            <p className="text-xs text-[#555] leading-relaxed">
              你最近的记录显示，你偏爱在晚间安静时书写，常常在工作结束后寻找内心的平静。读书是你最喜欢的主题，文字里透露着对知识的渴望。继续播种吧，每一次记录都是一粒充满力量的种子 🌿
            </p>
            <p className="text-[10px] text-[#999] mt-2">↑ 上方绿色标签已放大至手机可轻松阅读的大小</p>
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 删除弹窗 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">删除确认弹窗</h2>
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#E57373] text-[#E57373] text-sm rounded-full hover:bg-[#FFEBEE] transition-colors">
            <Trash2 className="w-4 h-4" />
            点击预览删除弹窗
          </button>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 4套主题（已去掉夜间模式）---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-1">4套主题色</h2>
          <p className="text-[10px] text-[#999] mb-3">
            切换主题后，整个页面的背景色和强调色都会跟着变，不只是某个区块。
          </p>
          <div className="space-y-2">
            {THEMES.map(theme => (
              <div key={theme.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#E8E8E3]"
                style={{ background: theme.bg }}>
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background: theme.accent }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: theme.text }}>{theme.name}</div>
                  <div className="text-[10px]" style={{ color: theme.text, opacity: 0.6 }}>{theme.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="h-px bg-[#E8E8E3] mx-4" />

        {/* ---- 空状态 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-3">空状态页面</h2>
          <div className="text-center py-8 bg-white card-sketch border border-[#E8E8E3]">
            <SproutIllustration className="w-24 h-24 mx-auto mb-4 animate-bounce-gentle" />
            <p className="text-[#666] text-sm leading-relaxed px-6">
              每一颗灵感的种子，都在此刻破土而出，<br />
              迎接第一缕晨光，请在此播下你的思绪。
            </p>
            <button className="mt-4 px-6 py-2 bg-gradient-to-br from-[#8BC34A] to-[#AED581] text-white text-sm rounded-full shadow-md">
              去播种第一颗心芽 →
            </button>
          </div>
        </section>

        {/* ---- 底部导航说明 ---- */}
        <section className="px-4 py-4">
          <h2 className="text-[10px] font-bold text-[#999] tracking-widest uppercase mb-2">底部导航说明</h2>
          <p className="text-xs text-[#666] leading-relaxed">
            图标选用同一系列线条风格：萌芽🌱 枝叶🍃 年轮☀️ 根系🌲，全部使用 Lucide Icons 统一线宽。
            现在四个Tab都已完整显示，可在下方导航栏点击切换。
          </p>
        </section>

      </div>

      {/* 底部导航 */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* 删除弹窗 */}
      {showDelete && <DeleteDialog onClose={() => setShowDelete(false)} />}
    </div>
  )
}
