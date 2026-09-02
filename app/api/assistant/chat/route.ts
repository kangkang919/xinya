import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { handleChat } from "@/lib/assistant/chat"

// POST /api/assistant/chat - 发送消息
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const body = await req.json()
    const question = String(body?.question || "").trim()
    if (!question) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 })
    }
    if (question.length > 500) {
      return NextResponse.json({ error: "消息太长了，请精简到 500 字以内" }, { status: 400 })
    }

    const result = await handleChat(userId, question)
    return NextResponse.json({ ok: true, data: result })
  } catch (e) {
    console.error("[AssistantChat]", e)
    return NextResponse.json({ error: "服务暂时不可用，请稍后再试" }, { status: 500 })
  }
}
