// 豆苗：人设维度常量（需求文档 §4.1）+ 共享小组件
"use client"

export interface DimOption {
  emoji: string
  t: string
  d: string
}
export interface Dim {
  title: string
  desc: string
  options: DimOption[]
}

export const DIMS: Record<"tone" | "teach" | "call", Dim> = {
  tone: {
    title: "语气风格",
    desc: "豆苗说话给人的整体感觉",
    options: [
      { emoji: "⚡", t: "简洁直接", d: "干脆利落，不废话" },
      { emoji: "🌸", t: "温暖鼓励", d: "温和友善，多说肯定" },
      { emoji: "🎈", t: "活泼俏皮", d: "轻松有趣，偶尔调侃" },
      { emoji: "📚", t: "沉稳知性", d: "稳重理性，有书卷气" },
      { emoji: "💮", t: "娃娃音", d: "可爱俏皮，语气词多（呀～嘛～啦）" },
    ],
  },
  teach: {
    title: "指导方式",
    desc: "豆苗怎么帮你理解知识",
    options: [
      { emoji: "🧠", t: "苏格拉底式提问", d: "以问代答，引导你自己思考" },
      { emoji: "📖", t: "直接解答", d: "清晰直接给出答案和解释" },
      { emoji: "🔍", t: "启发引导", d: "先给提示等你思考，不会再说答案" },
      { emoji: "🤗", t: "鼓励陪伴", d: "重在共情和肯定，压力小" },
    ],
  },
  call: {
    title: "角色称呼",
    desc: "豆苗的自称和对你的称呼",
    options: [
      { emoji: "👋", t: "我 / 你", d: "最自然中性，像朋友聊天" },
      { emoji: "👩‍🏫", t: "老师感", d: "自称老师，说话带指导感" },
      { emoji: "🤝", t: "咱们 / 伙伴", d: "像一起学习的伙伴" },
    ],
  },
}

export const DEFAULT_DIMS = { tone: "温暖鼓励", teach: "启发引导", call: "我 / 你" }

export interface ProfileState {
  tone: string
  teach: string
  call: string
  freeDesc: string
  wizardDone: boolean
}

export const AVATAR_URL = "/assistant/doumiao-avatar.png"

// 豆苗头像（形象图裁切规范：保留头部）
export function Avatar({ size = 34, gray = false }: { size?: number; gray?: boolean }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 border"
      style={{
        width: size,
        height: size,
        borderColor: "var(--color-primary-light)",
        filter: gray ? "grayscale(1) opacity(0.55)" : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AVATAR_URL}
        alt="豆苗"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
      />
    </div>
  )
}
