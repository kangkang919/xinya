/**
 * 批量改名脚本 - 干跑版（只查询匹配，不修改）
 * 用法：npx tsx scripts/batch-rename-titles-dryrun.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 48 条改名规则：[原标题, 新标题]
const RENAME_RULES: [string, string][] = [
  // 一、RAG 课程（16 条）
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
  // 二、模型微调课程（7 条）
  ["0. 大模型和微调的本质：先理解\u201c是什么\u201d，再决定\u201c做不做\u201d", "微调·0 本质：先理解是什么再决定做不做"],
  ["1. 大模型微调 vs RAG：应用场景比较", "微调·1 微调 vs RAG 场景比较"],
  ["2. PM 在微调项目中的四步工作流：定义数据和验收标准", "微调·2 PM四步工作流"],
  ["3. 微调数据怎么准备：来源、配比和质量控制", "微调·3 数据准备"],
  ["4. 微调方法选型：全参微调与 PEFT高效微调", "微调·4 方法选型"],
  ["5. 模型评估怎么做：通用基准、领域基准与三种评估方式", "微调·5 模型评估"],
  ["6. 私有化部署工具链：从个人电脑到企业级服务", "微调·6 私有化部署"],
  // 三、Agent 评估系列（5 条）
  ["如何做Agent评估（四步法）", "评估·总览：四步法"],
  ["0. 评估的底层逻辑与核心架构", "评估·1 底层逻辑与核心架构"],
  ["1. 评分器的选择与校准策略", "评估·2 评分器选择与校准"],
  ["2. 多场景评估与非确定性治理", "评估·3 多场景与非确定性治理"],
  ["3. PM主导的评估落地路线图", "评估·4 落地路线图"],
  // 四、AI 产品开发课程（5 主课 + 3 附篇）
  ["AI Coding的全链路地图", "AI产品开发·总览：全链路地图"],
  ["第一课：AI产品 vs 传统软件——7个根本区别", "AI产品开发·1 产品vs传统软件的7个区别"],
  ["第二课：3P门控模型——AI产品的三阶段成长路径", "AI产品开发·2 3P门控模型"],
  ["第三课：评测驱动开发 vs 功能驱动开发", "AI产品开发·3 评测驱动开发"],
  ["第四课：九层工具链全景", "AI产品开发·4 九层工具链"],
  ["附：九层工具链 vs 3P门控——什么关系？", "AI产品开发·4-附 九层工具链 vs 3P门控"],
  ["附：评测驱动开发 vs TDD——是一回事还是两回事？", "AI产品开发·3-附2 评测驱动 vs TDD"],
  ["附：跑评测（让它失败）—— 很多人初学TDD时都会有这个疑问：\u201c代码都没写，跑评测肯定全失败啊，这不是脱裤子放屁吗？\u201d", "AI产品开发·3-附1 跑评测让它失败"],
  // 五、Coze 课程（9 条）
  ["1-1. 工作流是什么", "Coze·1-1 工作流是什么"],
  ["1-2. Coze：智能体 → 工作流 → 插件", "Coze·1-2 智能体/工作流/插件"],
  ["1-3. Coze 的三层发布", "Coze·1-3 三层发布"],
  ["2-1. 选择器 和 意图识别 节点区别", "Coze·2-1 选择器 vs 意图识别"],
  ["2-2. Coze 循环节点", "Coze·2-2 循环节点"],
  ["3-1. Coze 自建云插件完整流程", "Coze·3-1 自建云插件"],
  ["3-2. Coze 插件稳定性分析", "Coze·3-2 插件稳定性"],
  ["4-1. 【实操】Coze 实操注意事项", "Coze·4-1 实操注意事项"],
  ["5-1. JSON 序列化与反序列化", "Coze·5-1 JSON序列化与反序列化"],
  // 六、其他标题小优化（3 条）
  ["附-1. 鲁棒性（Robustness）", "鲁棒性（Robustness）：输入异常仍可用"],
  ["附-2. Golden 回归基线样本", "Golden 回归基线样本（黄金样本）"],
  ["Evals", "Evals：动态评测框架"],
]

async function main() {
  // 1. 查找用户
  const user = await prisma.user.findUnique({ where: { email: "1243177461@qq.com" } })
  if (!user) {
    console.log("❌ 未找到邮箱为 1243177461@qq.com 的用户")
    return
  }
  console.log(`✅ 找到用户：${user.email}（ID: ${user.id}）\n`)

  // 2. 查询该用户所有心得标题
  const entries = await prisma.entry.findMany({
    where: { userId: user.id },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  })
  console.log(`📚 该用户共有 ${entries.length} 条心得\n`)

  // 3. 逐条匹配
  const matched: { entryId: string; oldTitle: string; newTitle: string; ruleIndex: number }[] = []
  const unmatched: { ruleIndex: number; expectedTitle: string }[] = []

  for (let i = 0; i < RENAME_RULES.length; i++) {
    const [oldTitle, newTitle] = RENAME_RULES[i]
    const entry = entries.find(e => e.title === oldTitle)
    if (entry) {
      matched.push({ entryId: entry.id, oldTitle, newTitle, ruleIndex: i + 1 })
    } else {
      unmatched.push({ ruleIndex: i + 1, expectedTitle: oldTitle })
    }
  }

  // 4. 输出结果
  console.log("=" .repeat(80))
  console.log(`📋 匹配结果：${matched.length} / ${RENAME_RULES.length} 条命中\n`)

  if (matched.length > 0) {
    console.log("✅ 匹配成功的心得：")
    for (const m of matched) {
      console.log(`  [${String(m.ruleIndex).padStart(2)}] ${m.oldTitle}`)
      console.log(`       → ${m.newTitle}`)
    }
  }

  console.log("")

  if (unmatched.length > 0) {
    console.log(`⚠️  未匹配到的规则（${unmatched.length} 条）：`)
    for (const u of unmatched) {
      console.log(`  [${String(u.ruleIndex).padStart(2)}] 「${u.expectedTitle}」`)
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log("🔍 这是干跑（dry-run），未做任何修改。")
  console.log("如需执行实际改名，请运行：npx tsx scripts/batch-rename-titles-execute.ts")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
