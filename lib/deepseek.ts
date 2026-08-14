const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

interface GeneratedQuestion {
  question: string
  type: "single" | "multiple" | "truefalse"
  options: string[]
  answer: number[]
  explanation: string
}

interface GeneratedResult {
  keyPoints: string
  questions: GeneratedQuestion[]
}

export async function generateQuestions(
  entryTitle: string,
  entryContent: string,
  maxRetries = 1
): Promise<GeneratedResult> {
  const prompt = `请根据以下心得内容，生成复习用的题目和要点总结。

心得标题：${entryTitle}
心得内容：${entryContent.substring(0, 1000)}

要求：
1. 题干简洁明了：单选/多选题≤30字；判断题为完整陈述句，≤50字。题干必须是完整的句子，禁止半句截断
2. 题型自动适配：概念辨析→单选，关系匹配→多选，对比→判断
3. 选项数量：单选/多选4个选项，判断题只有2个选项（正确/错误）
4. 答案用选项索引表示（单选[0]，多选[0,2]，判断[0]为对[1]为错）
5. 解析引用原文重点
6. 同时生成要点总结（keyPoints）：请你以老师的角色，对这篇心得的核心内容做 1-2 句总结叙述，不要发散，不要用 1、2、3、4、5 这样的列举，总字数（含标点）控制在 150 字以内

请返回 JSON 格式：
{
  "keyPoints": "1-2 句要点总结，150 字以内",
  "questions": [
    {
      "question": "题干",
      "type": "single/multiple/truefalse",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": [0],
      "explanation": "解析..."
    }
  ]
}
注意：判断题的options只有2个元素，如["正确", "错误"]

只返回JSON，不要其他内容。`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        console.error(`[DeepSeek] API error (attempt ${attempt + 1}):`, res.status)
        lastError = new Error(`API error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ""

      // 提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error(`[DeepSeek] No JSON found (attempt ${attempt + 1})`)
        lastError = new Error("No JSON in response")
        continue
      }

      const result = JSON.parse(jsonMatch[0])
      const questions = (result.questions || []).map((q: any) => ({
        question: q.question?.substring(0, 100) || "", // 100字安全上限（仅防异常超长，不再30字硬截断致断句）
        type: ["single", "multiple", "truefalse"].includes(q.type) ? q.type : "single",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        answer: Array.isArray(q.answer) ? q.answer : [0],
        explanation: q.explanation || "",
      }))

      return {
        keyPoints: result.keyPoints || "",
        questions,
      }
    } catch (e) {
      console.error(`[DeepSeek] Error (attempt ${attempt + 1}):`, e)
      lastError = e as Error
    }
  }

  console.error("[DeepSeek] All retries failed:", lastError)
  return { keyPoints: "", questions: [] }
}

// ========== 题目重生（F9.22）：从不同角度生成新题 ==========
export async function generateQuestionsWithAngle(
  entryTitle: string,
  entryContent: string,
  existingQuestion: string,
  maxRetries = 1
): Promise<GeneratedResult> {
  const prompt = `请根据以下心得内容，从不同角度生成一道新的复习题。

心得标题：${entryTitle}
心得内容：${entryContent.substring(0, 1000)}

已有的旧题目（请避免重复或相似）：
"${existingQuestion}"

要求：
1. 必须从与旧题不同的角度切入，考察心得中其他知识点或理解维度
2. 题干简洁明了：单选/多选题≤30字；判断题为完整陈述句，≤50字。题干必须是完整的句子
3. 题型自动适配：概念辨析→单选，关系匹配→多选，对比→判断
4. 选项数量：单选/多选4个选项，判断题只有2个选项（正确/错误）
5. 答案用选项索引表示（单选[0]，多选[0,2]，判断[0]为对[1]为错）
6. 解析引用原文重点
7. 不需要重新生成 keyPoints，返回空字符串即可

请返回 JSON 格式：
{
  "keyPoints": "",
  "questions": [
    {
      "question": "题干",
      "type": "single/multiple/truefalse",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": [0],
      "explanation": "解析..."
    }
  ]
}
注意：判断题的options只有2个元素，如["正确", "错误"]

只返回JSON，不要其他内容。`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        console.error(`[DeepSeek:Angle] API error (attempt ${attempt + 1}):`, res.status)
        lastError = new Error(`API error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ""

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error(`[DeepSeek:Angle] No JSON found (attempt ${attempt + 1})`)
        lastError = new Error("No JSON in response")
        continue
      }

      const result = JSON.parse(jsonMatch[0])
      const questions = (result.questions || []).map((q: any) => ({
        question: q.question?.substring(0, 100) || "",
        type: ["single", "multiple", "truefalse"].includes(q.type) ? q.type : "single",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        answer: Array.isArray(q.answer) ? q.answer : [0],
        explanation: q.explanation || "",
      }))

      return {
        keyPoints: result.keyPoints || "",
        questions,
      }
    } catch (e) {
      console.error(`[DeepSeek:Angle] Error (attempt ${attempt + 1}):`, e)
      lastError = e as Error
    }
  }

  console.error("[DeepSeek:Angle] All retries failed:", lastError)
  return { keyPoints: "", questions: [] }
}

// ========== 月度成长洞察（F5.9） ==========
export interface MonthlyInsight {
  themes: string[]
  moodTrend: string
  growth: string
  encouragement: string
}

/**
 * 基于当月全部心得的要点总结（keyPoints），生成月度成长洞察。
 * 输入源为已蒸馏的 ≤150 字总结，覆盖全部篇数，token 成本极低。
 */
export async function generateMonthlyInsight(
  monthLabel: string,
  entrySummaries: { title: string; keyPoints: string }[],
  maxRetries = 1
): Promise<MonthlyInsight | null> {
  const list = entrySummaries
    .map((e, i) => `${i + 1}. 【${e.title || "无题"}】${e.keyPoints}`)
    .join("\n")

  const prompt = `你是“心芽”里的洞察分析师，一位温柔、诗意、从不评判的成长陪伴者。
下面是用户 ${monthLabel} 记录的心得要点总结（共 ${entrySummaries.length} 篇）：

${list}

请你基于这些总结，为用户凝出一枚这个月的成长洞察，包含：
1. themes：这个月反复出现的主题关键词（2-4个，每个≤4字）
2. moodTrend：这个月整体的情绪基调与变化（1-2句，温柔观察，不说教）
3. growth：这个月用户内心的成长或探索（1-2句，肯定式的发现）
4. encouragement：一句诗意的鼓励（1句，像朋友写在叶脉上的话，≤30字）

语气要求：温柔、克制、诗意，多用自然意象（叶、光、根、季节），不要列举数字，不要鸡汤口号，不要发散。

只返回 JSON，不要其他内容：
{
  "themes": ["关键词1", "关键词2"],
  "moodTrend": "...",
  "growth": "...",
  "encouragement": "..."
}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        console.error(`[DeepSeek:Insight] API error (attempt ${attempt + 1}):`, res.status)
        lastError = new Error(`API error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ""

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error(`[DeepSeek:Insight] No JSON found (attempt ${attempt + 1})`)
        lastError = new Error("No JSON in response")
        continue
      }

      const result = JSON.parse(jsonMatch[0])
      const themes = Array.isArray(result.themes)
        ? result.themes.map((t: string) => String(t).substring(0, 6)).slice(0, 4)
        : []

      return {
        themes,
        moodTrend: String(result.moodTrend || "").substring(0, 200),
        growth: String(result.growth || "").substring(0, 200),
        encouragement: String(result.encouragement || "").substring(0, 60),
      }
    } catch (e) {
      console.error(`[DeepSeek:Insight] Error (attempt ${attempt + 1}):`, e)
      lastError = e as Error
    }
  }

  console.error("[DeepSeek:Insight] All retries failed:", lastError)
  return null
}
