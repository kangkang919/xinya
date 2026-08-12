import { describe, it, expect } from "vitest"
import {
  stripHtml,
  formatDate,
  isSameDay,
  generateCode,
  generateToken,
  getBeijingDateParts,
  beijingDateString,
  beijingDayStart,
  getBeijingDayOfWeek,
} from "@/lib/utils"

describe("stripHtml", () => {
  it("去掉 HTML 标签返回纯文本", () => {
    expect(stripHtml("<p>hello</p>")).toBe("hello")
    expect(stripHtml("<div><b>bold</b> text</div>")).toBe("bold text")
  })

  it("截断超长文本并加省略号", () => {
    const long = "a".repeat(100)
    const result = stripHtml(long, 10)
    expect(result).toHaveLength(11) // 10字符 + "…"
    expect(result.endsWith("…")).toBe(true)
  })

  it("空字符串返回空", () => {
    expect(stripHtml("")).toBe("")
  })

  it("只有标签的字符串返回空", () => {
    expect(stripHtml("<div></div>")).toBe("")
  })
})

describe("formatDate", () => {
  it("格式化日期为 YYYY-MM-DD", () => {
    const d = new Date("2026-08-12T10:00:00.000Z")
    expect(formatDate(d)).toBe("2026-08-12")
  })

  it("接受字符串输入", () => {
    expect(formatDate("2026-01-15")).toBe("2026-01-15")
  })
})

describe("isSameDay", () => {
  it("同年同月同日返回 true", () => {
    expect(isSameDay(new Date("2026-08-12"), new Date("2026-08-12T15:00:00"))).toBe(true)
  })

  it("不同日返回 false", () => {
    expect(isSameDay(new Date("2026-08-12"), new Date("2026-08-13"))).toBe(false)
  })

  it("不同月返回 false", () => {
    expect(isSameDay(new Date("2026-08-12"), new Date("2026-07-12"))).toBe(false)
  })
})

describe("generateCode", () => {
  it("生成 6 位数字字符串", () => {
    const code = generateCode()
    expect(code).toHaveLength(6)
    expect(/^\d{6}$/.test(code)).toBe(true)
  })

  it("每次生成不同的码", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe("generateToken", () => {
  it("生成 64 位十六进制字符串", () => {
    const token = generateToken()
    expect(token).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
  })

  it("每次生成不同的 token", () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})

describe("beijingDateString", () => {
  it("北京时间 2026-08-12 上午返回 2026-08-12", () => {
    // UTC 2026-08-12 02:00 = 北京时间 2026-08-12 10:00
    const d = new Date("2026-08-12T02:00:00.000Z")
    expect(beijingDateString(d)).toBe("2026-08-12")
  })

  it("北京时间跨天：UTC 16:00 = 北京时间次日 00:00", () => {
    // UTC 2026-08-12 16:00 = 北京时间 2026-08-13 00:00
    const d = new Date("2026-08-12T16:00:00.000Z")
    expect(beijingDateString(d)).toBe("2026-08-13")
  })

  it("北京时间凌晨：UTC 前一天 17:00 = 北京时间当天 01:00", () => {
    // UTC 2026-08-11 17:00 = 北京时间 2026-08-12 01:00
    const d = new Date("2026-08-11T17:00:00.000Z")
    expect(beijingDateString(d)).toBe("2026-08-12")
  })
})

describe("getBeijingDateParts", () => {
  it("正确返回年月日", () => {
    const d = new Date("2026-08-12T10:00:00.000Z") // 北京时间 18:00
    const parts = getBeijingDateParts(d)
    expect(parts.y).toBe(2026)
    expect(parts.m).toBe(8)
    expect(parts.d).toBe(12)
  })
})

describe("getBeijingDayOfWeek", () => {
  it("2026-08-12 是星期三", () => {
    expect(getBeijingDayOfWeek(2026, 8, 12)).toBe(3)
  })

  it("2026-08-10 是星期一", () => {
    expect(getBeijingDayOfWeek(2026, 8, 10)).toBe(1)
  })

  it("2026-08-16 是星期日", () => {
    expect(getBeijingDayOfWeek(2026, 8, 16)).toBe(0)
  })
})

describe("beijingDayStart", () => {
  it("返回北京时间当天 00:00 对应的 UTC 时间", () => {
    const start = beijingDayStart(2026, 8, 12)
    // 北京时间 2026-08-12 00:00 = UTC 2026-08-11 16:00
    expect(start.getUTCFullYear()).toBe(2026)
    expect(start.getUTCMonth()).toBe(7) // 0-indexed
    expect(start.getUTCDate()).toBe(11)
    expect(start.getUTCHours()).toBe(16)
  })
})
