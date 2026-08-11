// GET /api/share/[token] - 访客通过 token 访问分享内容（注意：单数 share）

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 查找分享链接
    const share = await prisma.share.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!share) {
      return NextResponse.json({ ok: false, error: "链接不存在" }, { status: 404 })
    }

    // 检查是否有效
    const now = new Date()
    if (!share.isActive || share.expiresAt < now) {
      return NextResponse.json({ ok: false, error: "链接已失效", expired: true }, { status: 410 })
    }

    // 根据 scope 获取心得
    let entries
    if (share.scope === "all") {
      // 获取用户所有心得
      entries = await prisma.entry.findMany({
        where: { userId: share.userId },
        include: {
          tags: {
            select: { id: true, name: true },
          },
        },
        orderBy: { recordTime: "desc" },
      })
    } else {
      // 获取指定标签下的心得
      const tagIds = share.tagIds
      if (tagIds.length === 0) {
        return NextResponse.json({ ok: true, data: { owner: share.user.email, entries: [], tags: [] } })
      }

      // 获取标签及其子标签
      const allTags = await prisma.tag.findMany({
        where: { userId: share.userId },
      })
      
      // 找出所有相关标签ID（包括子标签）
      const relatedTagIds = new Set<string>(tagIds)
      for (const tagId of tagIds) {
        const children = allTags.filter(t => t.parentId === tagId)
        for (const child of children) {
          relatedTagIds.add(child.id)
        }
      }

      // 获取这些标签下的心得
      entries = await prisma.entry.findMany({
        where: {
          userId: share.userId,
          tags: {
            some: {
              id: { in: Array.from(relatedTagIds) },
            },
          },
        },
        include: {
          tags: {
            select: { id: true, name: true },
          },
        },
        orderBy: { recordTime: "desc" },
      })
    }

    // 获取相关标签（包括父子关系）
    const allTags = await prisma.tag.findMany({
      where: { userId: share.userId },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    })

    // 过滤出分享范围内的标签
    let visibleTags = allTags
    if (share.scope === "tags") {
      const tagIds = new Set(share.tagIds)
      // 包含选中的标签及其子标签
      visibleTags = allTags.filter(t => {
        if (tagIds.has(t.id)) return true
        if (t.parentId && tagIds.has(t.parentId)) return true
        return false
      })
    }

    // 构造返回数据
    // 计算每个标签的心得数量（父标签包括所有子标签下的心得）
    const tagEntryCounts = new Map<string, number>()
    for (const tag of visibleTags) {
      const relatedTagIds = new Set<string>([tag.id])
      for (const otherTag of visibleTags) {
        if (otherTag.parentId === tag.id) {
          relatedTagIds.add(otherTag.id)
        }
      }
      const count = entries.filter(e => 
        e.tags.some(t => relatedTagIds.has(t.id))
      ).length
      tagEntryCounts.set(tag.id, count)
    }

    // 查询所有相关标签下的排序记录（包括子标签）
    const allVisibleTagIds = visibleTags.map(t => t.id)
    const entryIds = entries.map(e => e.id)
    const sortRecords = entryIds.length > 0
      ? await prisma.entryTagSort.findMany({
          where: { entryId: { in: entryIds }, tagId: { in: allVisibleTagIds } },
        })
      : []
    const sortMap = new Map<string, Record<string, number>>()
    for (const r of sortRecords) {
      if (!sortMap.has(r.entryId)) sortMap.set(r.entryId, {})
      sortMap.get(r.entryId)![r.tagId] = r.sortOrder
    }

    const shareData = {
      owner: share.user.email,
      scope: share.scope,
      expiresAt: share.expiresAt.toISOString(),
      tags: visibleTags.map(t => ({
        id: t.id,
        name: t.name,
        parentId: t.parentId,
        entryCount: tagEntryCounts.get(t.id) || 0,
      })),
      entries: entries.map(e => ({
        id: e.id,
        title: e.title,
        content: e.content,
        mood: e.mood,
        recordTime: e.recordTime.toISOString(),
        isTop: e.isTop,
        sortOrders: sortMap.get(e.id) || {},
        tags: e.tags.map(t => ({ id: t.id, name: t.name })),
      })),
    }

    return NextResponse.json({ ok: true, data: shareData })
  } catch (error) {
    console.error("获取分享内容失败:", error)
    return NextResponse.json({ ok: false, error: "服务器错误" }, { status: 500 })
  }
}
