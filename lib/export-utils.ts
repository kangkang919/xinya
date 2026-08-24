let turndownService: any = null

function getTurndownService() {
  if (!turndownService) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TurndownService = require('turndown')
    turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    })
    // 移除空 div 产生的多余空行
    turndownService.addRule('emptyDiv', {
      filter: 'div',
      replacement: (content: string, node: HTMLElement) => {
        const el = node as HTMLElement
        if (el.innerHTML.trim() === '' || el.innerHTML === '<br>') return ''
        return content
      },
    })
  }
  return turndownService
}

interface ExportEntry {
  title: string
  content: string
  tags: { name: string; parentName: string | null }[]
  createdAt: string
}

export function toMarkdown(entries: ExportEntry[]): string {
  const td = getTurndownService()
  return entries.map(e => {
    const tags = e.tags.map(t => `#${t.parentName ? t.parentName + '/' + t.name : t.name}`).join(' ')
    const date = new Date(e.createdAt).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
    const mdContent = td.turndown(e.content || '').trim()
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
