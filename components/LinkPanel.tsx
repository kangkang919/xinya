"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Tag { id: string; name: string }
interface LinkedEntry {
  id: string
  title: string
  contentPreview: string
  tags: Tag[]
  recordTime: string
}
interface OutLink {
  id: string
  relationType: string
  note: string | null
  createdAt: string
  targetEntry: LinkedEntry
}
interface InLink {
  id: string
  relationType: string
  note: string | null
  createdAt: string
  sourceEntry: LinkedEntry
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  sequence: { label: "串行", icon: "→", color: "#42A5F5" },
  hierarchy: { label: "总分", icon: "⑂", color: "#8BC34A" },
  related: { label: "关联", icon: "↔", color: "#FF8C42" },
  insight: { label: "启发", icon: "💡", color: "#AB47BC" },
}

interface Props {
  outgoing: OutLink[]
  incoming: InLink[]
  isDark: boolean
  currentEntryId: string
  onDelete: (linkId: string) => void
}

export default function LinkPanel({ outgoing, incoming, isDark, currentEntryId, onDelete }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const titleColor = isDark ? "#E0E0E0" : "#333"
  const subColor = isDark ? "#999" : "#999"
  const dimColor = isDark ? "#666" : "#bbb"
  const borderColor = isDark ? "#444" : "#eee"
  const cardBg = isDark ? "#2A2A2A" : "#fff"

  if (outgoing.length === 0 && incoming.length === 0) return null

  // 按关系类型分组
  const allLinks = [
    ...outgoing.map(l => ({ ...l, direction: "outgoing" as const, entry: l.targetEntry })),
    ...incoming.map(l => ({ ...l, direction: "incoming" as const, entry: l.sourceEntry })),
  ]

  const grouped: Record<string, typeof allLinks> = {}
  for (const link of allLinks) {
    if (!grouped[link.relationType]) grouped[link.relationType] = []
    grouped[link.relationType].push(link)
  }

  const typeOrder = ["sequence", "hierarchy", "related", "insight"]

  function navigateToEntry(entryId: string) {
    router.push(`/entry/${entryId}/view?from=sprout`)
  }

  async function handleDelete(linkId: string) {
    if (deletingId) return
    setDeletingId(linkId)
    try {
      await fetch(`/api/links/${linkId}`, { method: "DELETE" })
      onDelete(linkId)
    } catch { /* ignore */ }
    setDeletingId(null)
  }

  return (
    <div className="px-4 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
      <p className="text-xs mb-3" style={{ color: subColor, letterSpacing: "1px" }}>关联心得</p>

      {typeOrder.map(type => {
        const links = grouped[type]
        if (!links || links.length === 0) return null
        const config = TYPE_CONFIG[type]
        if (!config) return null

        return (
          <div key={type} className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ color: config.color, fontSize: 12 }}>{config.icon}</span>
              <span className="text-[11px]" style={{ color: config.color }}>{config.label}</span>
            </div>
            <div className="space-y-1.5">
              {links.map(link => {
                const entry = link.entry
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                  >
                    <button
                      onClick={() => navigateToEntry(entry.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm truncate" style={{ color: titleColor }}>{entry.title}</p>
                      {link.note && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: subColor }}>"{link.note}"</p>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded transition"
                      style={{ color: "#e57373" }}
                      title="删除关联"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
