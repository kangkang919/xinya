// 模板题目生成器（DeepSeek 失败时的降级方案）

interface TemplateQuestion {
  question: string
  type: "single" | "multiple" | "truefalse"
  options: string[]
  answer: number[]
  explanation: string
}

export function generateTemplateQuestions(entryTitle: string, entryContent: string): { keyPoints: string; questions: TemplateQuestion[] } {
  const questions: TemplateQuestion[] = []

  // 题目1：核心观点（单选）
  questions.push({
    question: "这篇心得的核心主题是什么？",
    type: "single",
    options: [
      entryTitle.substring(0, 30),
      "与主题相关的其他观点",
      "完全不同的领域知识",
      "以上都不是",
    ],
    answer: [0],
    explanation: `这篇心得的标题是「${entryTitle}」，核心内容围绕此主题展开。`,
  })

  // 题目2：内容理解（判断）
  const contentLength = entryContent.length
  questions.push({
    question: `这篇心得的内容篇幅属于？`,
    type: "truefalse",
    options: ["较长（详细阐述）", "较短（简要记录）"],
    answer: [contentLength > 200 ? 0 : 1],
    explanation: `这篇心得共有${contentLength}字，属于${contentLength > 200 ? "详细阐述" : "简要记录"}类型。`,
  })

  // 模板要点：取内容前200字
  const plainText = entryContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  const keyPoints = plainText.length > 200 ? plainText.substring(0, 200) + "…" : plainText

  return { keyPoints, questions }
}
