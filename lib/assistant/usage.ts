// 豆苗学习助手：DeepSeek 调用消耗记录（需求文档 §11.3）
// 初期不限制调用，但后台记录每次调用（次数/token/估算费用），可追溯审计

import { prisma } from "@/lib/prisma"

// DeepSeek Chat 定价（元 / 1K tokens）——以实际 API 定价为准
const INPUT_PRICE = 0.001 // ¥/1K input tokens
const OUTPUT_PRICE = 0.002 // ¥/1K output tokens

export async function recordUsage(params: {
  userId: string
  inputTokens: number
  outputTokens: number
  model?: string
  questionBrief?: string
}): Promise<void> {
  try {
    const { userId, inputTokens, outputTokens, model, questionBrief } = params
    const estimatedCost =
      (inputTokens * INPUT_PRICE + outputTokens * OUTPUT_PRICE) / 1000

    await prisma.assistantUsage.create({
      data: {
        userId,
        inputTokens,
        outputTokens,
        model: model || "deepseek-chat",
        estimatedCost,
        questionBrief: questionBrief ? questionBrief.slice(0, 30) : null,
      },
    })
  } catch (e) {
    // 消耗记录失败不应阻断对话主流程，仅打日志
    console.error("[AssistantUsage]", e)
  }
}

// 查询用户累计消耗（供后续管理界面/审计使用）
export async function getUserUsage(userId: string): Promise<{
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
}> {
  const agg = await prisma.assistantUsage.aggregate({
    where: { userId },
    _count: { _all: true },
    _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
  })
  return {
    totalCalls: agg._count._all,
    totalInputTokens: agg._sum.inputTokens || 0,
    totalOutputTokens: agg._sum.outputTokens || 0,
    totalCost: Math.round((agg._sum.estimatedCost || 0) * 1000) / 1000,
  }
}
