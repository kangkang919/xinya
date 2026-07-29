"use client"

interface DeleteDialogProps {
  open: boolean
  title?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  // 以下可选，默认沿用删除心得的文案与配色（供重新播种等场景复用样式）
  heading?: string
  description?: string
  confirmText?: string
  loadingText?: string
  confirmColor?: string
}

export function DeleteDialog({
  open,
  title = "",
  onConfirm,
  onCancel,
  loading,
  heading = "确定要让这片叶子飘落吗？",
  description = "一旦飘落，便无法追回。",
  confirmText = "让它飘落",
  loadingText = "飘落中…",
  confirmColor = "#e57373",
}: DeleteDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="dialog-sketch bg-white w-full max-w-sm p-6 shadow-xl animate-fade-in"
        style={{ border: "2px solid #e0e0e0" }}>
        <h3 className="text-lg font-bold text-center mb-2" style={{ color: "#333" }}>
          {heading}
        </h3>
        {title && (
          <p className="text-sm text-center mb-1 line-clamp-1" style={{ color: "#999" }}>
            「{title}」
          </p>
        )}
        <p className="text-xs text-center mb-6" style={{ color: "#aaa" }}>
          {description}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-medium border transition"
            style={{ borderColor: "#ccc", color: "#666", background: "#fafafa" }}>
            再想想
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition"
            style={{ background: loading ? "#ccc" : confirmColor }}>
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}