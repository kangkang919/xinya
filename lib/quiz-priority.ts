import { prisma } from "./prisma"

export interface QuizPriorityConfig {
  tag: string
  mode: "insert" | "weight"
  multiplier?: number
  until?: "all_answered" | "manual"
}

/**
 * 获取用户当前的出题优先级配置
 */
export async function getQuizPriorities(userId: string) {
  return prisma.quizPriority.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * 添加出题优先级
 */
export async function addQuizPriority(
  userId: string,
  config: QuizPriorityConfig
) {
  return prisma.quizPriority.create({
    data: {
      userId,
      tag: config.tag,
      mode: config.mode,
      multiplier: config.multiplier ?? 2.0,
      until: config.until ?? "all_answered",
    },
  })
}

/**
 * 删除出题优先级（软删除：标记 active=false）
 */
export async function removeQuizPriority(userId: string, priorityId: number) {
  return prisma.quizPriority.update({
    where: { id: priorityId },
    data: { active: false },
  })
}

/**
 * 检查标签的未答题是否已全部答完（用于 insert 模式的自动停用）
 */
export async function isTagAllAnswered(userId: string, tag: string): Promise<boolean> {
  // 查找该标签下心得的未答题数量
  const unansweredCount = await prisma.quizRecord.count({
    where: {
      userId,
      answeredAt: null,
      question: {
        entry: {
          tags: {
            some: { name: tag },
          },
        },
      },
    },
  })
  return unansweredCount === 0
}

/**
 * 自动停用已完成的 insert 优先级（该标签未答题全部答完）
 */
export async function autoDeactivateCompletedPriorities(userId: string) {
  const insertPriorities = await prisma.quizPriority.findMany({
    where: {
      userId,
      active: true,
      mode: "insert",
      until: "all_answered",
    },
  })

  for (const priority of insertPriorities) {
    const allAnswered = await isTagAllAnswered(userId, priority.tag)
    if (allAnswered) {
      await prisma.quizPriority.update({
        where: { id: priority.id },
        data: { active: false },
      })
    }
  }
}

/**
 * 获取标签的未答题统计（用于豆苗对话展示）
 */
export async function getTagUnansweredStats(userId: string, tags: string[]) {
  const stats = await prisma.quizRecord.groupBy({
    by: ["entryId"],
    where: {
      userId,
      answeredAt: null,
    },
    _count: true,
  })

  // 按标签聚合
  const tagStats: Record<string, { unanswered: number; total: number }> = {}
  for (const tag of tags) {
    tagStats[tag] = { unanswered: 0, total: 0 }
  }

  // 查询每个 entry 的标签
  const entryIds = stats.map(s => s.entryId)
  const entries = await prisma.entry.findMany({
    where: { id: { in: entryIds } },
    include: { tags: true },
  })

  for (const entry of entries) {
    const count = stats.find(s => s.entryId === entry.id)?._count ?? 0
    for (const tag of entry.tags) {
      if (tagStats[tag.name]) {
        tagStats[tag.name].unanswered += count
      }
    }
  }

  // 查询总数
  for (const tag of tags) {
    const total = await prisma.quizRecord.count({
      where: {
        userId,
        question: {
          entry: {
            tags: {
              some: { name: tag },
            },
          },
        },
      },
    })
    tagStats[tag].total = total
  }

  return tagStats
}
