"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const userId = params.get("userId") || ""
  const email = params.get("email") || ""

  const [codes, setCodes] = useState(["","","","","",""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendSec, setResendSec] = useState(60)
  const inputs = useRef<(HTMLInputElement|null)[]>([])

  useEffect(() => {
    const t = setInterval(() => setResendSec(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  function handleChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const next = [...codes]
    next[i] = val.slice(-1)
    setCodes(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(c => c) && !loading) submitCode(next.join(""))
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !codes[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  async function submitCode(code: string) {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || "验证失败"); setCodes(["","","","","",""]); inputs.current[0]?.focus() }
      else router.push("/onboard")
    } catch {
      setError("网络出了点问题 🌧️")
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (resendSec > 0) return
    setResendSec(60)
    setError("")
    // 重新注册即可重发
    await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "_resend_" }),
    })
  }

  return (
    <div className="card-sketch bg-white p-8 shadow-md" style={{ border: "2px solid #e0e0e0" }}>
      <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "#333" }}>验证你的邮箱</h2>
      <p className="text-sm text-center mb-6" style={{ color: "#999" }}>
        验证码已发送至<br/>
        <span className="font-medium" style={{ color: "#8BC34A" }}>{email}</span>
      </p>

      <div className="flex gap-2 justify-center mb-4">
        {codes.map((c, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            className="w-11 h-14 text-center text-xl font-bold rounded-lg outline-none"
            style={{ border: `2px solid ${c ? "#8BC34A" : "#ccc"}`, background: "#fafaf5" }}
            maxLength={1} value={c}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            inputMode="numeric"
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-500 text-center mb-3">{error}</p>}
      {loading && <p className="text-sm text-center mb-3" style={{ color: "#8BC34A" }}>验证中…</p>}

      <p className="text-center text-sm" style={{ color: "#999" }}>
        没收到？
        <button onClick={resend} disabled={resendSec > 0}
          className="ml-1 font-medium" style={{ color: resendSec > 0 ? "#aaa" : "#8BC34A" }}>
          {resendSec > 0 ? `${resendSec}秒后重发` : "重新发送"}
        </button>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyForm /></Suspense>
}
