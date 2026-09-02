import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { deleteMemory } from "@/lib/assistant/memory"

// DELETE /api/assistant/memories/[id] - 删除单条记忆
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const { id } = await params
    const deleted = await deleteMemory(id, userId)
    if (!deleted) {
      return NextResponse.json({ error: "记忆不存在" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[AssistantMemory:Delete]", e)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
