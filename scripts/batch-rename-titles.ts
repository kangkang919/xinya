/**
 * 批量修改心得标题脚本
 * 
 * 功能：根据改名清单批量更新用户心得的标题
 * 
 * 使用方式：
 * - npx tsx scripts/batch-rename-titles.ts
 * 
 * 注意：
 * - 只改标题，不改标签、正文、心情等其他字段
 * - 必须精确匹配原标题（逐字符）
 * - 若某条原标题匹配不到则跳过并记录
 */

// 加载环境变量
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "../.env") })

import { PrismaClient } from "@prisma/client"
import nodemailer from "nodemailer"

const prisma = new PrismaClient({
  log: ["error"],
})

// 目标用户邮箱
const TARGET_USER_EMAIL = "1243177461@qq.com"

// 邮件发送配置
const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface RenameRule {
  oldTitle: string
  newTitle: string
}

// 改名规则清单（从附件提取）
const RENAME_RULES: RenameRule[] = [
  // 一、RAG 课程（16 条）
  { oldTitle: "RAG 总纲：知识全貌与核心流程", newTitle: "RAG·总纲：知识全貌与核心流程" },
  { oldTitle: "1-1. RAG 市场定位：应用场景与ROI", newTitle: "RAG·1-1 市场定位：应用场景与ROI" },
  { oldTitle: "1-2. RAG 概述：检索、增强、生成", newTitle: "RAG·1-2 概述：检索、增强、生成" },
  { oldTitle: "2-1. Naive RAG：文档解析", newTitle: "RAG·2-1 文档解析" },
  { oldTitle: "2-2. Naive RAG：文档分块", newTitle: "RAG·2-2 文档分块" },
  { oldTitle: "2-3. Naive RAG：向量与向量检索", newTitle: "RAG·2-3 向量与向量检索" },
  { oldTitle: "3-1. Advanced RAG：检索前优化-重写器", newTitle: "RAG·3-1 重写器" },
  { oldTitle: "3-2. Advanced RAG：检索前优化-索引策略", newTitle: "RAG·3-2 索引策略" },
  { oldTitle: "3-3. Advanced RAG：索引优化应用场景", newTitle: "RAG·3-3 索引应用场景" },
  { oldTitle: "3-4. Advanced RAG：检索中与检索后优化", newTitle: "RAG·3-4 检索中后优化" },
  { oldTitle: "4-1. RAG 评估：方法", newTitle: "RAG·4-1 评估方法" },
  { oldTitle: "4-2. RAG 评估：类型与指标", newTitle: "RAG·4-2 评估类型与指标" },
  { oldTitle: "4-3. RAG 评估：业务指标拓展", newTitle: "RAG·4-3 业务指标拓展" },
  { oldTitle: "向量数据库与RAG的关系辨析", newTitle: "RAG·辨析：向量数据库与RAG的关系" },
  { oldTitle: "专家系统到企业级 RAG 的改造", newTitle: "RAG·案例：专家系统到企业级RAG改造" },
  { oldTitle: "父子索引为什么在C端更好用", newTitle: "RAG·父子索引在C端更好用" },

  // 二、模型微调课程（7 条）
  { oldTitle: "0. 大模型和微调的本质：先理解\"是什么\"，再决定\"做不做\"", newTitle: "微调·0 本质：先理解是什么再决定做不做" },
  { oldTitle: "1. 大模型微调 vs RAG：应用场景比较", newTitle: "微调·1 微调 vs RAG 场景比较" },
  { oldTitle: "2. PM 在微调项目中的四步工作流：定义数据和验收标准", newTitle: "微调·2 PM四步工作流" },
  { oldTitle: "3. 微调数据怎么准备：来源、配比和质量控制", newTitle: "微调·3 数据准备" },
  { oldTitle: "4. 微调方法选型：全参微调与 PEFT高效微调", newTitle: "微调·4 方法选型" },
  { oldTitle: "5. 模型评估怎么做：通用基准、领域基准与三种评估方式", newTitle: "微调·5 模型评估" },
  { oldTitle: "6. 私有化部署工具链：从个人电脑到企业级服务", newTitle: "微调·6 私有化部署" },

  // 三、Agent 评估系列（5 条）
  { oldTitle: "如何做Agent评估（四步法）", newTitle: "评估·总览：四步法" },
  { oldTitle: "0. 评估的底层逻辑与核心架构", newTitle: "评估·1 底层逻辑与核心架构" },
  { oldTitle: "1. 评分器的选择与校准策略", newTitle: "评估·2 评分器选择与校准" },
  { oldTitle: "2. 多场景评估与非确定性治理", newTitle: "评估·3 多场景与非确定性治理" },
  { oldTitle: "3. PM主导的评估落地路线图", newTitle: "评估·4 落地路线图" },

  // 四、AI 产品开发课程（8 条：5 主课 + 3 附篇）
  { oldTitle: "AI Coding的全链路地图", newTitle: "AI产品开发·总览：全链路地图" },
  { oldTitle: "第一课：AI产品 vs 传统软件——7个根本区别", newTitle: "AI产品开发·1 产品vs传统软件的7个区别" },
  { oldTitle: "第二课：3P门控模型——AI产品的三阶段成长路径", newTitle: "AI产品开发·2 3P门控模型" },
  { oldTitle: "第三课：评测驱动开发 vs 功能驱动开发", newTitle: "AI产品开发·3 评测驱动开发" },
  { oldTitle: "第四课：九层工具链全景", newTitle: "AI产品开发·4 九层工具链" },
  { oldTitle: "附：九层工具链 vs 3P门控——什么关系？", newTitle: "AI产品开发·4-附 九层工具链 vs 3P门控" },
  { oldTitle: "附：评测驱动开发 vs TDD——是一回事还是两回事？", newTitle: "AI产品开发·3-附2 评测驱动 vs TDD" },
  { oldTitle: "附：跑评测（让它失败）—— 很多人初学TDD时都会有这个疑问：\"代码都没写，跑评测肯定全失败啊，这不是脱裤子放屁吗？\"", newTitle: "AI产品开发·3-附1 跑评测让它失败" },

  // 五、Coze 课程（9 条）
  { oldTitle: "1-1. 工作流是什么", newTitle: "Coze·1-1 工作流是什么" },
  { oldTitle: "1-2. Coze：智能体 → 工作流 → 插件", newTitle: "Coze·1-2 智能体/工作流/插件" },
  { oldTitle: "1-3. Coze 的三层发布", newTitle: "Coze·1-3 三层发布" },
  { oldTitle: "2-1. 选择器 和 意图识别 节点区别", newTitle: "Coze·2-1 选择器 vs 意图识别" },
  { oldTitle: "2-2. Coze 循环节点", newTitle: "Coze·2-2 循环节点" },
  { oldTitle: "3-1. Coze 自建云插件完整流程", newTitle: "Coze·3-1 自建云插件" },
  { oldTitle: "3-2. Coze 插件稳定性分析", newTitle: "Coze·3-2 插件稳定性" },
  { oldTitle: "4-1. 【实操】Coze 实操注意事项", newTitle: "Coze·4-1 实操注意事项" },
  { oldTitle: "5-1. JSON 序列化与反序列化", newTitle: "Coze·5-1 JSON序列化与反序列化" },

  // 六、其他标题小优化（3 条）
  { oldTitle: "附-1. 鲁棒性（Robustness）", newTitle: "鲁棒性（Robustness）：输入异常仍可用" },
  { oldTitle: "附-2. Golden 回归基线样本", newTitle: "Golden 回归基线样本（黄金样本）" },
  { oldTitle: "Evals", newTitle: "Evals：动态评测框架" },
]

interface RenameResult {
  entryId: string
  oldTitle: string
  newTitle: string
  status: "success" | "not_found" | "error"
}

async function batchRenameTitles() {
  console.log("[BatchRename] 开始执行批量标题修改...")
  console.log(`[BatchRename] 目标用户: ${TARGET_USER_EMAIL}`)
  console.log(`[BatchRename] 改名规则数: ${RENAME_RULES.length}`)
  console.log(`[BatchRename] 时间: ${new Date().toISOString()}\n`)

  // 查找目标用户
  const user = await prisma.user.findUnique({
    where: { email: TARGET_USER_EMAIL },
  })

  if (!user) {
    console.error(`[BatchRename] ❌ 未找到用户: ${TARGET_USER_EMAIL}`)
    await prisma.$disconnect()
    return []
  }

  console.log(`[BatchRename] ✅ 找到用户 ID: ${user.id}\n`)

  // 获取该用户的所有非草稿心得
  const entries = await prisma.entry.findMany({
    where: { userId: user.id, isDraft: false },
    select: { id: true, title: true },
  })

  console.log(`[BatchRename] 该用户共有 ${entries.length} 篇心得（不含草稿）\n`)

  // 构建标题到心得ID的映射
  const titleToEntryMap = new Map<string, string>()
  for (const entry of entries) {
    titleToEntryMap.set(entry.title, entry.id)
  }

  // 执行批量改名
  const results: RenameResult[] = []
  let successCount = 0
  let notFoundCount = 0
  let errorCount = 0

  for (const rule of RENAME_RULES) {
    const entryId = titleToEntryMap.get(rule.oldTitle)

    if (!entryId) {
      notFoundCount++
      results.push({
        entryId: "",
        oldTitle: rule.oldTitle,
        newTitle: rule.newTitle,
        status: "not_found",
      })
      console.log(`[BatchRename] ⚠️ 未找到: "${rule.oldTitle}"`)
      continue
    }

    try {
      await prisma.entry.update({
        where: { id: entryId },
        data: { title: rule.newTitle },
      })

      successCount++
      results.push({
        entryId,
        oldTitle: rule.oldTitle,
        newTitle: rule.newTitle,
        status: "success",
      })
      console.log(`[BatchRename] ✅ 已修改: "${rule.oldTitle}" → "${rule.newTitle}"`)

      // 避免数据库压力，每条间隔 100ms
      await new Promise(r => setTimeout(r, 100))
    } catch (e) {
      errorCount++
      results.push({
        entryId,
        oldTitle: rule.oldTitle,
        newTitle: rule.newTitle,
        status: "error",
      })
      console.error(`[BatchRename] ❌ 修改失败: "${rule.oldTitle}"`, e)
    }
  }

  console.log(`\n[BatchRename] 完成！`)
  console.log(`  ✅ 成功: ${successCount}`)
  console.log(`  ⚠️ 未找到: ${notFoundCount}`)
  console.log(`  ❌ 错误: ${errorCount}`)

  await prisma.$disconnect()

  return results
}

async function sendNotification(results: RenameResult[]) {
  const successResults = results.filter(r => r.status === "success")
  const notFoundResults = results.filter(r => r.status === "not_found")
  const errorResults = results.filter(r => r.status === "error")

  const subject = `心芽 · 标题批量修改报告（${new Date().toLocaleDateString("zh-CN")}）`

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
      <h2 style="color:#8BC34A;margin-bottom:8px;">📝 心芽 · 标题批量修改报告</h2>
      <p style="color:#666;font-size:14px;">执行时间：${new Date().toLocaleString("zh-CN")}</p>
      <p style="color:#666;font-size:14px;">目标用户：${TARGET_USER_EMAIL}</p>

      <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;">
        <h3 style="color:#333;margin:0 0 12px 0;">📊 执行概览</h3>
        <p style="color:#666;font-size:14px;margin:8px 0;">
          共处理 <strong>${results.length}</strong> 条改名规则
        </p>
        <p style="color:#666;font-size:14px;margin:8px 0;">
          <strong style="color:#8BC34A;">✅ 成功：${successResults.length} 条</strong>
          ${notFoundResults.length > 0 ? `<strong style="color:#FFA726;margin-left:12px;">⚠️ 未找到：${notFoundResults.length} 条</strong>` : ""}
          ${errorResults.length > 0 ? `<strong style="color:#e57373;margin-left:12px;">❌ 错误：${errorResults.length} 条</strong>` : ""}
        </p>
      </div>

      ${successResults.length > 0 ? `
        <div style="background:#f0f7ff;border:1px solid #2196F3;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#1565C0;margin:0 0 12px 0;">✅ 修改成功的标题</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;list-style:none;">
            ${successResults.map(r => `
              <li style="margin:12px 0;padding:8px;background:#fff;border-radius:4px;">
                <div style="color:#999;font-size:12px;text-decoration:line-through;margin-bottom:4px;">${r.oldTitle}</div>
                <div style="color:#2196F3;font-size:13px;font-weight:bold;">→ ${r.newTitle}</div>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${notFoundResults.length > 0 ? `
        <div style="background:#fff8e1;border:1px solid #FFA726;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#F57C00;margin:0 0 12px 0;">⚠️ 未找到的标题（可能已被手动修改）</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${notFoundResults.map(r => `
              <li style="margin:8px 0;"><strong>${r.oldTitle}</strong></li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${errorResults.length > 0 ? `
        <div style="background:#fff4f4;border:1px solid #e57373;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#e57373;margin:0 0 12px 0;">❌ 修改失败的标题</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${errorResults.map(r => `
              <li style="margin:8px 0;"><strong>${r.oldTitle}</strong></li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      <p style="color:#999;font-size:12px;margin-top:24px;">
        此邮件由心芽系统自动发送。<br>
        仅修改标题，未改动标签、正文、心情等其他字段。
      </p>
      <p style="color:#999;font-size:12px;">每一颗灵感的种子，都在此刻破土而出 🌿</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"心芽系统" <${process.env.SMTP_USER}>`,
      to: TARGET_USER_EMAIL,
      subject,
      html,
    })
    console.log(`\n[BatchRename] 📧 通知邮件已发送至 ${TARGET_USER_EMAIL}`)
  } catch (e) {
    console.error(`[BatchRename] ❌ 发送邮件失败:`, e)
  }
}

async function main() {
  try {
    const results = await batchRenameTitles()
    await sendNotification(results)
    console.log("\n[BatchRename] 全部任务完成")
  } catch (e) {
    console.error("[BatchRename] 任务执行失败:", e)
    process.exit(1)
  }
}

main()
