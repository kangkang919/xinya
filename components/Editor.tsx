"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { EyeOff } from "lucide-react"
import toast from "react-hot-toast"
import EditorToolbar from "./EditorToolbar"
import { useTheme } from "@/lib/useTheme"

const MOODS = [
  { key: "happy", emoji: "😊", label: "开心", color: "#FFB74D" },
  { key: "calm", emoji: "😌", label: "平静", color: "#81C784" },
  { key: "excited", emoji: "🤩", label: "兴奋", color: "#FF7043" },
  { key: "sad", emoji: "😔", label: "低落", color: "#64B5F6" },
  { key: "worried", emoji: "😰", label: "忧虑", color: "#90A4AE" },
]

interface EditorProps {
  entryId?: string
  isNew: boolean
}

export default function Editor({ entryId, isNew }: EditorProps) {
  const router = useRouter()
  const { isDark, titleColor, inputBg, inputBorder } = useTheme()
  const [title, setTitle] = useState("")
  const [mood, setMood] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(true)
  const [newTagName, setNewTagName] = useState("")
  const [charCount, setCharCount] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => { fetch("/api/tags").then(r => r.json()).then(d => { if (d.ok) setAllTags(d.data) }) }, [])

  useEffect(() => {
    if (entryId && !initialized.current && editorRef.current) {
      fetch(`/api/entries/${entryId}`).then(r => r.json()).then(d => {
        if (d.ok) {
          setTitle(d.data.title)
          if (editorRef.current) editorRef.current.innerHTML = d.data.content || ""
          setMood(d.data.mood)
          setSelectedTags(d.data.tags.map((t: { id: string }) => t.id))
          initialized.current = true
          setCharCount((d.data.content || "").replace(/<[^>]*>/g, "").replace(/\s/g, "").length)
        }
      })
    }
  }, [entryId])

  useEffect(() => {
    if (!entryId && !initialized.current && editorRef.current) {
      initialized.current = true
    }
  }, [entryId])

  function handleInput() {
    setCharCount((editorRef.current?.textContent || "").replace(/\s/g, "").length)
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"))
  }, [])

  function handleExecCommand(cmd: string) {
    document.execCommand(cmd, false, undefined)
  }

  function insertList(type: "ul" | "ol") {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const cmd = type === "ul" ? "insertUnorderedList" : "insertOrderedList"
    const result = document.execCommand(cmd, false, undefined)
    if (!result) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        let block = range.startContainer as HTMLElement
        if (block.nodeType === 3) block = block.parentElement as HTMLElement
        while (block && block !== editor && block.parentElement && block.parentElement !== editor) {
          block = block.parentElement
        }
        if (block && block !== editor) {
          const text = block.textContent || ""
          const lines = text.split(/\n/).filter(l => l.trim())
          if (lines.length > 0) {
            const listHtml = `<${type}>${lines.map(l => `<li>${l}</li>`).join("")}</${type}>`
            block.outerHTML = listHtml
          } else {
            const listHtml = `<${type}><li><br></li></${type}>`
            block.outerHTML = listHtml
          }
        } else {
          const listHtml = `<${type}><li><br></li></${type}><p><br></p>`
          editor.insertAdjacentHTML("beforeend", listHtml)
          const li = editor.querySelector(`${type}:last-of-type li`) as HTMLElement
          if (li) {
            const r = document.createRange()
            r.setStart(li, 0)
            r.collapse(true)
            sel.removeAllRanges()
            sel.addRange(r)
          }
        }
      }
    }
    setCharCount((editor.textContent || "").replace(/\s/g, "").length)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("标题不能为空"); return }
    setSaving(true)
    try {
      const body = { title: title.trim(), content: editorRef.current?.innerHTML || "", mood, tagIds: selectedTags, isDraft: false }
      const res = await fetch(isNew ? "/api/entries" : `/api/entries/${entryId}`, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) { toast.success("心得已保存"); router.push("/") } else toast.error(data.error || "保存失败")
    } catch { toast.error("网络异常") } finally { setSaving(false) }
  }

  function toggleTag(tagId: string) { setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]) }

  async function createTag() {
    if (!newTagName.trim()) return
    try {
      const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTagName.trim() }) })
      const data = await res.json()
      if (data.ok) { setAllTags(prev => [...prev, data.data]); setSelectedTags(prev => [...prev, data.data.id]); setNewTagName(""); toast.success("标签已创建") } else toast.error(data.error)
    } catch { toast.error("创建失败") }
  }

  return (
    <div className={`min-h-screen pb-24 ${!focusMode ? 'pt-[92px]' : ''}`} style={{ background: focusMode ? "#1a1a2e" : (isDark ? "#1E1E1E" : "#FAFAF5") }}>
      {!focusMode && (
        <EditorToolbar
          isNew={isNew}
          saving={saving}
          charCount={charCount}
          hasTags={selectedTags.length > 0}
          showTagPicker={showTagPicker}
          onBack={() => router.back()}
          onSave={() => handleSave()}
          onToggleTagPicker={() => setShowTagPicker(!showTagPicker)}
          onToggleFocus={() => setFocusMode(true)}
          onExecCommand={handleExecCommand}
          onInsertList={insertList}
        />
      )}
      <div className="max-w-3xl mx-auto">
        <input className="w-full text-xl font-bold outline-none px-4 pt-6 pb-2" style={{ color: focusMode ? "#eee" : titleColor, background: "transparent" }} placeholder="给这颗种子取个名字…" value={title} onChange={e => setTitle(e.target.value)} />
        {focusMode && <button onClick={() => setFocusMode(false)} className="fixed top-4 right-4 z-20 p-2 rounded-full opacity-50 hover:opacity-100" style={{ background: "rgba(255,255,255,0.1)" }}><EyeOff size={20} color="#aaa" /></button>}
        <div ref={editorRef} contentEditable suppressContentEditableWarning onPaste={handlePaste} className="w-full outline-none text-sm leading-relaxed" style={{ padding: focusMode ? "40px 24px" : "16px", minHeight: focusMode ? "60vh" : "30vh", color: focusMode ? "#ddd" : (isDark ? "#E0E0E0" : "#333") }} onInput={handleInput} data-placeholder="在这里写下你的感悟、想法或日记…" />
        {!focusMode && (
          <div className="px-4 py-3 border-t" style={{ borderColor: isDark ? "#444" : "#e0e0e0" }}>
            <p className="text-xs mb-2" style={{ color: "#999" }}>此刻的心情</p>
            <div className="flex gap-3">{MOODS.map(m => (
              <button key={m.key} onClick={() => setMood(mood === m.key ? null : m.key)} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition" style={{ background: mood === m.key ? `${m.color}20` : "transparent", border: mood === m.key ? `2px solid ${m.color}` : "2px solid transparent" }}>
                <span className="text-xl">{m.emoji}</span><span className="text-[10px]" style={{ color: mood === m.key ? m.color : "#999" }}>{m.label}</span>
              </button>
            ))}</div>
          </div>
        )}
        {showTagPicker && !focusMode && (
          <div className="px-4 py-3 border-t animate-fade-in" style={{ borderColor: isDark ? "#444" : "#e0e0e0" }}>
            <div className="flex items-center gap-2 mb-2">
              <input className="input-sketch flex-1 px-3 py-2 text-sm outline-none" style={{ border: `1.5px solid ${inputBorder}`, background: inputBg, color: titleColor }} placeholder="新建标签名" value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === "Enter" && createTag()} />
              <button onClick={createTag} className="px-3 py-2 text-sm rounded-full text-white" style={{ background: "#8BC34A" }}>添加</button>
            </div>
            <div className="flex flex-wrap gap-2">{allTags.map(tag => (
              <button key={tag.id} onClick={() => toggleTag(tag.id)} className="px-3 py-1.5 rounded-full text-xs font-medium transition" style={{ background: selectedTags.includes(tag.id) ? "#8BC34A" : (isDark ? "#333" : "#f0f0f0"), color: selectedTags.includes(tag.id) ? "#fff" : (isDark ? "#aaa" : "#666") }}>{tag.name}</button>
            ))}</div>
          </div>
        )}
      </div>
      {focusMode && (<div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 pb-8" style={{ background: "linear-gradient(transparent, rgba(26,26,46,0.95))" }}><button onClick={() => handleSave()} className="px-6 py-2 rounded-full text-sm font-medium text-white" style={{ background: "#8BC34A" }}>保存</button></div>)}
      <style>{`
        [contenteditable]:empty:before{content:attr(data-placeholder);color:#bbb;pointer-events:none}
        [contenteditable] ul{list-style:disc;padding-left:1.5em;margin:0.5em 0}
        [contenteditable] ol{list-style:decimal;padding-left:1.5em;margin:0.5em 0}
        [contenteditable] li{margin:0.2em 0}
      `}</style>
    </div>
  )
}

