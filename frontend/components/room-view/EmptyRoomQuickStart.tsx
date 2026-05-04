'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, Code2, FileText, Loader2, MessagesSquare, Scale, Search } from 'lucide-react'
import { API_URL } from '../../lib/api'
import { AgentAvatar } from '../AgentAvatar'

export interface QuickStartTemplate {
  id: string
  title: string
  description: string
  topic: string
  teamId: string
  agentIds: string[]
  icon: 'litigation' | 'competitor' | 'paper' | 'roundtable' | 'software'
}

interface AgentSummary {
  id: string
  name?: string
  provider: string
}

interface ProviderReadiness {
  provider: string
  label: string
  status: 'ready' | 'cli_missing' | 'untested' | 'test_failed'
}

interface RecentRoomSummary {
  id: string
  topic: string
  agentCount: number
  createdAt?: number
  updatedAt?: number
  state?: string
  activityState?: string
  teamId?: string
  teamName?: string
  teamVersionNumber?: number
}

const READINESS_META = {
  ready: { label: '可用', dotClassName: 'bg-emerald-500', className: 'tone-success-pill border' },
  cli_missing: { label: 'CLI 未配置', dotClassName: 'bg-red-500', className: 'tone-danger-panel border' },
  untested: { label: '待测试', dotClassName: 'bg-amber-500', className: 'tone-warning-pill border' },
  test_failed: { label: '测试失败', dotClassName: 'bg-amber-600', className: 'tone-warning-pill border' },
  unknown: { label: '状态待检查', dotClassName: 'bg-ink-soft/45', className: 'border border-line bg-surface-muted text-ink-soft' },
} as const

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'litigation-strategy',
    title: '诉讼策略 Team',
    description: '事实、证据、主张与对方打法一次铺开。',
    topic: '',
    teamId: 'litigation-strategy',
    agentIds: [
      'litigation-case-mapper',
      'litigation-evidence-strategist',
      'litigation-opposing-counsel',
      'litigation-risk-controller',
    ],
    icon: 'litigation',
  },
  {
    id: 'competitor-analysis',
    title: '竞品分析 Team',
    description: '定位、用户、渠道、价格和护城河对比。',
    topic: '',
    teamId: 'competitor-analysis',
    agentIds: [
      'competitor-market-mapper',
      'competitor-positioning-strategist',
      'competitor-product-skeptic',
      'competitor-gtm-operator',
    ],
    icon: 'competitor',
  },
  {
    id: 'paper-revision',
    title: '论文返修 Team',
    description: '拆审稿意见，定修改清单和 rebuttal。',
    topic: '',
    teamId: 'paper-revision',
    agentIds: [
      'paper-review-diagnoser',
      'paper-methods-editor',
      'paper-rebuttal-writer',
      'paper-hostile-reviewer',
    ],
    icon: 'paper',
  },
  {
    id: 'roundtable-forum',
    title: '圆桌讨论 Team',
    description: '让不同思维模型正面交锋后收敛。',
    topic: '',
    teamId: 'roundtable-forum',
    agentIds: ['paul-graham', 'steve-jobs', 'zhang-yiming', 'munger', 'taleb'],
    icon: 'roundtable',
  },
  {
    id: 'software-development',
    title: '软件开发 Team',
    description: '双架构、实现、Reviewer 形成工程闭环。',
    topic: '',
    teamId: 'software-development',
    agentIds: ['dev-architect', 'dev-challenge-architect', 'dev-implementer', 'dev-reviewer'],
    icon: 'software',
  },
]

const TEMPLATE_ICONS = {
  litigation: Scale,
  competitor: Search,
  paper: FileText,
  roundtable: MessagesSquare,
  software: Code2,
}

interface EmptyRoomQuickStartProps {
  onStartBlank: () => void
  onStartTemplate: (template: QuickStartTemplate) => void
  onContinueRoom?: (roomId: string) => void
  recentRooms?: RecentRoomSummary[]
  creatingTemplateId?: string | null
  error?: string | null
}

type TemplateReadiness = typeof READINESS_META[keyof typeof READINESS_META]

function ReadinessDot({ readiness }: { readiness: TemplateReadiness }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${readiness.className}`}
      title={readiness.label}
      aria-label={readiness.label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${readiness.dotClassName}`} aria-hidden />
      {readiness.label}
    </span>
  )
}

export function EmptyRoomQuickStart({
  onStartBlank,
  onStartTemplate,
  onContinueRoom,
  recentRooms = [],
  creatingTemplateId,
  error,
}: EmptyRoomQuickStartProps) {
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [providerReadiness, setProviderReadiness] = useState<Record<string, ProviderReadiness>>({})
  const agentsById = useMemo(() => new Map(agents.map(agent => [agent.id, agent])), [agents])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`${API_URL}/api/agents`).then(response => response.json()).catch(() => []),
      fetch(`${API_URL}/api/providers/readiness`).then(response => response.json()).catch(() => ({})),
    ]).then(([nextAgents, readiness]) => {
      if (cancelled) return
      setAgents(nextAgents)
      setProviderReadiness(readiness)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function getTemplateReadiness(template: QuickStartTemplate) {
    const providerNames = [...new Set(template.agentIds.map(agentId => agentsById.get(agentId)?.provider).filter(Boolean))]
    const statuses = providerNames
      .map(provider => providerReadiness[provider as string])
      .filter((readiness): readiness is ProviderReadiness => Boolean(readiness))

    if (statuses.some(readiness => readiness.status === 'cli_missing')) {
      return READINESS_META.cli_missing
    }
    if (statuses.some(readiness => readiness.status === 'test_failed')) {
      return READINESS_META.test_failed
    }
    if (statuses.some(readiness => readiness.status === 'untested')) {
      return READINESS_META.untested
    }
    if (statuses.some(readiness => readiness.status === 'ready')) {
      return READINESS_META.ready
    }
    return READINESS_META.unknown
  }

  function getAgentName(agentId: string) {
    return agentsById.get(agentId)?.name ?? agentId
  }

  const recentTeamRooms = useMemo(
    () => recentRooms.filter(room => room.teamId && room.teamName).slice(0, 3),
    [recentRooms],
  )

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-8 md:px-10">
      <div className="w-full max-w-6xl">
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface shadow-sm">
            <BrainCircuit className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent">OpenCouncil</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-ink md:text-3xl">
              发起一个任务，交给 Team 协作。
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-ink-soft">
              先选择一支 Team，进入协作现场后再告诉它这次要做什么。
            </p>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-ink-soft">
              让 4-5 位专家 Agent 在同一间房里讨论、质疑、收敛，比单 Agent 多一层把关。
            </p>
          </div>
        </div>

        {recentTeamRooms.length > 0 && onContinueRoom && (
          <div className="mb-5">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft">继续上次的协作</p>
            <div className="grid gap-2 md:grid-cols-3">
              {recentTeamRooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onContinueRoom(room.id)}
                  className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left shadow-sm transition-colors hover:border-accent/45 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink">{room.topic}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                      {room.teamName}{room.teamVersionNumber ? ` · v${room.teamVersionNumber}` : ''} · {room.agentCount} 位成员
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {QUICK_START_TEMPLATES.map(template => {
            const Icon = TEMPLATE_ICONS[template.icon]
            const readiness = getTemplateReadiness(template)
            const creating = creatingTemplateId === template.id
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onStartTemplate(template)}
                disabled={Boolean(creatingTemplateId)}
                className="group flex min-h-40 flex-col justify-between rounded-lg border border-line bg-surface px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/45 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
                  ) : (
                    <ReadinessDot readiness={readiness} />
                  )}
                </span>
                <span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="block text-[15px] font-bold text-ink">{template.title}</span>
                  </span>
                  <span className="mt-1.5 block text-[12px] leading-5 text-ink-soft">{template.description}</span>
                  <span className="mt-3 flex items-center gap-1.5">
                    <span className="flex -space-x-1">
                      {template.agentIds.slice(0, 4).map(agentId => {
                        const name = getAgentName(agentId)
                        return (
                          <AgentAvatar
                            key={agentId}
                            name={name}
                            size={18}
                            className="rounded-full border border-surface shadow-sm"
                          />
                        )
                      })}
                    </span>
                    <span className="whitespace-nowrap text-[11px] text-ink-faint">{template.agentIds.length} 位专家</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] leading-5 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStartBlank}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-[14px] font-bold text-bg shadow-sm transition-opacity hover:opacity-90"
          >
            发起任务
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <p className="text-[12px] text-ink-soft">
            已有任务记录仍在左侧；这里始终保留给下一次协作。
          </p>
        </div>
      </div>
    </div>
  )
}
