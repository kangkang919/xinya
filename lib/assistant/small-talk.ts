// ============ 寒暄纯函数分类（问候/感谢/应答/告别），便于单测 ============
// 背景：原实现把问候、感谢、应答混在一个回复池随机取，导致用户说「谢谢」
// 可能抽到问候语「在的～有什么想一起看看的心得吗？」，牛头不对马嘴。

export type SmallTalkKind = "greeting" | "thanks" | "ack" | "farewell"

const THANKS_PATTERNS = [/^(谢谢|多谢|感谢|辛苦|麻烦|费心)/]
const GREETING_PATTERNS = [/^(你好|您好|嗨|哈喽|hello|hi|在吗|早|早上好|中午好|下午好|晚上好)/i]
// 告别模式：包含中文告别词 + 数字告别（88=拜拜、886=拜拜了）
const FAREWELL_PATTERNS = [
  /^(拜拜|再见|晚安|回见|下次见)/,
  /(88|886)[^\u4e00-\u9fffA-Za-z]*$/, // 88/886 在消息末尾（允许后跟标点）
]
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
  "再见啦～今天聊得很开心，明天继续 🌱",
  "好嘞，先忙去吧～随时回来找我聊",
]

/**
 * 判断消息是否为纯寒暄（问候/感谢/应答/告别），返回类别；否则返回 null。
 * 告别模式（88/拜拜等）优先检测且不受长度限制（"谢谢，88" 即使较长也是告别）。
 * 其他类别限制短消息（去标点后 ≤8 字），避免误伤正常提问。
 */
export function classifySmallTalk(question: string): SmallTalkKind | null {
  // 保留数字（88=拜拜等网络用语），去除标点/空格/特殊符号
  const clean = question.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "")
  if (clean.length === 0) return null
  // 剥离称呼前缀：「豆苗，你好」→「你好」；纯称呼（豆苗/豆芽）视为问候
  const stripped = clean.replace(CALL_NAME, "")
  if (stripped.length === 0) return "greeting"
  // 告别优先检测（不受长度限制）："不用展开了谢谢88" → farewell
  if (FAREWELL_PATTERNS.some(r => r.test(stripped))) return "farewell"
  // 其他类别：短消息才判定，避免误伤正常提问
  if (stripped.length > 8) return null
  if (THANKS_PATTERNS.some(r => r.test(stripped))) return "thanks"
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
