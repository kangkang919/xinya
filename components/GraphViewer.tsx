"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GraphCanvas } from "reagraph"

interface Tag { id: string; name: string }
interface NodeData {
  id: string
  title: string
  tags: Tag[]
  recordTime: string
}
interface EdgeData {
  id: string
  source: string
  target: string
  relationType: string
  note: string | null
}

const EDGE_COLORS: Record<string, string> = {
  sequence: "#42A5F5",
  hierarchy: "#8BC34A",
  related: "#FF8C42",
  insight: "#AB47BC",
}

const EDGE_LABELS: Record<string, string> = {
  sequence: "串行",
  hierarchy: "总分",
  related: "关联",
  insight: "启发",
}

export default function GraphViewer() {
  const router = useRouter()
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/entries/graph")
      .then(r => r.json())
      .then(data => {
        if (!data.ok) { setError("加载失败"); return }
        const { nodes: rawNodes, edges: rawEdges } = data.data

        // 统计每个节点的关联数，用于调整大小
        const linkCount: Record<string, number> = {}
        for (const e of rawEdges) {
          linkCount[e.source] = (linkCount[e.source] || 0) + 1
          linkCount[e.target] = (linkCount[e.target] || 0) + 1
        }

        setNodes(rawNodes.map((n: NodeData) => ({
          id: n.id,
          label: n.title.length > 6 ? n.title.slice(0, 6) + "…" : n.title,
          fill: "#8BC34A",
          size: Math.max(6, Math.min(16, 6 + (linkCount[n.id] || 0) * 2.5)),
          labelVisible: true,
          data: n,
        })))

        setEdges(rawEdges.map((e: EdgeData) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          fill: EDGE_COLORS[e.relationType] || "#999",
          label: e.note || EDGE_LABELS[e.relationType] || "",
          data: e,
        })))
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false))
  }, [])

  const handleNodeClick = useCallback((node: any) => {
    if (node?.data?.id) {
      router.push(`/entry/${node.data.id}/view?from=sprout`)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E1E1E" }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🕸️</div>
          <p className="text-sm" style={{ color: "#bbb" }}>编织知识网络中…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E1E1E" }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🍂</div>
          <p className="text-sm" style={{ color: "#bbb" }}>{error}</p>
          <button onClick={() => router.push("/root")} className="mt-4 px-4 py-2 rounded-full text-sm" style={{ background: "#8BC34A", color: "#fff" }}>
            返回根系
          </button>
        </div>
      </div>
    )
  }

  // 没有节点数据时显示空状态
  if (nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E1E1E" }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🌱</div>
          <p className="text-sm mb-2" style={{ color: "#bbb" }}>还没有心得可以编织</p>
          <p className="text-xs mb-4" style={{ color: "#666" }}>先写几篇心得，再来构建知识网络</p>
          <button onClick={() => router.push("/")} className="px-4 py-2 rounded-full text-sm" style={{ background: "#8BC34A", color: "#fff" }}>
            去萌芽页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen" style={{ background: "#1a1a2e" }}>
      {/* 返回按钮 */}
      <button
        onClick={() => router.push("/root")}
        className="absolute top-4 left-4 z-10 flex items-center gap-1 text-sm rounded-full px-3 py-1.5"
        style={{ background: "rgba(255,255,255,0.1)", color: "#ccc", backdropFilter: "blur(8px)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        返回
      </button>

      {/* 图例 */}
      <div
        className="absolute bottom-4 left-4 z-10 p-3 rounded-xl"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      >
        <p className="text-[10px] mb-1.5" style={{ color: "#999" }}>关系类型</p>
        <div className="space-y-1">
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: "#ccc" }}>{EDGE_LABELS[type]}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "#666" }}>
          {nodes.length} 篇心得 · {edges.length} 条关联
        </p>
      </div>

      {/* 图谱 */}
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        layoutType="forceDirected2d"
        cameraMode="pan"
        theme={{
          canvas: { background: "transparent" },
          node: {
            fill: "#8BC34A",
            activeFill: "#AED581",
            opacity: 1,
            selectedOpacity: 1,
            inactiveOpacity: 0.4,
            label: {
              color: "#ddd",
              activeColor: "#fff",
            },
          },
          ring: {
            fill: "#555",
            activeFill: "#8BC34A",
          },
          edge: {
            fill: "#555",
            activeFill: "#888",
            opacity: 0.8,
            selectedOpacity: 1,
            inactiveOpacity: 0.3,
            label: {
              color: "#aaa",
              activeColor: "#fff",
              fontSize: 9,
            },
          },
          arrow: {
            fill: "#555",
            activeFill: "#888",
          },
          lasso: {
            background: "rgba(139,195,74,0.1)",
            border: "1px solid rgba(139,195,74,0.3)",
          },
        }}
      />
    </div>
  )
}
