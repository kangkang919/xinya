import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { resetProfile } from "@/lib/review-scheduler"

// 重置学习画像（重新播种）：答题记录恢复初始状态，题目缓存保留，当天可再次弹出卡片
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const resetCount = await resetProfile(userId)

    return NextResponse.json({ ok: true, data: { resetCount } })
  } catch (e) {
    console.error("[ReviewReset]", e)
    return NextResponse.json({ error: "重置失败" }, { status: 500 })
  }
}
