"use client"
import { useState } from "react"
import Link from "next/link"
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!data.ok) {
        if (data.data?.needVerify) { window.location.href = "/verify-email?userId=" + data.data.userId; return }
        return setError(data.error || "登录失败")
      }
      window.location.href = data.data?.onboardDone ? "/" : "/onboard"
    } catch(err: any) { setError("错误: " + err.message) } finally { setLoading(false) }
  }
  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "#333" }}>回到你的花园</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-sm mb-1 block" style={{ color: "#795548" }}>邮箱</label><input className="w-full px-4 py-3 text-sm outline-none" style={{ border: "1.5px solid #ccc", background: "#fafaf5" }} type="email" placeholder="输入你的邮箱" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div><label className="text-sm mb-1 block" style={{ color: "#795548" }}>密码</label><input className="w-full px-4 py-3 text-sm outline-none" style={{ border: "1.5px solid #ccc", background: "#fafaf5" }} type="password" placeholder="输入密码" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <div className="text-right"><Link href="/forgot-password" className="text-xs" style={{ color: "#8BC34A" }}>忘记密码？</Link></div>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 font-bold text-white text-sm rounded-lg" style={{ background: loading ? "#aaa" : "#8BC34A" }}>{loading ? "花园门正在开启…" : "登录 🌿"}</button>
      </form>
      <p className="text-center text-sm mt-5" style={{ color: "#999" }}>还没有账号？<Link href="/register" className="font-medium ml-1" style={{ color: "#8BC34A" }}>播下第一颗种子</Link></p>
    </div>
  )
}
