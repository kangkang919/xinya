// 登录/注册页的公共布局：居中、绿色渐变背景
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f0f7e6 0%, #e8f5e9 50%, #fafaf5 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌱</div>
          <h1 className="text-2xl font-bold" style={{ color: "#8BC34A" }}>心芽</h1>
          <p className="text-sm mt-1" style={{ color: "#795548" }}>记录内心的每一次萌发</p>
        </div>
        {children}
      </div>
    </div>
  )
}
