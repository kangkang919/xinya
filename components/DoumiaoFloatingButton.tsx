"use client"

import { useRouter } from "next/navigation"

/**
 * 豆苗学习助手悬浮头像按钮
 * 带呼吸浮动动画 + 绿点脉冲效果，可在各主页面复用
 */
export function DoumiaoFloatingButton() {
  const router = useRouter()

  return (
    <div
      className="fixed z-40 doumiao-float"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', right: '1rem' }}
    >
      <button
        onClick={() => router.push('/assistant')}
        className="rounded-full shadow-lg transition-transform active:scale-95"
        style={{
          width: '56px',
          height: '56px',
          padding: 0,
          border: '2px solid #fff',
          background: 'transparent',
          overflow: 'hidden',
        }}
        aria-label="打开豆苗学习助手"
      >
        <img
          src="/assistant/doumiao-avatar.png"
          alt="豆苗"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 20%' }}
        />
      </button>
      {/* 在线小绿点 + 脉冲扩散 */}
      <span
        className="absolute rounded-full doumiao-pulse"
        style={{
          top: '-2px',
          right: '-2px',
          width: '12px',
          height: '12px',
          background: '#4CAF50',
          border: '2px solid #fff',
        }}
      />
    </div>
  )
}
