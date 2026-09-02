// 豆苗学习助手：三级检索（需求文档 §5.1/§5.2/§5.3）
// 三条渠道独立并行：标签匹配(高) → 标题匹配(中) → 内容匹配(低)
// 跨渠道去重：同一篇心得只保留最高优先级的一次命中

import { prisma } from "@/lib/prisma"
import { stripHtml } from "@/lib/utils"

export interface RetrievalItem {
  entryId: string
  title: string
  keyPoints: string
  tags: string[]
  recordTime: Date
  priority: "high" | "medium" | "low"
  matchType: "tag" | "title" | "content"
  excerpt?: string // 内容匹配时附带命中的正文片段（≤200字）
}

export interface RetrievalResult {
  items: RetrievalItem[]
  totalCount: number // 去重后的命中总篇数（用于宽泛提问判定 >10）
  matchedTags: string[] // 命中的标签名（供检索标签展示）
}

const MAX_TAG = 5
const MAX_TITLE = 3
const MAX_CONTENT = 5

// 疑问/寒暄/虚词停用词：从提问中剔除，避免作为检索关键词
const STOP_WORDS = [
  "你好", "请问", "可以", "帮我", "一下", "关于", "什么", "哪些", "哪个",
  "怎么", "如何", "为什么", "为何", "多少", "怎样", "是不是", "有没有",
  "我", "你", "的", "了", "吗", "呢", "啊", "呀", "吧", "嘛", "是", "在",
  "和", "与", "跟", "过", "有", "没", "写", "记", "看", "说", "讲", "学",
  "心", "得", "篇", "条", "今天", "昨天", "最近", "感觉", "觉得", "知道",
]

// 英文/数字 token（≥2 字符）：React、CSS、useMemo、zustand、AI
function extractLatinTokens(s: string): string[] {
  return (s.match(/[A-Za-z][A-Za-z0-9+.\-#]*/g) || []).filter(t => t.length >= 2)
}

// 中文连续段（剔除停用词后 ≥2 字的片段；>8 字截前 8 字，避免整句当关键词）
function extractChineseSegs(s: string): string[] {
  const cleaned = s
    .replace(/[A-Za-z0-9+.\-#\s]/g, " ")
    .split(/\s+/)
    .map(seg => {
      for (const w of STOP_WORDS) {
        // 仅剔除位于段首/段尾的停用词，保留段内的（如「状态管理」）
        seg = seg.replace(new RegExp(`^(?:${w})`, "g"), "").replace(new RegExp(`(?:${w})$`, "g"), "")
      }
      return seg
    })
    .join(" ")
    .split(/\s+/)
  const result: string[] = []
  for (let seg of cleaned) {
    seg = seg.trim()
    if (seg.length >= 2) result.push(seg.length > 8 ? seg.slice(0, 8) : seg)
  }
  return result.slice(0, 4) // 最多取 4 个中文段
}

// 从提问中提取检索关键词
export function extractKeywords(question: string): string[] {
  return [...extractLatinTokens(question), ...extractChineseSegs(question)]
}

// ============ 一级：标签匹配（高优先级） ============
async function matchByTag(userId: string, question: string, latinTokens: string[]): Promise<{
  items: RetrievalItem[]
  matchedTags: string[]
}> {
  // 取该用户全部标签（含子标签，标签层级仅 2 级）
  const allTags = await prisma.tag.findMany({
    where: { userId },
    select: { id: true, name: true, parentId: true },
  })

  // 命中规则：标签名出现在问题中（含标签名是英文 token 时），或问题中英文 token 出现在标签名中
  const qLower = question.toLowerCase()
  const hitTagIds = new Set<string>()
  const hitTagNames: string[] = []
  for (const tag of allTags) {
    const nameLower = tag.name.toLowerCase()
    const hit =
      (tag.name.length >= 2 && qLower.includes(nameLower)) ||
      latinTokens.some(t => nameLower.includes(t.toLowerCase()))
    if (hit) {
      hitTagIds.add(tag.id)
      hitTagNames.push(tag.name)
    }
  }

  if (hitTagIds.size === 0) return { items: [], matchedTags: [] }

  // 命中父标签时，其子标签的心得一并纳入（与 /api/entries 标签筛选行为一致）
  const childIds = allTags.filter(t => t.parentId && hitTagIds.has(t.parentId)).map(t => t.id)
  const finalTagIds = [...hitTagIds, ...childIds]

  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false, tags: { some: { id: { in: finalTagIds } } } },
    select: {
      id: true, title: true, keyPoints: true, recordTime: true,
      tags: { select: { name: true } },
    },
    orderBy: { recordTime: "desc" },
    take: MAX_TAG,
  })

  const items: RetrievalItem[] = entries.map(e => ({
    entryId: e.id,
    title: e.title,
    keyPoints: e.keyPoints || "",
    tags: e.tags.map(t => t.name),
    recordTime: e.recordTime,
    priority: "high",
    matchType: "tag",
  }))
  return { items, matchedTags: hitTagNames }
}

// ============ 二级：标题匹配（中优先级） ============
async function matchByTitle(
  userId: string,
  keywords: string[],
  excludeIds: Set<string>
): Promise<RetrievalItem[]> {
  if (!keywords.length) return []
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      isDraft: false,
      OR: keywords.map(kw => ({ title: { contains: kw, mode: "insensitive" as const } })),
    },
    select: {
      id: true, title: true, keyPoints: true, recordTime: true,
      tags: { select: { name: true } },
    },
    orderBy: { recordTime: "desc" },
    take: MAX_TITLE + 5, // 多取几条留出去重空间
  })

  const items: RetrievalItem[] = []
  for (const e of entries) {
    if (excludeIds.has(e.id)) continue // 跨渠道去重：保留高优先级
    items.push({
      entryId: e.id,
      title: e.title,
      keyPoints: e.keyPoints || "",
      tags: e.tags.map(t => t.name),
      recordTime: e.recordTime,
      priority: "medium",
      matchType: "title",
    })
    excludeIds.add(e.id)
    if (items.length >= MAX_TITLE) break
  }
  return items
}

// ============ 三级：内容匹配（低优先级） ============
async function matchByContent(
  userId: string,
  keywords: string[],
  excludeIds: Set<string>
): Promise<RetrievalItem[]> {
  if (!keywords.length) return []
  const rawEntries = await prisma.entry.findMany({
    where: {
      userId,
      isDraft: false,
      OR: keywords.map(kw => ({ content: { contains: kw, mode: "insensitive" as const } })),
    },
    select: {
      id: true, title: true, keyPoints: true, content: true, recordTime: true,
      tags: { select: { name: true } },
    },
    orderBy: { recordTime: "desc" },
    take: 30,
  })

  // 按关键词出现频率降序（需求文档 §5.2），并在内存中做跨渠道去重
  const scored = rawEntries
    .filter(e => !excludeIds.has(e.id))
    .map(e => {
      const plain = stripHtml(e.content, 10000)
      const lower = plain.toLowerCase()
      const freq = keywords.reduce((sum, kw) => sum + (lower.split(kw.toLowerCase()).length - 1), 0)
      return { e, freq, plain }
    })
    .sort((a, b) => b.freq - a.freq || b.e.recordTime.getTime() - a.e.recordTime.getTime())

  const items: RetrievalItem[] = []
  for (const { e, plain } of scored) {
    if (items.length >= MAX_CONTENT) break
    items.push({
      entryId: e.id,
      title: e.title,
      keyPoints: e.keyPoints || "",
      tags: e.tags.map(t => t.name),
      recordTime: e.recordTime,
      priority: "low",
      matchType: "content",
      excerpt: plain.slice(0, 200),
    })
  }
  return items
}

// ============ 主入口：三级检索 ============
export async function retrieve(userId: string, question: string): Promise<RetrievalResult> {
  const keywords = extractKeywords(question)
  const latinTokens = extractLatinTokens(question)
  const excludeIds = new Set<string>()

  // 一级（标签匹配）必须先完成，其命中结果供中/低渠道去重（保留最高优先级）
  const tagResult = await matchByTag(userId, question, latinTokens)
  for (const it of tagResult.items) excludeIds.add(it.entryId)

  // 二、三级并行执行
  const [titleItems, contentItems] = await Promise.all([
    keywords.length ? matchByTitle(userId, keywords, excludeIds) : Promise.resolve([]),
    keywords.length ? matchByContent(userId, keywords, excludeIds) : Promise.resolve([]),
  ])

  // 合并：高 → 中 → 低
  const items = [...tagResult.items, ...titleItems, ...contentItems]
  return {
    items,
    totalCount: items.length,
    matchedTags: tagResult.matchedTags,
  }
}
