/**
 * 批量改名脚本 - 阶段4 批次①「编号治理」（23 篇）
 * 只改标题，不动标签/正文/日期
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const RENAME_RULES: [string, string][] = [
  // 一、补平断号（3 篇）
  ["RAG·3-4 检索中后优化", "RAG·3-3 检索中后优化"],
  ["部署·3 Git工作流选型", "部署·2 Git工作流选型"],
  ["部署·4 Code Review", "部署·3 Code Review"],
  // 二、去编号 · 全栈（7 篇）
  ["全栈·0 前端框架知识体系", "全栈·前端框架知识体系"],
  ["全栈·1 服务端框架知识体系", "全栈·服务端框架知识体系"],
  ["全栈·2 前后端分工与协作", "全栈·前后端分工与协作"],
  ["全栈·3 通信协议与数据流", "全栈·通信协议与数据流"],
  ["全栈·4 语言与前后端的关系", "全栈·语言与前后端的关系"],
  ["全栈·5 Node/Nest/Next 概念", "全栈·Node/Nest/Next 概念"],
  ["全栈·6 后端先行 vs 前端先行", "全栈·后端先行 vs 前端先行"],
  // 三、去编号 · 前端（6 篇）
  ["前端·0 网页三剑客", "前端·网页三剑客"],
  ["前端·1 HTML骨架", "前端·HTML骨架"],
  ["前端·2 CSS皮肤", "前端·CSS皮肤"],
  ["前端·3 JavaScript肌肉", "前端·JavaScript肌肉"],
  ["前端·附-2 网页报错与HTTP状态码", "前端·网页报错与HTTP状态码"],
  ["前端·附-3 HTML标签裸露", "前端·HTML标签裸露"],
  // 四、去编号 · AI产品开发（4 篇）
  ["AI产品开发·1 产品vs传统软件的7个区别", "AI产品开发·产品vs传统软件的7个区别"],
  ["AI产品开发·2 3P门控模型", "AI产品开发·3P门控模型"],
  ["AI产品开发·3 评测驱动开发", "AI产品开发·评测驱动开发"],
  ["AI产品开发·4 九层工具链", "AI产品开发·九层工具链"],
  // 五、去编号 · Agent架构（3 篇）
  ["Agent架构·1-1 模型(LLM) + 泛化的操作环境(Harness)", "Agent架构·模型(LLM) + 泛化的操作环境(Harness)"],
  ["Agent架构·1-2 AI Agent 比 LLM 多出了什么？", "Agent架构·AI Agent 比 LLM 多出了什么？"],
  ["Agent架构·2-1 工程链路、Workflow、Agent：概念辨析与选型", "Agent架构·工程链路、Workflow、Agent：概念辨析与选型"],
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

  // 重要：补平断号的 3 条必须按顺序执行（先改 3-4→3-3，再改 3→2，最后 4→3）
  // 但为避免冲突，我们采用"先查后改"，且每条更新后立即刷新 entries 列表
  for (let i = 0; i < RENAME_RULES.length; i++) {
    const [oldTitle, newTitle] = RENAME_RULES[i]

    // 从最新 entries 列表中查找（每次更新后刷新）
    const entry = entries.find(e => e.title === oldTitle)

    if (!entry) {
      skipCount++
      notFound.push({ idx: i + 1, oldTitle })
      results.push({ idx: i + 1, oldTitle, newTitle, status: "跳过（未找到）" })
      continue
    }

    // 检查新标题是否已被占用
    const existingNew = entries.find(e => e.title === newTitle && e.id !== entry.id)
    if (existingNew) {
      skipCount++
      results.push({ idx: i + 1, oldTitle, newTitle, status: `跳过（新标题已存在：${existingNew.title}）` })
      continue
    }

    await prisma.entry.update({ where: { id: entry.id }, data: { title: newTitle } })
    // 更新本地列表以反映变更（防止后续规则冲突）
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
