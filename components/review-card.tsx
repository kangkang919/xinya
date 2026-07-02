"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ReviewCardProps {
  card: {
    entryId: string
    entryTitle: string
    conceptName: string
    keyPoints: string
    questionId: string
    question: string
    type: string
    options: string[]
    answer: number[]
    explanation: string
  }
  onClose: () => void
  onSkip: () => void
}

export default function ReviewCard({ card, onClose, onSkip }: ReviewCardProps) {
  const router = useRouter()
  const [flipped, setFlipped] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (selectedAnswer.length === 0 || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/review/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: card.questionId, answer: selectedAnswer }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ correct: data.data.correct, explanation: data.data.explanation })
        setSubmitted(true)
      }
    } catch (_) {}
    setLoading(false)
  }

  function handleViewOriginal() {
    router.push(`/entry/${card.entryId}/view`)
    onClose()
  }

  function toggleOption(idx: number) {
    if (submitted) return
    if (card.type === 'single' || card.type === 'truefalse') {
      setSelectedAnswer([idx])
    } else {
      setSelectedAnswer(prev =>
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      )
    }
  }

  const isDark = document.documentElement.classList?.contains('dark') ||
    localStorage.getItem('xinya-theme') === 'night'
  const cardBg = isDark ? '#2A2A2A' : '#fff'
  const cardBorder = isDark ? '#444' : '#e0e0e0'
  const titleColor = isDark ? '#E0E0E0' : '#333'
  const subColor = isDark ? '#999' : '#666'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: cardBg, border: `1px solid ${cardBorder}`, maxHeight: '80vh', overflow: 'auto' }}
      >
        {/* 顶部关闭按钮 */}
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: subColor, background: isDark ? '#333' : '#f0f0f0' }}
          >
            
          </button>
        </div>

        <div className="px-6 pb-6">
          {!flipped ? (
            // 正面：概念名
            <div className="text-center py-8">
              <p className="text-xs mb-4" style={{ color: subColor }}>今日拾遗</p>
              <h2 className="text-2xl font-bold mb-6" style={{ color: titleColor }}>
                {card.conceptName}
              </h2>
              <button
                onClick={() => setFlipped(true)}
                className="px-6 py-2 rounded-full text-sm font-medium text-white"
                style={{ background: '#8BC34A' }}
              >
                查看要点
              </button>
            </div>
          ) : !answering ? (
            // 背面：要点 + 开始答题
            <div className="text-center py-4">
              <h3 className="text-lg font-bold mb-4" style={{ color: titleColor }}>
                {card.conceptName}
              </h3>
              {card.keyPoints ? (
                <p className="text-sm leading-relaxed mb-6" style={{ color: subColor }}>
                  {card.keyPoints}
                </p>
              ) : (
                <p className="text-sm mb-6" style={{ color: subColor }}>
                  温故而知新，让我们一起回顾这片心得
                </p>
              )}
              <button
                onClick={() => setAnswering(true)}
                className="px-6 py-2 rounded-full text-sm font-medium text-white"
                style={{ background: '#8BC34A' }}
              >
                开始答题
              </button>
            </div>
          ) : !submitted ? (
            // 答题区
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: titleColor }}>
                {card.question}
              </h3>
              <div className="space-y-2 mb-6">
                {card.options.map((opt, idx) => {
                  const isSelected = selectedAnswer.includes(idx)
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleOption(idx)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition"
                      style={{
                        background: isSelected ? 'rgba(139,195,74,0.15)' : (isDark ? '#333' : '#f5f5f5'),
                        border: `1.5px solid ${isSelected ? '#8BC34A' : cardBorder}`,
                        color: titleColor,
                      }}
                    >
                      <span className="font-medium mr-2" style={{ color: '#8BC34A' }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer.length === 0 || loading}
                className="w-full py-3 rounded-xl text-sm font-medium text-white"
                style={{ background: selectedAnswer.length === 0 || loading ? '#aaa' : '#8BC34A' }}
              >
                {loading ? '提交中…' : '提交答案'}
              </button>
            </div>
          ) : (
            // 反馈区
            <div className="text-center py-4">
              <div className="text-5xl mb-4">{result?.correct ? '🌱' : '💪'}</div>
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: result?.correct ? '#8BC34A' : '#e57373' }}
              >
                {result?.correct ? '答对了！' : '再想想~'}
              </h3>
              {result?.explanation && (
                <p className="text-sm mb-6 px-4" style={{ color: subColor }}>
                  {result.explanation}
                </p>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleViewOriginal}
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(139,195,74,0.12)', color: '#8BC34A' }}
                >
                  查看原文
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm"
                  style={{ color: subColor, border: `1px solid ${cardBorder}` }}
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 跳过按钮（仅在未提交时显示） */}
      {!submitted && (
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ color: '#999', background: 'rgba(255,255,255,0.1)' }}
        >
          
        </button>
      )}
    </div>
  )
}
