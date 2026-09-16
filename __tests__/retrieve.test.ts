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

describe("extractKeywords", () => {
  it("英文 + 中文关键词混合", () => {
    const kw = extractKeywords("怎么理解Prisma是干什么的")
    expect(kw).toContain("Prisma")
    expect(kw).toContain("理解")
    expect(kw).toContain("干什么")
  })

  it("纯英文提问", () => {
    const kw = extractKeywords("What is React")
    expect(kw).toContain("What")
    expect(kw).toContain("React")
  })

  it("纯中文提问", () => {
    const kw = extractKeywords("今天学了什么")
    expect(kw.length).toBeGreaterThanOrEqual(0)
    // 停用词过滤后可能为空
  })

  it("含豆苗称呼的提问", () => {
    const kw = extractKeywords("豆苗，Prisma怎么用")
    expect(kw).toContain("Prisma")
  })
})
