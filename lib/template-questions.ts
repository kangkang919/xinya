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

  // 模板要点：生成老师风格的总结
  const plainText = entryContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  
  let keyPoints: string
  if (!plainText) {
    // 内容为空时用标题
    keyPoints = entryTitle
  } else {
    // 取第一句话作为核心，加上引导语
    const firstSentence = plainText.split(/[。！？]/)[0].trim()
    const title = entryTitle.length > 20 ? entryTitle.substring(0, 20) + "..." : entryTitle
    
    if (firstSentence && firstSentence.length > 10) {
      // 有完整句子：用"本文讲解..."的格式
      const summary = firstSentence.length > 80 ? firstSentence.substring(0, 80) + "..." : firstSentence
      keyPoints = `本文讲解「${title}」：${summary}`
    } else {
      // 句子太短：直接用标题 + 内容前 80 字
      const content = plainText.length > 80 ? plainText.substring(0, 80) + "..." : plainText
      keyPoints = `「${title}」${content}`
    }
  }

  return { keyPoints, questions }
}
