/**
 * 批量改名脚本 - 第二步：残留编号 21 条
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 21 条改名规则
const RENAME_RULES: [string, string][] = [
  // A. Agent架构（3 条）
  ["1-1. Agent = 模型(LLM) + 泛化的操作环境(Harness)", "Agent架构·1-1 模型(LLM) + 泛化的操作环境(Harness)"],
  ["1-2. AI Agent 比普通大模型（LLM）多出了什么？", "Agent架构·1-2 AI Agent 比 LLM 多出了什么？"],
  ["2-1. 工程链路、Workflow、Agent：概念辨析与架构选型", "Agent架构·2-1 工程链路、Workflow、Agent：概念辨析与选型"],
  // B. 全栈总览（6 条）
  ["0. 前端框架知识体系", "全栈·0 前端框架知识体系"],
  ["1. 服务端框架知识体系", "全栈·1 服务端框架知识体系"],
  ["2. 前端和服务端框架层的协作比喻", "全栈·2 前后端协作比喻"],
  ["3. 前后端通信协议与数据流", "全栈·3 通信协议与数据流"],
  ["4. JS/Python/Node.js 与 前端/后端 的关系", "全栈·4 语言与前后端的关系"],
  ["5. node.js/nest.js/next.js 概念讲解", "全栈·5 Node/Nest/Next 概念"],
  // C. 前端三件套（6 条）
  ["网页三剑客（HTML/CSS/JavaScript）", "前端·0 网页三剑客"],
  ["1. HTML骨架：常用标签", "前端·1 HTML骨架"],
  ["2. CSS皮肤：基础语言", "前端·2 CSS皮肤"],
  ["3. JavaScript肌肉：基础语言", "前端·3 JavaScript肌肉"],
  ["附-2. 网页的两种报错 + HTTP 状态码", "前端·附-2 网页报错与HTTP状态码"],
  ["附-3. HTML 标签裸露", "前端·附-3 HTML标签裸露"],
  // D. 部署运维（6 条）
  ["0. 代码开发、版本管理与服务器部署", "部署·0 代码开发与版本管理"],
  ["1. Git-代码的版本管理", "部署·1 Git版本管理"],
  ["2. GitHub-把代码放到云上", "部署·2 GitHub云端托管"],
  ["Git 工作流选型：API 直推 vs 标准 Git", "部署·3 Git工作流选型"],
  ["4. Code Review", "部署·4 Code Review"],
  ["附-1. FDE-前线部署工程师", "部署·附 FDE前线部署工程师"],
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
