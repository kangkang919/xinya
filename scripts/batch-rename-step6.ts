/**
 * 批量改名脚本 - 阶段4 批次④「命名不统一」（38 篇）
 * 只改标题，不动标签/正文/日期
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 38 条改名规则（按编号排列，注意多组合规则已合并为单条）
const RENAME_RULES: [string, string][] = [
  // A组 · 括号半角→全角（3 条）
  ["用户画像(Persona)与理想客户画像(ICP)：定义、区别与应用", "用户画像（Persona）与理想客户画像（ICP）：定义、区别与应用"],
  ["Agent架构·模型(LLM) + 泛化的操作环境(Harness)", "Agent架构·模型（LLM） + 泛化的操作环境（Harness）"],
  ["Sandbox(沙箱) vs Docker", "Sandbox（沙箱） vs Docker"],
  // B组 · vs 两侧补空格（1 条）
  ["AI产品开发·产品vs传统软件的7个区别", "AI产品开发·产品 vs 传统软件的7个区别"],
  // C组 · 写法统一（3 条，第4条同时属F组已合并）
  ["开发路线·A2 VibeCoding 标准工作流大纲（理论）", "开发路线·A2 Vibe Coding 标准工作流大纲（理论）"],
  ["AICoding 历史变化", "AI Coding 历史变化"],
  ["AI应用开发技术栈：从大模型到 Skill 的层次关系", "AI 应用开发技术栈：从大模型到 Skill 的层次关系"],
  // D组 · 评估→评测（3 条，第10条同时套F组已合并）
  ["Agent评估体系落地：从底层逻辑到线上监控", "Agent 评测体系落地：从底层逻辑到线上监控"],
  ["RAG·4-1 评估方法", "RAG·4-1 评测方法"],
  ["RAG·4-2 评估类型与指标", "RAG·4-2 评测类型与指标"],
  // F组 · 中英之间补半角空格（剩余 28 条，已与上述组合去重）
  ["AI产品开发·3P门控模型", "AI产品开发·3P 门控模型"],
  ["AI时代的权限治理：从「谁能访问」到「谁能执行」", "AI 时代的权限治理：从「谁能访问」到「谁能执行」"],
  ["AI评测体系全景与指标地图", "AI 评测体系全景与指标地图"],
  ["AI评测方法论：Evals 框架与自动评测实践", "AI 评测方法论：Evals 框架与自动评测实践"],
  ["AI评测的测试类型：基线、回归与边界", "AI 评测的测试类型：基线、回归与边界"],
  ["B端市场\u201c付费者不等于使用者\u201d", "B 端市场\u201c付费者不等于使用者\u201d"],
  ["Coze·5-1 JSON序列化与反序列化", "Coze·5-1 JSON 序列化与反序列化"],
  ["Dify/Coze/FastGPT/n8n/RAGFlow：五款低代码AI工具对比", "Dify/Coze/FastGPT/n8n/RAGFlow：五款低代码 AI 工具对比"],
  ["Mac合盖模式（Clamshell Mode）", "Mac 合盖模式（Clamshell Mode）"],
  ["Mac快捷操作与文件管理", "Mac 快捷操作与文件管理"],
  ["Mac浏览器快捷键与操作", "Mac 浏览器快捷键与操作"],
  ["RAG·案例：专家系统到企业级RAG改造", "RAG·案例：专家系统到企业级 RAG 改造"],
  ["RAG·答疑：为什么父子索引在C端更好用？", "RAG·答疑：为什么父子索引在 C 端更好用？"],
  ["RAG·辨析：向量数据库与RAG的关系", "RAG·辨析：向量数据库与 RAG 的关系"],
  ["SSE适配器：把 Agent 事件流翻译给前端", "SSE 适配器：把 Agent 事件流翻译给前端"],
  ["Windows终端 & Mac终端", "Windows 终端 & Mac 终端"],
  ["【实操】如何用Qoder写一个程序并能分享", "【实操】如何用 Qoder 写一个程序并能分享"],
  ["全球Top20 AI公司与模型对应关系（2026年7月版）", "全球 Top20 AI 公司与模型对应关系（2026年7月版）"],
  ["前端·CSS皮肤", "前端·CSS 皮肤"],
  ["前端·HTML标签裸露", "前端·HTML 标签裸露"],
  ["前端·HTML骨架", "前端·HTML 骨架"],
  ["前端·JavaScript肌肉", "前端·JavaScript 肌肉"],
  ["前端·网页报错与HTTP状态码", "前端·网页报错与 HTTP 状态码"],
  ["双项目密钥安全：凭证地图、JWT机制与Code Review盲区", "双项目密钥安全：凭证地图、JWT 机制与 Code Review 盲区"],
  ["对象存储OSS", "对象存储 OSS"],
  ["行业+AI、AI+行业、原生AI：AI渗透产业的三个阶段", "行业 + AI、AI + 行业、原生 AI：AI 渗透产业的三个阶段"],
  ["部署·2 Git工作流选型", "部署·2 Git 工作流选型"],
  ["部署·附 FDE前线部署工程师", "部署·附 FDE 前线部署工程师"],
]

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "1243177461@qq.com" } })
  if (!user) { console.log("❌ 未找到用户"); return }
  console.log(`✅ 用户：${user.email}\n`)

  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    select: { id: true, title: true },
  })
  console.log(`📚 共 ${entries.length} 条心得\n`)
  console.log(`📋 共 ${RENAME_RULES.length} 条改名规则\n`)

  let successCount = 0
  let skipCount = 0
  const results: { idx: number; oldTitle: string; newTitle: string; status: string }[] = []
  const notFound: { idx: number; oldTitle: string }[] = []

  for (let i = 0; i < RENAME_RULES.length; i++) {
    const [oldTitle, newTitle] = RENAME_RULES[i]
    const entry = entries.find(e => e.title === oldTitle)

    if (!entry) {
      skipCount++
      notFound.push({ idx: i + 1, oldTitle })
      results.push({ idx: i + 1, oldTitle, newTitle, status: "跳过（未找到）" })
      continue
    }

    const existingNew = entries.find(e => e.title === newTitle && e.id !== entry.id)
    if (existingNew) {
      skipCount++
      results.push({ idx: i + 1, oldTitle, newTitle, status: `跳过（新标题已存在）` })
      continue
    }

    await prisma.entry.update({ where: { id: entry.id }, data: { title: newTitle } })
    entry.title = newTitle
    successCount++
    results.push({ idx: i + 1, oldTitle, newTitle, status: "✅ 已更新" })
  }

  console.log("\n" + "=".repeat(80))
  console.log("📋 改名执行报告")
  console.log("=".repeat(80))
  console.log(`\n总计：${RENAME_RULES.length} 条规则`)
  console.log(`成功：${successCount} 条`)
  console.log(`跳过：${skipCount} 条\n`)

  console.log("详细结果：")
  for (const r of results) {
    console.log(`  [${String(r.idx).padStart(2)}] ${r.status}  「${r.oldTitle}」→「${r.newTitle}」`)
  }

  if (notFound.length > 0) {
    console.log("\n" + "-".repeat(80))
    console.log(`⚠️  未找到原标题的条目（${notFound.length} 条）：`)
    for (const n of notFound) {
      console.log(`  [${String(n.idx).padStart(2)}] 「${n.oldTitle}」`)
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("✅ 批量改名完成！")
}

main()
  .catch(e => { console.error("执行出错:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
