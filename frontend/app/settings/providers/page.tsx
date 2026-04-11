'use client'

import { useEffect, useState } from 'react'

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
  lastTestResult: { success: boolean; version?: string; error?: string } | null
}

// ── Provider Form ─────────────────────────────────────────────────────────────

function ProviderForm({
  provider,
  onSave,
  onTest,
  saving,
  testing,
}: {
  provider: ProviderConfig
  onSave: (updated: ProviderConfig) => void
  onTest: () => void
  saving: boolean
  testing: boolean
}) {
  const [form, setForm] = useState<ProviderConfig>(provider)

  useEffect(() => { setForm(provider) }, [provider])

  function field<K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const lastResult = form.lastTestResult
  const lastTestedLabel = form.lastTested
    ? `${lastResult?.success ? '✓' : '✗'} ${lastResult?.success ? lastResult.version : lastResult?.error} — ${timeAgo(form.lastTested)}`
    : '从未测试'

  return (
    <div className="flex flex-col gap-5">
      {/* CLI 路径 */}
      <div>
        <label className="block text-xs font-medium text-apple-secondary mb-1.5">CLI 路径</label>
        <input
          type="text"
          value={form.cliPath}
          onChange={e => field('cliPath', e.target.value)}
          placeholder="~/.opencode/bin/opencode"
          className="w-full border border-apple-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary font-mono"
        />
      </div>

      {/* 默认模型 */}
      <div>
        <label className="block text-xs font-medium text-apple-secondary mb-1.5">
          默认模型 {form.name === 'opencode' ? '(provider/model 格式)' : ''}
        </label>
        <input
          type="text"
          value={form.defaultModel}
          onChange={e => field('defaultModel', e.target.value)}
          placeholder={form.name === 'opencode' ? 'google/gemini-2-0-flash' : 'claude-sonnet-4-6'}
          className="w-full border border-apple-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary font-mono"
        />
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-apple-secondary mb-1.5">API Key</label>
        <input
          type="password"
          value={form.apiKey}
          onChange={e => field('apiKey', e.target.value)}
          placeholder={form.apiKey ? '••••••••••••••••' : 'sk-...'}
          className="w-full border border-apple-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary font-mono"
        />
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-xs font-medium text-apple-secondary mb-1.5">Base URL</label>
        <input
          type="text"
          value={form.baseUrl}
          onChange={e => field('baseUrl', e.target.value)}
          placeholder="https://api.anthropic.com（留空使用默认）"
          className="w-full border border-apple-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary font-mono"
        />
      </div>

      {/* 超时时间 */}
      <div>
        <label className="block text-xs font-medium text-apple-secondary mb-1.5">超时时间（秒）</label>
        <input
          type="number"
          value={form.timeout}
          onChange={e => field('timeout', Number(e.target.value))}
          min={10}
          max={300}
          className="w-full border border-apple-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary"
        />
      </div>

      {/* 命令预览 */}
      <div className="border-t border-apple-border pt-4">
        <div className="text-xs font-medium text-apple-secondary mb-2">最终执行命令</div>
        <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-[13px] text-green-400 whitespace-pre-wrap break-all">
          {form.name === 'opencode'
            ? `~/.opencode/bin/opencode run ${form.defaultModel ? `-m ${form.defaultModel}` : ''} ${form.thinking ? '--thinking' : ''} --format json -- "<prompt>"`
            : `claude -p "<prompt>" --verbose --output-format=stream-json --include-partial-messages`}
        </div>
        {form.name === 'opencode' && (
          <p className="text-[11px] text-apple-secondary mt-1">模型: {form.defaultModel || '(未设置，将使用 opencode 默认)'}</p>
        )}
      </div>

      {/* 测试连接 */}
      <div className="border-t border-apple-border pt-4">
        <button
          onClick={onTest}
          disabled={testing}
          className="px-5 py-2 text-sm bg-apple-primary/10 text-apple-primary rounded-lg hover:bg-apple-primary/20 disabled:opacity-50 transition-colors font-medium"
        >
          {testing ? '测试中…' : '测试连接'}
        </button>
        {lastResult && (
          <p className={`mt-2 text-xs ${lastResult.success ? 'text-green-600' : 'text-red-500'}`}>
            {lastResult.success ? '✓' : '✗'} {lastResult.success ? '连接成功' : '连接失败'}
            {lastResult.version && ` — ${lastResult.version}`}
            {lastResult.error && ` — ${lastResult.error}`}
          </p>
        )}
        <p className="mt-1 text-xs text-apple-secondary">
          上次测试：{lastTestedLabel}
        </p>
      </div>

      {/* 保存 */}
      <div className="flex justify-end">
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-5 py-2 text-sm bg-apple-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
        >
          {saving ? '保存中…' : '保存配置'}
        </button>
      </div>
    </div>
  )
}

// ── Provider Card ─────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  isSelected,
  onSelect,
}: {
  provider: ProviderConfig
  isSelected: boolean
  onSelect: () => void
}) {
  const dotColors: Record<string, string> = {
    'opencode': 'bg-purple-500',
    'claude-code': 'bg-blue-500',
  }
  const dot = dotColors[provider.name] || 'bg-gray-400'

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
        isSelected
          ? 'bg-apple-primary/10 border-2 border-apple-primary'
          : 'bg-apple-bg border-2 border-transparent hover:border-apple-border'
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-apple-text truncate">{provider.label}</p>
        <p className="text-xs text-apple-secondary font-mono truncate">{provider.name}</p>
      </div>
      {isSelected && (
        <span className="ml-auto text-apple-primary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </button>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(ts).toLocaleDateString('zh')
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  function load() {
    setLoading(true)
    fetch(`${API}/api/providers`)
      .then(r => r.json())
      .then((data: Record<string, ProviderConfig>) => {
        setProviders(data)
        if (!selected && Object.keys(data).length > 0) setSelected(Object.keys(data)[0])
        setLoading(false)
      })
      .catch(e => { console.error(e); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function handleSave(updated: ProviderConfig) {
    setSaving(true)
    fetch(`${API}/api/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).then(async r => {
      if (r.ok) {
        const data = await r.json()
        setProviders(prev => ({ ...prev, [data.name]: data }))
      }
      setSaving(false)
    }).catch(() => setSaving(false))
  }

  function handleTest() {
    if (!selected) return
    setTesting(true)
    fetch(`${API}/api/providers/${selected}/test`, { method: 'POST' })
      .then(r => r.json())
      .then((result: { success: boolean; version?: string; error?: string }) => {
        setProviders(prev => ({
          ...prev,
          [selected]: { ...prev[selected], lastTested: Date.now(), lastTestResult: result },
        }))
        setTesting(false)
      })
      .catch(() => setTesting(false))
  }

  const current = selected ? providers[selected] : null

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-apple-text mb-1">Provider 配置</h1>
        <p className="text-sm text-apple-secondary">管理 AI CLI Provider 的连接参数和测试状态</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-apple-secondary text-sm">加载中…</div>
      ) : (
        <div className="flex gap-6">
          {/* Left: provider list */}
          <div className="w-[220px] flex-shrink-0 flex flex-col gap-2">
            {Object.values(providers).map(p => (
              <ProviderCard
                key={p.name}
                provider={p}
                isSelected={selected === p.name}
                onSelect={() => setSelected(p.name)}
              />
            ))}
          </div>

          {/* Right: config form */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-apple-border p-6">
            {current ? (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-base font-semibold text-apple-text">{current.label}</h2>
                  <span className="text-xs font-mono text-apple-secondary bg-apple-bg px-2 py-0.5 rounded-full">
                    {current.name}
                  </span>
                </div>
                <ProviderForm
                  provider={current}
                  onSave={handleSave}
                  onTest={handleTest}
                  saving={saving}
                  testing={testing}
                />
              </>
            ) : (
              <p className="text-sm text-apple-secondary text-center py-8">选择一个 Provider 查看配置</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
