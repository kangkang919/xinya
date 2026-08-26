"use client"
import { useState } from "react"
import type { Editor } from "@tiptap/react"
import { ArrowLeft, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Palette, Tag, Focus, Code, Heading, Quote, Minus } from "lucide-react"

const COLORS = ["#333333", "#8BC34A", "#42A5F5", "#FF8C42", "#795548", "#e57373"]

interface EditorToolbarProps {
  isNew: boolean
  saving: boolean
  charCount: number
  hasTags: boolean
  isDark: boolean
  editor: Editor | null
  onBack: () => void
  onSave: () => void
  onToggleTagPicker: () => void
  onToggleFocus: () => void
}

export default function EditorToolbar({
  isNew, saving, charCount, hasTags, isDark, editor,
  onBack, onSave, onToggleTagPicker, onToggleFocus,
}: EditorToolbarProps) {
  const toolbarBg = isDark ? "rgba(30,30,30,0.98)" : "rgba(250,250,245,0.98)"
  const toolbarBorder = isDark ? "#333" : "#e0e0e0"
  const titleColor = isDark ? "#E0E0E0" : "#333"
  const iconColor = isDark ? "#aaa" : "#666"
  const sepColor = isDark ? "#444" : "#e0e0e0"
  const hoverBg = isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
  const activeBg = isDark ? "bg-gray-600" : "bg-gray-200"
  const [showColorPicker, setShowColorPicker] = useState(false)

  // 工具栏按钮通用样式：激活态 + 悬停
  function btnClass(active: boolean) {
    return `p-2 rounded-lg ${active ? activeBg : hoverBg}`
  }

  function run(fn: () => void) {
    if (!editor) return
    fn()
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50" style={{ background: toolbarBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${toolbarBorder}` }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <button onClick={onBack} className="p-2"><ArrowLeft size={22} color={iconColor} /></button>
          <span className="text-sm font-medium" style={{ color: titleColor }}>{isNew ? "心芽，记录内心的每一次萌发" : "续叶，重温这片心得"}</span>
          <div className="flex items-center gap-1">
            <button onClick={onSave} disabled={saving} className="btn-sketch px-4 py-1.5 text-xs font-medium text-white" style={{ background: saving ? "#aaa" : "#8BC34A" }}>{saving ? "保存中…" : "保存"}</button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto max-w-3xl mx-auto">
          {/* 加粗 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleBold().run())} className={btnClass(editor?.isActive('bold') || false)}><Bold size={18} color={iconColor} /></button>
          {/* 斜体 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleItalic().run())} className={btnClass(editor?.isActive('italic') || false)}><Italic size={18} color={iconColor} /></button>
          {/* 下划线 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleUnderline().run())} className={btnClass(editor?.isActive('underline') || false)}><Underline size={18} color={iconColor} /></button>
          {/* 删除线 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleStrike().run())} className={btnClass(editor?.isActive('strike') || false)}><Strikethrough size={18} color={iconColor} /></button>
          {/* 标题 H2（切换） */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleHeading({ level: 2 }).run())} className={btnClass(editor?.isActive('heading', { level: 2 }) || false)}><Heading size={18} color={iconColor} /></button>
          {/* 引用块 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleBlockquote().run())} className={btnClass(editor?.isActive('blockquote') || false)}><Quote size={18} color={iconColor} /></button>
          {/* 无序列表 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleBulletList().run())} className={btnClass(editor?.isActive('bulletList') || false)}><List size={18} color={iconColor} /></button>
          {/* 有序列表 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleOrderedList().run())} className={btnClass(editor?.isActive('orderedList') || false)}><ListOrdered size={18} color={iconColor} /></button>
          {/* 代码块 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().toggleCodeBlock().run())} className={btnClass(editor?.isActive('codeBlock') || false)}><Code size={18} color={iconColor} /></button>
          {/* 分隔线 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor!.chain().focus().setHorizontalRule().run())} className={btnClass(false)}><Minus size={18} color={iconColor} /></button>
          {/* 字体颜色 */}
          <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColorPicker(!showColorPicker)} className={`p-2 rounded-lg ${hoverBg}`}><Palette size={18} color={iconColor} /></button>
          <div className="w-px h-5 mx-1" style={{ background: sepColor }} />
          {/* 标签 */}
          <button onClick={onToggleTagPicker} className={`p-2 rounded-lg ${hoverBg}`}><Tag size={18} color={hasTags ? "#8BC34A" : iconColor} /></button>
          {/* 专注模式 */}
          <button onClick={onToggleFocus} className={`p-2 rounded-lg ${hoverBg}`}><Focus size={18} color={iconColor} /></button>
          <span className="ml-auto text-xs" style={{ color: isDark ? "#666" : "#bbb" }}>{charCount} 字</span>
        </div>
      </div>
      {showColorPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
          <div
            className={`fixed z-[60] border rounded-xl shadow-xl p-3 flex gap-2 ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
            style={{ top: 100, left: '50%', transform: 'translateX(-50%)' }}
          >
            {COLORS.map(c => (
              <button
                key={c}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { if (editor) editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
                className="w-8 h-8 rounded-full border-2 hover:scale-125 transition-transform shadow-sm"
                style={{ background: c, borderColor: c === "#333333" ? "#999" : c }}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
