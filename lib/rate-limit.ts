// 轻量级内存频率限制器（适用于单实例部署）
// 生产环境若多实例部署，需改用 Redis

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

/**
 * 检查是否超过频率限制
 * @param key 限流键（如 "login:192.168.1.1" 或 "verify:userId"）
 * @param maxAttempts 时间窗口内允许的最大次数
 * @param windowMs 时间窗口（毫秒）
 * @returns { limited: boolean; remaining: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  const storeKey = `${maxAttempts}:${windowMs}`
  if (!stores.has(storeKey)) stores.set(storeKey, new Map())
  const store = stores.get(storeKey)!

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: maxAttempts - 1 }
  }

  if (entry.count >= maxAttempts) {
    return { limited: true, remaining: 0 }
  }

  entry.count++
  return { limited: false, remaining: maxAttempts - entry.count }
}

// 定期清理过期条目（每10分钟）
setInterval(() => {
  const now = Date.now()
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }
}, 10 * 60 * 1000).unref()
