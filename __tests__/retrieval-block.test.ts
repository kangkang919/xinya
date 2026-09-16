import { describe, it, expect } from "vitest"
import { buildRetrievalBlock } from "@/lib/assistant/prompts"

describe("buildRetrievalBlock", () => {
  const baseItem = {
    entryId: "1",
    title: "测试心得",
    keyPoints: "这是摘要内容",
    tags: ["标签A"],
    recordTime: new Date("2026-09-16"),
    priority: "low" as const,
    matchType: "content" as const,
  }

  it("空数组返回空字符串", () => {
    expect(buildRetrievalBlock([])).toBe("")
  })

  it("无 excerpt 时不输出正文片段行", () => {
    const result = buildRetrievalBlock([baseItem])
    expect(result).toContain("摘要：这是摘要内容")
    expect(result).not.toContain("正文片段")
  })

  it("有 excerpt 时输出正文片段行", () => {
    const item = { ...baseItem, excerpt: "Prisma 是一个现代化的 ORM 框架..." }
    const result = buildRetrievalBlock([item])
    expect(result).toContain("正文片段：Prisma 是一个现代化的 ORM 框架...")
  })

  it("excerpt 为 undefined 时不输出正文片段行", () => {
    const item = { ...baseItem, excerpt: undefined }
    const result = buildRetrievalBlock([item])
    expect(result).not.toContain("正文片段")
  })

  it("多条结果混合 excerpt 存在/缺失", () => {
    const items = [
      { ...baseItem, entryId: "1", title: "有心得", excerpt: "命中片段A" },
      { ...baseItem, entryId: "2", title: "无excerpt", excerpt: undefined },
      { ...baseItem, entryId: "3", title: "也有excerpt", excerpt: "命中片段B" },
    ]
    const result = buildRetrievalBlock(items)
    expect(result).toContain("正文片段：命中片段A")
    expect(result).toContain("正文片段：命中片段B")
    // 第二条不应有正文片段行（但标题和摘要仍正常）
    const lines = result.split("\n")
    const wuxinIdx = lines.findIndex(l => l.includes("无excerpt"))
    // 无excerpt 条目的下一行不应是"正文片段"
    if (wuxinIdx >= 0) {
      expect(lines[wuxinIdx + 1]).not.toContain("正文片段")
    }
  })

  it("输出包含总条数", () => {
    const result = buildRetrievalBlock([baseItem, { ...baseItem, entryId: "2" }])
    expect(result).toContain("共 2 条")
  })

  it("优先级标签正确映射", () => {
    const high = { ...baseItem, priority: "high" as const, matchType: "tag" as const }
    const medium = { ...baseItem, priority: "medium" as const, matchType: "title" as const, entryId: "2" }
    const result = buildRetrievalBlock([high, medium])
    expect(result).toContain("高（标签匹配）")
    expect(result).toContain("中（标题匹配）")
  })
})
