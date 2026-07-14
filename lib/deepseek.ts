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
1. 题干≤30字，简洁明了
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
        question: q.question?.substring(0, 30) || "",
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
