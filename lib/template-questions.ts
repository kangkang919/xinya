// 模板题目生成器（DeepSeek 失败时的降级方案）

interface TemplateQuestion {
  question: string
  type: "single" | "multiple" | "truefalse"
  options: string[]
  answer: number[]
  explanation: string
}

// 从内容生成要点总结（100 字以内）
export function generateKeyPoints(title: string, content: string): string {
  const plainText = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()

  if (!plainText) {
    return title
  }

  const firstSentence = plainText.split(/[。！？]/)[0].trim()
  const shortTitle = title.length > 15 ? title.substring(0, 15) + "…" : title

  let result: string
  if (firstSentence && firstSentence.length > 10) {
    // 有完整句子：用"本文讲解..."的格式
    result = `本文讲解「${shortTitle}」：${firstSentence}`
  } else {
    // 句子太短：直接用标题 + 内容
    result = `「${shortTitle}」${plainText}`
  }

  // 确保总字数不超过 100 字
  return result.length > 100 ? result.substring(0, 99) + "…" : result
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
  const contentLength = entryContent.replace(/<[^>]*>/g, "").length
  questions.push({
    question: `这篇心得的内容篇幅属于？`,
    type: "truefalse",
    options: ["较长（详细阐述）", "较短（简要记录）"],
    answer: [contentLength > 200 ? 0 : 1],
    explanation: `这篇心得共有${contentLength}字，属于${contentLength > 200 ? "详细阐述" : "简要记录"}类型。`,
  })

  const keyPoints = generateKeyPoints(entryTitle, entryContent)

  return { keyPoints, questions }
}
