'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle2, X, ChevronLeft, Loader2 } from 'lucide-react'

const API = 'http://localhost:7001'

interface ProviderConfig {
  name: string
  label: string
  cliPath: string
  defaultModel: string
  apiKey: string
  baseUrl: string
  timeout: number
  thinking: boolean
  lastTested: number | null
  lastTestResult: { success: boolean; cli?: string; output?: string; error?: string } | null
}

const PROVIDER_COLORS: Record<string, string> = {
  'claude-code': 'var(--accent)',
  'opencode': '#7C3AED',
}

function ProviderCard({
  provider,
  isSelected,
  onSelect,
}: {
  provider: ProviderConfig
  isSelected: boolean
  onSelect: () => void
}) {
  const isOk = provider.lastTestResult?.success
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-4 rounded-xl transition-all flex items-center gap-3 ${
        isSelected
          ? 'bg-surface border-2 border-accent shadow-sm'
          : 'bg-surface border-2 border-transparent hover:border-line'
      }`}
    >
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PROVIDER_COLORS[provider.name] || '#888' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink truncate">{provider.label}</p>
        <p className="text-[11px] text-ink-soft font-mono truncate">{provider.name}</p>
      </div>
      {provider.lastTestResult && (
        <span className={`flex-shrink-0 ${isOk ? 'text-emerald-500' : 'text-red-500'}`}>
          {isOk ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </span>
      )}
    </button>
  )
}

function ProviderDetail({ provider, onTest }: { provider: ProviderConfig; onTest: () => void }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ProviderConfig['lastTestResult']>(provider.lastTestResult)

  useEffect(() => {
    setTestResult(provider.lastTestResult)
  }, [provider])

  function handleTest() {
    setTesting(true)
    fetch(`${API}/api/providers/${provider.name}/test`, { method: 'POST' })
      .then(r => r.json())
      .then((result: ProviderConfig['lastTestResult']) => {
        setTestResult(result)
        setTesting(false)
      })
      .catch(err => {
        setTestResult({ success: false, error: err.message })
        setTesting(false)
      })
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[16px] font-bold shadow-sm" style={{ backgroundColor: PROVIDER_COLORS[provider.name] || '#888' }}>
          {provider.label.slice(0, 1)}
        </span>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{provider.label}</h2>
          <p className="text-[12px] text-ink-soft font-mono">{provider.name}</p>
        </div>
      </div>

      {/* CLI Path */}
      <div>
        <label className="block text-[12px] font-bold text-ink-soft uppercase tracking-wider mb-2">CLI 路径</label>
        <p className="text-[13px] text-ink font-mono bg-bg border border-line rounded-lg px-3 py-2.5">
          {provider.cliPath}
        </p>
      </div>

      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={testing}
        className="w-full py-3.5 text-[14px] bg-ink text-bg rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
      >
        {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> 测试中…</> : <><Play className="w-4 h-4 fill-current" /> {testResult ? '重新测试' : '测试连接'}</>}
      </button>

      {/* Test Result */}
      {testResult && (
        <div className="border border-line rounded-xl overflow-hidden">
          <div className="bg-[#1e1e1e] px-4 py-2 font-mono text-[12px] text-gray-400 border-b border-[#333] flex items-center gap-2">
            <span className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {testResult.success ? <CheckCircle2 className="w-3 h-3 inline" /> : <X className="w-3 h-3 inline" />}
            </span>
            命令
          </div>
          {testResult.cli && (
            <div className="bg-[#1e1e1e] px-4 py-3 font-mono text-[13px] text-emerald-400 whitespace-pre-wrap break-all">
              {testResult.cli}
            </div>
          )}
          {testResult.error && (
            <div className="bg-[#1e1e1e] px-4 py-3 font-mono text-[13px] text-red-400 whitespace-pre-wrap break-all">
              {testResult.error}
            </div>
          )}
          {testResult.output && (
            <div className="bg-[#1e1e1e] px-4 py-3 font-mono text-[13px] text-emerald-300/90 whitespace-pre-wrap break-all border-t border-[#333] max-h-60 overflow-y-auto custom-scrollbar">
              {testResult.output}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`${API}/api/providers`)
      .then(r => r.json())
      .then((data: Record<string, ProviderConfig>) => {
        setProviders(data)
        if (!selected && Object.keys(data).length > 0) setSelected(Object.keys(data)[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const current = selected ? providers[selected] : null

  return (
    <div className="max-w-[900px] mx-auto py-8 px-4 md:px-8">
      {/* Back + Header */}
      <div className="mb-8 flex items-center gap-4">
        <button onClick={() => router.push('/')} className="p-2 rounded-full bg-surface border border-line text-ink-soft hover:text-ink transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ink">Provider 配置</h1>
          <p className="text-[14px] text-ink-soft mt-1">测试并管理 AI CLI Provider 连接状态</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <span className="text-ink-soft animate-pulse font-medium text-[14px]">加载中…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          {/* Provider list */}
          <div className="flex flex-col gap-2">
            {Object.values(providers).map(p => (
              <ProviderCard
                key={p.name}
                provider={p}
                isSelected={selected === p.name}
                onSelect={() => setSelected(p.name)}
              />
            ))}
          </div>

          {/* Provider detail */}
          <div>
            {current ? <ProviderDetail key={current.name} provider={current} onTest={() => {}} /> : (
              <div className="bg-surface rounded-2xl border border-line p-12 flex items-center justify-center">
                <p className="text-ink-soft text-[14px]">从左侧选择一个 Provider</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
