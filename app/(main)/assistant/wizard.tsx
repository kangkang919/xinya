// 豆苗：首次使用 3 步设置向导（需求文档 §4.3）
// 步骤：语气风格 → 指导方式 → 角色称呼(+自由描述) → 完成页
// 可跳过（使用默认值）；预设为骨架最高约束，自由描述仅做局部润色
"use client"

import { useState } from "react"
import { DIMS, Avatar } from "./dims"

const FREE_EXAMPLE = "你是一个温柔的女老师，喜欢用提问引导我思考，偶尔会活泼地开个玩笑"

interface Props {
  onFinish: (p: {
    tone: string
    teach: string
    call: string
    freeDesc: string
  }) => Promise<void> | void
}

export default function Wizard({ onFinish }: Props) {
  const [step, setStep] = useState(0) // 0=tone 1=teach 2=call 3=完成
  const [tone, setTone] = useState("温暖鼓励")
  const [teach, setTeach] = useState("启发引导")
  const [call, setCall] = useState("我 / 你")
  const [free, setFree] = useState("")
  const [saving, setSaving] = useState(false)

  const keys = ["tone", "teach", "call"] as const
  const key = keys[step]

  const save = async (useDefault: boolean) => {
    if (saving) return
    setSaving(true)
    const data = useDefault
      ? { tone: "温暖鼓励", teach: "启发引导", call: "我 / 你", freeDesc: "" }
      : { tone, teach, call, freeDesc: free.trim() }
    try {
      await onFinish(data)
    } finally {
      setSaving(false)
    }
  }

  // ---- 完成页 ----
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
        <div style={{ width: 104, height: 104, borderRadius: "50%", overflow: "hidden", border: "3px solid var(--color-primary-light)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assistant/doumiao-avatar.png" alt="豆苗" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: "var(--color-brown)" }}>
          设置完成！豆苗认识你啦～
        </h3>
        <div className="text-xs leading-relaxed" style={{ color: "#666" }}>
          语气：{tone} · 指导：{teach} · 称呼：{call}
          <br />
          {free.trim() ? `自由润色：「${free.trim()}」` : "（未填写自由描述）"}
          <br />
          可在「豆苗设置」中随时调整 · 对话中不能修改
        </div>
        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            className="btn-primary px-8 py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={saving}
            onClick={() => save(false)}
          >
            开始和豆苗聊天 ➤
          </button>
          <button
            className="text-xs underline"
            style={{ color: "#999" }}
            onClick={() => {
              setStep(0)
              setTone("温暖鼓励")
              setTeach("启发引导")
              setCall("我 / 你")
              setFree("")
            }}
          >
            重新设置
          </button>
        </div>
      </div>
    )
  }

  const dim = DIMS[key]
  const sel = key === "tone" ? tone : key === "teach" ? teach : call
  const isLast = step === 2

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 头部 */}
      <div className="text-center pt-5 pb-1 px-6">
        <div style={{ width: 56, height: 56, margin: "0 auto 6px" }}>
          <Avatar size={56} />
        </div>
        <h2 className="text-base font-bold" style={{ color: "var(--color-brown)" }}>
          你好呀，我是豆苗 🌱
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#999" }}>
          以后由我陪你回顾心得、分析知识。先花 30 秒认识一下？
        </p>
        {/* 步骤指示 */}
        <div className="flex justify-center gap-2 pt-2.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full flex items-center justify-center text-[11px] font-medium transition-colors"
              style={{
                width: 24,
                height: 24,
                background: i <= step ? "var(--color-primary)" : "#fff",
                border: `2px solid ${i <= step ? "var(--color-primary)" : "#e0e0e0"}`,
                color: i <= step ? "#fff" : "#bbb",
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 选项区 */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="mb-2.5">
          <div className="text-[15px] font-semibold">
            第 {step + 1} 步 · {dim.title}
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: "#999" }}>
            {dim.desc}
          </div>
        </div>

        {dim.options.map(o => (
          <button
            key={o.t}
            className="w-full flex items-center gap-2.5 rounded-2xl border bg-white px-3 py-2 mb-2 text-left transition-all"
            style={{
              borderColor: sel === o.t ? "var(--color-primary)" : "#eee",
              background: sel === o.t ? "var(--color-primary-light)" : undefined,
              boxShadow: sel === o.t ? "0 0 0 1px var(--color-primary)" : undefined,
            }}
            onClick={() => (key === "tone" ? setTone(o.t) : key === "teach" ? setTeach(o.t) : setCall(o.t))}
          >
            <span className="text-xl w-8 text-center">{o.emoji}</span>
            <span>
              <span className="block text-[13.5px] font-semibold">{o.t}</span>
              <span className="block text-[11px] mt-0.5" style={{ color: "#999" }}>
                {o.d}
              </span>
            </span>
          </button>
        ))}

        {/* 自由描述（仅最后一步） */}
        {isLast && (
          <div className="mt-1.5 mb-3">
            <label className="text-[13.5px] font-semibold block mb-1.5">
              自由描述（可选）
              <span className="font-normal text-[10.5px] ml-1" style={{ color: "#999" }}>
                · 仅做局部润色，不覆盖上面选项
              </span>
            </label>
            <textarea
              className="w-full rounded-xl border px-3 py-2 text-[13px] resize-none outline-none"
              style={{ borderColor: "#eee", minHeight: 58, background: "#fff" }}
              placeholder="给豆苗加点独特的语气细节……"
              value={free}
              onChange={e => setFree(e.target.value)}
            />
            <div
              className="text-[11px] rounded-lg px-2.5 py-1.5 mt-1 leading-relaxed"
              style={{ background: "#fff8e6", border: "1px dashed #e6c76a", color: "#8a6d1f" }}
            >
              💡 示例：{FREE_EXAMPLE}
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="px-5 pt-2.5 pb-4 border-t bg-white" style={{ borderColor: "#eee" }}>
        <div className="flex gap-2.5">
          {step > 0 ? (
            <button
              className="flex-1 rounded-xl border py-2 text-sm font-medium text-gray-600 bg-white"
              style={{ borderColor: "#eee" }}
              onClick={() => setStep(step - 1)}
            >
              上一步
            </button>
          ) : (
            <button
              className="flex-1 rounded-xl border py-2 text-sm text-gray-400"
              style={{ borderColor: "#eee" }}
              onClick={() => save(true)}
            >
              跳过设置
            </button>
          )}
          <button
            className="flex-1 rounded-xl py-2 text-sm font-semibold text-white"
            style={{ background: "var(--color-primary)" }}
            onClick={() => (isLast ? save(false) : setStep(step + 1))}
          >
            {isLast ? "完成设置" : "下一步"}
          </button>
        </div>
        {step === 0 && (
          <button
            className="block mx-auto mt-2 text-xs underline"
            style={{ color: "#999" }}
            onClick={() => save(true)}
          >
            跳过设置，使用默认值 →
          </button>
        )}
      </div>
    </div>
  )
}
