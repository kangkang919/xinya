// 豆苗学习助手：LLM 查询改写（方案 C）
// 用 DeepSeek 从用户提问中提取精确搜索短语，优先用于数据库检索
// 失败时降级为 jieba 关键词提取

import { chatWithDeepSeek } from "@/lib/deepseek"

const REFORMULATE_PROMPT = `从以下用户提问中提取 2-5 个关键搜索短语，用于在知识库中搜索相关文档。

要求：
- 提取用户提到的核心概念/术语/短语（保持完整，不要拆分）
- 如果提问中有明确的专有名词、技术术语、方法论名称，优先提取
- 返回 JSON 数组格式

示例：
提问："用户旅程地图和用户故事地图的区别是什么"
输出：["用户旅程地图", "用户故事地图"]

提问："怎么理解Prisma是干什么的"
输出：["Prisma"]

提问："React和Vue哪个更适合小型项目"
输出：["React", "Vue", "小型项目"]

用户提问："{question}"

只返回JSON数组，不要其他内容：`

export async function reformulateQuery(question: string): Promise<string[]> {
  try {
    const result = await chatWithDeepSeek(
      [{ role: "user", content: REFORMULATE_PROMPT.replace("{question}", question) }],
      { temperature: 0.3, maxTokens: 200, maxRetries: 0 } // 低温度、短输出、不重试（快速失败）
    )

    if (!result?.content) return []

    // 提取 JSON 数组
    const jsonMatch = result.content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const phrases = JSON.parse(jsonMatch[0])
    if (!Array.isArray(phrases)) return []

    // 过滤：只保留 2-20 字的短语
    return phrases
      .filter((p: unknown) => typeof p === "string" && p.length >= 2 && p.length <= 20)
      .slice(0, 5)
  } catch {
    // LLM 调用失败时返回空数组，调用方会降级到 jieba
    return []
  }
}
