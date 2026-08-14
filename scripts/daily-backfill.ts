/**
 * 定时 backfill + 题目重生脚本
 * 
 * 功能：
 * 1. 查找所有缺失题目或 AI 总结的心得，调用 DeepSeek 补生成（失败降级模板）
 * 2. 查找已答对题目的心得，从不同角度生成新测试题（旧题保留但退休）
 * 3. 补全/重生结果均发送邮件通知管理员
 * 
 * 使用方式：
 * - 手动运行：npx tsx scripts/daily-backfill.ts
 * - 定时任务：crontab 每周三、周六凌晨 3:00
 */

import { PrismaClient } from "@prisma/client"
import nodemailer from "nodemailer"
import { generateQuestions, generateQuestionsWithAngle } from "../lib/deepseek"
import { generateTemplateQuestions } from "../lib/template-questions"

const prisma = new PrismaClient()

// 管理员邮箱（接收通知）
const ADMIN_EMAIL = "1243177461@qq.com"

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

interface BackfillResult {
  entryId: string
  title: string
  status: "success" | "error"
  questionCount: number
  source: "deepseek" | "template" | "none"
}

interface RegenerateResult {
  entryId: string
  title: string
  status: "success" | "error"
  oldQuestion: string
  newQuestion: string
  source: "deepseek" | "template" | "none"
}

async function runBackfill() {
  console.log("[DailyBackfill] 开始执行每日补全任务...")
  console.log("[DailyBackfill] 时间:", new Date().toISOString())

  // 查找所有没有题目的心得
  const entriesWithoutQuestions = await prisma.entry.findMany({
    where: {
      quizQuestions: { none: {} },
    },
  })

  // 查找有题目但没有 keyPoints 的心得
  const entriesWithoutKeyPoints = await prisma.entry.findMany({
    where: {
      quizQuestions: { some: {} },
      keyPoints: null,
    },
  })

  const totalMissing = entriesWithoutQuestions.length + entriesWithoutKeyPoints.length

  // 查询总心得数（用于邮件报告）
  const totalEntries = await prisma.entry.count({ where: { isDraft: false } })

  if (totalMissing === 0) {
    console.log(`[DailyBackfill] ✅ 所有心得已有题目和要点，无需补全（共检查 ${totalEntries} 篇）`)
    await prisma.$disconnect()
    return { success: 0, failed: 0, results: [], totalChecked: totalEntries }
  }

  console.log(`[DailyBackfill] 发现 ${totalMissing} 篇需要补全的心得`)
  console.log(`  - 缺失题目：${entriesWithoutQuestions.length} 篇`)
  console.log(`  - 缺失要点：${entriesWithoutKeyPoints.length} 篇`)

  let successCount = 0
  let failCount = 0
  const results: BackfillResult[] = []

  // 处理缺失题目的心得
  for (const entry of entriesWithoutQuestions) {
    try {
      console.log(`[DailyBackfill] 处理: ${entry.title}`)

      // 尝试 DeepSeek 生成
      const result = await generateQuestions(entry.title, entry.content, 1)
      let questions = result.questions
      let source: "deepseek" | "template" = "deepseek"

      // 保存 AI 生成的要点
      if (result.keyPoints) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { keyPoints: result.keyPoints },
        })
      }

      if (questions.length === 0) {
        // 降级到模板
        console.log(`[DailyBackfill] DeepSeek 返回空，使用模板降级`)
        const templateResult = generateTemplateQuestions(entry.title, entry.content)
        questions = templateResult.questions
        source = "template"
        if (templateResult.keyPoints) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { keyPoints: templateResult.keyPoints },
          })
        }
      }

      // 创建题目和答题记录
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const question = await prisma.quizQuestion.create({
          data: {
            entryId: entry.id,
            question: q.question,
            type: q.type,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            angle: i + 1,
          },
        })

        const nextReviewAt = new Date()
        nextReviewAt.setDate(nextReviewAt.getDate() + 1)

        await prisma.quizRecord.create({
          data: {
            userId: entry.userId,
            questionId: question.id,
            entryId: entry.id,
            correct: false,
            nextReviewAt,
            streak: 0,
          },
        })
      }

      successCount++
      results.push({
        entryId: entry.id,
        title: entry.title,
        status: "success",
        questionCount: questions.length,
        source,
      })
      console.log(`[DailyBackfill] ✅ 成功: ${entry.title} (${questions.length} 题, ${source})`)

      // 避免 API 限流，每篇间隔 2 秒
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      failCount++
      results.push({
        entryId: entry.id,
        title: entry.title,
        status: "error",
        questionCount: 0,
        source: "none",
      })
      console.error(`[DailyBackfill] ❌ 失败: ${entry.title}`, e)
    }
  }

  // 处理有题目但缺失 keyPoints 的心得
  for (const entry of entriesWithoutKeyPoints) {
    try {
      console.log(`[DailyBackfill] 补全要点: ${entry.title}`)

      const result = await generateQuestions(entry.title, entry.content, 1)

      if (result.keyPoints) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { keyPoints: result.keyPoints },
        })
        successCount++
        results.push({
          entryId: entry.id,
          title: entry.title,
          status: "success",
          questionCount: 0, // 题目已存在，只是补全要点
          source: "deepseek",
        })
        console.log(`[DailyBackfill] ✅ 要点已补全: ${entry.title}`)
      } else {
        // 使用模板生成要点
        const templateResult = generateTemplateQuestions(entry.title, entry.content)
        if (templateResult.keyPoints) {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { keyPoints: templateResult.keyPoints },
          })
          successCount++
          results.push({
            entryId: entry.id,
            title: entry.title,
            status: "success",
            questionCount: 0,
            source: "template",
          })
          console.log(`[DailyBackfill] ✅ 要点已补全(模板): ${entry.title}`)
        }
      }

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      failCount++
      results.push({
        entryId: entry.id,
        title: entry.title,
        status: "error",
        questionCount: 0,
        source: "none",
      })
      console.error(`[DailyBackfill] ❌ 补全要点失败: ${entry.title}`, e)
    }
  }

  console.log(`\n[DailyBackfill] 完成！成功: ${successCount}, 失败: ${failCount}`)
  await prisma.$disconnect()

  return { success: successCount, failed: failCount, results, totalChecked: totalEntries }
}

// ========== 题目重生（F9.22）：为已答对的心得多角度生成新题 ==========
async function runRegenerate() {
  console.log("\n[Regenerate] 开始检查已答对题目的重生需求...")

  // 查找所有答对过（correct=true）的答题记录，按心得分组
  const correctRecords = await prisma.quizRecord.findMany({
    where: { correct: true, answeredAt: { not: null } },
    select: { entryId: true },
    distinct: ["entryId"],
  })

  if (correctRecords.length === 0) {
    console.log("[Regenerate] 没有找到答对过的心得，跳过重生")
    return { success: 0, failed: 0, results: [] as RegenerateResult[] }
  }

  const answeredEntryIds = correctRecords.map(r => r.entryId)
  console.log(`[Regenerate] 发现 ${answeredEntryIds.length} 篇心得有答对记录`)

  // 排除已有"未答题"记录的心得（避免堆积未做的新题）
  const pendingRecords = await prisma.quizRecord.findMany({
    where: { entryId: { in: answeredEntryIds }, answeredAt: null },
    select: { entryId: true },
    distinct: ["entryId"],
  })
  const pendingEntryIds = new Set(pendingRecords.map(r => r.entryId))

  const eligibleEntryIds = answeredEntryIds.filter(id => !pendingEntryIds.has(id))
  console.log(`[Regenerate] 其中 ${pendingEntryIds.size} 篇已有待答题目（跳过），${eligibleEntryIds.length} 篇需要重生`)

  if (eligibleEntryIds.length === 0) {
    return { success: 0, failed: 0, results: [] as RegenerateResult[] }
  }

  // 获取这些心得的详情和当前活跃题目
  const entries = await prisma.entry.findMany({
    where: { id: { in: eligibleEntryIds } },
    include: {
      quizQuestions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  let successCount = 0
  let failCount = 0
  const results: RegenerateResult[] = []

  for (const entry of entries) {
    const currentQuestion = entry.quizQuestions[0]
    if (!currentQuestion) continue

    try {
      console.log(`[Regenerate] 处理: ${entry.title}（旧题: "${currentQuestion.question.substring(0, 20)}..."）`)

      // 尝试 DeepSeek 从不同角度生成
      const result = await generateQuestionsWithAngle(entry.title, entry.content, currentQuestion.question, 1)
      let newQuestions = result.questions
      let source: "deepseek" | "template" = "deepseek"

      if (newQuestions.length === 0) {
        // 降级到模板
        console.log(`[Regenerate] DeepSeek 返回空，使用模板降级`)
        const templateResult = generateTemplateQuestions(entry.title, entry.content)
        newQuestions = templateResult.questions
        source = "template"
      }

      if (newQuestions.length === 0) {
        failCount++
        results.push({
          entryId: entry.id,
          title: entry.title,
          status: "error",
          oldQuestion: currentQuestion.question,
          newQuestion: "",
          source: "none",
        })
        console.log(`[Regenerate] ❌ 模板也失败: ${entry.title}`)
        continue
      }

      const newQ = newQuestions[0]

      // 退休旧题：将所有旧 QuizRecord 的 nextReviewAt 设到 100 年后
      const farFuture = new Date()
      farFuture.setFullYear(farFuture.getFullYear() + 100)

      await prisma.quizRecord.updateMany({
        where: { entryId: entry.id, answeredAt: { not: null } },
        data: { nextReviewAt: farFuture },
      })

      // 创建新题目
      const newQuestion = await prisma.quizQuestion.create({
        data: {
          entryId: entry.id,
          question: newQ.question,
          type: newQ.type,
          options: newQ.options,
          answer: newQ.answer,
          explanation: newQ.explanation,
          angle: (currentQuestion.angle || 1) + 1,
        },
      })

      // 创建新答题记录
      const nextReviewAt = new Date()
      nextReviewAt.setDate(nextReviewAt.getDate() + 1)

      await prisma.quizRecord.create({
        data: {
          userId: entry.userId,
          questionId: newQuestion.id,
          entryId: entry.id,
          correct: false,
          nextReviewAt,
          streak: 0,
        },
      })

      successCount++
      results.push({
        entryId: entry.id,
        title: entry.title,
        status: "success",
        oldQuestion: currentQuestion.question,
        newQuestion: newQ.question,
        source,
      })
      console.log(`[Regenerate] ✅ 新题已生成: ${entry.title} → "${newQ.question}" (${source})`)

      // 避免 API 限流，每篇间隔 2 秒
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      failCount++
      results.push({
        entryId: entry.id,
        title: entry.title,
        status: "error",
        oldQuestion: currentQuestion.question,
        newQuestion: "",
        source: "none",
      })
      console.error(`[Regenerate] ❌ 失败: ${entry.title}`, e)
    }
  }

  console.log(`\n[Regenerate] 完成！成功: ${successCount}, 失败: ${failCount}`)
  return { success: successCount, failed: failCount, results }
}

async function sendNotification(
  backfillResult: { success: number; failed: number; results: BackfillResult[]; totalChecked: number },
  regenResult: { success: number; failed: number; results: RegenerateResult[] }
) {
  const successEntries = backfillResult.results.filter(r => r.status === "success")
  const failedEntries = backfillResult.results.filter(r => r.status === "error")
  const hasBackfill = backfillResult.success > 0 || backfillResult.failed > 0
  const hasRegen = regenResult.success > 0 || regenResult.failed > 0
  const regenSuccessEntries = regenResult.results.filter(r => r.status === "success")
  const regenFailedEntries = regenResult.results.filter(r => r.status === "error")

  // 邮件标题
  const parts: string[] = []
  if (hasBackfill) parts.push("补全")
  if (hasRegen) parts.push("重生")
  const isAllGood = !hasBackfill && !hasRegen
  let subject: string
  if (isAllGood) {
    subject = `心芽 · 自检正常（${new Date().toLocaleDateString("zh-CN")}）`
  } else {
    subject = `心芽 · 定时报告 · ${parts.join("+")}（${new Date().toLocaleDateString("zh-CN")}）`
  }

  // 根据情况生成不同的邮件内容
  let bodyHtml: string = ""

  // 概览
  bodyHtml += `
    <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="color:#333;margin:0 0 12px 0;">📊 执行概览</h3>
      <p style="color:#666;font-size:14px;margin:8px 0;">
        共检查 <strong>${backfillResult.totalChecked}</strong> 篇心得
      </p>
      ${hasBackfill ? `
        <p style="color:#666;font-size:14px;margin:8px 0;">
          <strong style="color:#8BC34A;">✅ 补全成功：${backfillResult.success} 篇</strong>
          ${backfillResult.failed > 0 ? `<strong style="color:#e57373;margin-left:12px;">❌ 补全失败：${backfillResult.failed} 篇</strong>` : ""}
        </p>
      ` : ""}
      ${hasRegen ? `
        <p style="color:#666;font-size:14px;margin:8px 0;">
          <strong style="color:#2196F3;">🔄 题目重生成功：${regenResult.success} 篇</strong>
          ${regenResult.failed > 0 ? `<strong style="color:#e57373;margin-left:12px;">❌ 重生失败：${regenResult.failed} 篇</strong>` : ""}
        </p>
      ` : ""}
      ${isAllGood ? `
        <p style="color:#2e7d32;font-size:14px;margin:8px 0;">
          ✅ 所有心得均已拥有测试题和 AI 总结，且无需要重生的题目，一切正常。
        </p>
      ` : ""}
    </div>
  `

  // 补全详情
  if (hasBackfill) {
    bodyHtml += `
      ${successEntries.length > 0 ? `
        <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#333;margin:0 0 12px 0;">✅ 补全成功的心得</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${successEntries.map(e => `
              <li style="margin:8px 0;">
                <strong>${e.title}</strong>
                <span style="color:#999;font-size:12px;">（${e.questionCount} 题，${e.source}）</span>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${failedEntries.length > 0 ? `
        <div style="background:#fff4f4;border:1px solid #e57373;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#e57373;margin:0 0 12px 0;">⚠️ 补全失败的心得</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${failedEntries.map(e => `
              <li style="margin:8px 0;"><strong>${e.title}</strong></li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
    `
  }

  // 重生详情
  if (hasRegen) {
    bodyHtml += `
      ${regenSuccessEntries.length > 0 ? `
        <div style="background:#f0f7ff;border:1px solid #2196F3;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#1565C0;margin:0 0 12px 0;">🔄 题目重生成功</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${regenSuccessEntries.map(r => `
              <li style="margin:8px 0;">
                <strong>${r.title}</strong>
                <span style="color:#999;font-size:12px;">（${r.source}）</span>
                <br><span style="color:#999;font-size:11px;">旧题: ${r.oldQuestion.substring(0, 30)}…</span>
                <br><span style="color:#2196F3;font-size:11px;">新题: ${r.newQuestion.substring(0, 30)}…</span>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${regenFailedEntries.length > 0 ? `
        <div style="background:#fff4f4;border:1px solid #e57373;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#e57373;margin:0 0 12px 0;">⚠️ 题目重生失败</h3>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${regenFailedEntries.map(r => `
              <li style="margin:8px 0;"><strong>${r.title}</strong></li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
    `
  }

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
      <h2 style="color:#8BC34A;margin-bottom:8px;">🌱 心芽 · 题目补全报告</h2>
      <p style="color:#666;font-size:14px;">执行时间：${new Date().toLocaleString("zh-CN")}</p>
      ${bodyHtml}
      <p style="color:#999;font-size:12px;margin-top:24px;">
        此邮件由心芽系统自动发送（每周三、周六凌晨 3:00 执行）。<br>
        包含：① 缺失题目/要点补全 ② 已答对题目重生（从不同角度出新题）
      </p>
      <p style="color:#999;font-size:12px;">每一颗灵感的种子，都在此刻破土而出 🌿</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"心芽系统" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[DailyBackfill] 📧 通知邮件已发送至 ${ADMIN_EMAIL}`)
  } catch (e) {
    console.error(`[DailyBackfill] ❌ 发送邮件失败:`, e)
  }
}

// 发送故障通知邮件（程序异常时调用）
async function sendErrorNotification(error: unknown) {
  const errorMsg = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : ""
  const subject = `心芽 · ⚠️ 题目补全程序故障（${new Date().toLocaleDateString("zh-CN")}）`

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
      <h2 style="color:#e57373;margin-bottom:8px;">⚠️ 心芽 · 题目补全程序故障</h2>
      <p style="color:#666;font-size:14px;">执行时间：${new Date().toLocaleString("zh-CN")}</p>

      <div style="background:#fff4f4;border:1px solid #e57373;border-radius:8px;padding:20px;margin:20px 0;">
        <h3 style="color:#e57373;margin:0 0 12px 0;">❌ 程序运行异常</h3>
        <p style="color:#666;font-size:14px;margin:8px 0;">
          定时补全任务执行失败，请检查服务器日志。
        </p>
        <div style="background:#fff;border-radius:4px;padding:12px;margin:12px 0;font-family:monospace;font-size:12px;color:#333;word-break:break-all;">
          <strong>错误信息：</strong>${errorMsg}
          ${errorStack ? `<br><br><strong>堆栈：</strong><pre style="white-space:pre-wrap;margin:0;">${errorStack.substring(0, 500)}</pre>` : ""}
        </div>
        <p style="color:#999;font-size:12px;margin:8px 0;">
          日志位置：/tmp/xinya-backfill.log
        </p>
      </div>

      <p style="color:#999;font-size:12px;margin-top:24px;">
        此邮件由心芽系统自动发送。
      </p>
      <p style="color:#999;font-size:12px;">每一颗灵感的种子，都在此刻破土而出 🌿</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"心芽系统" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[DailyBackfill] 📧 故障通知邮件已发送至 ${ADMIN_EMAIL}`)
  } catch (e) {
    console.error(`[DailyBackfill] ❌ 发送故障通知失败:`, e)
  }
}

// 主函数
async function main() {
  try {
    const backfillResult = await runBackfill()
    const regenResult = await runRegenerate()
    await sendNotification(backfillResult, regenResult)
    console.log("\n[DailyBackfill] 全部任务完成")
  } catch (e) {
    console.error("[DailyBackfill] 任务执行失败:", e)
    // 情况③：程序异常，发送故障通知
    await sendErrorNotification(e)
    process.exit(1)
  }
}

main()
