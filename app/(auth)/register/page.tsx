"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) return setError("两次输入的密码不一致")
    if (password.length < 6) return setError("密码至少需要6位")

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!data.ok) return setError(data.error || "注册失败")
      // 跳转到验证邮箱页
      router.push(`/verify-email?userId=${data.data.userId}&email=${encodeURIComponent(email)}`)
    } catch {
      setError("网络出了点问题，请稍后再试 🌧️")
    } finally {
      setLoading(false)
    }
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
            type="email" placeholder="输入你的邮箱" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
        </div>
        <div>
          <label className="text-sm mb-1 block" style={{ color: "#795548" }}>密码</label>
          <input
            className="input-sketch w-full px-4 py-3 text-sm outline-none"
            style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
            type="password" placeholder="至少6位" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
        </div>
        <div>
          <label className="text-sm mb-1 block" style={{ color: "#795548" }}>确认密码</label>
          <input
            className="input-sketch w-full px-4 py-3 text-sm outline-none"
            style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
            type="password" placeholder="再输入一次" value={confirm}
            onChange={e => setConfirm(e.target.value)} required
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="btn-sketch w-full py-3 font-bold text-white text-sm transition-opacity"
          style={{ background: loading ? "#aaa" : "#8BC34A" }}
        >
          {loading ? "种子正在破土…" : "注册 🌱"}
        </button>
      </form>

      <p className="text-center text-sm mt-5" style={{ color: "#999" }}>
        已有账号？
        <Link href="/login" className="font-medium ml-1" style={{ color: "#8BC34A" }}>
          回到登录
        </Link>
      </p>
    </div>
  )
}
