import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { skipToday } from "../../../../lib/review-scheduler"

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    await skipToday(userId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[ReviewSkip]", e)
    return NextResponse.json({ error: "跳过失败" }, { status: 500 })
  }
}
