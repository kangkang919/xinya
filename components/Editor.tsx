"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

interface TagData {
  id: string
  name: string
  parentId: string | null
  children?: { id: string; name: string }[]
}

interface SimilarEntry {
  id: string
  title: string
  recordTime: string
}

interface EditorProps {
  entryId?: string
  isNew: boolean
}

export default function Editor({ entryId, isNew }: EditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPage = searchParams.get('from') || ''
  const fromTagId = searchParams.get('tagId') || ''
  const { isDark, titleColor, inputBg, inputBorder } = useTheme()
  const [title, setTitle] = useState("")
  const [mood, setMood] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<TagData[]>([])
  const [saving, setSaving] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(true)
  const [newTagName, setNewTagName] = useState("")
  const [newTagParentId, setNewTagParentId] = useState<string>("")
  const [charCount, setCharCount] = useState(0)
  const [similarEntries, setSimilarEntries] = useState<SimilarEntry[]>([])
  const editorRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const initialTagIds = useRef<string[]>([])
  const similarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetch("/api/tags").then(r => r.json()).then(d => { if (d.ok) setAllTags(d.data) }) }, [])

  // 标题相似检测（防抖 1 秒）
  useEffect(() => {
    if (similarTimer.current) clearTimeout(similarTimer.current)
    if (!title.trim() || title.trim().length < 3) {
      setSimilarEntries([])
      return
    }
    similarTimer.current = setTimeout(() => {
      fetch(`/api/entries?similarTitle=${encodeURIComponent(title.trim())}`)
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.data.similar) {
            // 排除当前正在编辑的心得
            setSimilarEntries(d.data.similar.filter((e: SimilarEntry) => e.id !== entryId))
          }
        })
        .catch(() => {})
    }, 1000)
    return () => { if (similarTimer.current) clearTimeout(similarTimer.current) }
  }, [title, entryId])

  useEffect(() => {
    if (entryId && !initialized.current && editorRef.current) {
      fetch(`/api/entries/${entryId}`).then(r => r.json()).then(d => {
        if (d.ok) {
          setTitle(d.data.title)
          if (editorRef.current) editorRef.current.innerHTML = d.data.content || ""
          setMood(d.data.mood)
          setSelectedTags(d.data.tags.map((t: { id: string }) => t.id))
          initialTagIds.current = d.data.tags.map((t: { id: string }) => t.id)
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
      if (data.ok) {
        toast.success("心得已保存")
        // 检测标签是否变更，记录到 sessionStorage 供枝叶页判断
        if (fromPage === 'leaf' && !isNew) {
          const tagsChanged = initialTagIds.current.length !== selectedTags.length ||
            !initialTagIds.current.every(id => selectedTags.includes(id))
          sessionStorage.setItem('leaf_saved', JSON.stringify({ tagChanged: tagsChanged, tagId: fromTagId }))
        }
        // 根据来源页面导航回去
        if (fromPage === 'leaf') {
          router.push(`/leaf?tagId=${fromTagId}`)
        } else {
          router.push("/")
        }
      } else toast.error(data.error || "保存失败")
    } catch { toast.error("网络异常") } finally { setSaving(false) }
  }

  function toggleTag(tagId: string) { setSelectedTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]) }

  async function createTag() {
    if (!newTagName.trim()) return
    try {
      const body: { name: string; parentId?: string } = { name: newTagName.trim() }
      if (newTagParentId) body.parentId = newTagParentId
      const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        // 重新拉取标签列表以获取正确的分组
        const tagRes = await fetch("/api/tags")
        const tagData = await tagRes.json()
        if (tagData.ok) setAllTags(tagData.data)
        setSelectedTags(prev => [...prev, data.data.id])
        setNewTagName("")
        setNewTagParentId("")
        toast.success("标签已创建")
      } else toast.error(data.error)
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
          isDark={isDark}
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
        {/* 相似心得提示 */}
        {!focusMode && similarEntries.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: isDark ? 'rgba(255,183,77,0.1)' : '#FFF8E1', border: `1px solid ${isDark ? 'rgba(255,183,77,0.3)' : '#FFE082'}` }}>
              <span>⚠️</span>
              <div>
                <p style={{ color: isDark ? '#FFB74D' : '#F57C00' }}>发现相似心得：</p>
                {similarEntries.map(e => (
                  <button key={e.id} onClick={() => router.push(`/entry/${e.id}/view?from=${fromPage || 'sprout'}${fromTagId ? `&tagId=${fromTagId}` : ''}`)}
                    className="block text-left underline mt-1 truncate max-w-[280px]"
                    style={{ color: isDark ? '#FFB74D' : '#E65100' }}>
                    「{e.title}」({new Date(e.recordTime).toLocaleDateString('zh-CN')})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
              <input className="input-sketch flex-1 px-3 py-2 text-sm outline-none" style={{ border: `1.5px solid ${inputBorder}`, background: inputBg, color: titleColor }} placeholder="新建标签名" maxLength={8} value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === "Enter" && createTag()} />
              <select
                value={newTagParentId}
                onChange={e => setNewTagParentId(e.target.value)}
                className="px-2 py-2 text-xs rounded-lg outline-none"
                style={{ border: `1.5px solid ${inputBorder}`, background: inputBg, color: titleColor, maxWidth: '100px' }}
              >
                <option value="">无父级</option>
                {allTags.filter(t => !t.parentId).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button onClick={createTag} className="px-3 py-2 text-sm rounded-full text-white" style={{ background: "#8BC34A" }}>添加</button>
            </div>
            {/* 标签分组显示 */}
            {(() => {
              // 有子标签的父标签
              const parentTags = allTags.filter(t => !t.parentId && t.children && t.children.length > 0)
              // 没有子标签的顶级标签
              const standaloneTags = allTags.filter(t => !t.parentId && (!t.children || t.children.length === 0))
              // 子标签（已被归入父标签下的，不在独立区域显示）
              const childTagIds = new Set(parentTags.flatMap(t => (t.children || []).map(c => c.id)))

              return (
                <div className="space-y-2">
                  {/* 有子标签的父分组 */}
                  {parentTags.map(parent => (
                    <div key={parent.id}>
                      <p className="text-[10px] mb-1 font-medium" style={{ color: '#999' }}>{parent.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {(parent.children || []).map(child => {
                          const childTag = allTags.find(t => t.id === child.id)
                          const isSelected = selectedTags.includes(child.id)
                          return (
                            <button key={child.id} onClick={() => toggleTag(child.id)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                              style={{ background: isSelected ? "#8BC34A" : (isDark ? "#333" : "#f0f0f0"), color: isSelected ? "#fff" : (isDark ? "#aaa" : "#666") }}>
                              {childTag?.name || child.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {/* 没有子标签的独立标签 */}
                  {standaloneTags.length > 0 && (
                    <div>
                      {(parentTags.length > 0) && <p className="text-[10px] mb-1 font-medium" style={{ color: '#999' }}>其他</p>}
                      <div className="flex flex-wrap gap-2">
                        {standaloneTags.map(tag => (
                          <button key={tag.id} onClick={() => toggleTag(tag.id)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                            style={{ background: selectedTags.includes(tag.id) ? "#8BC34A" : (isDark ? "#333" : "#f0f0f0"), color: selectedTags.includes(tag.id) ? "#fff" : (isDark ? "#aaa" : "#666") }}>
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
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

