// POST /api/shares - 创建分享链接
// GET /api/shares - 获取当前用户的分享链接列表

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUserId } from "@/lib/auth"

// POST: 创建分享链接
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })
    }

    const body = await request.json()
    const { expiresInDays, scope, tagIds } = body

    // 验证参数
    if (!expiresInDays || ![7, 30, 90].includes(expiresInDays)) {
      return NextResponse.json({ ok: false, error: "有效期参数无效" }, { status: 400 })
    }

    if (!scope || !["all", "tags"].includes(scope)) {
      return NextResponse.json({ ok: false, error: "分享范围参数无效" }, { status: 400 })
    }

    // 如果是指定标签，验证标签存在且属于当前用户
    let validTagIds: string[] = []
    if (scope === "tags") {
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return NextResponse.json({ ok: false, error: "请至少选择一个标签" }, { status: 400 })
      }
      const userTags = await prisma.tag.findMany({
        where: { userId, id: { in: tagIds } },
        select: { id: true },
      })
      validTagIds = userTags.map(t => t.id)
      if (validTagIds.length === 0) {
        return NextResponse.json({ ok: false, error: "所选标签不存在" }, { status: 400 })
      }
    }

    // 计算过期时间
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // 创建分享链接
    const share = await prisma.share.create({
      data: {
        userId,
        expiresAt,
        scope,
        tagIds: validTagIds,
        isActive: true,
      },
    })

    // 构建分享链接 URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const shareUrl = `${baseUrl}/share/${share.token}`

    return NextResponse.json({
      ok: true,
      data: {
        id: share.id,
        token: share.token,
        url: shareUrl,
        scope: share.scope,
        tagIds: share.tagIds,
        expiresAt: share.expiresAt.toISOString(),
        createdAt: share.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("创建分享链接失败:", error)
    return NextResponse.json({ ok: false, error: "服务器错误" }, { status: 500 })
  }
}

// GET: 获取当前用户的分享链接列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 })
    }

    const shares = await prisma.share.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        scope: true,
        tagIds: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // 如果是指定标签的分享，获取标签名称
    const sharesWithNames = await Promise.all(
      shares.map(async (share) => {
        let tagNames: string[] = []
        if (share.scope === "tags" && share.tagIds.length > 0) {
          const tags = await prisma.tag.findMany({
            where: { id: { in: share.tagIds } },
            select: { name: true },
          })
          tagNames = tags.map(t => t.name)
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        const now = new Date()
        const isExpired = share.expiresAt < now
        const daysRemaining = Math.max(0, Math.ceil((share.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

        return {
          id: share.id,
          token: share.token,
          url: `${baseUrl}/share/${share.token}`,
          scope: share.scope,
          tagIds: share.tagIds,
          tagNames,
          isActive: share.isActive && !isExpired,
          isExpired,
          daysRemaining,
          expiresAt: share.expiresAt.toISOString(),
          createdAt: share.createdAt.toISOString(),
        }
      })
    )

    return NextResponse.json({ ok: true, data: sharesWithNames })
  } catch (error) {
    console.error("获取分享链接列表失败:", error)
    return NextResponse.json({ ok: false, error: "服务器错误" }, { status: 500 })
  }
}
