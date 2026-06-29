import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "心芽 · 记录内心的每一次萌发",
  description: "私有记录 + 可控分享，属于你的内心花园",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontSize: "14px", borderRadius: "12px" },
            success: { iconTheme: { primary: "#8BC34A", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  )
}
