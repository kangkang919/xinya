import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

// div 段落：前后加空行，空 div 忽略
turndownService.addRule('div', {
  filter: 'div',
  replacement: (content: string, node: HTMLElement) => {
    const el = node as HTMLElement
    if (el.innerHTML.trim() === '' || el.innerHTML === '<br>') return ''
    return '\n\n' + content.trim() + '\n\n'
  },
})

// 后处理：修复 turndown 转换的常见问题
function cleanMarkdown(md: string): string {
  return md
    .replace(/\\=/g, '=')        // 修复等号被转义（\========== → ==========）
    .replace(/\*{4,}/g, '**')    // 修复嵌套<b>导致的多余星号（****总纲** → **总纲**）
    .replace(/\n{3,}/g, '\n\n')  // 清理多余空行
}

interface ExportEntry {
  title: string
  content: string
  tags: { name: string; parentName: string | null }[]
  createdAt: string
}

export function toMarkdown(entries: ExportEntry[]): string {
  return entries.map(e => {
    const tags = e.tags.map(t => `#${t.parentName ? t.parentName + '/' + t.name : t.name}`).join(' ')
    const date = new Date(e.createdAt).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
    const mdContent = cleanMarkdown(turndownService.turndown(e.content || '').trim())
    return `## ${e.title}\n\n${tags}\n\n${date}\n\n${mdContent}\n\n---`
  }).join('\n\n')
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
