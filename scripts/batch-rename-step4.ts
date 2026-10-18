/**
 * 批量改名脚本 - 阶段4 批次②「名实偏差」（9 篇）
 * 只改标题，不动标签/正文/日期
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const RENAME_RULES: [string, string][] = [
  ["Agent评估体系落地：从底层逻辑到四层防御网", "Agent评估体系落地：从底层逻辑到线上监控"],
  ["RAG·1-1 市场定位：应用场景与ROI", "RAG·1-1 典型应用场景：客服、知识库与专业问答"],
  ["Mac浏览器快捷键", "Mac浏览器快捷键与操作"],
  ["Mac日常操作快捷键", "Mac快捷操作与文件管理"],
  ["工程设计原则：有向无环", "有向无环图（DAG）：概念与工程应用"],
  ["Figma Make、Google Stitch 和墨刀AI", "AI 设计工具横评：Figma Make、Google Stitch 与墨刀 AI"],
  ["Mermaid 流程图", "Mermaid 绘图：用代码画流程图、时序图与甘特图"],
  ["全球Top20 AI公司与模型对应关系（2026版）", "全球Top20 AI公司与模型对应关系（2026年7月版）"],
  ["编程大模型选型排名（2026.05-07）", "编程大模型选型排名（2026年7月版）"],
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
