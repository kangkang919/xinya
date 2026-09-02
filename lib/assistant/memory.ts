// 豆苗学习助手：记忆系统（需求文档 §7）
// 选择性写入规则：不把每句话都变成记忆
// - 明确表达偏好/困难（对话关键词）
// - 同一主题重复出现（历史对话 ≥2 次）
// - 答题记录持续偏低（正确率 < 60%）
// - 用户明确要求记住

import { prisma } from "@/lib/prisma"

export interface MemoryItem {
  id: string
  type: "interest" | "weak"
  title: string
  description: string
  source: string
  createdAt: Date
}

// ============ 读取 ============
export async function getMemories(userId: string): Promise<MemoryItem[]> {
  const list = await prisma.assistantMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return list.map(m => ({
    id: m.id,
    type: m.type as MemoryItem["type"],
    title: m.title,
    description: m.description,
    source: m.source,
    createdAt: m.createdAt,
  }))
}

// 去重判断：同类型同标题的记忆已存在
async function exists(userId: string, type: string, title: string): Promise<boolean> {
  const found = await prisma.assistantMemory.findFirst({
    where: { userId, type, title },
    select: { id: true },
  })
  return !!found
}

// ============ 新增（内部去重） ============
export async function addMemory(
  userId: string,
  type: "interest" | "weak",
  title: string,
  description: string,
  source: "dialogue" | "quiz" | "user_specified"
): Promise<void> {
  const titleClean = title.trim().slice(0, 50)
  if (!titleClean) return
  if (await exists(userId, type, titleClean)) return // 已有同主题记忆，不重复写入
  await prisma.assistantMemory.create({
    data: { userId, type, title: titleClean, description: description.slice(0, 200), source },
  })
}

// ============ 删除（单条，用户可见可删） ============
export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  try {
    const result = await prisma.assistantMemory.deleteMany({
      where: { id: memoryId, userId }, // 校验归属：只能删自己的
    })
    return result.count > 0
  } catch {
    return false
  }
}

// ============ 答题记录薄弱点写入（quiz 来源） ============
// 同一标签相关题目正确率 < 60% 时，写入一条薄弱点记忆（quiz 来源）
export async function syncQuizWeakness(userId: string): Promise<void> {
  try {
    // 聚合：按题目关联的心得标签统计答题正确率
    const records = await prisma.quizRecord.findMany({
      where: { userId, answeredAt: { not: null } },
      select: {
        correct: true,
        question: { select: { entry: { select: { tags: { select: { name: true } } } } } },
      },
    })
    if (!records.length) return

    // 统计每个标签的答题数与正确数
    const stat = new Map<string, { total: number; correct: number }>()
    for (const r of records) {
      for (const tag of r.question.entry.tags) {
        const s = stat.get(tag.name) || { total: 0, correct: 0 }
        s.total++
        if (r.correct) s.correct++
        stat.set(tag.name, s)
      }
    }

    // 正确率 < 60% 且答题数 >= 3 的标签 → 薄弱点
    for (const [name, s] of stat) {
      if (s.total >= 3 && s.correct / s.total < 0.6) {
        await addMemory(
          userId,
          "weak",
          name,
          `答题正确率约 ${Math.round((s.correct / s.total) * 100)}%（${s.correct}/${s.total}），${name} 相关题目掌握不牢`,
          "quiz"
        )
      }
    }
  } catch (e) {
    console.error("[AssistantMemory:QuizWeakness]", e)
  }
}

// ============ 对话记忆写入判定（对话后调用，非阻塞） ============
const INTEREST_PATTERNS = [/喜欢|感兴趣|热爱|关注|想学|想深入|最近在读|经常用/]
const WEAK_PATTERNS = [/好难|很难|不懂|不会|老是错|总错|记不住|搞混|分不清|薄弱|难倒|困扰|卡住/]
const REMEMBER_PATTERNS = [/记住|记得(?!一下)|帮我记/]

/**
 * 从用户最近一条消息中提取主题（引用的标签名或标题主题词），供记忆写入
 */
function extractTopic(question: string, matchedTags: string[], matchedTitles: string[]): string {
  // 优先取命中的标签名（主题最准确）
  const hitTag = matchedTags.find(t => question.includes(t))
  if (hitTag) return hitTag
  // 其次取标题中的关键词
  const hitTitle = matchedTitles.find(t => question.includes(t))
  if (hitTitle) return hitTitle
  // 最后取问题中「xx好难/喜欢xx」结构后的主题词（简化：取问题前 20 字）
  return question.replace(/我|你|的|了|吗|呢|啊|呀|吧|是|在|和|与|跟|过|有|没/g, "").slice(0, 20)
}

export async function evaluateDialogueMemory(
  userId: string,
  question: string,
  reply: string,
  retrieval: { matchedTags: string[]; matchedTitles: string[] }
): Promise<void> {
  try {
    // 规则 4：用户明确要求记住 → 立即写入（兴趣类，来源 user_specified）
    if (REMEMBER_PATTERNS.some(p => p.test(question))) {
      const topic = extractTopic(question, retrieval.matchedTags, retrieval.matchedTitles)
      await addMemory(userId, "interest", topic, `用户在对话中明确表示希望记住：${question.slice(0, 60)}`, "user_specified")
      return
    }

    // 规则 1：明确表达偏好/困难
    const interestMatch = INTEREST_PATTERNS.find(p => p.test(question))
    if (interestMatch) {
      const topic = extractTopic(question, retrieval.matchedTags, retrieval.matchedTitles)
      await addMemory(userId, "interest", topic, "用户在对话中表达了对该主题的兴趣", "dialogue")
      return
    }
    const weakMatch = WEAK_PATTERNS.find(p => p.test(question))
    if (weakMatch) {
      const topic = extractTopic(question, retrieval.matchedTags, retrieval.matchedTitles)
      await addMemory(userId, "weak", topic, "用户在对话中提到该主题比较困难或容易出错", "dialogue")
      return
    }

    // 规则 2：同一主题在历史对话中重复出现（≥2 次提及同一标签）
    if (retrieval.matchedTags.length > 0) {
      const tag = retrieval.matchedTags[0]
      const recentHistory = await prisma.assistantMessage.findMany({
        where: { userId, role: "user", content: { contains: tag } },
        select: { id: true },
        take: 10,
      })
      if (recentHistory.length >= 2) {
        await addMemory(userId, "interest", tag, "该主题在多次对话中被反复提及", "dialogue")
      }
    }
  } catch (e) {
    console.error("[AssistantMemory:Evaluate]", e)
  }
}
