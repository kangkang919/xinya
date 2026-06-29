"use client"
import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      // 无论邮箱是否存在都显示成功（安全考虑）
      setSent(true)
    } catch {
      setError("网络出了点问题 🌧️")
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="card-sketch bg-white p-8 shadow-md text-center" style={{ border: "2px solid #e0e0e0" }}>
      <div className="text-5xl mb-4">📬</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#333" }}>邮件已发出</h2>
      <p className="text-sm mb-6" style={{ color: "#999" }}>
        如果该邮箱已注册，你将收到一封重置密码的邮件。
        <br/>请检查收件箱和垃圾邮件。
      </p>
      <Link href="/login" className="btn-sketch inline-block px-8 py-3 text-sm font-bold text-white"
        style={{ background: "#8BC34A" }}>
        返回登录
      </Link>
    </div>
  )

  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "#333" }}>找回密码</h2>
      <p className="text-sm text-center mb-6" style={{ color: "#999" }}>
        输入注册邮箱，我们为你发送重置链接
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="input-sketch w-full px-4 py-3 text-sm outline-none"
          style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
          type="email" placeholder="输入你的邮箱" value={email}
          onChange={e => setEmail(e.target.value)} required
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="btn-sketch w-full py-3 font-bold text-white text-sm"
          style={{ background: loading ? "#aaa" : "#8BC34A" }}>
          {loading ? "发送中…" : "发送重置邮件"}
        </button>
      </form>

      <p className="text-center text-sm mt-5">
        <Link href="/login" style={{ color: "#8BC34A" }}>← 返回登录</Link>
      </p>
    </div>
  )
}
