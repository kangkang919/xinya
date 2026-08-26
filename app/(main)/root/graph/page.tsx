"use client"
import { Suspense } from "react"

export default function GraphPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF5" }}>
        <div className="text-center">
          <div className="text-3xl mb-2">🕸️</div>
          <p className="text-sm" style={{ color: "#bbb" }}>编织知识网络中…</p>
        </div>
      </div>
    }>
      <GraphContent />
    </Suspense>
  )
}

import dynamic from "next/dynamic"
const GraphViewer = dynamic(() => import("@/components/GraphViewer"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF5" }}>
      <div className="text-center">
        <div className="text-3xl mb-2">🕸️</div>
        <p className="text-sm" style={{ color: "#bbb" }}>加载图谱组件…</p>
      </div>
    </div>
  ),
})

function GraphContent() {
  return <GraphViewer />
}
