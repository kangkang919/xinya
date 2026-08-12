/**
 * 每日定时 backfill 脚本
 * 
 * 功能：
 * 1. 查找所有缺失题目或 AI 总结的心得
 * 2. 调用 DeepSeek 补生成题目和 keyPoints
 * 3. 如果 DeepSeek 失败，降级到模板题目
 * 4. 补全成功后发送邮件通知管理员
 * 
 * 使用方式：
 * - 手动运行：npx tsx scripts/daily-backfill.ts
 * - 定时任务：通过 PM2 cron 或系统 crontab 每天执行
 */

import { PrismaClient } from "@prisma/client"
import nodemailer from "nodemailer"
import { generateQuestions } from "../lib/deepseek"
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

  if (totalMissing === 0) {
    console.log("[DailyBackfill] ✅ 所有心得已有题目和要点，无需补全")
    await prisma.$disconnect()
    return { success: 0, failed: 0, results: [], skipped: true }
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

  return { success: successCount, failed: failCount, results, skipped: false }
}

async function sendNotification(result: { success: number; failed: number; results: BackfillResult[]; skipped: boolean }) {
  if (result.skipped) {
    console.log("[DailyBackfill] 无需通知，所有心得已完整")
    return
  }

  if (result.success === 0 && result.failed === 0) {
    console.log("[DailyBackfill] 无需通知，没有处理任何心得")
    return
  }

  const successEntries = result.results.filter(r => r.status === "success")
  const failedEntries = result.results.filter(r => r.status === "error")

  const subject = `心芽 · 每日题目补全报告（${new Date().toLocaleDateString("zh-CN")}）`

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:32px;background:#FAFAF5;border-radius:12px;">
      <h2 style="color:#8BC34A;margin-bottom:8px;">🌱 心芽 · 每日题目补全报告</h2>
      <p style="color:#666;font-size:14px;">执行时间：${new Date().toLocaleString("zh-CN")}</p>
      
      <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;">
        <h3 style="color:#333;margin:0 0 12px 0;">📊 执行结果</h3>
        <p style="color:#666;font-size:14px;margin:8px 0;">
          <strong style="color:#8BC34A;">✅ 成功补全：${result.success} 篇</strong>
        </p>
        <p style="color:#666;font-size:14px;margin:8px 0;">
          <strong style="color:#e57373;">❌ 补全失败：${result.failed} 篇</strong>
        </p>
      </div>

      ${successEntries.length > 0 ? `
        <div style="background:#fff;border-radius:8px;padding:20px;margin:20px 0;">
          <h3 style="color:#333;margin:0 0 12px 0;">✅ 成功补全的心得</h3>
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
          <p style="color:#666;font-size:14px;margin:8px 0;">以下心得补全失败，请检查 DeepSeek API 或手动处理：</p>
          <ul style="color:#666;font-size:14px;margin:0;padding-left:20px;">
            ${failedEntries.map(e => `
              <li style="margin:8px 0;"><strong>${e.title}</strong></li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      <p style="color:#999;font-size:12px;margin-top:24px;">
        此邮件由心芽系统自动发送，如需修改通知设置请联系管理员。
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

// 主函数
async function main() {
  try {
    const result = await runBackfill()
    await sendNotification(result)
    console.log("[DailyBackfill] 任务完成")
  } catch (e) {
    console.error("[DailyBackfill] 任务执行失败:", e)
    process.exit(1)
  }
}

main()
