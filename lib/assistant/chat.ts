// 豆苗学习助手：聊天核心（需求文档 §11.2 意图判定 + §6 对话 + §7 记忆 + §11.3 消耗）
// 流程：寒暄快判 → 安全快判 → 三级检索 → 命中为0兜底 → 宽泛/回顾补充 → 记忆注入 → LLM 生成 → 落库 → 消耗记录 → 记忆写入判定

import { prisma } from "@/lib/prisma"
import { chatWithDeepSeek } from "@/lib/deepseek"
import { retrieve } from "./retrieve"
import { getMemories, evaluateDialogueMemory, type MemoryItem } from "./memory"
import { recordUsage } from "./usage"
import {
  buildSystemPrompt,
  buildRetrievalBlock,
  buildMemoryBlock,
  buildHistoryBlock,
  FALLBACK_NONE,
} from "./prompts"

export interface AssistantProfileData {
  tone: string
  teach: string
  call: string
  freeDesc: string
  wizardDone: boolean
}

export const DEFAULT_PROFILE: AssistantProfileData = {
  tone: "温暖鼓励",
  teach: "启发引导",
  call: "我 / 你",
  freeDesc: "",
  wizardDone: false,
}

export interface ChatResult {
  reply: string
  retrievedTag: string | null
  source: "local" | "ai"
}

// ============ 读取/初始化配置 ============
export async function getProfile(userId: string): Promise<AssistantProfileData> {
  const p = await prisma.assistantProfile.findUnique({ where: { userId } })
  if (!p) return { ...DEFAULT_PROFILE }
  return { tone: p.tone, teach: p.teach, call: p.call, freeDesc: p.freeDesc, wizardDone: p.wizardDone }
}

export async function saveProfile(
  userId: string,
  data: { tone: string; teach: string; call: string; freeDesc: string; wizardDone: boolean }
): Promise<void> {
  await prisma.assistantProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })
}

// ============ 本地快判话术 ============
const GREETINGS = [
  /^(你好|您好|嗨|哈喽|hello|hi|在吗|早|早上好|中午好|下午好|晚上好|晚安|拜拜|再见)/i,
  /^(谢谢|多谢|感谢|辛苦|好的|好嘞|明白|嗯嗯|知道了)/,
]
const GREETING_REPLIES = [
  "你好呀～我是豆苗 🌱 想回顾心得还是梳理知识点？",
  "在的～有什么想一起看看的心得吗？",
  "嗨～随时可以聊聊你写下的心得",
  "谢谢～能陪你一起回顾学习，我也很开心 🌱",
  "不用客气～我们继续吧",
]
// 安全敏感词：心得语境不会出现，属安全边界，必须本地拦截（不依赖 LLM）
const SAFE_BLOCK =
  /毒品|赌博|色情|裸聊|诈骗|黑客|破解|外挂|翻墙|枪支|炸弹|杀人|自杀|自残|恐怖袭击|银行卡|验证码|身份证号/
const SAFE_REPLY = "这个话题我帮不上忙，我们还是聊聊心得吧～"

// 回顾/总结类问题（检索命中不足时补充最近心得，需求文档 §5.5.2）
const REVIEW_WORDS = /最近|近况|这周|这个月|阶段|状态|总结|回顾|梳理|写了什么|怎么样|进步|收获/

// 分析类问题（薄弱/兴趣/擅长等，检索为 0 时也补充最近心得让 AI 基于最近内容分析）
const ANALYSIS_WORDS = /薄弱|不会|难|错|兴趣|喜欢|擅长|学得好|掌握|记住|盲点|提升|成长|不足|改进|加强|学习|知识|技能|理解|困惑|疑问/

// 宽泛学习相关（兜底：检索为 0 时，若问题与学习/成长相关，也补充最近心得让 AI 给通用建议）
const LEARNING_WORDS = /学习|成长|提升|进步|知识|技能|理解|掌握|困惑|疑问|盲点|不足|改进|加强|复习|巩固|拓展|深入|思考|反思|总结|心得|体会|感悟|收获|启发|灵感|方向|目标|计划|方法|技巧|经验|教训|建议|推荐|怎么|如何|为什么|什么|哪些|哪里/

function isPureGreeting(question: string): boolean {
  const clean = question.replace(/[^\u4e00-\u9fffA-Za-z]/g, "")
  if (clean.length > 8) return false
  return GREETINGS.some(r => r.test(clean))
}

// ============ 保存消息 ============
async function saveMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
  retrievedTag?: string | null
): Promise<void> {
  await prisma.assistantMessage.create({
    data: { userId, role, content, retrievedTag: retrievedTag || null },
  })
}

// ============ 补充最近心得（回顾类问题的兜底注入） ============
interface RecentItem {
  entryId: string
  title: string
  keyPoints: string
  tags: string[]
  recordTime: Date
  priority: "high" | "medium" | "low"
  matchType: "tag" | "title" | "content"
}

async function appendRecentEntries(userId: string, excludeIds: Set<string>): Promise<RecentItem[]> {
  const entries = await prisma.entry.findMany({
    where: { userId, isDraft: false },
    select: { id: true, title: true, keyPoints: true, recordTime: true, tags: { select: { name: true } } },
    orderBy: { recordTime: "desc" },
    take: 5,
  })
  return entries
    .filter(e => !excludeIds.has(e.id))
    .map(e => ({
      entryId: e.id,
      title: e.title,
      keyPoints: (e.keyPoints || "").slice(0, 150),
      tags: e.tags.map(t => t.name),
      recordTime: e.recordTime,
      priority: "low" as const,
      matchType: "content" as const,
    }))
}

// ============ 主流程 ============
export async function handleChat(userId: string, question: string): Promise<ChatResult> {
  const q = question.trim()
  if (!q) return { reply: "嗯？我好像没听清，再说一遍吧～", retrievedTag: null, source: "local" }

  // ---- 步骤 1：纯寒暄（本地回应，不调 LLM 不检索） ----
  if (isPureGreeting(q)) {
    const reply = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)]
    await saveMessage(userId, "user", q)
    await saveMessage(userId, "assistant", reply)
    return { reply, retrievedTag: null, source: "local" }
  }

  // ---- 步骤 2：安全敏感词（本地拦截） ----
  if (SAFE_BLOCK.test(q)) {
    await saveMessage(userId, "user", q)
    await saveMessage(userId, "assistant", SAFE_REPLY)
    return { reply: SAFE_REPLY, retrievedTag: null, source: "local" }
  }

  // ---- 步骤 3：三级检索 ----
  const retrieval = await retrieve(userId, q)
  let items = [...retrieval.items] as RecentItem[]
  let totalCount = retrieval.totalCount

  // ---- 步骤 4：检索为 0 且属回顾/分析/学习相关问题 → 补充最近心得；仍为 0 → 检索无果兜底 ----
  const isReview = REVIEW_WORDS.test(q) || ANALYSIS_WORDS.test(q)
  const isLearningRelated = LEARNING_WORDS.test(q)
  if (items.length === 0 && (isReview || isLearningRelated)) {
    const excludeIds = new Set(retrieval.items.map(i => i.entryId))
    const recent = await appendRecentEntries(userId, excludeIds)
    items = recent
    totalCount = recent.length
  }
  if (items.length === 0) {
    await saveMessage(userId, "user", q)
    await saveMessage(userId, "assistant", FALLBACK_NONE)
    return { reply: FALLBACK_NONE, retrievedTag: null, source: "local" }
  }

  // ---- 步骤 5：读取配置与相关记忆 ----
  const profile = await getProfile(userId)

  let memories: MemoryItem[] = []
  const memoryAsk = /薄弱|不会|难|错|兴趣|喜欢|擅长|学得好|掌握|记住/.test(q)
  if (memoryAsk) {
    const all = await getMemories(userId)
    memories = all.slice(0, 5)
  }

  // ---- 步骤 6：读取最近 30 轮历史（升序） ----
  const historyRows = await prisma.assistantMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  const history = historyRows
    .reverse()
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))

  // ---- 步骤 7：组装 Prompt 并调用 DeepSeek ----
  const sysContent =
    buildSystemPrompt(profile) +
    "\n\n" +
    buildRetrievalBlock(items) +
    "\n\n" +
    buildMemoryBlock(memories) +
    "\n\n" +
    buildHistoryBlock(history)

  const result = await chatWithDeepSeek(
    [
      { role: "system", content: sysContent },
      { role: "user", content: q },
    ],
    { temperature: 0.7, maxTokens: 1200 }
  )

  // ---- 步骤 8：记录消耗（不管成功失败都记） ----
  await recordUsage({
    userId,
    inputTokens: result?.inputTokens || 0,
    outputTokens: result?.outputTokens || 0,
    questionBrief: q,
  })

  if (!result || !result.content) {
    await saveMessage(userId, "user", q)
    const fallback = "哎呀，我刚刚走神了～可以再说一遍吗？"
    await saveMessage(userId, "assistant", fallback)
    return { reply: fallback, retrievedTag: null, source: "local" }
  }

  const reply = result.content.trim()

  // ---- 步骤 9：生成检索标签（供 UI 展示依据来源） ----
  let retrievedTag: string | null = null
  if (retrieval.matchedTags.length > 0) {
    const hitCount = retrieval.items.filter(i => i.matchType === "tag").length
    retrievedTag = `标签匹配：${retrieval.matchedTags.slice(0, 2).join("/")}（命中 ${hitCount} 篇）`
  } else if (items.length > 0) {
    if (isReview && retrieval.items.length === 0) {
      retrievedTag = `已通读你最近 ${items.length} 篇心得`
    } else {
      retrievedTag = `从 ${totalCount} 篇心得中找到相关内容`
    }
  }

  // ---- 步骤 10：落库 + 记忆写入判定（记忆写入非阻塞） ----
  await saveMessage(userId, "user", q)
  await saveMessage(userId, "assistant", reply, retrievedTag)
  evaluateDialogueMemory(userId, q, reply, {
    matchedTags: retrieval.matchedTags,
    matchedTitles: retrieval.items.map(i => i.title),
  }).catch(e => console.error("[AssistantMemory:Eval]", e))

  return { reply, retrievedTag, source: "ai" }
}

// ============ 清空对话历史（记忆与配置保留） ============
export async function clearMessages(userId: string): Promise<void> {
  await prisma.assistantMessage.deleteMany({ where: { userId } })
}
