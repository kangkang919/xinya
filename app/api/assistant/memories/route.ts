import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { getMemories } from "@/lib/assistant/memory"

// GET /api/assistant/memories - 记忆清单（可见）
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const memories = await getMemories(userId)
    return NextResponse.json({
      ok: true,
      data: memories.map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        source: m.source,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error("[AssistantMemories]", e)
    return NextResponse.json({ error: "获取记忆失败" }, { status: 500 })
  }
}
