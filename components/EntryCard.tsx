"use client"
import { Bookmark, Pin, Smile, Frown, Meh, Sparkles, CloudRain, MoreVertical } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface Tag { id: string; name: string }

interface EntryCardProps {
  id: string
  title: string
  contentPreview: string
  tags: Tag[]
  mood: string | null
  recordTime: string
  isTop: boolean
  isFavorite: boolean
  isDark?: boolean
  onToggleFavorite: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string, title: string) => void
}

const MOODS: Record<string, { icon: typeof Smile; color: string; label: string }> = {
  happy:   { icon: Smile,    color: "#FFB74D", label: "开心" },
  calm:    { icon: Meh,      color: "#81C784", label: "平静" },
  excited: { icon: Sparkles, color: "#FF7043", label: "兴奋" },
  sad:     { icon: Frown,    color: "#64B5F6", label: "低落" },
  worried: { icon: CloudRain, color: "#90A4AE", label: "忧虑" },
}

export function EntryCard({ id, title, contentPreview, tags, mood, recordTime,
  isTop, isFavorite, isDark = false, onToggleFavorite, onTogglePin, onDelete }: EntryCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const cardBg = isDark ? "#2A2A2A" : "#fff"
  const cardBorder = isTop ? "#8BC34A" : (isDark ? "#444" : "#e0e0e0")
  const titleColor = isDark ? "#E0E0E0" : "#333"
  const textColor = isDark ? "#aaa" : "#666"

  const date = new Date(recordTime)
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  const moodInfo = mood ? MOODS[mood] : null
  const MoodIcon = moodInfo?.icon

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleFavorite(id)
    try {
      await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      })
      toast.success(isFavorite ? "已取消收藏" : "已收藏 🌱")
    } catch {
      onToggleFavorite(id) // 回滚
      toast.error("操作失败")
    }
  }

  return (
    <div
      className="card-sketch p-4 shadow-sm relative transition-all hover:shadow-md cursor-pointer"
      style={{ background: cardBg, border: isTop ? "2px solid #8BC34A" : `1.5px solid ${cardBorder}` }}
      onClick={() => router.push(`/entry/${id}/view`)}
    >
      {/* 置顶标记 */}
      {isTop && (
        <div className="absolute top-2 left-3">
          <Pin size={14} color="#8BC34A" fill="#8BC34A" />
        </div>
      )}

      {/* 收藏按钮 - 右上角 */}
      <button onClick={handleFavorite}
        className="absolute top-2.5 right-3 p-1 transition-transform"
        style={{ color: isFavorite ? "#FFB74D" : "#ccc" }}>
        <Bookmark size={18} fill={isFavorite ? "#FFB74D" : "none"}
          className={isFavorite ? "animate-bookmark-pop" : ""} />
      </button>

      {/* 更多按钮 */}
      <div className="absolute top-2.5 right-9">
        <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="p-1 rounded-full hover:bg-gray-100">
          <MoreVertical size={16} color="#999" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 border rounded-lg shadow-lg py-1 min-w-[100px] z-10"
            style={{ background: cardBg, borderColor: cardBorder }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { onTogglePin(id); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              style={{ color: titleColor }}>
              {isTop ? "取消置顶" : "置顶"}
            </button>
            <button onClick={() => { onDelete(id, title); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50">
              删除
            </button>
          </div>
        )}
      </div>

      {/* 标题 */}
      <h3 className="font-bold text-base mb-1 pr-12" style={{ color: titleColor, marginTop: isTop ? 16 : 0 }}>
        {title}
      </h3>

      {/* 内容预览 */}
      <p className="text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: textColor }}>
        {contentPreview || "（空白心得）"}
      </p>

      {/* 底部：标签 + 心情 + 时间 */}
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map(t => (
          <span key={t.id} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#e8f5e9", color: "#8BC34A" }}>
            {t.name}
          </span>
        ))}
        {moodInfo && MoodIcon && (
          <span className="flex items-center gap-0.5 text-xs" style={{ color: moodInfo.color }}>
            <MoodIcon size={13} />
            {moodInfo.label}
          </span>
        )}
        <span className="text-xs ml-auto" style={{ color: "#bbb" }}>
          {dateStr} {timeStr}
        </span>
      </div>
    </div>
  )
}