import { describe, it, expect, beforeEach, vi } from "vitest"
import { checkRateLimit } from "@/lib/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-12T10:00:00.000Z"))
  })

  it("首次请求不限制", () => {
    const result = checkRateLimit("test:ip1", 5, 60000)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
  })

  it("未超限时递增计数", () => {
    checkRateLimit("test:ip2", 5, 60000)
    checkRateLimit("test:ip2", 5, 60000)
    const result = checkRateLimit("test:ip2", 5, 60000)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(2)
  })

  it("达到上限后返回 limited=true", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:ip3", 5, 60000)
    }
    const result = checkRateLimit("test:ip3", 5, 60000)
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it("时间窗口过后重置计数", () => {
    // 先用满 5 次
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:ip4", 5, 60000)
    }
    // 快进 61 秒
    vi.setSystemTime(new Date("2026-08-12T10:01:01.000Z"))
    const result = checkRateLimit("test:ip4", 5, 60000)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
  })

  it("不同 key 互不影响", () => {
    // 用尽 ip5 的配额
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:ip5", 5, 60000)
    }
    // ip6 仍可请求
    const result = checkRateLimit("test:ip6", 5, 60000)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
  })

  it("不同参数组合使用不同存储", () => {
    // 同 key 不同参数不应共享计数
    checkRateLimit("test:ip7", 3, 60000)
    const result = checkRateLimit("test:ip7", 10, 60000)
    // 不同参数组合应该从 1 开始
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(9)
  })
})
