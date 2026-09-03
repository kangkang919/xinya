import { describe, it, expect } from "vitest"
import { classifySmallTalk, smallTalkReply } from "@/lib/assistant/small-talk"

// ============ 评测集：2026-09-03 线上对话 ============
// 场景：用户配置保存成功后回复「谢谢」，曾被混池随机抽到问候语
// 「在的～有什么想一起看看的心得吗？」，牛头不对马嘴。

const THANKS_POOL = [
  "不用客气～能陪你一起学习，我也很开心 🌱",
  "嘿嘿，别客气～还有什么想聊的随时说",
  "不客气～你的每一点努力，豆苗都记着呢 🌱",
]
const GREETING_POOL = [
  "你好呀～我是豆苗 🌱 想回顾心得还是梳理知识点？",
  "在的～有什么想一起看看的心得吗？",
  "嗨～随时可以聊聊你写下的心得",
]

describe("classifySmallTalk - 线上对话评测集", () => {
  it("用例1：「谢谢」→ 感谢类，回复必须来自感谢池", () => {
    const kind = classifySmallTalk("谢谢")
    expect(kind).toBe("thanks")
    expect(THANKS_POOL).toContain(smallTalkReply("thanks"))
    expect(GREETING_POOL).not.toContain(smallTalkReply("thanks"))
  })

  it("用例2：感谢变体均归感谢类", () => {
    for (const q of ["多谢", "感谢", "辛苦了", "麻烦你了", "谢谢！"]) {
      expect(classifySmallTalk(q)).toBe("thanks")
    }
  })

  it("用例3：问候归问候类", () => {
    for (const q of ["你好", "在吗", "嗨", "早上好", "hello"]) {
      expect(classifySmallTalk(q)).toBe("greeting")
    }
  })

  it("用例4：应答归应答类", () => {
    for (const q of ["好的", "好嘞", "明白", "嗯嗯", "知道了", "收到"]) {
      expect(classifySmallTalk(q)).toBe("ack")
    }
  })

  it("用例5：告别归告别类", () => {
    for (const q of ["拜拜", "再见", "晚安"]) {
      expect(classifySmallTalk(q)).toBe("farewell")
    }
  })
})

describe("classifySmallTalk - 防误伤", () => {
  it("长消息不判定为寒暄", () => {
    expect(classifySmallTalk("谢谢你，然后再帮我看看 AI 安全的心得")).toBeNull()
    expect(classifySmallTalk("好的，那我想增加出题频次怎么操作")).toBeNull()
  })

  it("含寒暄词开头的正常提问不判定", () => {
    expect(classifySmallTalk("谢谢之后还想问下拾遗怎么用")).toBeNull()
  })

  it("空消息不判定", () => {
    expect(classifySmallTalk("")).toBeNull()
    expect(classifySmallTalk("！！！")).toBeNull()
  })
})
