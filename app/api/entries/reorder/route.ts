import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/entries/reorder - 保存标签视图下的心得自定义排序
// body: { tagId: string, orderedEntryIds: string[] }
// 排序规则：sortOrder = -(index+1)，即列表第一个为 -1，第二个为 -2...
// 未排序的心得（无记录）视为 sortOrder=0，排在已排序心得之前，按 recordTime 倒序
export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const { tagId, orderedEntryIds } = await req.json()

  if (!tagId || !Array.isArray(orderedEntryIds) || orderedEntryIds.length === 0) {
    return NextResponse.json({ ok: false, error: "参数无效" }, { status: 400 })
  }

  // 验证标签属于当前用户
  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId } })
  if (!tag) {
    return NextResponse.json({ ok: false, error: "标签不存在" }, { status: 400 })
  }

  // 验证所有心得属于当前用户
  const ownedCount = await prisma.entry.count({
    where: { id: { in: orderedEntryIds }, userId },
  })
  if (ownedCount !== orderedEntryIds.length) {
    return NextResponse.json({ ok: false, error: "存在无权操作的心得" }, { status: 403 })
  }

  // 批量更新排序：第一个为 -1，第二个为 -2，依此类推
  await prisma.$transaction(
    orderedEntryIds.map((entryId, index) =>
      prisma.entryTagSort.upsert({
        where: { entryId_tagId: { entryId, tagId } },
        update: { sortOrder: -(index + 1) },
        create: { entryId, tagId, sortOrder: -(index + 1) },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
