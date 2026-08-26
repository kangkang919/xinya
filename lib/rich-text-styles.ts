/**
 * 富文本编辑器内容样式生成器
 * 
 * 用途：确保编辑器、查看页、分享面板、分享链接页的富文本渲染效果完全一致
 * 原则：同一套样式只维护一份，消除重复和遗漏
 * 
 * 使用方式：
 * - Editor.tsx: 使用 CSS 变量版本（已在组件内定义 --ed-* 变量）
 * - view/page.tsx, SharePanel.tsx, share/[token]/page.tsx: 传入具体颜色值生成完整 CSS
 */

export interface RichTextTheme {
  /** 正文文字颜色 */
  textColor: string
  /** 代码块背景色 */
  codeBg: string
  /** 代码块文字颜色 */
  codeColor: string
  /** 边框/分隔线颜色 */
  borderColor: string
  /** 引用块左边框颜色 */
  quoteBorderColor: string
  /** 引用块文字颜色 */
  quoteTextColor: string
}

/**
 * 生成完整的富文本内容样式字符串
 * @param selector CSS 选择器前缀（如 '.view-content'、'.share-content'）
 * @param theme 主题颜色配置
 * @returns 可直接插入 <style> 标签的 CSS 字符串
 */
export function generateRichTextStyles(selector: string, theme: RichTextTheme): string {
  return `
    ${selector} p { margin: 0; line-height: 1.625; }
    ${selector} p:empty { min-height: 1.625em; }
    ${selector} > * + * { margin-top: 0; }
    ${selector} ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
    ${selector} ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
    ${selector} li { margin: 0.2em 0; }
    ${selector} b, ${selector} strong { font-weight: bold; }
    ${selector} i, ${selector} em { font-style: italic; }
    ${selector} u { text-decoration: underline; }
    ${selector} pre { background: ${theme.codeBg}; border-radius: 8px; padding: 12px 16px; margin: 8px 0; font-family: 'SF Mono','Fira Code','Cascadia Code',monospace; font-size: 13px; line-height: 1.6; white-space: pre; overflow-x: auto; tab-size: 4; color: ${theme.codeColor}; }
    ${selector} hr { border: none; border-top: 1px solid ${theme.borderColor}; margin: 16px 0; }
    ${selector} blockquote { border-left: 3px solid ${theme.quoteBorderColor}; padding-left: 12px; margin: 8px 0; color: ${theme.quoteTextColor}; }
    ${selector} h2 { font-size: 1.25em; font-weight: bold; margin: 12px 0 4px; }
    ${selector} s, ${selector} strike, ${selector} del { text-decoration: line-through; }
  `.trim()
}

/**
 * 为编辑器生成基于 CSS 变量的样式字符串
 * 编辑器已在 .editor-wrap 上定义了 --ed-* 变量，这里直接引用
 */
export function getEditorRichTextStyles(): string {
  return `
    .tiptap p { margin: 0; line-height: 1.625; }
    .tiptap p:empty { min-height: 1.625em; }
    .tiptap > * + * { margin-top: 0; }
    .tiptap ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
    .tiptap ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
    .tiptap li { margin: 0.2em 0; }
    .tiptap pre { background: var(--ed-code-bg); border-radius: 8px; padding: 12px 16px; margin: 8px 0; font-family: 'SF Mono','Fira Code','Cascadia Code',monospace; font-size: 13px; line-height: 1.6; white-space: pre; overflow-x: auto; tab-size: 4; color: var(--ed-code-color); }
    .tiptap hr { border: none; border-top: 1px solid var(--ed-border); margin: 16px 0; }
    .tiptap blockquote { border-left: 3px solid var(--ed-quote-border); padding-left: 12px; margin: 8px 0; color: var(--ed-quote-color); }
    .tiptap h2 { font-size: 1.25em; font-weight: bold; margin: 12px 0 4px; }
    .tiptap s { text-decoration: line-through; }
    .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #bbb; pointer-events: none; height: 0; }
  `.trim()
}
