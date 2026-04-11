import Link from 'next/link'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-apple-bg">
      {/* Top nav */}
      <div className="bg-white border-b border-apple-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link href="/" className="text-apple-secondary hover:text-apple-primary text-sm transition-colors">
            ← 讨论室
          </Link>
          <span className="text-apple-secondary">|</span>
          <Link href="/settings/agents" className="text-apple-primary font-semibold text-sm">
            Agent 配置
          </Link>
          <span className="text-apple-secondary">|</span>
          <span className="text-apple-secondary/40 text-sm">Provider 配置（请在 ⚙ 抽屉内访问）</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
