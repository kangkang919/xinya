interface ExportEntry {
  title: string
  content: string
  tags: { name: string }[]
  createdAt: string
}

export function toMarkdown(entries: ExportEntry[]): string {
  return entries.map(e => {
    const tags = e.tags.map(t => `#${t.name}`).join(' ')
    const date = new Date(e.createdAt).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
    return `## ${e.title}\n\n${tags}\n\n${date}\n\n${e.content}\n\n---`
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
