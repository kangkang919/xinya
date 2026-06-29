import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_CONFIG } from "@/lib/auth"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_CONFIG.name)
  return NextResponse.json({ ok: true })
}
