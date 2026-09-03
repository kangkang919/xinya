// 豆苗学习助手：Prompt 模板（需求文档 §5.4/§5.5）
// 分层结构：身份 → 人设骨架 → 自由润色 → 边界规则 → 检索结果 → 记忆 → 历史 → 提问

// ============ 固定话术（需求文档 §3.3） ============
export const FALLBACK_REFUSE =
  "这个话题我还不太了解，系统设置了我仅能聊聊心得方面的话题，我们聊聊心得吧～"

export const FALLBACK_NONE =
  "我在你的心得里没有找到相关的话题呢～要不要换个问题，或者先去写一篇相关的心得？"

export interface AssistantProfileLike {
  tone: string
  teach: string
  call: string
  freeDesc: string
}

export interface AssistantMemoryLike {
  type: string // "interest" | "weak"
  title: string
  description: string
  source: string
}

// ============ System Prompt 构建（Layer 1-4 固定 + 设置注入） ============
export function buildSystemPrompt(profile: AssistantProfileLike): string {
  const freeBlock = profile.freeDesc
    ? `\n自由润色（仅补充细节，不得覆盖上面的预设）：${profile.freeDesc}`
    : ""
  return `你是「豆苗」，心芽应用中的学习心得小助手。你以当前用户写下的心得（含标题、标签、要点、正文）为主要知识来源，同时可参考拾遗学习画像与统计概览，陪用户回顾、梳理、深化自己的心得知识。

你只与当前这一位用户对话，不假装真人，不编造自己的经历，不回答与用户心得无关的问题。

## 豆苗的性格（来自用户的设置，请严格遵守；预设为骨架，自由描述只做局部润色，二者矛盾时以预设为准）
语气风格：${profile.tone}
指导方式：${profile.teach}
角色称呼：${profile.call}${freeBlock}

## 输出指令（必须逐条遵守）
1.【回答风格】按上述「指导方式」回答：若为提问式（苏格拉底式提问/启发引导），用提问引导用户思考而不是直接给答案；若为直接解答/鼓励陪伴，则直接给出清晰回应。全程按「语气风格」组织语言，用「角色称呼」规则自称和对用户称呼。
2.【回答长度】根据问题复杂度自然决定：简单问题短答，分析/回顾类问题可以展开；不刻意冗长，不每句都加语气词。
3.【仅限心得范围】只讨论与用户心得相关的话题（回顾、总结、关联、薄弱点分析、基于心得的出题）。以下情况一律拒绝，回复：${FALLBACK_REFUSE}
   - 与心得无关的日常话题（天气、电影、笑话、新闻、美食、游戏等）
   - 需要外部知识才能回答的问题（与用户心得记录无关的知识性问题）
   - 敏感、危险、违法内容
4.【基本寒暄】用户问好/道谢/告别（你好、谢谢、辛苦了、再见等）可以正常回应，保持简短自然。
5.【检索依据】回答必须基于注入的【心得检索结果】。检索结果为空时，回复：${FALLBACK_NONE}
6.【禁止编造】不得编造心得中不存在的内容；对心得里没有提到的细节，如实说「你的心得里没有提到这个细节」。回答中涉及心得标题、篇数、标签时，必须与检索结果一致。
7.【矛盾处理】如果检索到的不同心得之间观点矛盾，如实指出这种矛盾并尝试帮用户梳理，不得强行统一或忽略任一方。
8.【多结果提炼】同一主题命中多条心得时，提取共同点、指出差异，概括回答；回答开头可告知「从 N 篇心得里找到了相关内容」。
9.【宽泛提问】如果检索结果命中超过 10 条：按标签分组概述（「涉及的内容比较多，我帮你按标签理一下：#A（N 篇）、#B（M 篇）…先从哪个开始聊？」），或按时间取最近 5 篇总结，末尾引导用户缩小范围；但如果用户明确要列举（如「我写过哪些关于 X 的心得」），直接逐条列出标题+一句话摘要。
10.【检索标签】检索来源标记（命中篇数/标签等）由界面自动显示在回答气泡上方，回复正文中不要输出「【命中…】」「标签匹配」之类的标记行。
11.【拾遗画像】当用户问学习状态/薄弱点/进步/成长/画像/拾遗相关问题时，可基于注入的【拾遗学习画像】和【统计概览】数据回答；若数据为空，如实告知「你还没有答题记录，先去萌芽页做几道题吧」。
12.【出题优先级干预】当用户提到想增加某个标签的出题频次/优先级时：
   - 先调用 \`GET /api/review/priority\` 获取当前优先级配置和标签未答题统计
   - 告知用户当前的出题规划（如「AI 安全目前有 5 道未答题，总共 20 道」）
   - 询问用户希望如何增加：
     a) **插队模式**：直接明天就插进去开始，直到这个标签的未答题全部答完
     b) **权重模式**：仅放大这个标签下题目出现的概率（默认 2 倍）
   - 用户确认后，调用 \`POST /api/review/priority\` 保存配置（body: { tag, mode: "insert"|"weight", multiplier?, until? }）
   - **重要约束**：你不能干预出题规则（单选/多选/每天 1 次/每周凌晨更新），只能在已有题目范围内改变出题顺序/概率；新增心得生成的题目会自动进入出题列表，不会被遗漏`
}

// ============ 检索结果注入块构建（Layer 5） ============
export interface SearchItemLike {
  entryId: string
  title: string
  keyPoints: string
  tags: string[]
  recordTime: Date
  priority: "high" | "medium" | "low"
  matchType: "tag" | "title" | "content"
}

export function buildRetrievalBlock(results: SearchItemLike[]): string {
  if (!results.length) return ""
  const prioMap: Record<string, string> = { high: "高（标签匹配）", medium: "中（标题匹配）", low: "低（内容命中）" }
  const lines = results.map((r, i) => {
    const tagStr = r.tags.length ? r.tags.map((t) => `#${t}`).join(" ") : "（无标签）"
    const dateStr = r.recordTime ? new Date(r.recordTime).toISOString().slice(0, 10) : ""
    return `${i + 1}.【优先级：${prioMap[r.priority]}】《${r.title}》\n   标签：${tagStr}  记录时间：${dateStr}\n   摘要：${r.keyPoints || "（无要点，正文未提供）"}`
  })
  return `## 心得检索结果（仅以下内容可作为回答依据；共 ${results.length} 条）\n${lines.join("\n")}`
}

// ============ 记忆注入块构建（Layer 6） ============
export function buildMemoryBlock(memories: AssistantMemoryLike[]): string {
  if (!memories.length) return ""
  const lines = memories.map((m, i) => {
    const typeName = m.type === "interest" ? "兴趣" : "薄弱点"
    return `${i + 1}.【${typeName}】${m.title}：${m.description}（来源：${m.source === "quiz" ? "答题记录" : m.source === "user_specified" ? "用户指定" : "对话分析"}）`
  })
  return `## 豆苗对用户的记忆（供辅助回答，如用户问「我哪里薄弱」时使用）\n${lines.join("\n")}`
}

// ============ 对话历史块构建（Layer 7，最近 N 轮） ============
export function buildHistoryBlock(history: { role: string; content: string }[], maxRounds = 30): string {
  const recent = history.slice(-maxRounds)
  if (!recent.length) return ""
  const lines = recent.map((m) => `${m.role === "user" ? "用户" : "豆苗"}：${m.content.replace(/\n+/g, " ").slice(0, 500)}`)
  return `## 最近的对话（供语气与话题连续性参考，不要重复已说过的话）\n${lines.join("\n")}`
}

// ============ 拾遗学习画像块构建（Layer 8） ============
export interface ReviewProfileLike {
  daysStudied: number
  totalQuestions: number
  accuracy: number
  recentDays: { date: string; correct: number; total: number }[]
  weakAreas: { tag: string; accuracy: number; count: number }[]
  strongAreas: { tag: string; accuracy: number; count: number }[]
}

export function buildProfileBlock(profile: ReviewProfileLike | null): string {
  if (!profile || profile.totalQuestions === 0) return ""
  const lines: string[] = []
  lines.push(`学习天数：${profile.daysStudied} 天`)
  lines.push(`答题总数：${profile.totalQuestions} 题 · 准确率：${profile.accuracy}%`)
  if (profile.weakAreas.length) {
    lines.push(`薄弱领域：${profile.weakAreas.map(a => `${a.tag}(${a.accuracy}%)`).join("、")}`)
  }
  if (profile.strongAreas.length) {
    lines.push(`掌握良好：${profile.strongAreas.map(a => `${a.tag}(${a.accuracy}%)`).join("、")}`)
  }
  if (profile.recentDays.length) {
    lines.push(`近 5 日答题：${profile.recentDays.map(d => `${d.date}(${d.correct}/${d.total})`).join("、")}`)
  }
  return `## 拾遗学习画像（供回答学习状态/薄弱点/进步类问题时参考）\n${lines.join("\n")}`
}

// ============ 本月洞察块构建（Layer 9） ============
export function buildInsightBlock(insight: string | null): string {
  if (!insight) return "## 本月洞察\n暂无（当月进行中或心得不足 3 篇）"
  return `## 本月洞察\n${insight}`
}

// ============ 统计概览块构建（Layer 10） ============
export interface StatsLike {
  totalEntries: number
  monthlyEntries: number
  maxStreakDays: number
  avgWeeklyEntries: number
  peakHour: number
  timeDistribution: { period: string; count: number }[]
  tagDistribution: { tag: string; count: number }[]
}

export function buildStatsBlock(stats: StatsLike): string {
  const lines: string[] = []
  lines.push(`累计心得：${stats.totalEntries} 篇 · 本月篇数：${stats.monthlyEntries} 篇`)
  lines.push(`连续记录：最长 ${stats.maxStreakDays} 天 · 平均每周 ${stats.avgWeeklyEntries} 篇`)
  const hourLabel = `${stats.peakHour}:00`
  lines.push(`最常记录：${hourLabel}（${stats.peakHour >= 6 && stats.peakHour < 12 ? "上午" : stats.peakHour >= 12 && stats.peakHour < 18 ? "下午" : stats.peakHour >= 18 && stats.peakHour < 22 ? "傍晚" : "夜间"}）`)
  if (stats.timeDistribution.length) {
    const distStr = stats.timeDistribution.map(d => `${d.period}${d.count}篇`).join("、")
    lines.push(`时间分布：${distStr}`)
  }
  if (stats.tagDistribution.length) {
    const tagStr = stats.tagDistribution.map(t => `#${t.tag}(${t.count}篇)`).join("、")
    lines.push(`内容范围：${tagStr}`)
  }
  return `## 统计概览（供回答记录习惯/内容范围/连续记录类问题时参考）\n${lines.join("\n")}`
}

// ============ 出题优先级块构建（Layer 10） ============
export interface PriorityLike {
  id: number
  tag: string
  mode: string
  multiplier: number
  until: string
  active: boolean
}

export function buildPriorityBlock(
  priorities: PriorityLike[],
  tagStats: Record<string, { unanswered: number; total: number }>
): string {
  if (!priorities.length) {
    return "## 出题优先级（当前无优先级配置，按默认顺序出题）"
  }
  const lines = priorities.map(p => {
    const stats = tagStats[p.tag]
    const statsStr = stats ? `（未答${stats.unanswered}/总${stats.total}）` : ""
    const modeLabel = p.mode === "insert" ? "插队模式" : `权重模式（${p.multiplier}倍）`
    const untilLabel = p.until === "all_answered" ? "直到未答题全部答完" : "手动清除"
    return `- #${p.tag}：${modeLabel}，${untilLabel}${statsStr}`
  })
  return `## 出题优先级（用户已配置的标签优先出题规则）\n${lines.join("\n")}`
}
