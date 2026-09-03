// ============ 寒暄纯函数分类（问候/感谢/应答/告别），便于单测 ============
// 背景：原实现把问候、感谢、应答混在一个回复池随机取，导致用户说「谢谢」
// 可能抽到问候语「在的～有什么想一起看看的心得吗？」，牛头不对马嘴。

export type SmallTalkKind = "greeting" | "thanks" | "ack" | "farewell"

const THANKS_PATTERNS = [/^(谢谢|多谢|感谢|辛苦|麻烦|费心)/]
const GREETING_PATTERNS = [/^(你好|您好|嗨|哈喽|hello|hi|在吗|早|早上好|中午好|下午好|晚上好)/i]
const FAREWELL_PATTERNS = [/^(拜拜|再见|晚安|回见|下次见)/]
const ACK_PATTERNS = [/^(好的|好嘞|明白|嗯嗯|知道了|收到|ok)/i]
// 称呼前缀（如「豆苗，你好」「豆芽 你好」），分类前先剥离
const CALL_NAME = /^(豆苗|豆芽|小苗|苗苗)/

const GREETING_REPLIES = [
  "你好呀～我是豆苗 🌱 想回顾心得还是梳理知识点？",
  "在的～有什么想一起看看的心得吗？",
  "嗨～随时可以聊聊你写下的心得",
]
const THANKS_REPLIES = [
  "不用客气～能陪你一起学习，我也很开心 🌱",
  "嘿嘿，别客气～还有什么想聊的随时说",
  "不客气～你的每一点努力，豆苗都记着呢 🌱",
]
const ACK_REPLIES = [
  "嗯嗯～有什么想聊的随时找我",
  "🌱 我在的，随时招呼",
  "好嘞～继续你的学习节奏吧",
]
const FAREWELL_REPLIES = [
  "拜拜～有需要随时找我 🌱",
  "下次见～别忘了拾遗明天还有小题等你",
]

/**
 * 判断消息是否为纯寒暄（问候/感谢/应答/告别），返回类别；否则返回 null。
 * 仅短消息（去标点后 ≤8 字）参与判定，避免误伤正常提问。
 */
export function classifySmallTalk(question: string): SmallTalkKind | null {
  const clean = question.replace(/[^\u4e00-\u9fffA-Za-z]/g, "")
  if (clean.length === 0 || clean.length > 8) return null
  // 剥离称呼前缀：「豆苗，你好」→「你好」；纯称呼（豆苗/豆芽）视为问候
  const stripped = clean.replace(CALL_NAME, "")
  if (stripped.length === 0) return "greeting"
  if (THANKS_PATTERNS.some(r => r.test(stripped))) return "thanks"
  if (FAREWELL_PATTERNS.some(r => r.test(stripped))) return "farewell"
  if (GREETING_PATTERNS.some(r => r.test(stripped))) return "greeting"
  if (ACK_PATTERNS.some(r => r.test(stripped))) return "ack"
  return null
}

/** 按类别从对应回复池随机取一条（感谢不会抽到问候语） */
export function smallTalkReply(kind: SmallTalkKind): string {
  const pool =
    kind === "thanks"
      ? THANKS_REPLIES
      : kind === "ack"
        ? ACK_REPLIES
        : kind === "farewell"
          ? FAREWELL_REPLIES
          : GREETING_REPLIES
  return pool[Math.floor(Math.random() * pool.length)]
}
