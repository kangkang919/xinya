/**
 * 批量改名脚本 - 阶段4 批次③「裸术语标题」（10 篇）
 * 只改标题，不动标签/正文/日期
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const RENAME_RULES: [string, string][] = [
  ["LangGraph", "LangGraph：会记状态的 Agent 编排框架"],
  ["MCP 与 A2A", "MCP 与 A2A：Agent 的两套连接协议"],
  ["API Key", "API Key：AI 服务的凭证与安全红线"],
  ["Marvis", "Marvis：腾讯的操作系统级 AI 助手"],
  ["Typora", "Typora：所见即所得的 Markdown 编辑器"],
  ["Markdown", "Markdown：程序员的通用书写格式"],
  ["SSE适配器", "SSE适配器：把 Agent 事件流翻译给前端"],
  ["Supabase", "Supabase：开箱即用的后端即服务（BaaS）"],
  ["软件测试", "软件测试：层级、类型与测试金字塔"],
  ["KV 缓存", "KV 缓存：大模型推理的复用机制"],
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
