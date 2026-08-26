import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

// Tiptap 输出标准语义 HTML（<p>、<strong>、<em> 等），turndown 原生支持
// 仅处理空段落（Tiptap 空段落为 <p></p>）
turndownService.addRule('emptyParagraph', {
  filter: (node) => node.nodeName === 'P' && node.textContent?.trim() === '',
  replacement: () => '',
})

// 后处理：清理多余空行
function cleanMarkdown(md: string): string {
  return md.replace(/\n{3,}/g, '\n\n')
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
