"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError("两次密码不一致")
    if (password.length < 6) return setError("密码至少需要6位")
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!data.ok) return setError(data.error || "重置失败")
      setDone(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("网络出了点问题 🌧️")
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="card-sketch bg-white p-8 shadow-md text-center" style={{ border: "2px solid #e0e0e0" }}>
      <p className="text-red-500 mb-4">链接无效，请重新申请</p>
      <Link href="/forgot-password" style={{ color: "#8BC34A" }}>重新获取</Link>
    </div>
  )

  if (done) return (
    <div className="card-sketch bg-white p-8 shadow-md text-center" style={{ border: "2px solid #e0e0e0" }}>
      <div className="text-5xl mb-4">🌱</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#333" }}>密码已重置</h2>
      <p className="text-sm" style={{ color: "#999" }}>正在跳转到登录页…</p>
    </div>
  )

  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "#333" }}>设置新密码</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="input-sketch w-full px-4 py-3 text-sm outline-none"
          style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
          type="password" placeholder="新密码（至少6位）" value={password}
          onChange={e => setPassword(e.target.value)} required
        />
        <input
          className="input-sketch w-full px-4 py-3 text-sm outline-none"
          style={{ border: "1.5px solid #ccc", background: "#fafaf5" }}
          type="password" placeholder="再次确认" value={confirm}
          onChange={e => setConfirm(e.target.value)} required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading}
          className="btn-sketch w-full py-3 font-bold text-white text-sm"
          style={{ background: loading ? "#aaa" : "#8BC34A" }}>
          {loading ? "保存中…" : "确认重置"}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>
}
