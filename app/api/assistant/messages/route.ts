import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clearMessages } from "@/lib/assistant/chat"

interface Msg {
  id: string
  role: string
  content: string
  retrievedTag: string | null
  createdAt: string
}

// GET /api/assistant/messages?limit=30&before=<id>
// 返回按时间升序的消息列表 + hasMore（向下翻更早历史）
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30")))
    const before = searchParams.get("before") || undefined

    // cuid 基于时间戳生成且单调递增，直接按 id 倒序做游标分页（稳定且无需额外排序键）
    const rows = await prisma.assistantMessage.findMany({
      where: { userId, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { id: "desc" },
      take: limit + 1, // 多取 1 条判断是否还有更早
    })

    const hasMore = rows.length > limit
    const pageRows = rows.slice(0, limit).reverse()

    return NextResponse.json({
      ok: true,
      data: {
        messages: pageRows.map((m): Msg => ({
          id: m.id,
          role: m.role,
          content: m.content,
          retrievedTag: m.retrievedTag,
          createdAt: m.createdAt.toISOString(),
        })),
        hasMore,
      },
    })
  } catch (e) {
    console.error("[AssistantMessages]", e)
    return NextResponse.json({ error: "获取消息失败" }, { status: 500 })
  }
}

// DELETE /api/assistant/messages - 清空对话历史（配置与记忆保留）
export async function DELETE() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    await clearMessages(userId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[AssistantMessages:Clear]", e)
    return NextResponse.json({ error: "清空失败" }, { status: 500 })
  }
}
