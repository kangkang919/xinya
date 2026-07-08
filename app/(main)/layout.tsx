"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const THEME_BG: Record<string, string> = {
  spring: '#F4FBF0',
  summer: '#EEF6FE',
  autumn: '#FAFAF5',
  winter: '#F5F5F7',
  night: '#1E1E1E',
}

const THEME_NAV_BG: Record<string, string> = {
  spring: 'rgba(255,255,255,0.95)',
  summer: 'rgba(255,255,255,0.95)',
  autumn: 'rgba(255,255,255,0.95)',
  winter: 'rgba(255,255,255,0.95)',
  night: 'rgba(36,36,36,0.97)',
}

const THEME_NAV_BORDER: Record<string, string> = {
  spring: '#e0e0e0',
  summer: '#e0e0e0',
  autumn: '#e0e0e0',
  winter: '#e0e0e0',
  night: '#333',
}

const THEME_ACTIVE: Record<string, string> = {
  spring: '#8BC34A',
  summer: '#2196F3',
  autumn: '#FF8C42',
  winter: '#90A4AE',
  night: '#8BC34A',
}

const THEME_INACTIVE: Record<string, string> = {
  spring: '#aaa',
  summer: '#aaa',
  autumn: '#aaa',
  winter: '#aaa',
  night: '#666',
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const initTheme = typeof window !== 'undefined' ? (localStorage.getItem('xinya-theme') || 'autumn') : 'autumn'
  const [bg, setBg] = useState(THEME_BG[initTheme] || '#FAFAF5')
  const [themeKey, setThemeKey] = useState(initTheme)

  useEffect(() => {
    function applyFromStorage() {
      const t = localStorage.getItem('xinya-theme') || 'autumn'
      setThemeKey(t)
      setBg(THEME_BG[t] || '#FAFAF5')
    }
    applyFromStorage()
    window.addEventListener('xinya-theme-change', applyFromStorage)
    return () => window.removeEventListener('xinya-theme-change', applyFromStorage)
  }, [pathname])

  const isActive = (path: string) => pathname === path
  const activeColor = THEME_ACTIVE[themeKey] || '#8BC34A'
  const inactiveColor = THEME_INACTIVE[themeKey] || '#aaa'
  const navBg = THEME_NAV_BG[themeKey] || 'rgba(255,255,255,0.95)'
  const navBorder = THEME_NAV_BORDER[themeKey] || '#e0e0e0'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, transition: 'background 0.4s ease' }}>
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* 底部导航 */}
      <nav
        className="fixed bottom-0 left-0 right-0 pb-safe"
        style={{
          background: navBg,
          borderTop: `1px solid ${navBorder}`,
          backdropFilter: 'blur(12px)',
          transition: 'background 0.4s ease, border-color 0.4s ease',
        }}
      >
        <div className="flex items-end justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
          {/* 萌芽 */}
          <button
            className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all"
            style={{ color: isActive('/') ? activeColor : inactiveColor }}
            onClick={() => router.push('/')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth={isActive('/') ? '2.5' : '1.8'}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" />
              <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" />
              <path d="M5 21h14" />
            </svg>
            <span className="text-[10px] font-medium">萌芽</span>
          </button>

          {/* 枝叶 */}
          <button
            className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all"
            style={{ color: isActive('/leaf') ? activeColor : inactiveColor }}
            onClick={() => router.push('/leaf')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth={isActive('/leaf') ? '2.5' : '1.8'}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
            <span className="text-[10px] font-medium">枝叶</span>
          </button>

          {/* 新建按钮（中央大按钮） */}
          <button
            className="flex items-center justify-center rounded-full shadow-lg mb-3 transition-transform active:scale-95"
            style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #8BC34A, #AED581)' }}
            onClick={() => router.push('/entry/new')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>

          {/* 年轮 */}
          <button
            className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all"
            style={{ color: isActive('/ring') ? activeColor : inactiveColor }}
            onClick={() => router.push('/ring')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth={isActive('/ring') ? '2.5' : '1.8'}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <span className="text-[10px] font-medium">年轮</span>
          </button>

          {/* 根系 */}
          <button
            className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all"
            style={{ color: isActive('/root') ? activeColor : inactiveColor }}
            onClick={() => router.push('/root')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth={isActive('/root') ? '2.5' : '1.8'}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" />
              <path d="M12 22v-3" />
            </svg>
            <span className="text-[10px] font-medium">根系</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
