﻿"use client"
import { useState } from "react"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
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
    } catch {
      setError("网络出了点问题，请稍后再试 ️")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="card-sketch bg-white p-8 shadow-md text-center" style={{ border: "2px solid #e0e0e0" }}>
        <div className="text-4xl mb-4"></div>
        <h2 className="text-xl font-bold mb-3" style={{ color: "#333" }}>注册链接已发送</h2>
        <p className="text-sm mb-2" style={{ color: "#666" }}>请前往 <strong>{email}</strong> 查收邮件</p>
        <p className="text-xs mb-6" style={{ color: "#999" }}>点击邮件中的链接即可完成注册并登录（15分钟内有效）</p>
        <button
          onClick={() => { setSent(false); setError("") }}
          className="text-sm font-medium"
          style={{ color: "#8BC34A" }}
        >
          换个邮箱重新发送
        </button>
        <p className="text-center text-sm mt-6" style={{ color: "#999" }}>
          已有账号？
          <Link href="/login" className="font-bold ml-1" style={{ color: "#8BC34A" }}>点我回到登录</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "#333" }}>播下你的第一颗种子</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm mb-1 block" style={{ color: "#795548" }}>邮箱</label>
          <input
            className="input-sketch w-full px-4 py-3 text-sm outline-none"
            style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
            type="email"
            placeholder="输入你的邮箱"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-sketch w-full py-3 font-bold text-white text-sm transition-opacity"
          style={{ background: loading ? "#aaa" : "#8BC34A" }}
        >
          {loading ? "链接正在发送…" : "发送注册链接 🌱"}
        </button>
      </form>

      <p className="text-center text-sm mt-5" style={{ color: "#999" }}>
        已有账号？
        <Link href="/login" className="font-bold ml-1" style={{ color: "#8BC34A" }}>
          点我回到登录
        </Link>
      </p>
    </div>
  )
}
