import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "xinya-dev-secret-change-in-prod"
const COOKIE_NAME = "xinya_token"

// 密码加密
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

// 密码验证
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

// 生成JWT
export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" })
}

// 验证JWT
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// 从请求中获取当前用户ID
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifyToken(token)
    return payload?.userId || null
  } catch {
    return null
  }
}

// Cookie配置
export const COOKIE_CONFIG = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60, // 30天
    path: "/",
  },
}
