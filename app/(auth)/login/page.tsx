"use client"
import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [mode, setMode] = useState<"magic" | "password">("magic")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(urlError || "")
  const [sent, setSent] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/magic-link/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!data.ok) return setError(data.error || "发送失败")
      setSent(true)
    } catch (err: any) {
      setError("网络出了点问题，请稍后再试")
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!data.ok) {
        if (data.needVerify) {
          window.location.href = "/verify-email?userId=" + data.userId
          return
        }
        return setError(data.error || "登录失败")
      }
      window.location.href = data.data?.onboardDone ? "/" : "/onboard"
    } catch (err: any) {
      setError("网络出了点问题，请稍后再试")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card-sketch bg-white p-8 shadow-md text-center" style={{ border: "2px solid #e0e0e0" }}>
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-xl font-bold mb-3" style={{ color: "#333" }}>登录链接已发送</h2>
        <p className="text-sm mb-2" style={{ color: "#666" }}>请前往 <strong>{email}</strong> 查收邮件</p>
        <p className="text-xs mb-6" style={{ color: "#999" }}>点击邮件中的链接即可自动登录（15分钟内有效）</p>
        <button
          onClick={() => { setSent(false); setError("") }}
          className="text-sm font-medium"
          style={{ color: "#8BC34A" }}
        >
          换个邮箱重新发送
        </button>
        <p className="text-center text-sm mt-6" style={{ color: "#999" }}>
          还没有账号？
          <Link href="/register" className="font-medium ml-1" style={{ color: "#8BC34A" }}>播下第一颗种子</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-4 text-center" style={{ color: "#333" }}>回到你的花园</h2>

      {/* 模式切换 */}
      <div className="flex mb-6 rounded-lg overflow-hidden" style={{ border: "1.5px solid #ddd" }}>
        <button
          onClick={() => { setMode("magic"); setError("") }}
          className="flex-1 py-2 text-sm font-medium transition-colors"
          style={{
            background: mode === "magic" ? "#8BC34A" : "#fff",
            color: mode === "magic" ? "#fff" : "#999",
          }}
        >
          邮箱链接登录
        </button>
        <button
          onClick={() => { setMode("password"); setError("") }}
          className="flex-1 py-2 text-sm font-medium transition-colors"
          style={{
            background: mode === "password" ? "#8BC34A" : "#fff",
            color: mode === "password" ? "#fff" : "#999",
          }}
        >
          测试账号登录
        </button>
      </div>

      {mode === "magic" ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#795548" }}>邮箱</label>
            <input
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
              type="email"
              placeholder="输入你的邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold text-white text-sm rounded-lg"
            style={{ background: loading ? "#aaa" : "#8BC34A" }}
          >
            {loading ? "链接正在发送…" : "发送登录链接 🌿"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#795548" }}>邮箱</label>
            <input
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
              type="email"
              placeholder="输入你的邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#795548" }}>密码</label>
            <input
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
              type="password"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold text-white text-sm rounded-lg"
            style={{ background: loading ? "#aaa" : "#8BC34A" }}
          >
            {loading ? "花园门正在开启…" : "登录 🌿"}
          </button>
        </form>
      )}

      <p className="text-center text-sm mt-5" style={{ color: "#999" }}>
        还没有账号？
        <Link href="/register" className="font-medium ml-1" style={{ color: "#8BC34A" }}>播下第一颗种子</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
