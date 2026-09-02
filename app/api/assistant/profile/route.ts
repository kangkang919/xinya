import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { getProfile, saveProfile } from "@/lib/assistant/chat"
import { prisma } from "@/lib/prisma"

// 校验人设维度值（只允许预设选项，防止脏数据）
const TONE_OPTIONS = ["简洁直接", "温暖鼓励", "活泼俏皮", "沉稳知性", "娃娃音"]
const TEACH_OPTIONS = ["苏格拉底式提问", "直接解答", "启发引导", "鼓励陪伴"]
const CALL_OPTIONS = ["我 / 你", "老师感", "咱们 / 伙伴"]

// GET /api/assistant/profile - 获取配置 + 知识库统计
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const profile = await getProfile(userId)
    const entryCount = await prisma.entry.count({ where: { userId, isDraft: false } })

    return NextResponse.json({ ok: true, data: { ...profile, entryCount } })
  } catch (e) {
    console.error("[AssistantProfile]", e)
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 })
  }
}

// PUT /api/assistant/profile - 更新配置
export async function PUT(req: Request) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const body = await req.json()
    const { tone, teach, call, freeDesc, wizardDone } = body

    const toneOk = tone === undefined || TONE_OPTIONS.includes(tone)
    const teachOk = teach === undefined || TEACH_OPTIONS.includes(teach)
    const callOk = call === undefined || CALL_OPTIONS.includes(call)

    if (!toneOk || !teachOk || !callOk) {
      return NextResponse.json({ error: "人设选项不合法" }, { status: 400 })
    }

    const current = await getProfile(userId)
    await saveProfile(userId, {
      tone: tone ?? current.tone,
      teach: teach ?? current.teach,
      call: call ?? current.call,
      freeDesc: typeof freeDesc === "string" ? freeDesc.slice(0, 200) : current.freeDesc,
      wizardDone: typeof wizardDone === "boolean" ? wizardDone : current.wizardDone,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[AssistantProfile:Save]", e)
    return NextResponse.json({ error: "保存失败" }, { status: 500 })
  }
}
