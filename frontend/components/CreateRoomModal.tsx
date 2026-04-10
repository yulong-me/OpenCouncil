'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = 'http://localhost:7001'

interface AgentConfig {
  id: string
  name: string
  roleLabel: string
  role: 'HOST' | 'AGENT'
  provider: 'claude-code' | 'opencode'
  providerOpts: { model?: string; thinking?: boolean; [key: string]: unknown }
  systemPrompt: string
  enabled: boolean
}

const PROVIDER_COLORS: Record<string, string> = {
  'claude-code': '#0071E3',
  'opencode': '#5856D6',
}

const PROVIDER_LABELS: Record<string, string> = {
  'claude-code': 'Claude',
  'opencode': 'OpenCode',
}

// Pick a stable color per agent name
const AGENT_COLORS = [
  '#8B4513', '#2E8B57', '#B8860B', '#556B2F', '#8B0000',
  '#007AFF', '#5856D6', '#1E90FF', '#4169E1', '#FF9500',
  '#FF2D55', '#00C7BE', '#AF52DE', '#FF6482', '#64D2FF',
]
function agentColor(name: string): string {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length] ?? '#888'
}

export default function CreateRoomModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [topic, setTopic] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Fetch available agents from config API
  useEffect(() => {
    if (!isOpen) return
    fetch(`${API}/api/agents`)
      .then(r => r.json())
      .then((data: AgentConfig[]) => {
        // Only show non-HOST agents for selection
        setAgents(data.filter(a => a.role !== 'HOST' && a.enabled))
        setLoadingAgents(false)
      })
      .catch(() => setLoadingAgents(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setTopic('')
      setSelected(new Set())
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  function toggleAgent(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (!topic.trim() || selected.size < 1) return
    setSubmitting(true)
    setError('')
    const selectedAgents = agents.filter(a => selected.has(a.id))
    try {
      const res = await fetch(`${API}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          agents: selectedAgents.map(a => a.name),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError((err as { error?: string }).error ?? '创建失败')
        return
      }
      const room = await res.json()
      onClose()
      router.push(`/room/${room.id}`)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAgents = agents.filter(a => selected.has(a.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-apple-text">发起新讨论</h1>
            <p className="text-apple-secondary mt-1">选择 Agent，开启多智能体协作讨论</p>
          </div>
          <button onClick={onClose} className="text-apple-secondary hover:text-apple-text transition-colors text-sm">
            取消
          </button>
        </div>

        {/* Agent Grid */}
        {loadingAgents ? (
          <div className="text-center py-8 text-apple-secondary text-sm">加载 Agent 配置...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-apple-secondary text-sm mb-3">还没有可用的 Agent</p>
            <a href="/settings/agents" className="text-apple-primary text-sm underline">
              去配置 Agent →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {agents.map(ag => {
              const isSelected = selected.has(ag.id)
              const color = agentColor(ag.name)
              return (
                <button
                  key={ag.id}
                  onClick={() => toggleAgent(ag.id)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-apple-primary bg-apple-primary/5'
                      : 'border-apple-border bg-white hover:border-apple-primary/50'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold mb-2"
                    style={{ backgroundColor: color }}
                  >
                    {ag.name.slice(0, 1)}
                  </div>
                  <p className="text-sm font-semibold text-apple-text">{ag.name}</p>
                  <p className="text-xs text-apple-secondary">{ag.roleLabel}</p>
                  <span
                    className="mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: PROVIDER_COLORS[ag.provider] + '18', color: PROVIDER_COLORS[ag.provider] }}
                  >
                    {PROVIDER_LABELS[ag.provider]}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Selected */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-apple-text mb-2">
            已选 {selected.size} 位 Agent{selected.size < 1 ? '（至少选 1 位）' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedAgents.map(ag => {
              const color = agentColor(ag.name)
              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                  style={{ backgroundColor: color + '18', border: `1.5px solid ${color}` }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                    {ag.name.slice(0, 1)}
                  </div>
                  <span className="font-medium" style={{ color }}>{ag.name}</span>
                  <span className="text-xs opacity-60">{PROVIDER_LABELS[ag.provider]}</span>
                  <button onClick={() => toggleAgent(ag.id)} className="ml-0.5 opacity-50 hover:opacity-100">×</button>
                </div>
              )
            })}
            {selected.size === 0 && (
              <p className="text-sm text-apple-secondary">点击上方卡片选择 Agent</p>
            )}
          </div>
        </div>

        {/* Topic */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-apple-text mb-2">讨论议题</label>
          <textarea
            className="w-full bg-apple-bg rounded-xl px-4 py-3 text-apple-text placeholder-apple-secondary resize-none focus:outline-none focus:ring-2 focus:ring-apple-primary"
            rows={2}
            placeholder="例如：折叠屏手机是否是未来趋势？"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          className="w-full bg-apple-primary text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          onClick={handleSubmit}
          disabled={submitting || selected.size < 1 || !topic.trim()}
        >
          {submitting ? '创建中...' : '开始讨论'}
        </button>
      </div>
    </div>
  )
}
