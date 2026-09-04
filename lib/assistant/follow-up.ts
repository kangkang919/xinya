// ============ 通用追问识别（纯函数，便于单测） ============
// 背景：用户对豆苗上一轮回复追问（"为什么？""具体说说""展开讲"），
// 检索为 0 时不应直接拒绝，而应基于对话历史让 LLM 补充回答。

export interface HistoryMsg {
  role: string
  content: string
}

// 追问关键词：要求展开/解释/细化上一轮回答
const FOLLOWUP_EXPAND = /具体|展开|详细|说说|讲讲|解释|展开讲|展开说|细说|深入|再聊|接着|继续|然后|还有呢|还有什么|再说|补充/
// 追问关键词：质疑/追问原因
const FOLLOWUP_WHY = /为什么|为啥|怎么说|什么意思|啥意思|何解|怎么理解/
// 追问关键词：简短确认（结合上下文判定）
const FOLLOWUP_SHORT = /^($|嗯|哦|啊|哈|噢|噢噢|嗯嗯|这样|原来|懂了|明白|了解|了解了解|原来如此|这样啊|这样子|好吧|好嘛)$/

const ALL_FOLLOWUP = [FOLLOWUP_EXPAND, FOLLOWUP_WHY]

/**
 * 判断用户当前消息是否是对豆苗上一轮回复的追问。
 * 条件：
 * 1. 豆苗上一轮回复存在且非空
 * 2. 用户消息命中追问关键词，或是极短确认词（≤4字）
 * 3. 用户消息不是独立的知识性问题（不含具体标签/心得标题等实体词）
 */
export function detectFollowUp(q: string, history: HistoryMsg[]): boolean {
  // 豆苗上一轮回复必须存在
  const lastAssistant = [...history].reverse().find(m => m.role === "assistant")?.content ?? ""
  if (!lastAssistant || lastAssistant.length < 10) return false

  const isQuestion = /[？?]/.test(q) || /怎么|如何|为什么|哪些|什么/.test(q)
  const isShort = q.length <= 6

  // 命中追问关键词
  const hasFollowupKeyword = ALL_FOLLOWUP.some(r => r.test(q))
  if (hasFollowupKeyword && (isQuestion || isShort || q.length <= 15)) return true

  // 极短确认词（"嗯嗯"、"这样啊"、"原来如此"）——需要上一轮豆苗有实质内容
  if (FOLLOWUP_SHORT.test(q.trim()) && q.length <= 6) return true

  return false
}
