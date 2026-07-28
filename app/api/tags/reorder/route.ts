import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/tags/reorder - 保存子标签在父标签下的自定义排序
// body: { parentId: string, orderedTagIds: string[] }
// 排序规则与心得排序一致：sortOrder = -(index+1)，第一个为 -1，第二个为 -2...
// 未排序的子标签（sortOrder=0）按名称排在最前
export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { parentId, orderedTagIds } = await req.json()

  if (!parentId || !Array.isArray(orderedTagIds) || orderedTagIds.length === 0) {
    return NextResponse.json({ ok: false, error: "参数无效" }, { status: 400 })
  }

  // 验证父标签属于当前用户
  const parent = await prisma.tag.findFirst({ where: { id: parentId, userId } })
  if (!parent) {
    return NextResponse.json({ ok: false, error: "父标签不存在" }, { status: 400 })
  }

  // 验证所有子标签属于当前用户且确实挂在该父标签下
  const ownedCount = await prisma.tag.count({
    where: { id: { in: orderedTagIds }, userId, parentId },
  })
  if (ownedCount !== orderedTagIds.length) {
    return NextResponse.json({ ok: false, error: "存在无权操作的标签" }, { status: 403 })
  }

  // 批量更新排序：第一个为 -1，第二个为 -2，依此类推
  await prisma.$transaction(
    orderedTagIds.map((tagId, index) =>
      prisma.tag.update({
        where: { id: tagId },
        data: { sortOrder: -(index + 1) },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
