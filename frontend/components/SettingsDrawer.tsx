'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = 'http://localhost:7001'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProviderName = 'claude-code' | 'opencode'

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

interface AgentConfig {
  id: string
  name: string
  roleLabel: string
  role: 'HOST' | 'AGENT'
  provider: ProviderName
  providerOpts: { model?: string; thinking?: boolean; [key: string]: unknown }
  systemPrompt: string
  enabled: boolean
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  'claude-code': 'Claude Code',
  'opencode': 'OpenCode',
}

// ── Provider Tab ───────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(ts).toLocaleDateString('zh')
}

function ProviderTab({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

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
    <div className="flex gap-4 h-full">
      {/* Left: list */}
      <div className="w-[180px] flex-shrink-0 flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-apple-secondary">加载中…</p>
        ) : (
          Object.values(providers).map(p => (
            <button
              key={p.name}
              onClick={() => setSelected(p.name)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm ${
                selected === p.name
                  ? 'bg-apple-primary/10 border-2 border-apple-primary font-semibold text-apple-primary'
                  : 'bg-apple-bg border-2 border-transparent text-apple-text hover:border-apple-border'
              }`}
            >
              {p.label}
            </button>
          ))
        )}
      </div>

      {/* Right: form */}
      <div className="flex-1 overflow-y-auto pr-1">
        {current ? (
          <ProviderForm
            key={current.name}
            provider={current}
            onSave={handleSave}
            onTest={handleTest}
            saving={saving}
            testing={testing}
          />
        ) : (
          <p className="text-sm text-apple-secondary text-center py-8">选择一个 Provider</p>
        )}
      </div>
    </div>
  )
}

function ProviderForm({
  provider,
  onSave,
  onTest,
  saving,
  testing,
}: {
  provider: ProviderConfig
  onSave: (p: ProviderConfig) => void
  onTest: () => void
  saving: boolean
  testing: boolean
}) {
  const [form, setForm] = useState(provider)
  const [lastResult, setLastResult] = useState(provider.lastTestResult)

  useEffect(() => { setForm(provider); setLastResult(provider.lastTestResult) }, [provider])

  function field<K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-apple-secondary mb-1">CLI 路径</label>
          <input value={form.cliPath} onChange={e => field('cliPath', e.target.value)}
            className="w-full border border-apple-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-apple-secondary mb-1">默认模型</label>
          <input value={form.defaultModel} onChange={e => field('defaultModel', e.target.value)}
            placeholder={form.name === 'opencode' ? 'google/gemini-2-0-flash' : 'claude-sonnet-4-6'}
            className="w-full border border-apple-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-apple-secondary mb-1">API Key</label>
          <input type="password" value={form.apiKey} onChange={e => field('apiKey', e.target.value)}
            placeholder="sk-…"
            className="w-full border border-apple-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-apple-secondary mb-1">Base URL</label>
          <input value={form.baseUrl} onChange={e => field('baseUrl', e.target.value)}
            placeholder="https://api.anthropic.com"
            className="w-full border border-apple-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-apple-secondary mb-1">超时（秒）</label>
          <input type="number" value={form.timeout} onChange={e => field('timeout', Number(e.target.value))}
            min={10} max={300}
            className="w-full border border-apple-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
      </div>

      {/* 命令预览 */}
      <div className="bg-gray-900 rounded-lg px-3 py-2 font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
        {form.name === 'opencode'
          ? `opencode run ${form.defaultModel ? `-m ${form.defaultModel}` : ''} ${form.thinking ? '--thinking' : ''} --format json -- "<prompt>"`
          : `claude -p "<prompt>" --verbose --output-format=stream-json --include-partial-messages`}
      </div>

      {/* 测试 + 保存 */}
      <div className="flex items-center gap-3">
        <button onClick={onTest} disabled={testing}
          className="px-4 py-1.5 text-sm bg-apple-bg border border-apple-border rounded-lg hover:bg-apple-border/50 disabled:opacity-50 transition-colors">
          {testing ? '测试中…' : '测试连接'}
        </button>
        {lastResult && (
          <span className={`text-xs ${lastResult.success ? 'text-green-600' : 'text-red-500'}`}>
            {lastResult.success ? '✓' : '✗'} {lastResult.version || lastResult.error}
          </span>
        )}
        <button onClick={() => onSave(form)} disabled={saving}
          className="ml-auto px-5 py-1.5 text-sm bg-apple-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

// ── Agent Tab ─────────────────────────────────────────────────────────────────

function AgentTab() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  function load() {
    setLoading(true)
    fetch(`${API}/api/agents`)
      .then(r => r.json())
      .then((data: AgentConfig[]) => { setAgents(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleSave(updated: AgentConfig) {
    setSaving(true)
    fetch(`${API}/api/agents/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).then(async r => {
      if (r.ok) {
        const data = await r.json()
        setAgents(prev => prev.map(a => a.id === data.id ? data : a))
      }
      setSaving(false)
      setEditingId(null)
    }).catch(() => setSaving(false))
  }

  function handleDelete(id: string) {
    if (!confirm('确认删除该 Agent？')) return
    fetch(`${API}/api/agents/${id}`, { method: 'DELETE' })
      .then(r => { if (r.ok) { setAgents(prev => prev.filter(a => a.id !== id)); router.refresh() } })
      .catch(console.error)
  }

  function handleAdd(form: Omit<AgentConfig, 'id'>) {
    fetch(`${API}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'AGENT', providerOpts: { thinking: true }, enabled: true }),
    }).then(async r => {
      if (r.ok) { load(); setShowAdd(false) }
    }).catch(console.error)
  }

  if (loading) return <p className="text-sm text-apple-secondary text-center py-8">加载中…</p>

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
      {agents.map(agent => (
        <div key={agent.id} className="bg-white rounded-xl border border-apple-border p-4">
          {editingId === agent.id ? (
            <AgentEditForm
              agent={agent}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              saving={saving}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: agent.role === 'HOST' ? '#FF9500' : '#0071E3' }}>
                {agent.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-apple-text">{agent.name}</span>
                  {agent.role === 'HOST' && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">主持人</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    agent.provider === 'opencode' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>{agent.provider}</span>
                </div>
                <p className="text-xs text-apple-secondary truncate font-mono">{agent.roleLabel || '—'} · {agent.providerOpts.model || '默认模型'}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditingId(agent.id)}
                  className="text-xs text-apple-primary hover:underline">编辑</button>
                {agent.role !== 'HOST' && (
                  <button onClick={() => handleDelete(agent.id)}
                    className="text-xs text-red-500 hover:underline">删除</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showAdd ? (
        <AgentAddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full py-2.5 text-sm text-apple-primary border-2 border-dashed border-apple-border rounded-xl hover:border-apple-primary/50 transition-colors">
          + 新增 Agent
        </button>
      )}
    </div>
  )
}

function AgentEditForm({ agent, onSave, onCancel, saving }: {
  agent: AgentConfig
  onSave: (a: AgentConfig) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(agent)
  useEffect(() => { setForm(agent) }, [agent])

  function field<K extends keyof AgentConfig>(k: K, v: AgentConfig[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function opt(k: string, v: unknown) {
    setForm(f => ({ ...f, providerOpts: { ...f.providerOpts, [k]: v } }))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-apple-secondary mb-1">名称</label>
          <input value={form.name} onChange={e => field('name', e.target.value)}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div>
          <label className="block text-xs text-apple-secondary mb-1">角色标签</label>
          <input value={form.roleLabel} onChange={e => field('roleLabel', e.target.value)}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
        <div>
          <label className="block text-xs text-apple-secondary mb-1">Provider</label>
          <select value={form.provider} onChange={e => field('provider', e.target.value as ProviderName)}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-apple-primary/30">
            {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-apple-secondary mb-1">模型</label>
          <input value={form.providerOpts.model ?? ''} onChange={e => opt('model', e.target.value)}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-apple-primary/30" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-sm text-apple-secondary">取消</button>
        <button onClick={() => onSave(form)} disabled={saving}
          className="px-4 py-1 text-sm bg-apple-primary text-white rounded-lg disabled:opacity-50">
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

function AgentAddForm({ onAdd, onCancel }: { onAdd: (a: Omit<AgentConfig, 'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', roleLabel: '', provider: 'claude-code' as ProviderName, systemPrompt: '' })

  return (
    <div className="bg-white rounded-xl border border-apple-border p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-apple-text">新增 Agent</p>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-apple-secondary mb-1">名称</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30" placeholder="小明" />
        </div>
        <div>
          <label className="block text-xs text-apple-secondary mb-1">角色标签</label>
          <input value={form.roleLabel} onChange={e => setForm(f => ({ ...f, roleLabel: e.target.value }))}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-primary/30" placeholder="历史学家" />
        </div>
        <div>
          <label className="block text-xs text-apple-secondary mb-1">Provider</label>
          <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value as ProviderName }))}
            className="w-full border border-apple-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-apple-primary/30">
            {(Object.keys(PROVIDER_LABELS) as ProviderName[]).map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-sm text-apple-secondary">取消</button>
        <button onClick={() => { if (form.name) onAdd(form as Omit<AgentConfig, 'id'>) }}
          className="px-4 py-1 text-sm bg-apple-primary text-white rounded-lg">创建</button>
      </div>
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

export default function SettingsDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<'provider' | 'agent'>('provider')

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[680px] bg-apple-bg border-l border-apple-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-apple-border">
          <div className="flex gap-1 bg-apple-bg rounded-xl p-1">
            <button
              onClick={() => setTab('provider')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'provider' ? 'bg-white shadow-sm text-apple-primary' : 'text-apple-secondary hover:text-apple-text'
              }`}
            >
              Provider 配置
            </button>
            <button
              onClick={() => setTab('agent')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'agent' ? 'bg-white shadow-sm text-apple-primary' : 'text-apple-secondary hover:text-apple-text'
              }`}
            >
              Agent 配置
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-apple-secondary hover:text-apple-text hover:bg-apple-bg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {tab === 'provider' ? <ProviderTab onClose={onClose} /> : <AgentTab />}
        </div>
      </div>
    </>
  )
}
