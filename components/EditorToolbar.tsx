"use client"
import { useState } from "react"
import { ArrowLeft, Bold, Italic, Underline, List, ListOrdered, Palette, Tag, Focus } from "lucide-react"

const COLORS = ["#333333", "#8BC34A", "#42A5F5", "#FF8C42", "#795548", "#e57373"]

interface EditorToolbarProps {
  isNew: boolean
  saving: boolean
  charCount: number
  hasTags: boolean
  showTagPicker: boolean
  onBack: () => void
  onSave: () => void
  onToggleTagPicker: () => void
  onToggleFocus: () => void
  onExecCommand: (cmd: string) => void
  onInsertList: (type: "ul" | "ol") => void
}

export default function EditorToolbar({
  isNew, saving, charCount, hasTags, showTagPicker,
  onBack, onSave, onToggleTagPicker, onToggleFocus, onExecCommand, onInsertList
}: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number } | null>(null)

  function openColorPicker(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setColorPickerPos({ top: rect.bottom + 4, left: rect.left })
    setShowColorPicker(!showColorPicker)
  }

  return (
    <>
      <div className="sticky top-0 z-20" style={{ background: "rgba(250,250,245,0.98)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e0e0e0" }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <button onClick={onBack} className="p-2"><ArrowLeft size={22} color="#666" /></button>
          <span className="text-sm font-medium" style={{ color: "#333" }}>{isNew ? "心芽，记录内心的每一次萌发" : "续叶，重温这片心得"}</span>
          <div className="flex items-center gap-1">
            <button onClick={onSave} disabled={saving} className="btn-sketch px-4 py-1.5 text-xs font-medium text-white" style={{ background: saving ? "#aaa" : "#8BC34A" }}>{saving ? "保存中…" : "保存"}</button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto max-w-3xl mx-auto">
          <button onMouseDown={e => e.preventDefault()} onClick={() => onExecCommand("bold")} className="p-2 rounded-lg hover:bg-gray-100"><Bold size={18} color="#666" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => onExecCommand("italic")} className="p-2 rounded-lg hover:bg-gray-100"><Italic size={18} color="#666" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => onExecCommand("underline")} className="p-2 rounded-lg hover:bg-gray-100"><Underline size={18} color="#666" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => onInsertList("ul")} className="p-2 rounded-lg hover:bg-gray-100"><List size={18} color="#666" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => onInsertList("ol")} className="p-2 rounded-lg hover:bg-gray-100"><ListOrdered size={18} color="#666" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={openColorPicker} className="p-2 rounded-lg hover:bg-gray-100"><Palette size={18} color="#666" /></button>
          <div className="w-px h-5 mx-1" style={{ background: "#e0e0e0" }} />
          <button onClick={onToggleTagPicker} className="p-2 rounded-lg hover:bg-gray-100"><Tag size={18} color={hasTags ? "#8BC34A" : "#666"} /></button>
          <button onClick={onToggleFocus} className="p-2 rounded-lg hover:bg-gray-100"><Focus size={18} color="#666" /></button>
          <span className="ml-auto text-xs" style={{ color: "#bbb" }}>{charCount} 字</span>
        </div>
      </div>
      {showColorPicker && colorPickerPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
          <div className="fixed z-50 bg-white border rounded-xl shadow-xl p-3 flex gap-2" style={{ top: colorPickerPos.top, left: colorPickerPos.left }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { document.execCommand("foreColor", false, c); setShowColorPicker(false) }} className="w-8 h-8 rounded-full border-2 hover:scale-125 transition-transform shadow-sm" style={{ background: c, borderColor: c === "#333333" ? "#999" : c }} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

