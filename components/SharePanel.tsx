"use client"
import { useState, useRef, useCallback } from "react"

// 从 CDN 动态加载 html2canvas
function loadHtml2Canvas(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).html2canvas) {
      resolve({ default: (window as any).html2canvas })
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
    script.onload = () => resolve({ default: (window as any).html2canvas })
    script.onerror = reject
    document.head.appendChild(script)
  })
}

interface SharePanelProps {
  entryId: string
  entryTitle: string
  entryTags: { name: string }[]
  entryContent: string
  entryDate: string
  isDark: boolean
  onClose: () => void
}

export default function SharePanel({
  entryId,
  entryTitle,
  entryTags,
  entryContent,
  entryDate,
  isDark,
  onClose,
}: SharePanelProps) {
  const [capturing, setCapturing] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const captureRef = useRef<HTMLDivElement>(null)

  const handleCapture = useCallback(async () => {
    if (capturing) return
    setCapturing(true)
    setError("")

    try {
      const mod = await loadHtml2Canvas()
      const html2canvas = mod.default

      const el = captureRef.current
      if (!el) throw new Error("截图区域未找到")

      const canvas = await html2canvas(el, {
        backgroundColor: isDark ? "#1E1E1E" : "#FAFAF5",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      })

      const url = canvas.toDataURL("image/png")
      setImageUrl(url)
      setCaptured(true)
    } catch (e: any) {
      setError("截图失败，请重试")
    }
    setCapturing(false)
  }, [capturing, isDark])

  const handleShare = async () => {
    if (!imageUrl) return
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const file = new File([blob], "xinya-share.png", { type: "image/png" })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: entryTitle || "心芽心得",
          text: entryTitle || "",
        })
      } else {
        // 降级：下载图片
        const a = document.createElement("a")
        a.href = imageUrl
        a.download = `xinya-${entryId}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (_) {
      // 用户取消分享
    }
  }

  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = `xinya-${entryId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 截图预览区域（隐藏渲染）
  const renderCaptureContent = () => (
    <div
      ref={captureRef}
      style={{
        width: "375px",
        padding: "24px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        background: isDark ? "#1E1E1E" : "#FAFAF5",
        color: isDark ? "#E0E0E0" : "#333",
        boxSizing: "border-box",
      }}
    >
      {/* Logo 水印 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
        <span style={{ fontSize: "18px" }}>🌱</span>
        <span style={{ fontSize: "18px", fontWeight: 600, color: "#8BC34A" }}>心芽</span>
        <span style={{ fontSize: "11px", color: isDark ? "#888" : "#bbb", marginLeft: "auto" }}>
          shuxiangnote.top
        </span>
      </div>

      {/* 标签 */}
      {entryTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
          {entryTags.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: "11px",
                padding: "0 8px",
                height: "20px",
                lineHeight: "20px",
                borderRadius: "10px",
                background: isDark ? "rgba(139,195,74,0.2)" : "rgba(139,195,74,0.12)",
                color: isDark ? "#AED581" : "#5a8a2f",
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* 标题 */}
      {entryTitle && (
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: 1.4,
            marginBottom: "6px",
            color: isDark ? "#F0F0F0" : "#222",
          }}
        >
          {entryTitle}
        </div>
      )}

      {/* 日期 */}
      <div style={{ fontSize: "11px", color: isDark ? "#888" : "#bbb", marginBottom: "14px" }}>
        {entryDate}
      </div>

      {/* 正文 */}
      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.7,
          color: isDark ? "#D0D0D0" : "#444",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: entryContent || "" }}
      />

      {/* 底部分隔 + Logo */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "12px",
          borderTop: `1px solid ${isDark ? "#333" : "#eee"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: "12px" }}>🌱</span>
        <span style={{ fontSize: "11px", color: isDark ? "#888" : "#bbb" }}>
          记录于 心芽 · shuxiangnote.top
        </span>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-4 pb-6"
        style={{
          background: isDark ? "#2A2A2A" : "#fff",
          maxHeight: "85vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium" style={{ color: isDark ? "#E0E0E0" : "#333" }}>
            截图分享
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke={isDark ? "#aaa" : "#666"} strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {!captured ? (
          <>
            {/* 截图预览区 */}
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{
                border: `1px solid ${isDark ? "#444" : "#eee"}`,
                maxHeight: "50vh",
                overflow: "auto",
              }}
            >
              {renderCaptureContent()}
            </div>

            {error && (
              <p className="text-xs text-center mb-3" style={{ color: "#e57373" }}>{error}</p>
            )}

            {/* 操作按钮 */}
            <button
              onClick={handleCapture}
              disabled={capturing}
              className="w-full py-3 rounded-xl text-sm font-medium transition"
              style={{
                background: "linear-gradient(135deg, #8BC34A, #AED581)",
                color: "#fff",
                opacity: capturing ? 0.6 : 1,
              }}
            >
              {capturing ? "生成截图中…" : "生成分享图"}
            </button>
          </>
        ) : (
          <>
            {/* 截图结果 */}
            {imageUrl && (
              <div className="rounded-xl overflow-hidden mb-4" style={{ border: `1px solid ${isDark ? "#444" : "#eee"}` }}>
                <img src={imageUrl} alt="截图" className="w-full" />
              </div>
            )}

            {/* 分享按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                style={{
                  background: "linear-gradient(135deg, #8BC34A, #AED581)",
                  color: "#fff",
                }}
              >
                分享
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                  color: isDark ? "#E0E0E0" : "#333",
                }}
              >
                保存图片
              </button>
            </div>

            {/* 重新生成 */}
            <button
              onClick={() => { setCaptured(false); setImageUrl(null) }}
              className="w-full mt-2 py-2 text-xs"
              style={{ color: isDark ? "#888" : "#999" }}
            >
              重新生成
            </button>
          </>
        )}
      </div>
    </div>
  )
}
