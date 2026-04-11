'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Play, BrainCircuit } from 'lucide-react'

const API = 'http://localhost:7001'

interface AgentConfig {
  id: string
  name: string
  roleLabel: string
  role: 'HOST' | 'AGENT'
  provider: 'claude-code' | 'opencode'
  providerOpts: { thinking?: boolean; [key: string]: unknown }
  systemPrompt: string
  enabled: boolean
  tags: string[]
}

const PROVIDER_COLORS: Record<string, string> = {
  'claude-code': 'var(--accent)',
  'opencode': '#7C3AED',
}

const PROVIDER_LABELS: Record<string, string> = {
  'claude-code': 'Claude',
  'opencode': 'OpenCode',
}

const AGENT_COLORS = [
  '#D97706', '#059669', '#DC2626', '#4D7C0F', '#9F1239',
  '#2563EB', '#7C3AED', '#0284C7', '#0D9488', '#EA580C',
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

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API}/api/agents`)
      .then(r => r.json())
      .then((data: AgentConfig[]) => {
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

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

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
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="关闭"
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onClose() }}
      />
      <div
        role="dialog"
        aria-modal
        aria-label="发起新讨论"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="bg-bg rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-line custom-scrollbar pointer-events-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-accent" aria-hidden/> 发起新讨论
              </h1>
              <p className="text-ink-soft mt-1.5 text-[14px]">选择 Agent，开启多智能体协作讨论</p>
            </div>
            <button onClick={onClose} aria-label="关闭" className="p-2 text-ink-soft hover:text-ink hover:bg-surface rounded-full transition-colors">
              <X className="w-5 h-5" aria-hidden/>
            </button>
          </div>

        {/* Agent Grid */}
        {loadingAgents ? (
          <div className="text-center py-10 text-ink-soft text-sm">加载 Agent 配置...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-ink-soft text-sm mb-3">还没有可用的 Agent</p>
            <a href="/settings/agents" className="text-accent text-sm underline underline-offset-2">去配置 Agent →</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {agents.map(ag => {
              const isSelected = selected.has(ag.id)
              const color = agentColor(ag.name)
              return (
                <button
                  key={ag.id}
                  onClick={() => toggleAgent(ag.id)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-accent bg-accent/5 shadow-sm'
                      : 'border-line bg-surface hover:border-accent/40'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3 shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {ag.name.slice(0, 1)}
                  </div>
                  <p className="text-[14px] font-bold text-ink">{ag.name}</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">{ag.roleLabel}</p>
                  <span
                    className="mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                    style={{ backgroundColor: PROVIDER_COLORS[ag.provider] + '20', color: PROVIDER_COLORS[ag.provider] }}
                  >
                    {PROVIDER_LABELS[ag.provider]}
                  </span>
                  {ag.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {ag.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-muted border border-line text-ink-soft">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected */}
        <div className="mb-6 bg-surface p-4 rounded-2xl border border-line">
          <p className="text-[13px] font-bold text-ink mb-3 uppercase tracking-wide">
            已选 {selected.size} 位 Agent{selected.size < 1 ? '（至少选 1 位）' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedAgents.map(ag => {
              const color = agentColor(ag.name)
              return (
                <div
                  key={ag.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-bg border"
                  style={{ borderColor: color + '40' }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                    {ag.name.slice(0, 1)}
                  </div>
                  <span className="font-bold text-[13px]" style={{ color }}>{ag.name}</span>
                  <button type="button" onClick={() => toggleAgent(ag.id)} aria-label={`移除 ${ag.name}`} className="ml-1 opacity-50 hover:opacity-100 text-ink-soft"><X className="w-3.5 h-3.5" aria-hidden/></button>
                </div>
              )
            })}
            {selected.size === 0 && (
              <p className="text-[13px] text-ink-soft italic">点击上方卡片选择 Agent</p>
            )}
          </div>
        </div>

        {/* Topic */}
        <div className="mb-6">
          <label className="block text-[13px] font-bold text-ink mb-2 uppercase tracking-wide">讨论议题</label>
          <textarea
            className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-soft/60 resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            rows={3}
            placeholder="例如：折叠屏手机是否是未来趋势？"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-4 px-2">{error}</p>}

        <button
          type="button"
          className="w-full bg-ink text-bg font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:active:scale-100"
          onClick={handleSubmit}
          disabled={submitting || selected.size < 1 || !topic.trim()}
        >
          <Play className="w-4 h-4 fill-current" aria-hidden/>
          {submitting ? '创建中...' : '开始讨论'}
        </button>
      </div>
      </div>
    </>
  )
}
