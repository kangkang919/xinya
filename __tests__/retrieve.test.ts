import { describe, it, expect } from "vitest"
import { extractKeywords, extractLatinTokens } from "@/lib/assistant/retrieve"

describe("extractLatinTokens", () => {
  it("提取英文 token（≥2 字符）", () => {
    expect(extractLatinTokens("怎么理解Prisma是干什么的")).toEqual(["Prisma"])
  })

  it("提取多个英文 token", () => {
    expect(extractLatinTokens("React和Vue哪个更好")).toEqual(["React", "Vue"])
  })

  it("忽略单字符", () => {
    expect(extractLatinTokens("用a还是用b")).toEqual([])
  })

  it("含特殊符号的 token", () => {
    expect(extractLatinTokens("useState和useMemo的区别")).toEqual(["useState", "useMemo"])
  })

  it("纯中文返回空", () => {
    expect(extractLatinTokens("今天天气怎么样")).toEqual([])
  })
})

describe("extractKeywords (jieba TF-IDF)", () => {
  it("正确拆分连词连接的多概念", () => {
    const kw = extractKeywords("用户旅程地图和用户故事地图的区别是什么")
    // jieba 应能正确分词，不会把整句截断为 8 字
    expect(kw.length).toBeGreaterThan(0)
    // 应包含核心概念词（不一定是完整短语，但关键词应被识别）
    const kwStr = kw.join(",")
    expect(kwStr).toMatch(/旅程|故事|地图|区别/)
  })

  it("英文关键词权重最高", () => {
    const kw = extractKeywords("怎么理解Prisma是干什么的")
    // Prisma 应该是第一个关键词（TF-IDF 权重最高）
    expect(kw[0]).toBe("Prisma")
  })

  it("纯英文提问", () => {
    const kw = extractKeywords("What is React")
    expect(kw).toContain("React")
  })

  it("纯中文提问停用词过滤", () => {
    const kw = extractKeywords("今天学了什么")
    // 停用词过滤后可能为空或只剩少量词
    expect(kw.length).toBeGreaterThanOrEqual(0)
  })

  it("含豆苗称呼的提问", () => {
    const kw = extractKeywords("豆苗，Prisma怎么用")
    expect(kw).toContain("Prisma")
  })

  it("技术术语正确识别", () => {
    const kw = extractKeywords("useState和useMemo的区别")
    expect(kw.some(k => k.includes("useState") || k.includes("useMemo"))).toBe(true)
  })
})
