// ============ 优先级配置确认回复拦截（纯函数，便于单测） ============
// 背景：豆苗询问「插队模式 / 权重模式」后，用户的选择回复（如「插队模式」）
// 不含学习类关键词，三级检索为 0 会被代码层兜底为 FALLBACK_NONE，根本到不了 LLM。
// 因此在检索之前用本模块确定性拦截：识别确认/选择回复 → 直接保存配置。

export interface PriorityInterceptResult {
  intercept: boolean
  tag?: string
  mode?: "insert" | "weight"
}

export interface HistoryMsg {
  role: string
  content: string
}

const SAVE_PRIORITY_WORDS = /保存|实施|按你说的|确认|就这么|好的就|行就|可以就/
const MODE_CHOICE_WORDS = /插队|权重|一口气|细水长流/
const PRIORITY_CONTEXT_WORDS = /插队模式|权重模式|出题频次|出题优先/
const QUESTION_WORDS = /怎么|如何|为什么|哪些|？|\?/
const NEGATIVE_WORDS = /不想|不要|取消|别|不用/

function modeFrom(text: string): "insert" | "weight" | null {
  if (/插队|一口气|集中/.test(text)) return "insert"
  if (/权重|细水长流/.test(text)) return "weight"
  return null
}

/**
 * 判断用户当前消息是否为优先级配置的确认/选择回复。
 * @param q 当前用户消息
 * @param history 最近对话历史（时间升序，最后一条为豆苗上一轮回复）
 * @param tagNames 用户全部标签名（用于规范化匹配，避免空格等格式差异）
 */
export function detectPriorityConfirm(
  q: string,
  history: HistoryMsg[],
  tagNames: string[],
): PriorityInterceptResult {
  const recentText = history.map(m => m.content).join("\n")
  // 上下文里没有优先级讨论时不拦截，避免误伤普通对话
  if (!PRIORITY_CONTEXT_WORDS.test(recentText)) return { intercept: false }
  if (NEGATIVE_WORDS.test(q)) return { intercept: false }

  const isQuestion = QUESTION_WORDS.test(q)
  const isSaveAsk = SAVE_PRIORITY_WORDS.test(q)
  const isModeChoice = MODE_CHOICE_WORDS.test(q) && q.length <= 30 && !isQuestion
  if (!isSaveAsk && !isModeChoice) return { intercept: false }

  // 标签：优先从豆苗上一轮回复提取，与标签表规范化（去空格）匹配
  const lastAssistant = [...history].reverse().find(m => m.role === "assistant")?.content ?? ""
  let tag: string | null = null
  for (const text of [lastAssistant, recentText]) {
    const normalized = text.replace(/\s/g, "")
    for (const name of tagNames) {
      if (normalized.includes(name.replace(/\s/g, ""))) {
        tag = name
        break
      }
    }
    if (tag) break
  }
  if (!tag) return { intercept: false }

  // 模式：先看当前消息，再看历史中的用户消息，兜底插队
  let mode = modeFrom(q)
  if (!mode) {
    const userMsgs = history.filter(m => m.role === "user").map(m => m.content)
    for (let i = userMsgs.length - 1; i >= 0; i--) {
      mode = modeFrom(userMsgs[i])
      if (mode) break
    }
  }
  if (!mode) mode = "insert"

  return { intercept: true, tag, mode }
}
