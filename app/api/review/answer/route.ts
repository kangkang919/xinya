import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { submitAnswer } from "../../../../lib/review-scheduler"

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { questionId, answer } = await req.json()

    if (!questionId || !answer) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    const result = await submitAnswer(userId, questionId, answer)

    if (!result) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (e) {
    console.error("[ReviewAnswer]", e)
    return NextResponse.json({ error: "提交答案失败" }, { status: 500 })
  }
}
