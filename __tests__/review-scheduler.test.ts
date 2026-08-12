import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock 依赖模块（review-scheduler 依赖 prisma + deepseek + template-questions）
vi.mock("@/lib/prisma", () => ({
  prisma: {
    quizRecord: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    entry: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    userSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    reviewCallLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/deepseek", () => ({
  generateQuestions: vi.fn(),
}))

vi.mock("@/lib/template-questions", () => ({
  generateKeyPoints: vi.fn(() => "要点摘要"),
}))

import { submitAnswer } from "@/lib/review-scheduler"
import { prisma } from "@/lib/prisma"

describe("submitAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("单选题答对：返回 correct=true，间隔 2 天", async () => {
    const mockRecord: any = {
      id: "r1",
      userId: "u1",
      questionId: "q1",
      streak: 0,
      question: { id: "q1", answer: [0], explanation: "解析A" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q1", [0])

    expect(result).not.toBeNull()
    expect(result!.correct).toBe(true)
    expect(result!.nextReviewDays).toBe(2) // 2^(0+1) = 2
    expect(result!.explanation).toBe("解析A")
  })

  it("单选题答错：返回 correct=false，间隔 1 天", async () => {
    const mockRecord: any = {
      id: "r2",
      userId: "u1",
      questionId: "q2",
      streak: 3,
      question: { id: "q2", answer: [0], explanation: "解析B" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q2", [1])

    expect(result).not.toBeNull()
    expect(result!.correct).toBe(false)
    expect(result!.nextReviewDays).toBe(1)
  })

  it("多选题全对：返回 correct=true", async () => {
    const mockRecord: any = {
      id: "r3",
      userId: "u1",
      questionId: "q3",
      streak: 1,
      question: { id: "q3", answer: [0, 2], explanation: "解析C" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q3", [0, 2])

    expect(result!.correct).toBe(true)
    expect(result!.nextReviewDays).toBe(4) // 2^(1+1) = 4
  })

  it("多选题顺序不同也算对", async () => {
    const mockRecord: any = {
      id: "r4",
      userId: "u1",
      questionId: "q4",
      streak: 0,
      question: { id: "q4", answer: [0, 2], explanation: "解析D" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q4", [2, 0])

    expect(result!.correct).toBe(true)
  })

  it("多选题部分正确算错", async () => {
    const mockRecord: any = {
      id: "r5",
      userId: "u1",
      questionId: "q5",
      streak: 0,
      question: { id: "q5", answer: [0, 2], explanation: "解析E" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q5", [0])

    expect(result!.correct).toBe(false)
    expect(result!.nextReviewDays).toBe(1)
  })

  it("多选了错误选项算错（长度相同但内容不同）", async () => {
    const mockRecord: any = {
      id: "r6",
      userId: "u1",
      questionId: "q6",
      streak: 0,
      question: { id: "q6", answer: [0, 1], explanation: "解析F" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    // 正确答案是 [0,1]，用户选 [0,2]——长度相同但 2 不在正确答案中
    const result = await submitAnswer("u1", "q6", [0, 2])

    expect(result!.correct).toBe(false)
  })

  it("连续答对：streak=2 时间隔 8 天", async () => {
    const mockRecord: any = {
      id: "r7",
      userId: "u1",
      questionId: "q7",
      streak: 2,
      question: { id: "q7", answer: [1], explanation: "解析G" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q7", [1])

    expect(result!.correct).toBe(true)
    expect(result!.nextReviewDays).toBe(8) // 2^(2+1) = 8
  })

  it("答错后 streak 重置为 0：下次答对间隔回到 2 天", async () => {
    // streak=5 但答错
    const mockRecord: any = {
      id: "r8",
      userId: "u1",
      questionId: "q8",
      streak: 5,
      question: { id: "q8", answer: [0], explanation: "解析H" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    const result = await submitAnswer("u1", "q8", [1])

    expect(result!.correct).toBe(false)
    expect(result!.nextReviewDays).toBe(1)
    // 验证 update 被调用，streak 被重置为 0
    const updateCall = (prisma.quizRecord.update as any).mock.calls[0][0]
    expect(updateCall.data.streak).toBe(0)
  })

  it("题目记录不存在时返回 null", async () => {
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(null)

    const result = await submitAnswer("u1", "nonexistent", [0])

    expect(result).toBeNull()
  })

  it("答对时 prisma.update 被正确调用", async () => {
    const mockRecord: any = {
      id: "r9",
      userId: "u1",
      questionId: "q9",
      streak: 0,
      question: { id: "q9", answer: [0], explanation: "解析I" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    await submitAnswer("u1", "q9", [0])

    const updateCall = (prisma.quizRecord.update as any).mock.calls[0][0]
    expect(updateCall.where.id).toBe("r9")
    expect(updateCall.data.correct).toBe(true)
    expect(updateCall.data.streak).toBe(1)
    expect(updateCall.data.answerCount).toEqual({ increment: 1 })
    expect(updateCall.data.answeredAt).toBeInstanceOf(Date)
  })

  it("答错时 prisma.update 被正确调用", async () => {
    const mockRecord: any = {
      id: "r10",
      userId: "u1",
      questionId: "q10",
      streak: 2,
      question: { id: "q10", answer: [0], explanation: "解析J" },
    }
    ;(prisma.quizRecord.findFirst as any).mockResolvedValue(mockRecord)
    ;(prisma.quizRecord.update as any).mockResolvedValue(mockRecord)

    await submitAnswer("u1", "q10", [1])

    const updateCall = (prisma.quizRecord.update as any).mock.calls[0][0]
    expect(updateCall.data.correct).toBe(false)
    expect(updateCall.data.streak).toBe(0)
    expect(updateCall.data.userAnswer).toEqual([1])
  })
})
