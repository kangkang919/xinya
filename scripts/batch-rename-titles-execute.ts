/**
 * 批量改名脚本 - 执行版
 * 用法：在服务器上运行 npx tsx scripts/batch-rename-titles-execute.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 45 条确认匹配的改名规则：[原标题, 新标题]
const RENAME_RULES: [string, string][] = [
  ["RAG 总纲：知识全貌与核心流程", "RAG·总纲：知识全貌与核心流程"],
  ["1-1. RAG 市场定位：应用场景与ROI", "RAG·1-1 市场定位：应用场景与ROI"],
  ["1-2. RAG 概述：检索、增强、生成", "RAG·1-2 概述：检索、增强、生成"],
  ["2-1. Naive RAG：文档解析", "RAG·2-1 文档解析"],
  ["2-2. Naive RAG：文档分块", "RAG·2-2 文档分块"],
  ["2-3. Naive RAG：向量与向量检索", "RAG·2-3 向量与向量检索"],
  ["3-1. Advanced RAG：检索前优化-重写器", "RAG·3-1 重写器"],
  ["3-2. Advanced RAG：检索前优化-索引策略", "RAG·3-2 索引策略"],
  ["3-3. Advanced RAG：索引优化应用场景", "RAG·3-3 索引应用场景"],
  ["3-4. Advanced RAG：检索中与检索后优化", "RAG·3-4 检索中后优化"],
  ["4-1. RAG 评估：方法", "RAG·4-1 评估方法"],
  ["4-2. RAG 评估：类型与指标", "RAG·4-2 评估类型与指标"],
  ["4-3. RAG 评估：业务指标拓展", "RAG·4-3 业务指标拓展"],
  ["向量数据库与RAG的关系辨析", "RAG·辨析：向量数据库与RAG的关系"],
  ["专家系统到企业级 RAG 的改造", "RAG·案例：专家系统到企业级RAG改造"],
  ["父子索引为什么在C端更好用", "RAG·父子索引在C端更好用"],
  ["0. 大模型和微调的本质：先理解\u201c是什么\u201d，再决定\u201c做不做\u201d", "微调·0 本质：先理解是什么再决定做不做"],
  ["1. 大模型微调 vs RAG：应用场景比较", "微调·1 微调 vs RAG 场景比较"],
  ["2. PM 在微调项目中的四步工作流：定义数据和验收标准", "微调·2 PM四步工作流"],
  ["3. 微调数据怎么准备：来源、配比和质量控制", "微调·3 数据准备"],
  ["4. 微调方法选型：全参微调与 PEFT高效微调", "微调·4 方法选型"],
  ["5. 模型评估怎么做：通用基准、领域基准与三种评估方式", "微调·5 模型评估"],
  ["6. 私有化部署工具链：从个人电脑到企业级服务", "微调·6 私有化部署"],
  ["如何做Agent评估（四步法）", "评估·总览：四步法"],
  ["0. 评估的底层逻辑与核心架构", "评估·1 底层逻辑与核心架构"],
  ["1. 评分器的选择与校准策略", "评估·2 评分器选择与校准"],
  ["2. 多场景评估与非确定性治理", "评估·3 多场景与非确定性治理"],
  ["3. PM主导的评估落地路线图", "评估·4 落地路线图"],
  ["AI Coding的全链路地图", "AI产品开发·总览：全链路地图"],
  ["第一课：AI产品 vs 传统软件——7个根本区别", "AI产品开发·1 产品vs传统软件的7个区别"],
  ["第二课：3P门控模型——AI产品的三阶段成长路径", "AI产品开发·2 3P门控模型"],
  ["第三课：评测驱动开发 vs 功能驱动开发", "AI产品开发·3 评测驱动开发"],
  ["第四课：九层工具链全景", "AI产品开发·4 九层工具链"],
  ["1-1. 工作流是什么", "Coze·1-1 工作流是什么"],
  ["1-2. Coze：智能体 → 工作流 → 插件", "Coze·1-2 智能体/工作流/插件"],
  ["1-3. Coze 的三层发布", "Coze·1-3 三层发布"],
  ["2-1. 选择器 和 意图识别 节点区别", "Coze·2-1 选择器 vs 意图识别"],
  ["2-2. Coze 循环节点", "Coze·2-2 循环节点"],
  ["3-1. Coze 自建云插件完整流程", "Coze·3-1 自建云插件"],
  ["3-2. Coze 插件稳定性分析", "Coze·3-2 插件稳定性"],
  ["4-1. 【实操】Coze 实操注意事项", "Coze·4-1 实操注意事项"],
  ["5-1. JSON 序列化与反序列化", "Coze·5-1 JSON序列化与反序列化"],
  ["附-1. 鲁棒性（Robustness）", "鲁棒性（Robustness）：输入异常仍可用"],
  ["附-2. Golden 回归基线样本", "Golden 回归基线样本（黄金样本）"],
  ["Evals", "Evals：动态评测框架"],
]

async function main() {
  // 1. 查找用户
  const user = await prisma.user.findUnique({ where: { email: "1243177461@qq.com" } })
  if (!user) {
    console.log("❌ 未找到用户")
    return
  }
  console.log(`✅ 用户：${user.email}\n`)

  // 2. 查询所有心得
  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    select: { id: true, title: true },
  })
  console.log(`📚 共 ${entries.length} 条心得\n`)

  // 3. 逐条执行更新
  let successCount = 0
  let skipCount = 0
  const results: { oldTitle: string; newTitle: string; status: string }[] = []

  for (let i = 0; i < RENAME_RULES.length; i++) {
    const [oldTitle, newTitle] = RENAME_RULES[i]
    const entry = entries.find(e => e.title === oldTitle)

    if (!entry) {
      skipCount++
      results.push({ oldTitle, newTitle, status: "跳过（未找到）" })
      continue
    }

    // 检查新标题是否已被占用（避免重复执行时冲突）
    const existingNew = entries.find(e => e.title === newTitle && e.id !== entry.id)
    if (existingNew) {
      skipCount++
      results.push({ oldTitle, newTitle, status: `跳过（新标题已存在：${existingNew.id}）` })
      continue
    }

    // 执行更新
    await prisma.entry.update({
      where: { id: entry.id },
      data: { title: newTitle },
    })
    successCount++
    results.push({ oldTitle, newTitle, status: "✅ 已更新" })
  }

  // 4. 输出报告
  console.log("\n" + "=".repeat(80))
  console.log("📋 改名执行报告")
  console.log("=".repeat(80))
  console.log(`\n总计：${RENAME_RULES.length} 条规则`)
  console.log(`成功：${successCount} 条`)
  console.log(`跳过：${skipCount} 条\n`)

  console.log("详细结果：")
  for (const r of results) {
    console.log(`  ${r.status}  「${r.oldTitle}」→「${r.newTitle}」`)
  }

  console.log("\n" + "=".repeat(80))
  console.log("✅ 批量改名完成！")
}

main()
  .catch(e => { console.error("执行出错:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
