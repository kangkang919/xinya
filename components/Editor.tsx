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

  // 持续跟踪编辑器光标位置，确保 savedRangeRef 始终保存最新有效选区
  useEffect(() => {
    function handleSelectionChange() {
      const editor = editorRef.current
      if (!editor) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const anchorNode = sel.anchorNode
      if (anchorNode && editor.contains(anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [])

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
    const plainText = e.clipboardData.getData("text/plain")
    if (!plainText) return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    range.deleteContents()

    // 把换行符转成 <br>，让多行文本保持在同一个块内
    // 这样点击 <> 按钮时只会生成一个代码块，而不是每个段落一个
    const lines = plainText.split('\n')
    lines.forEach((line, i) => {
      if (line) {
        const textNode = document.createTextNode(line)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
      }
      if (i < lines.length - 1) {
        const br = document.createElement('br')
        range.insertNode(br)
        range.setStartAfter(br)
        range.setEndAfter(br)
      }
    })

    // 恢复光标位置到末尾
    sel.removeAllRanges()
    sel.addRange(range)
  }, [])

  function handleExecCommand(cmd: string, value?: string) {
    const editor = editorRef.current
    if (!editor) return

    // 标题切换：h2 ↔ 普通段落（手动 DOM 操作，确保光标始终在 H2 内部）
    if (cmd === 'formatBlock' && value === 'h2') {
      // 恢复保存的光标位置（由 selectionchange 持续跟踪）
      const savedRange = savedRangeRef.current
      if (savedRange) {
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(savedRange)
        }
      }

      // 从光标位置向上查找编辑器直接子块
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      let container = sel.getRangeAt(0).startContainer as HTMLElement
      if (container.nodeType === 3) container = container.parentElement as HTMLElement
      let block: HTMLElement | null = container
      while (block && block !== editor && block.parentElement !== editor) {
        block = block.parentElement as HTMLElement
      }

      if (block && block !== editor) {
        if (block.tagName === 'H2') {
          // H2 → P：手动替换标签，光标移入新 P
          const p = document.createElement('p')
          p.innerHTML = block.innerHTML
          block.replaceWith(p)
          const r = document.createRange()
          r.setStart(p, 0)
          r.collapse(true)
          sel.removeAllRanges()
          sel.addRange(r)
        } else {
          // P/其他 → H2：手动替换标签，光标移入新 H2
          const h2 = document.createElement('h2')
          h2.innerHTML = block.innerHTML
          block.replaceWith(h2)
          const r = document.createRange()
          r.setStart(h2, 0)
          r.collapse(true)
          sel.removeAllRanges()
          sel.addRange(r)
        }
      } else {
        // 光标不在任何子块内（在编辑器根层文本节点），用 formatBlock 兜底
        document.execCommand('formatBlock', false, 'h2')
        // 确保光标在新生成的 H2 内部
        const h2 = editor.querySelector('h2')
        if (h2 && sel) {
          const r = document.createRange()
          r.setStart(h2, 0)
          r.collapse(true)
          sel.removeAllRanges()
          sel.addRange(r)
        }
      }
      setCharCount((editor.textContent || "").replace(/\s/g, "").length)
      return
    }

    if (value !== undefined) {
      document.execCommand(cmd, false, value)
    } else {
      document.execCommand(cmd, false, undefined)
    }
  }

  // Obsidian 风格分隔线：输入 --- 后按回车自动转为灰色分割线
  // 使用 beforeinput 事件：在浏览器处理 Enter 前拦截，此时 --- 仍在当前块中
  function handleBeforeInput(e: React.FormEvent) {
    const nativeEvent = e.nativeEvent as InputEvent
    if (nativeEvent.inputType !== 'insertParagraph') return
    const editor = editorRef.current
    if (!editor) return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    let container = sel.getRangeAt(0).startContainer as HTMLElement
    if (container.nodeType === 3) container = container.parentElement as HTMLElement

    // 找到光标所在的编辑器直接子块
    let block: HTMLElement | null = container
    while (block && block.parentElement !== editor) {
      block = block.parentElement
    }
    if (!block || block === editor) return

    const text = block.textContent || ''

    // 情况1：整块只有 ---
    if (text.trim() === '---') {
      e.preventDefault()
      const hr = document.createElement('hr')
      const newBlock = document.createElement('div')
      newBlock.innerHTML = '<br>'
      block.replaceWith(hr, newBlock)
      const r = document.createRange()
      r.setStart(newBlock, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
      return
    }

    // 情况2：--- 在末尾（如 "hello---"），保留前面的文字
    if (text.endsWith('---') && text.length > 3) {
      e.preventDefault()
      const beforeText = text.slice(0, -3)
      block.textContent = beforeText
      const hr = document.createElement('hr')
      const newBlock = document.createElement('div')
      newBlock.innerHTML = '<br>'
      block.after(hr, newBlock)
      const r = document.createRange()
      r.setStart(newBlock, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }
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

  const savedRangeRef = useRef<Range | null>(null)

  function saveRange() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  function insertCodeBlock() {
    const editor = editorRef.current
    if (!editor) return
    
    // 使用在 onMouseDown 时保存的光标位置
    const range = savedRangeRef.current
    if (!range) return
    
    // 恢复 selection
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(range)

    const selectedText = sel.toString()

    if (selectedText.trim()) {
      // 收集选中范围内所有块级元素的文本
      const fragment = range.cloneContents()
      const tempDiv = document.createElement("div")
      tempDiv.appendChild(fragment)
      const fullText = tempDiv.textContent || selectedText

      // 找到选中范围涉及的 editor 直接子元素（块级）
      const blocksToRemove: HTMLElement[] = []
      let firstBlock: HTMLElement | null = null

      for (let i = 0; i < editor.children.length; i++) {
        const child = editor.children[i] as HTMLElement
        if (range.intersectsNode(child)) {
          blocksToRemove.push(child)
          if (!firstBlock) firstBlock = child
        }
      }

      if (blocksToRemove.length === 0 || !firstBlock) return

      // 在第一个块之前插入 <pre>
      const pre = document.createElement("pre")
      pre.textContent = fullText.trimEnd()
      firstBlock.parentNode?.insertBefore(pre, firstBlock)

      // 删除所有涉及的块元素
      blocksToRemove.forEach(b => b.remove())

      // 在 pre 后面插入空段落
      const p = document.createElement("p")
      p.innerHTML = "<br>"
      pre.parentNode?.insertBefore(p, pre.nextSibling)

      // 光标移到新段落
      const r = document.createRange()
      r.setStart(p, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    } else {
      // 没有选中内容：插入空代码块
      const pre = document.createElement("pre")
      pre.innerHTML = "<br>"
      let node = range.startContainer as HTMLElement
      if (node.nodeType === 3) node = node.parentElement as HTMLElement
      while (node && node.parentElement && node.parentElement !== editor) {
        node = node.parentElement
      }
      if (node && node !== editor) {
        node.parentNode?.insertBefore(pre, node.nextSibling)
      } else {
        editor.appendChild(pre)
      }
      const r = document.createRange()
      r.setStart(pre, 0)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }
    setCharCount((editor.textContent || "").replace(/\s/g, "").length)
  }

  function insertDivider() {
    const editor = editorRef.current
    if (!editor) return
    const range = savedRangeRef.current
    if (!range) return
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(range)

    const hr = document.createElement('hr')
    let node = range.startContainer as HTMLElement
    if (node.nodeType === 3) node = node.parentElement as HTMLElement
    while (node && node.parentElement && node.parentElement !== editor) {
      node = node.parentElement
    }
    if (node && node !== editor) {
      node.parentNode?.insertBefore(hr, node.nextSibling)
    } else {
      editor.appendChild(hr)
    }
    // hr 后面插入空段落，光标移入
    const p = document.createElement('div')
    p.innerHTML = '<br>'
    hr.after(p)
    const r = document.createRange()
    r.setStart(p, 0)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
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
          onInsertCodeBlock={insertCodeBlock}
          onInsertDivider={insertDivider}
          onSaveRange={saveRange}
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
        <div ref={editorRef} contentEditable suppressContentEditableWarning onPaste={handlePaste} onBeforeInput={handleBeforeInput} className="w-full outline-none text-sm leading-relaxed" style={{ padding: focusMode ? "40px 24px" : "16px", minHeight: focusMode ? "60vh" : "30vh", color: focusMode ? "#ddd" : (isDark ? "#E0E0E0" : "#333") }} onInput={handleInput} data-placeholder="在这里写下你的感悟、想法或日记…" />
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
        [contenteditable] pre{background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};border-radius:8px;padding:12px 16px;margin:8px 0;font-family:'SF Mono','Fira Code','Cascadia Code',monospace;font-size:13px;line-height:1.6;white-space:pre;overflow-x:auto;tab-size:4;color:${isDark ? '#ccc' : '#333'}}
        [contenteditable] hr{border:none;border-top:1px solid ${isDark ? '#555' : '#ccc'};margin:16px 0}
        [contenteditable] blockquote{border-left:3px solid ${isDark ? '#555' : '#ccc'};padding-left:12px;margin:8px 0;color:${isDark ? '#999' : '#888'}}
        [contenteditable] h2{font-size:1.25em;font-weight:bold;margin:12px 0 4px}
      `}</style>
    </div>
  )
}

