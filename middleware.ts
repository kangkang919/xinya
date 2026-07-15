import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authPages = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/onboard", "/showcase"]
  const isAuthPage = authPages.some(p => pathname.startsWith(p))

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next()
  }

  const hasToken = request.cookies.has("xinya_token")
  const tokenValue = request.cookies.get("xinya_token")?.value?.substring(0, 20) + "..."
  console.log("[Middleware-DEBUG] pathname:", pathname, "isAuthPage:", isAuthPage, "hasToken:", hasToken, "tokenPreview:", tokenValue)

  if (isAuthPage) {
    return NextResponse.next()
  }

  if (!hasToken) {
    console.log("[Middleware-DEBUG] 无token, 重定向到 /login")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\..*).*)"]
}
