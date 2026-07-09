"use client"
import { useEffect, useState } from "react"

export function useTheme() {
  const [theme, setTheme] = useState("spring")

  useEffect(() => {
    const saved = localStorage.getItem("xinya-theme") || "spring"
    setTheme(saved)

    function sync() {
      const v = localStorage.getItem("xinya-theme") || "spring"
      setTheme(v)
    }
    window.addEventListener("xinya-theme-change", sync)
    return () => window.removeEventListener("xinya-theme-change", sync)
  }, [])

  const isDark = theme === "night"
  const cardBg = isDark ? "#2A2A2A" : "#fff"
  const cardBorder = isDark ? "#444" : "#eee"
  const titleColor = isDark ? "#E0E0E0" : "#333"
  const subColor = isDark ? "#999" : "#999"
  const dimColor = isDark ? "#666" : "#bbb"
  const inputBg = isDark ? "#333" : "#fafaf5"
  const inputBorder = isDark ? "#555" : "#e0e0e0"

  return { theme, isDark, cardBg, cardBorder, titleColor, subColor, dimColor, inputBg, inputBorder }
}
