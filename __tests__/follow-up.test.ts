import { describe, it, expect } from "vitest"
import { detectFollowUp } from "@/lib/assistant/follow-up"

// ============ 评测集：追问识别 ============

describe("detectFollowUp - 追问识别", () => {
  const historyWithSubstance = [
    { role: "user", content: "什么是标注？" },
    {
      role: "assistant",
      content:
        "伙伴，你这个问题其实在你的心得里是有答案的。我翻了翻，你写过两篇跟「标注」直接相关的内容，咱们一起来回顾一下：\n\n• 《数据标注》里你写道：标注是给原始数据打标签，让机器理解数据含义，上游是数据采集与清洗，下游是模型训练与评估。\n• 《标注、评测、测评》里你更强调：标注是数据工程环节，属于为原始数据打标签这一步。\n\n有意思的是，这两篇都把它定位成「数据工程」的一环，但视角略有不同——一篇更侧重它在整个链路中的位置（上游采集、下游训练），另一篇更侧重它和「评测」「测评」的区别。\n\n那我想顺着你的思路问一句：既然标注是为让机器理解数据，那在你看来，标注的质量好坏，会不会直接决定后面模型训练和评测的成败？还是说，你觉得标注只是「打个标签」这么简单，影响没那么大？\n\n咱们可以先聊聊这个，看看你当时有没有往这个方向想过。",
    },
  ]

  const historyEmpty = [
    { role: "user", content: "你好" },
    { role: "assistant", content: "你好呀～" },
  ]

  it("用例1：「具体说说」→ 追问", () => {
    expect(detectFollowUp("具体说说", historyWithSubstance)).toBe(true)
  })

  it("用例2：「为什么？」→ 追问", () => {
    expect(detectFollowUp("为什么？", historyWithSubstance)).toBe(true)
  })

  it("用例3：「展开讲」→ 追问", () => {
    expect(detectFollowUp("展开讲", historyWithSubstance)).toBe(true)
  })

  it("用例4：「什么意思」→ 追问", () => {
    expect(detectFollowUp("什么意思", historyWithSubstance)).toBe(true)
  })

  it("用例5：极短确认词「嗯嗯」→ 追问", () => {
    expect(detectFollowUp("嗯嗯", historyWithSubstance)).toBe(true)
  })

  it("用例6：极短确认词「原来如此」→ 追问", () => {
    expect(detectFollowUp("原来如此", historyWithSubstance)).toBe(true)
  })

  it("用例7：豆苗上一轮回复太短→ 不判定追问", () => {
    expect(detectFollowUp("具体说说", historyEmpty)).toBe(false)
  })

  it("用例8：无历史→ 不判定追问", () => {
    expect(detectFollowUp("为什么？", [])).toBe(false)
  })

  it("用例9：独立知识性问题→ 不判定追问", () => {
    // 长消息且不含追问关键词
    expect(detectFollowUp("AI安全的最新发展趋势是什么", historyWithSubstance)).toBe(false)
  })

  it("用例10：「能详细说说吗？」→ 追问", () => {
    expect(detectFollowUp("能详细说说吗？", historyWithSubstance)).toBe(true)
  })

  it("用例11：「还有呢」→ 追问", () => {
    expect(detectFollowUp("还有呢", historyWithSubstance)).toBe(true)
  })

  it("用例12：「这样啊」→ 追问（短确认词）", () => {
    expect(detectFollowUp("这样啊", historyWithSubstance)).toBe(true)
  })
})
