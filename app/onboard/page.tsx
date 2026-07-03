"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const STEPS = [
  {
    emoji: "",
    title: "欢迎来到心芽",
    desc: "这里是只属于你的内心花园，记录每一次心灵的萌发。",
    hint: "每一颗小小的心得，都是一粒种子。",
  },
  {
    emoji: "📝",
    title: "随时记录心得",
    desc: "写下你的感悟、想法或日记。支持标签分类、心情标记，让每条记录都有归属。",
    hint: "不需要写完整，一句话也是一颗种子。",
  },
  {
    emoji: "🌳",
    title: "见证自己的成长",
    desc: "年轮页会展示你的记录热力图，写满20篇心得后，AI每日为你送上专属回顾。",
    hint: "坚持记录，看看自己长成了什么样。",
  },
]

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  async function finish() {
    setLoading(true)
    // 标记引导完成
    await fetch("/api/auth/onboard-done", { method: "POST" })
    router.push("/")
  }

  function skip() {
    finish()
  }

  const cur = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #f0f7e6 0%, #e8f5e9 50%, #fafaf5 100%)" }}>

      {/* 跳过按钮 */}
      <div className="w-full max-w-sm flex justify-end mb-4">
        <button onClick={skip} className="text-sm px-4 py-1.5 rounded-full"
          style={{ color: "#999", background: "rgba(0,0,0,0.05)" }}>
          跳过引导
        </button>
      </div>

      {/* 卡片 */}
      <div className="card-sketch bg-white w-full max-w-sm p-8 shadow-md text-center"
        style={{ border: "2px solid #e0e0e0" }}>

        <div className="text-6xl mb-6 animate-bounce-gentle inline-block">{cur.emoji}</div>
        <h2 className="text-xl font-bold mb-3" style={{ color: "#333" }}>{cur.title}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: "#666" }}>{cur.desc}</p>
        <p className="text-xs italic" style={{ color: "#8BC34A" }}>{cur.hint}</p>
      </div>

      {/* 进度点 */}
      <div className="flex gap-2 my-6">
        {STEPS.map((_, i) => (
          <div key={i} className="rounded-full transition-all"
            style={{
              width: i === step ? 20 : 8, height: 8,
              background: i === step ? "#8BC34A" : "#ccc"
            }} />
        ))}
      </div>

      {/* 按钮 */}
      <div className="w-full max-w-sm">
        {isLast ? (
          <button onClick={finish} disabled={loading}
            className="btn-sketch w-full py-3 font-bold text-white"
            style={{ background: loading ? "#aaa" : "#8BC34A" }}>
            {loading ? "进入花园中…" : "开始记录 🌿"}
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)}
            className="btn-sketch w-full py-3 font-bold text-white"
            style={{ background: "#8BC34A" }}>
            下一步
          </button>
        )}
      </div>
    </div>
  )
}
