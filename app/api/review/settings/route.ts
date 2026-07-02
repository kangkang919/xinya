import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const entryCount = await prisma.entry.count({ where: { userId } })
    const setting = await prisma.userSetting.findUnique({ where: { userId } })

    return NextResponse.json({
      ok: true,
      data: {
        reviewEnabled: setting?.reviewEnabled || false,
        entryCount,
      },
    })
  } catch (e) {
    console.error("[ReviewSettings]", e)
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { reviewEnabled } = await req.json()
    const entryCount = await prisma.entry.count({ where: { userId } })

    if (reviewEnabled && entryCount < 20) {
      return NextResponse.json({ error: "累计心得需达到20条才可开启" }, { status: 400 })
    }

    await prisma.userSetting.upsert({
      where: { userId },
      update: { reviewEnabled },
      create: { userId, reviewEnabled },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[ReviewSettings]", e)
    return NextResponse.json({ error: "更新设置失败" }, { status: 500 })
  }
}
