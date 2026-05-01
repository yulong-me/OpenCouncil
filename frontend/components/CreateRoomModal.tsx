'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, Play, BrainCircuit, ChevronDown, Plus, Trash2, Wand2 } from 'lucide-react'
import { DirectoryPicker } from './DirectoryPicker'
import { API_URL } from '@/lib/api'
import { buildSettingsHref } from '../lib/settingsTabs'
import { debug, info, warn } from '@/lib/logger'
import type { TeamListItem } from '@/lib/agents'

const API = API_URL;

interface AgentConfig {
  id: string
  name: string
  roleLabel: string
  role: 'MANAGER' | 'WORKER' | 'USER'
  provider: 'claude-code' | 'opencode' | 'codex'
  providerOpts: { thinking?: boolean; [key: string]: unknown }
  systemPrompt: string
  enabled: boolean
  tags: string[]
}

type ProviderReadinessStatus = 'ready' | 'cli_missing' | 'untested' | 'test_failed'

interface ProviderReadiness {
  provider: string
  label: string
  cliPath: string
  cliAvailable: boolean
  status: ProviderReadinessStatus
  message: string
  resolvedPath?: string
}

interface RoomPreflightIssue {
  type: string
  provider?: string
  label?: string
  cliPath?: string
  agentIds: string[]
  agentNames: string[]
  message: string
}

interface RoomPreflightResult {
  ok: boolean
  blockers: RoomPreflightIssue[]
  warnings: RoomPreflightIssue[]
}

interface TeamDraftMember {
  displayName: string
  role: string
  responsibility: string
  systemPrompt: string
  whenToUse: string
  providerPreference?: 'claude-code' | 'opencode' | 'codex'
}

interface TeamDraftValidationCase {
  title: string
  failureSummary: string
  inputSnapshot: unknown
  expectedBehavior: string
  assertionType: 'checklist' | 'replay'
}

interface TeamDraft {
  name: string
  mission: string
  members: TeamDraftMember[]
  workflow: string
  teamProtocol: string
  routingPolicy: Record<string, unknown>
  teamMemory: string[]
  validationCases: TeamDraftValidationCase[]
  generationRationale: string
  generationSource?: 'agent' | 'fallback'
  fallbackReason?: string
}

interface CreateTeamResponse {
  team?: Partial<TeamListItem>
  version?: Partial<TeamListItem['activeVersion']>
}

const PROVIDER_READINESS_META: Record<ProviderReadinessStatus, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'tone-success-pill border' },
  cli_missing: { label: 'CLI 未配置', className: 'tone-danger-panel border' },
  untested: { label: '待测试', className: 'tone-warning-pill border' },
  test_failed: { label: '测试失败', className: 'tone-warning-pill border' },
}

function formatTeamDraftError(message?: string): string {
  if (!message) return '生成 Team 草案失败'
  if (/schema|invalid|output|格式不完整/i.test(message)) {
    return '生成 Team 草案失败，请调整目标后重试'
  }
  return message
}

function normalizeTeamDraft(draft: TeamDraft): TeamDraft {
  const name = draft.name.trim()
  return {
    ...draft,
    name: !name || name.toLowerCase() === 'goal-to-team draft' ? '新 Team 草案' : draft.name,
  }
}

function getFirstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return ''
}

function formatRoutingRule(rule: unknown): string {
  if (typeof rule === 'string') return rule.trim()
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return ''

  const item = rule as Record<string, unknown>
  const trigger = getFirstText(item, ['when', 'condition', 'trigger', 'scenario', 'input', 'if', 'on'])
  const target = getFirstText(item, ['memberRole', 'role', 'member', 'agent', 'target', 'to', 'owner', 'routeTo', 'assignee'])
  const action = getFirstText(item, ['action', 'behavior', 'instruction'])

  if (trigger && target) return `${trigger} → ${target}`
  if (trigger && action) return `${trigger}：${action}`
  if (target && action) return `${target}：${action}`

  const textValues = Object.values(item)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim())
  if (textValues.length >= 2) return `${textValues[0]} → ${textValues[1]}`
  return textValues[0] ?? ''
}

function formatRoutingPolicy(policy: Record<string, unknown>): string[] {
  const candidateLists = [policy.rules, policy.routes, policy.routingRules, policy.conditions]
  for (const candidate of candidateLists) {
    if (!Array.isArray(candidate)) continue
    const rules = candidate.map(formatRoutingRule).filter(Boolean)
    if (rules.length > 0) return rules
  }
  return []
}

function buildCreatedTeamListItem(data: CreateTeamResponse): TeamListItem | null {
  const team = data.team
  const version = data.version
  if (!team || !version) return null
  if (!team.id || !team.name || !team.sourceSceneId || !version.id || !version.teamId || !version.sourceSceneId) {
    return null
  }
  if (!Array.isArray(version.memberIds) || version.memberIds.length === 0 || !Array.isArray(version.memberSnapshots)) {
    return null
  }

  const members = version.memberIds
    .map(id => version.memberSnapshots?.find(snapshot => snapshot.id === id))
    .filter((member): member is NonNullable<TeamListItem['activeVersion']['memberSnapshots']>[number] => Boolean(member))
    .map(member => ({
      id: member.id,
      name: member.name,
      roleLabel: member.roleLabel,
      provider: member.provider,
    }))

  if (members.length !== version.memberIds.length) return null

  const activeVersion: TeamListItem['activeVersion'] = {
    id: version.id,
    teamId: version.teamId,
    versionNumber: typeof version.versionNumber === 'number' ? version.versionNumber : 1,
    name: version.name,
    description: version.description,
    sourceSceneId: version.sourceSceneId,
    memberIds: version.memberIds,
    memberSnapshots: version.memberSnapshots,
    workflowPrompt: version.workflowPrompt,
    routingPolicy: version.routingPolicy,
    teamMemory: version.teamMemory,
    maxA2ADepth: typeof version.maxA2ADepth === 'number' ? version.maxA2ADepth : 5,
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    builtin: team.builtin === true,
    sourceSceneId: team.sourceSceneId,
    activeVersionId: typeof team.activeVersionId === 'string' ? team.activeVersionId : version.id,
    activeVersion,
    members,
  }
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  initialTopic,
  initialSceneId,
  initialWorkerIds,
}: {
  isOpen: boolean
  onClose: () => void
  initialTopic?: string
  initialSceneId?: string
  initialWorkerIds?: string[]
}) {
  const [allAgents, setAllAgents] = useState<AgentConfig[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [topic, setTopic] = useState(initialTopic ?? '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialWorkerIds ?? []))
  const [submitting, setSubmitting] = useState(false)
  const [workspacePath, setWorkspacePath] = useState('')
  const [errors, setErrors] = useState<{ topic?: string; agents?: string }>({})
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [scenes, setScenes] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [sceneId, setSceneId] = useState(initialSceneId ?? 'roundtable-forum')
  const [loadingScenes, setLoadingScenes] = useState(false)
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [teamId, setTeamId] = useState('')
  const [teamVersionId, setTeamVersionId] = useState('')
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [teamLoadFailed, setTeamLoadFailed] = useState(false)
  const [teamDraftOpen, setTeamDraftOpen] = useState(false)
  const [teamGoal, setTeamGoal] = useState('')
  const [teamDraft, setTeamDraft] = useState<TeamDraft | null>(null)
  const [teamDraftError, setTeamDraftError] = useState('')
  const [teamDraftLoading, setTeamDraftLoading] = useState(false)
  const [teamDraftCreating, setTeamDraftCreating] = useState(false)
  const [providerReadiness, setProviderReadiness] = useState<Record<string, ProviderReadiness>>({})
  const [loadingProviderReadiness, setLoadingProviderReadiness] = useState(false)
  const [preflightWarnings, setPreflightWarnings] = useState<RoomPreflightIssue[]>([])
  const router = useRouter()
  const pathname = usePathname()

  const selectedTeam = teams.find(team => team.id === teamId)
  const selectedTeamSnapshotWorkers: AgentConfig[] = (selectedTeam?.activeVersion.memberSnapshots ?? []).map(snapshot => ({
    id: snapshot.id,
    name: snapshot.name,
    roleLabel: snapshot.roleLabel,
    role: 'WORKER',
    provider: snapshot.provider,
    providerOpts: snapshot.providerOpts ?? {},
    systemPrompt: snapshot.systemPrompt,
    enabled: true,
    tags: [selectedTeam?.name ?? 'Team'],
  }))
  const globalWorkers = allAgents.filter(a => a.role === 'WORKER' && a.enabled)
  const workers = selectedTeamSnapshotWorkers.length > 0 ? selectedTeamSnapshotWorkers : globalWorkers
  const hasInitialWorkerPreset = (initialWorkerIds?.length ?? 0) > 0
  const shouldKeepInitialWorkerPreset = hasInitialWorkerPreset && sceneId === initialSceneId
  const sceneFilterHint = selectedTeam
    ? ''
    : sceneId === 'software-development'
    ? '将使用软件开发场景的默认核心角色。'
    : shouldKeepInitialWorkerPreset
        ? '已带入该场景的默认专家组，可继续调整。'
        : ''
  const minimumWorkerCount = selectedTeam ? 1 : sceneId === 'roundtable-forum' ? 3 : sceneId === 'software-development' ? 4 : 1
  const minimumWorkerError = selectedTeam
    ? '请至少选择 1 位 Team 成员'
    : sceneId === 'roundtable-forum'
    ? '圆桌论坛至少选择 3 位专家'
    : sceneId === 'software-development'
      ? '软件开发至少选择 4 位核心专家（主架构师、挑战架构师、实现工程师、Reviewer）'
    : '请至少选择 1 位专家'
  const selectedWorkers = workers.filter(a => selected.has(a.id))
  const selectedProviderNames = [...new Set(selectedWorkers.map(worker => worker.provider))]
  const selectedProviderReadiness = selectedProviderNames
    .map(provider => providerReadiness[provider])
    .filter((readiness): readiness is ProviderReadiness => Boolean(readiness))
  const selectedCliBlockers = selectedWorkers.filter(worker => providerReadiness[worker.provider]?.status === 'cli_missing')
  const providerBlockerMessage = selectedCliBlockers.length > 0
    ? `Provider CLI 未准备好：${[...new Set(selectedCliBlockers.map(worker => providerReadiness[worker.provider]?.label ?? worker.provider))].join('、')}`
    : ''
  const draftRoutingRules = teamDraft ? formatRoutingPolicy(teamDraft.routingPolicy) : []

  async function loadTeams({ preserveOnFailure = false }: { preserveOnFailure?: boolean } = {}): Promise<TeamListItem[]> {
    setLoadingTeams(true)
    setTeamLoadFailed(false)
    try {
      const r = await fetch(`${API}/api/teams`)
      if (!r.ok) throw new Error(`teams ${r.status}`)
      const data = await r.json() as TeamListItem[]
      setTeams(data)
      debug('ui:room_create:teams_loaded', { count: data.length })
      return data
    } catch (err) {
      warn('ui:room_create:teams_load_failed', { error: err })
      if (!preserveOnFailure) {
        setTeams([])
      }
      setTeamLoadFailed(true)
      return []
    } finally {
      setLoadingTeams(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    debug('ui:room_create:modal_open')
    fetch(`${API}/api/agents`)
      .then(r => r.json())
      .then((data: AgentConfig[]) => {
        setAllAgents(data)
        setLoadingAgents(false)
        debug('ui:room_create:agents_loaded', { count: data.length })
      })
      .catch((err) => {
        warn('ui:room_create:agents_load_failed', { error: err })
        setLoadingAgents(false)
      })
    void loadTeams()
    // F016 compatibility: scenes remain the fallback source and management target.
    setLoadingScenes(true)
    fetch(`${API}/api/scenes`)
      .then(r => r.json())
      .then((data: Array<{ id: string; name: string; description?: string }>) => {
        setScenes(data)
        setLoadingScenes(false)
        debug('ui:room_create:scenes_loaded', { count: data.length })
      })
      .catch((err) => {
        warn('ui:room_create:scenes_load_failed', { error: err })
        setLoadingScenes(false)
      })
    setLoadingProviderReadiness(true)
    fetch(`${API}/api/providers/readiness`)
      .then(r => r.json())
      .then((data: Record<string, ProviderReadiness>) => {
        setProviderReadiness(data)
        setLoadingProviderReadiness(false)
        debug('ui:room_create:provider_readiness_loaded', { count: Object.keys(data).length })
      })
      .catch((err) => {
        warn('ui:room_create:provider_readiness_failed', { error: err })
        setLoadingProviderReadiness(false)
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set())
      setWorkspacePath('')
      setTopic('')
      setErrors({})
      setPreflightWarnings([])
      setWorkspaceOpen(false)
      setSceneId('roundtable-forum')
      setTeamId('')
      setTeamVersionId('')
      setTeamLoadFailed(false)
      setTeamDraftOpen(false)
      setTeamGoal('')
      setTeamDraft(null)
      setTeamDraftError('')
      setTeamDraftLoading(false)
      setTeamDraftCreating(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || teams.length === 0) return
    const preferred = teams.find(team => team.sourceSceneId === (initialSceneId ?? 'roundtable-forum')) ?? teams[0]
    if (!preferred || teamId) return
    setTeamId(preferred.id)
    setTeamVersionId(preferred.activeVersion.id)
    setSceneId(preferred.sourceSceneId)
    if (!hasInitialWorkerPreset) {
      setSelected(new Set(preferred.activeVersion.memberIds))
    }
  }, [hasInitialWorkerPreset, initialSceneId, isOpen, teamId, teams])

  useEffect(() => {
    if (!isOpen) return
    if (selectedTeam) {
      setSelected(new Set(selectedTeam.activeVersion.memberIds))
    } else if (!shouldKeepInitialWorkerPreset) {
      setSelected(new Set())
    }
    setErrors(prev => ({ ...prev, agents: undefined }))
  }, [isOpen, selectedTeam, shouldKeepInitialWorkerPreset])

  useEffect(() => {
    if (!isOpen) return
    setTopic(initialTopic ?? '')
    setSceneId(initialSceneId ?? 'roundtable-forum')
    setTeamId('')
    setTeamVersionId('')
    setSelected(new Set(initialWorkerIds ?? []))
    setErrors({})
    setPreflightWarnings([])
  }, [initialTopic, initialSceneId, initialWorkerIds, isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleOpenTeamDraft() {
    setTeamDraftOpen(true)
    setTeamDraftError('')
    setErrors(prev => ({ ...prev, agents: undefined }))
  }

  function handleOpenTeamSelect() {
    setTeamDraftOpen(false)
    setTeamDraftError('')
    if (!teamId && teams.length > 0) {
      handleTeamChange(teams[0].id)
    }
  }

  async function handleGenerateTeamDraft() {
    setTeamDraftLoading(true)
    setTeamDraftError('')
    try {
      const res = await fetch(`${API}/api/teams/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: teamGoal }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTeamDraftError(formatTeamDraftError((data as { error?: string }).error))
        return
      }
      setTeamDraft(normalizeTeamDraft(data as TeamDraft))
      info('ui:team_draft:generated', {
        memberCount: (data as TeamDraft).members?.length ?? 0,
        generationSource: (data as TeamDraft).generationSource,
      })
    } catch (err) {
      warn('ui:team_draft:generate_failed', { error: err })
      setTeamDraftError('网络错误，请重试')
    } finally {
      setTeamDraftLoading(false)
    }
  }

  function handleRemoveDraftMember(index: number) {
    setTeamDraft(prev => prev ? { ...prev, members: prev.members.filter((_, i) => i !== index) } : prev)
  }

  async function handleCreateTeamFromDraft() {
    if (!teamDraft) return
    if (teamDraft.members.length < 1) {
      setTeamDraftError('至少保留 1 位成员')
      return
    }
    setTeamDraftCreating(true)
    setTeamDraftError('')
    try {
      const res = await fetch(`${API}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: teamDraft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTeamDraftError(formatTeamDraftError((data as { error?: string }).error ?? '创建 Team 失败'))
        return
      }
      const nextTeam = buildCreatedTeamListItem(data as CreateTeamResponse)
      if (!nextTeam) {
        setTeamDraftError('团队已创建但无法载入，请刷新后重试')
        return
      }
      setTeams(prev => [nextTeam, ...prev.filter(team => team.id !== nextTeam.id)])
      setTeamId(nextTeam.id)
      setTeamVersionId(nextTeam.activeVersion.id)
      setSceneId(nextTeam.sourceSceneId)
      setSelected(new Set(nextTeam.activeVersion.memberIds))
      setTeamDraftOpen(false)
      setTeamDraft(null)
      setTeamGoal('')
      void loadTeams({ preserveOnFailure: true })
      info('ui:team_draft:created', { teamId: nextTeam.id, versionId: nextTeam.activeVersion.id })
    } catch (err) {
      warn('ui:team_draft:create_failed', { error: err })
      setTeamDraftError('网络错误，请重试')
    } finally {
      setTeamDraftCreating(false)
    }
  }

  function handleTeamChange(nextTeamId: string) {
    const team = teams.find(item => item.id === nextTeamId)
    setTeamId(nextTeamId)
    setTeamVersionId(team?.activeVersion.id ?? '')
    if (team) {
      setSceneId(team.sourceSceneId)
      if (!hasInitialWorkerPreset) {
        setSelected(new Set(team.activeVersion.memberIds))
      }
    } else {
      setSceneId(nextTeamId)
    }
    setErrors(prev => ({ ...prev, agents: undefined }))
  }

  function handleManageProviders() {
    debug('ui:room_create:manage_providers')
    onClose()
    router.push(buildSettingsHref('provider', pathname))
  }

  async function handleSubmit() {
    const newErrors: { topic?: string; agents?: string } = {}
    if (selectedWorkers.length < minimumWorkerCount) {
      newErrors.agents = minimumWorkerError
    }
    if (selectedCliBlockers.length > 0) {
      newErrors.agents = providerBlockerMessage || 'Provider CLI 未准备好'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setSubmitting(true)
    setErrors({})
    info('ui:room_create:submit', {
      topicLength: topic.trim().length,
      workerCount: selectedWorkers.length,
      hasWorkspace: Boolean(workspacePath.trim()),
      sceneId,
      teamId: teamId || undefined,
      teamVersionId: teamVersionId || undefined,
    })
    try {
      const preflightResponse = await fetch(`${API}/api/rooms/preflight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerIds: workers.filter(a => selected.has(a.id)).map(a => a.id),
          sceneId,
          ...(teamId ? { teamId } : {}),
          ...(teamVersionId ? { teamVersionId } : {}),
        }),
      })
      const preflight = await preflightResponse.json().catch(() => null) as RoomPreflightResult | null
      if (preflight && Array.isArray(preflight.blockers) && Array.isArray(preflight.warnings)) {
        setPreflightWarnings(preflight.warnings ?? [])
        if (!preflight.ok) {
          const msg = preflight.blockers.map(blocker => blocker.message).join('；') || 'Provider CLI 未准备好'
          setErrors({ agents: msg })
          warn('ui:room_create:preflight_blocked', {
            blockerCount: preflight.blockers.length,
            warningCount: preflight.warnings.length,
            sceneId,
          })
          return
        }
      }

      const res = await fetch(`${API}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || `未命名讨论 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
          workerIds: workers.filter(a => selected.has(a.id)).map(a => a.id),
          ...(workspacePath.trim() ? { workspacePath: workspacePath.trim() } : {}),
          sceneId, // F016 compatibility
          ...(teamId ? { teamId } : {}),
          ...(teamVersionId ? { teamVersionId } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error ?? '创建失败'
        if (msg.includes('topic') || msg.includes('主题')) {
          setErrors({ agents: msg })
        } else {
          setErrors({ agents: msg })
        }
        warn('ui:room_create:submit_failed', {
          status: res.status,
          error: msg,
          workerCount: selectedWorkers.length,
          sceneId,
          teamId: teamId || undefined,
          teamVersionId: teamVersionId || undefined,
        })
        return
      }
      const room = await res.json()
      info('ui:room_create:success', {
        roomId: room.id,
        workerCount: selectedWorkers.length,
        sceneId,
        teamId: teamId || undefined,
        teamVersionId: teamVersionId || undefined,
        hasWorkspace: Boolean(workspacePath.trim()),
      })
      onClose()
      router.push(`/room/${room.id}`, { scroll: false })
    } catch (err) {
      warn('ui:room_create:network_failed', { error: err, sceneId, teamId: teamId || undefined })
      setErrors({ agents: '网络错误，请重试' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="关闭"
        className="fixed inset-0 z-50 bg-[color:var(--overlay-scrim)]"
        onClick={onClose}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onClose() }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="发起新讨论"
        className="fixed inset-0 z-50 flex items-stretch justify-center p-4 pointer-events-none"
      >
        <div className="app-window-shell rounded-3xl w-full max-w-4xl flex flex-col custom-scrollbar pointer-events-auto overflow-hidden">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Header */}
            <div className="flex items-start justify-between px-6 md:px-8 pt-6 md:pt-8 pb-5 border-b border-line shrink-0">
              <div>
                <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-accent" aria-hidden/> 发起新讨论
                </h1>
                <p className="text-ink-soft mt-1 text-[14px]">选择一支 Team，开始一次协作。</p>
              </div>
              <button onClick={onClose} aria-label="关闭" className="p-2 text-ink-soft hover:text-ink hover:bg-surface-muted rounded-full transition-colors">
                <X className="w-5 h-5" aria-hidden/>
              </button>
            </div>

            {/* F052: Team Selection Mode */}
            <div className="px-6 md:px-8 pt-6 mb-1">
              <div className="mb-3 grid grid-cols-2 rounded-xl border border-line bg-surface-muted p-1">
                <button
                  type="button"
                  onClick={handleOpenTeamSelect}
                  aria-pressed={!teamDraftOpen}
                  className={`rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
                    !teamDraftOpen ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  使用已有 Team
                </button>
                <button
                  type="button"
                  onClick={handleOpenTeamDraft}
                  aria-pressed={teamDraftOpen}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
                    teamDraftOpen ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  生成新 Team
                </button>
              </div>
              {!teamDraftOpen ? (
                <div className="rounded-2xl border border-line bg-surface-muted/60 p-4">
                  <div>
                    <h2 className="text-[15px] font-bold text-ink">使用已有 Team</h2>
                    <p className="mt-1 text-[12px] text-ink-soft">从已保存的 Team 中选择一支，成员和工作流会一起带入。</p>
                  </div>
                  <div className="mt-3">
                  {teams.length > 0 ? (
                    <select
                      value={teamId}
                      onChange={e => handleTeamChange(e.target.value)}
                      disabled={loadingTeams}
                      className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all appearance-none cursor-pointer"
                    >
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} · v{team.activeVersion.versionNumber}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-soft">
                      {teamLoadFailed ? 'Team 列表暂不可用，请稍后重试或生成新 Team。' : '还没有可用 Team，请先生成新 Team。'}
                    </div>
                  )}
                  {loadingTeams && <p className="text-[11px] text-ink-soft mt-1">加载 Team 中…</p>}
                  </div>
                  {!loadingTeams && selectedTeam && selectedTeam.members.length > 0 && (
                    <div className="mt-4 rounded-xl border border-line bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-bold text-ink">{selectedTeam.name}</p>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          v{selectedTeam.activeVersion.versionNumber}
                        </span>
                      </div>
                      {selectedTeam.description && (
                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-soft">{selectedTeam.description}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedTeam.members.slice(0, 4).map(member => (
                          <span key={member.id} className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] text-ink-soft">
                            {member.name}
                          </span>
                        ))}
                        {selectedTeam.members.length > 4 && (
                          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] text-ink-soft">
                            +{selectedTeam.members.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!loadingTeams && sceneFilterHint && (
                    <p className="text-[11px] text-ink-soft mt-1">
                      {sceneFilterHint}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-surface-muted/60 p-4">
                  <div>
                    <h2 className="text-[15px] font-bold text-ink">生成新 Team</h2>
                    <p className="mt-1 text-[12px] text-ink-soft">描述目标，系统会规划成员、职责、工作流程和验收检查。</p>
                  </div>
                  <div className="mt-3">
                  <textarea
                    value={teamGoal}
                    onChange={e => { setTeamGoal(e.target.value); setTeamDraftError('') }}
                    placeholder="你希望这支 Team 帮你完成什么？"
                    className="min-h-[88px] w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateTeamDraft}
                      disabled={teamDraftLoading || teamGoal.trim().length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-bg disabled:opacity-50"
                    >
                      <Wand2 className="h-3.5 w-3.5" aria-hidden />
                  {teamDraftLoading ? '正在生成团队草案…' : teamDraft ? '重新生成' : '生成 Team 草案'}
                    </button>
                  </div>
                  {teamDraftLoading && (
                    <p className="mt-2 text-[11px] text-ink-soft">系统正在根据目标规划成员、职责和验收检查。</p>
                  )}
                  {teamDraftError && <p className="tone-danger-text mt-2 text-xs">{teamDraftError}</p>}
                  </div>

                  {!teamDraft && !teamDraftLoading && !teamDraftError && (
                    <div className="mt-4 rounded-xl border border-dashed border-line bg-surface px-3 py-4 text-center text-[12px] text-ink-soft">
                      生成后可在这里审阅团队草案。
                    </div>
                  )}

                  {teamDraft && (
                    <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold text-ink-soft">Team 名称</label>
                      </div>
                      <input
                        value={teamDraft.name}
                        onChange={e => setTeamDraft(prev => prev ? { ...prev, name: e.target.value } : prev)}
                        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[13px] font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{teamDraft.mission}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-ink-soft">成员</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {teamDraft.members.map((member, index) => (
                          <div key={`${member.displayName}-${index}`} className="rounded-xl border border-line bg-surface p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-bold text-ink">{member.displayName}</p>
                                <p className="mt-1 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                                  {member.role}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftMember(index)}
                                className="p-1 text-ink-soft hover:text-[color:var(--danger)]"
                                aria-label={`删除成员 ${member.displayName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                            <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">{member.responsibility}</p>
                            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-soft/80">
                              适用：{member.whenToUse.replace(/^触发[:：]\s*/, '')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-bold text-ink-soft">工作流程</p>
                        <p className="mt-1 whitespace-pre-line rounded-xl border border-line bg-surface p-3 text-[12px] leading-relaxed text-ink-soft">{teamDraft.workflow}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-ink-soft">分工规则</p>
                        <ul className="mt-1 space-y-1.5 rounded-xl border border-line bg-surface p-3 text-[12px] leading-relaxed text-ink-soft">
                          {draftRoutingRules.length > 0 ? draftRoutingRules.map((rule, index) => (
                            <li key={`${rule}-${index}`} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                              <span>{rule}</span>
                            </li>
                          )) : (
                            <li>按成员职责自动分配任务。</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-ink-soft">验收检查</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {teamDraft.validationCases.map((validationCase, index) => (
                          <div key={`${validationCase.title}-${index}`} className="rounded-xl border border-line bg-surface px-3 py-2">
                            <p className="text-[12px] font-semibold text-ink">{validationCase.title}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{validationCase.expectedBehavior}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { handleOpenTeamSelect(); setTeamDraft(null); setTeamDraftError('') }}
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-bold text-ink"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateTeamFromDraft}
                        disabled={teamDraftCreating || teamDraft.members.length < 1 || teamDraft.name.trim().length === 0}
                        className="rounded-lg bg-ink px-3 py-2 text-[12px] font-bold text-bg disabled:opacity-50"
                      >
                        {teamDraftCreating ? '创建中…' : '创建 Team v1'}
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 md:px-8 pt-4 pb-3">
              {loadingAgents && !selectedTeam && !teamDraftOpen && (
                <div className="text-center py-5 text-ink-soft text-sm">加载 Agent 配置…</div>
              )}
              {!teamDraftOpen && providerBlockerMessage && (
                <div className="tone-danger-panel mt-3 rounded-xl border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold">
                      {providerBlockerMessage}
                    </p>
                    <button
                      type="button"
                      onClick={handleManageProviders}
                      className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-bold text-bg transition-opacity hover:opacity-90"
                    >
                      去设置 Provider
                    </button>
                  </div>
                </div>
              )}
              {!teamDraftOpen && preflightWarnings.length > 0 && !providerBlockerMessage && (
                <div className="tone-warning-pill mt-3 rounded-xl border px-3 py-2 text-[12px] font-semibold">
                  {preflightWarnings.map(warning => warning.message).join('；')}
                </div>
              )}
              {!teamDraftOpen && errors.agents && <p className="tone-danger-text mt-2 text-xs">{errors.agents}</p>}
            </div>

            {/* Collapsible Workspace Section */}
            <div className="px-6 md:px-8 pb-4">
              <button
                type="button"
                onClick={() => setWorkspaceOpen(o => !o)}
                className="flex items-center gap-2 text-[12px] text-ink-soft hover:text-ink transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} aria-hidden/>
                工作目录（可选）
              </button>
              {workspaceOpen && (
                <div className="mt-2 p-4 bg-surface-muted rounded-2xl border border-line">
                  <DirectoryPicker
                    value={workspacePath}
                    onChange={setWorkspacePath}
                    placeholder="/Users/yulong/work/my-project"
                    inputLabel="工作目录"
                  />
                  <p className="text-[11px] text-ink-soft/60 mt-1.5">留空则使用默认临时工作区，agent 将在该目录下读写文件</p>
                </div>
              )}
            </div>

          </div>

          {/* Sticky Footer: CTA */}
          <div className="shrink-0 border-t border-line px-6 md:px-8 py-4 bg-surface">
            {!teamDraftOpen && selectedProviderReadiness.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedProviderReadiness.map(readiness => {
                  const meta = PROVIDER_READINESS_META[readiness.status]
                  return (
                    <span key={readiness.provider} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
                      {readiness.label} · {meta.label}
                    </span>
                  )
                })}
                {loadingProviderReadiness && <span className="text-[11px] text-ink-soft">检查 Provider 中…</span>}
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              className="w-full bg-ink text-bg font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:active:scale-100"
              onClick={handleSubmit}
              disabled={teamDraftOpen || submitting || selectedWorkers.length < minimumWorkerCount || selectedCliBlockers.length > 0}
            >
              <Play className="w-4 h-4 fill-current" aria-hidden/>
              {teamDraftOpen ? '先创建 Team' : submitting ? '创建中…' : '创建讨论'}
            </button>

          </div>
        </div>
      </div>
    </>
  )
}
