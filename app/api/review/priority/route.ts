import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  getQuizPriorities,
  addQuizPriority,
  removeQuizPriority,
  getTagUnansweredStats,
  type QuizPriorityConfig,
} from "@/lib/quiz-priority"

/**
 * GET /api/review/priority
 * 获取当前优先级配置 + 标签未答题统计
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const priorities = await getQuizPriorities(user.id)

  // 获取所有涉及的标签
  const tags = priorities.map(p => p.tag)
  const tagStats = tags.length > 0 ? await getTagUnansweredStats(user.id, tags) : {}

  return NextResponse.json({ priorities, tagStats })
}

/**
 * POST /api/review/priority
 * 添加优先级配置
 * Body: { tag, mode, multiplier?, until? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const body = await req.json()
  const config: QuizPriorityConfig = {
    tag: body.tag,
    mode: body.mode, // "insert" | "weight"
    multiplier: body.multiplier,
    until: body.until,
  }

  if (!config.tag || !config.mode) {
    return NextResponse.json({ error: "tag 和 mode 必填" }, { status: 400 })
  }

  if (!["insert", "weight"].includes(config.mode)) {
    return NextResponse.json({ error: "mode 必须是 insert 或 weight" }, { status: 400 })
  }

  const priority = await addQuizPriority(user.id, config)
  return NextResponse.json({ priority })
}

/**
 * DELETE /api/review/priority?id=xxx
 * 删除优先级配置（软删除）
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id 必填" }, { status: 400 })
  }

  // 验证是否属于当前用户
  const priority = await prisma.quizPriority.findFirst({
    where: { id: parseInt(id), userId: user.id },
  })

  if (!priority) {
    return NextResponse.json({ error: "优先级不存在" }, { status: 404 })
  }

  await removeQuizPriority(user.id, parseInt(id))
  return NextResponse.json({ success: true })
}
