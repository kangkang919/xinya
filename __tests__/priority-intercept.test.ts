import { describe, it, expect } from "vitest"
import { detectPriorityConfirm, type HistoryMsg } from "@/lib/assistant/priority-intercept"

// ============ 评测集：2026-09-03 真实线上对话（用户 1243177461@qq.com） ============
// 场景：豆苗询问插队/权重模式后，用户的选择回复曾被误判为「检索无果」兜底回复。
// 以下用例复刻该对话，确保拦截逻辑确定性生效。

const TAGS = ["AI安全", "AI辅助开发", "AI与大模型", "AICoding"]

// 豆苗上一轮的模式选择提问（复刻线上回复）
const ASSISTANT_ASK =
  "伙伴，想给 AI 安全加码，这是好事呀！咱们先看看现在的情况：AI 安全目前有 13 道未答题，总共 13 道。\n" +
  "要增加它的出题频次，咱们有两种玩法：\n" +
  "a) 插队模式：直接让 AI 安全的题明天就插队开始出，一口气把剩下这 13 道全部答完为止。\n" +
  "b) 权重模式：只是放大 AI 安全题目出现的概率（默认 2 倍）。\n" +
  "伙伴，你更倾向哪一种？选好了我就帮你把配置记下来～"

const historyWithAsk = (userFirst: string): HistoryMsg[] => [
  { role: "user", content: userFirst },
  { role: "assistant", content: ASSISTANT_ASK },
]

describe("detectPriorityConfirm - 线上对话评测集", () => {
  it("用例1：用户首问（含疑问词）不拦截，走正常检索流程", () => {
    const r = detectPriorityConfirm(
      "我想增加 AI 安全相关的出题频次，我应该怎么操作呢",
      [],
      TAGS,
    )
    expect(r.intercept).toBe(false)
  })

  it("用例2：回复「我要使用「插队模式」」→ 拦截为 insert + AI安全", () => {
    const r = detectPriorityConfirm(
      "我要使用「插队模式」",
      historyWithAsk("我想增加 AI 安全相关的出题频次，我应该怎么操作呢"),
      TAGS,
    )
    expect(r.intercept).toBe(true)
    expect(r.tag).toBe("AI安全")
    expect(r.mode).toBe("insert")
  })

  it("用例3：回复「插队模式」→ 拦截为 insert", () => {
    const r = detectPriorityConfirm("插队模式", historyWithAsk("我想增加出题频次"), TAGS)
    expect(r.intercept).toBe(true)
    expect(r.tag).toBe("AI安全")
    expect(r.mode).toBe("insert")
  })

  it("用例4：回复「权重模式」→ 拦截为 weight", () => {
    const r = detectPriorityConfirm("权重模式", historyWithAsk("我想增加出题频次"), TAGS)
    expect(r.intercept).toBe(true)
    expect(r.mode).toBe("weight")
  })

  it("用例5：回复「我希望一口气连续答完」→ 拦截为 insert", () => {
    const r = detectPriorityConfirm(
      "我希望一口气连续答完",
      historyWithAsk("我想增加出题频次"),
      TAGS,
    )
    expect(r.intercept).toBe(true)
    expect(r.mode).toBe("insert")
  })

  it("用例6：回复「细水长流」→ 拦截为 weight", () => {
    const r = detectPriorityConfirm("细水长流吧", historyWithAsk("我想增加出题频次"), TAGS)
    expect(r.intercept).toBe(true)
    expect(r.mode).toBe("weight")
  })

  it("用例7：回复「请保存配置」→ 拦截，模式兜底 insert", () => {
    const r = detectPriorityConfirm("请保存配置", historyWithAsk("我想增加出题频次"), TAGS)
    expect(r.intercept).toBe(true)
    expect(r.mode).toBe("insert")
  })
})

describe("detectPriorityConfirm - 防误伤", () => {
  it("无优先级上下文时不拦截（普通保存请求）", () => {
    const r = detectPriorityConfirm("保存配置", [{ role: "user", content: "今天天气不错" }], TAGS)
    expect(r.intercept).toBe(false)
  })

  it("优先级上下文中的追问（含疑问词）不拦截", () => {
    const r = detectPriorityConfirm(
      "插队模式和权重模式有什么区别？",
      historyWithAsk("我想增加出题频次"),
      TAGS,
    )
    expect(r.intercept).toBe(false)
  })

  it("否定表达不拦截", () => {
    const r = detectPriorityConfirm("不要插队模式", historyWithAsk("我想增加出题频次"), TAGS)
    expect(r.intercept).toBe(false)
  })

  it("上下文标签与标签表空格不一致时仍能匹配（规范化）", () => {
    const history: HistoryMsg[] = [
      { role: "assistant", content: "AI 安全目前有 13 道未答题。选插队模式还是权重模式？" },
    ]
    const r = detectPriorityConfirm("插队模式", history, TAGS)
    expect(r.intercept).toBe(true)
    expect(r.tag).toBe("AI安全")
  })

  it("上下文未提及任何已有标签时不拦截", () => {
    const history: HistoryMsg[] = [
      { role: "assistant", content: "量子计算目前有 3 道未答题。选插队模式还是权重模式？" },
    ]
    const r = detectPriorityConfirm("插队模式", history, TAGS)
    expect(r.intercept).toBe(false)
  })
})
