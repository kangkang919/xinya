import { prisma } from "./prisma"

// 记录调用日志（保留最近30条）
export async function logReviewCall(
  userId: string,
  entryId: string | null,
  step: string,
  success: boolean,
  questionCount: number,
  errorMsg?: string
) {
  await prisma.reviewCallLog.create({
    data: { userId, entryId, step, success, questionCount, errorMsg },
  })

  // 清理30条之前的旧日志
  const oldLogs = await prisma.reviewCallLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: 30,
    select: { id: true },
  })
  if (oldLogs.length > 0) {
    await prisma.reviewCallLog.deleteMany({
      where: { id: { in: oldLogs.map(l => l.id) } },
    })
  }
}

interface TodayCard {
  entryId: string
  entryTitle: string
  conceptName: string
  keyPoints: string
  questionId: string
  question: string
  type: string
  options: string[]
  answer: number[]
  explanation: string
}

export async function getTodayCard(userId: string): Promise<TodayCard | null> {
  const today = new Date().toISOString().split("T")[0]

  // 检查用户是否开启拾遗
  const setting = await prisma.userSetting.findUnique({ where: { userId } })
  if (!setting?.reviewEnabled) return null

  // 检查今天是否已弹过卡片
  if (setting.lastCardDate === today) return null

  // 查找待复习题目（nextReviewAt <= now，按答错优先 > 久未复习优先）
  const now = new Date()
  const dueQuestion = await prisma.quizRecord.findFirst({
    where: {
      userId,
      nextReviewAt: { lte: now },
    },
    orderBy: [
      { correct: "asc" }, // 答错的优先（false < true）
      { nextReviewAt: "asc" }, // 久未复习的优先
    ],
    include: {
      question: {
        include: {
          entry: true,
        },
      },
    },
  })

  if (dueQuestion) {
    return formatCard(dueQuestion)
  }

  // 若无待复习题，优先查找已有题目但未答题的记录
  const unreviewedRecord = await prisma.quizRecord.findFirst({
    where: {
      userId,
      answeredAt: { equals: null },
    },
    orderBy: { nextReviewAt: "asc" },
    include: {
      question: {
        include: {
          entry: true,
        },
      },
    },
  })

  if (unreviewedRecord) {
    console.log("[Scheduler] Found unreviewed record, entryId:", unreviewedRecord.entryId)
    return formatCard(unreviewedRecord)
  }

  // 最后才查找尚未出题的心得（需要在线生成题目）
  const entriesWithoutQuestions = await prisma.entry.findMany({
    where: {
      userId,
      quizQuestions: { none: {} },
    },
    orderBy: { createdAt: "desc" }, // 优先最新的心得
    take: 5,
  })

  if (entriesWithoutQuestions.length > 0) {
    const entry = entriesWithoutQuestions[0]
    console.log("[Scheduler] No questions found, returning entry for generation:", entry.id)
    return {
      entryId: entry.id,
      entryTitle: entry.title,
      conceptName: entry.title,
      keyPoints: "",
      questionId: "",
      question: "",
      type: "single",
      options: [],
      answer: [0],
      explanation: "",
    }
  }

  // 所有心得都有题目了，查找最久未复习的
  const oldestRecord = await prisma.quizRecord.findFirst({
    where: { userId },
    orderBy: { nextReviewAt: "asc" },
    include: {
      question: {
        include: {
          entry: true,
        },
      },
    },
  })

  if (oldestRecord) {
    return formatCard(oldestRecord)
  }

  return null
}

function formatCard(record: any): TodayCard {
  return {
    entryId: record.entryId,
    entryTitle: record.question.entry.title,
    conceptName: record.question.entry.title,
    keyPoints: "",
    questionId: record.questionId,
    question: record.question.question,
    type: record.question.type,
    options: record.question.options,
    answer: record.question.answer,
    explanation: record.question.explanation,
  }
}

export async function submitAnswer(
  userId: string,
  questionId: string,
  userAnswer: number[]
): Promise<{ correct: boolean; explanation: string; nextReviewDays: number } | null> {
  const record = await prisma.quizRecord.findFirst({
    where: { userId, questionId },
    include: { question: true },
  })

  if (!record) return null

  const question = record.question
  const correctAnswer = question.answer as number[]
  const isCorrect =
    correctAnswer.length === userAnswer.length &&
    correctAnswer.every((a: number) => userAnswer.includes(a))

  // 计算下次复习时间
  let nextReviewDays: number
  let newStreak: number

  if (isCorrect) {
    newStreak = record.streak + 1
    nextReviewDays = Math.pow(2, newStreak) // 1→2→4→8...
  } else {
    newStreak = 0
    nextReviewDays = 1 // 答错重置为1天
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + nextReviewDays)

  // 更新答题记录
  await prisma.quizRecord.update({
    where: { id: record.id },
    data: {
      correct: isCorrect,
      answeredAt: new Date(),
      nextReviewAt,
      streak: newStreak,
    },
  })

  return {
    correct: isCorrect,
    explanation: question.explanation,
    nextReviewDays,
  }
}

export async function skipToday(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0]
  await prisma.userSetting.upsert({
    where: { userId },
    update: { lastCardDate: today },
    create: { userId, lastCardDate: today },
  })
}
