'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, Copy, Edit2, GitBranch, Loader2, Plus, Trash2, UsersRound, X } from 'lucide-react'

import { API_URL } from '@/lib/api'
import { getAgentColor, type TeamListItem } from '@/lib/agents'
import { AgentAvatar } from '@/components/AgentAvatar'
import { CustomSelect } from '@/components/ui/CustomSelect'
import type { ProviderName, ReadOnlySkill, SkillConfig } from './types'

const API = API_URL
const PROVIDER_OPTIONS: Array<{ value: ProviderName; label: string }> = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'codex', label: 'Codex CLI' },
]
const LONG_TEXT_MODAL_THRESHOLD = 120

type TeamMemberSnapshot = NonNullable<TeamListItem['activeVersion']['memberSnapshots']>[number]
type TeamMemberSkillRef = NonNullable<TeamMemberSnapshot['skillRefs']>[number]
type SkillPickerSource = TeamMemberSkillRef['source']
type TeamSubtab = 'members' | 'rules' | 'memory' | 'versions'
type RoutingRule = { when: string; memberRole: string }

const TEAM_SUBTABS: Array<{ id: TeamSubtab; label: string; description: string }> = [
  { id: 'members', label: '成员', description: '编辑成员分工、执行工具和 Skill' },
  { id: 'rules', label: '分工 & 规则', description: 'Team 协作方式和路由规则' },
  { id: 'memory', label: '长期记忆', description: 'Team 级长期记忆' },
  { id: 'versions', label: '历史版本', description: 'Team 版本记录和回滚' },
]

interface SkillPickerOption {
  key: string
  source: SkillPickerSource
  id?: string
  name: string
  description: string
  sourcePath?: string
  providerCompat: ProviderName[]
}

interface TeamSettingsPatch {
  name?: string
  description?: string
  version?: {
    name?: string
    description?: string
    memberSnapshots?: TeamMemberSnapshot[]
    workflowPrompt?: string
    routingPolicy?: Record<string, unknown>
    teamMemory?: string[]
  }
}

function skillSourceLabel(source: SkillPickerSource): string {
  if (source === 'managed') return '系统维护'
  if (source === 'global') return '系统扫描'
  return 'Workspace'
}

function skillRefKey(ref: TeamMemberSkillRef): string {
  if (ref.source === 'managed') return `managed:${ref.id ?? ref.name}`
  return `${ref.source}:${ref.sourcePath ?? ref.name}`
}

function optionToSkillRef(option: SkillPickerOption): TeamMemberSkillRef {
  if (option.source === 'managed') {
    return { source: 'managed', id: option.id, name: option.name }
  }
  return { source: option.source, name: option.name, sourcePath: option.sourcePath }
}

function skillIdsFromRefs(refs: TeamMemberSkillRef[]): string[] {
  return refs
    .filter(ref => ref.source === 'managed' && typeof ref.id === 'string' && ref.id.trim())
    .map(ref => ref.id as string)
}

function getMemberSkillRefs(member: TeamMemberSnapshot, skills: SkillConfig[]): TeamMemberSkillRef[] {
  if (member.skillRefs?.length) return member.skillRefs
  return (member.skillIds ?? []).map(skillId => {
    const skill = skills.find(item => item.id === skillId)
    return {
      source: 'managed',
      id: skillId,
      name: skill?.name ?? skillId,
    }
  })
}

function isSkillOptionCompatibleWithProvider(option: SkillPickerOption, provider: ProviderName): boolean {
  return option.providerCompat.includes(provider)
}

function fallbackMembers(team?: TeamListItem): TeamMemberSnapshot[] {
  if (!team) return []
  if (team.activeVersion.memberSnapshots?.length) return team.activeVersion.memberSnapshots
  return team.members.map(member => ({
    id: member.id,
    name: member.name,
    roleLabel: member.roleLabel,
    provider: member.provider as ProviderName,
    providerOpts: {},
    systemPrompt: '',
  }))
}

function getRoutingRules(policy?: Record<string, unknown>): RoutingRule[] {
  const rules = Array.isArray(policy?.rules) ? policy.rules : []
  return rules
    .map(rule => {
      if (typeof rule === 'string') {
        const [when = rule, memberRole = ''] = rule.split('->').map(part => part.trim())
        return { when, memberRole }
      }
      if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) return null
      const record = rule as Record<string, unknown>
      return {
        when: typeof record.when === 'string' ? record.when : '',
        memberRole: typeof record.memberRole === 'string' ? record.memberRole : '',
      }
    })
    .filter((rule): rule is RoutingRule => rule !== null && Boolean(rule.when || rule.memberRole))
}

function buildRoutingPolicy(policy: Record<string, unknown> | undefined, rules: RoutingRule[]): Record<string, unknown> {
  return {
    ...(policy ?? {}),
    rules: rules
      .map(rule => ({
        when: rule.when.trim(),
        memberRole: rule.memberRole.trim(),
      }))
      .filter(rule => rule.when || rule.memberRole),
  }
}

function EditableText({
  value,
  placeholder = '点击编辑',
  multiline = false,
  monospace = false,
  longTextDialogTitle,
  displayLabel,
  alwaysUseDialog = false,
  className = '',
  onSave,
}: {
  value: string
  placeholder?: string
  multiline?: boolean
  monospace?: boolean
  longTextDialogTitle?: string
  displayLabel?: string
  alwaysUseDialog?: boolean
  className?: string
  onSave: (value: string) => Promise<void> | void
}) {
  const [editing, setEditing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const useDialogEditor = Boolean(longTextDialogTitle && multiline && (alwaysUseDialog || value.length > LONG_TEXT_MODAL_THRESHOLD))
  const visibleText = displayLabel ?? value

  useEffect(() => {
    if (!editing && !dialogOpen) setDraft(value)
  }, [dialogOpen, editing, value])

  async function commit() {
    const wasDialogOpen = dialogOpen
    setEditing(false)
    const next = draft.trimEnd()
    if (next === value) {
      setDialogOpen(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(next)
      setDialogOpen(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1200)
    } catch (err) {
      if (!wasDialogOpen) setDraft(value)
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function cancelDialogEdit() {
    setDraft(value)
    setDialogOpen(false)
    setError('')
  }

  if (editing) {
    const inputClass = `w-full rounded-lg border border-accent/40 bg-surface px-2 py-1.5 text-[12px] text-ink outline-none ring-2 ring-accent/10 ${monospace ? 'font-mono' : ''} ${className}`
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        rows={4}
        className={`${inputClass} resize-y`}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        className={inputClass}
      />
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (useDialogEditor) {
            setDialogOpen(true)
          } else {
            setEditing(true)
          }
        }}
        className={`min-h-7 w-full rounded-lg px-2 py-1.5 text-left text-[12px] leading-5 text-ink transition-colors hover:bg-surface focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 ${monospace ? 'font-mono' : ''} ${className}`}
      >
        <span className={visibleText ? `${useDialogEditor && !displayLabel ? 'line-clamp-4' : 'whitespace-pre-line'}` : 'text-ink-faint'}>
          {visibleText || placeholder}
        </span>
        {useDialogEditor && !displayLabel && (
          <span className="mt-1 block text-[11px] font-medium text-accent">内容较长，点击弹窗编辑</span>
        )}
      </button>
      {dialogOpen && (
        <div className="fixed inset-0 layer-nested-modal flex items-center justify-center bg-[color:var(--overlay-scrim)] px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={longTextDialogTitle}
            className="flex max-h-[min(42rem,calc(100vh-48px))] w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="text-[14px] font-bold text-ink">{longTextDialogTitle}</h3>
              <button
                type="button"
                onClick={cancelDialogEdit}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
                aria-label="关闭编辑弹窗"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
              <textarea
                autoFocus
                value={draft}
                onChange={event => setDraft(event.target.value)}
                className={`h-[min(28rem,calc(100vh-15rem))] w-full resize-none rounded-xl border border-line bg-surface-muted px-3 py-2 text-[13px] leading-6 text-ink outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/20 ${monospace ? 'font-mono' : ''}`}
              />
              {error && (
                <p role="alert" className="mt-2 text-[12px] text-[color:var(--danger)]">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={cancelDialogEdit}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => { void commit() }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      {(saving || saved || error) && (
        <p
          aria-live="polite"
          className={`mt-1 flex items-center gap-1 text-[11px] ${error ? 'text-[color:var(--danger)]' : 'text-ink-faint'}`}
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
          {error || (saving ? '保存中...' : '已保存')}
        </p>
      )}
    </div>
  )
}

function FieldHelp({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`${label} 填写说明`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full layer-tooltip mt-1 hidden w-64 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-[11px] font-normal leading-5 text-ink-soft shadow-xl group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  )
}

function FieldLabel({ children, help }: { children: string; help?: string }) {
  return (
    <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-faint">
      <span>{children}</span>
      {help && <FieldHelp label={children} text={help} />}
    </p>
  )
}

function ConstructionPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="mt-5 flex min-h-[18rem] items-center justify-center rounded-[10px] border border-dashed border-line bg-surface-muted/60 px-6 py-10 text-center">
      <div className="max-w-sm">
        <p className="font-display text-[22px] font-medium text-ink">建设中</p>
        <p className="mt-2 text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[12px] leading-5 text-ink-soft">{description}</p>
      </div>
    </section>
  )
}

export function TeamSettingsTab({
  teams,
  skills,
  globalSkills,
  initialTeamId,
  onUpdated,
}: {
  teams: TeamListItem[]
  skills: SkillConfig[]
  globalSkills: ReadOnlySkill[]
  initialTeamId?: string
  onUpdated: (team: TeamListItem) => void
}) {
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [appliedInitialTeamId, setAppliedInitialTeamId] = useState<string | undefined>(undefined)
  const [localTeams, setLocalTeams] = useState<TeamListItem[]>(teams)
  const [skillPickerMemberId, setSkillPickerMemberId] = useState<string | null>(null)
  const [activeSubtab, setActiveSubtab] = useState<TeamSubtab>('members')

  useEffect(() => setLocalTeams(teams), [teams])

  useEffect(() => {
    setAppliedInitialTeamId(undefined)
  }, [initialTeamId])

  useEffect(() => {
    if (!initialTeamId || appliedInitialTeamId === initialTeamId) return
    if (!localTeams.some(team => team.id === initialTeamId)) return
    setSelectedTeamId(initialTeamId)
    setAppliedInitialTeamId(initialTeamId)
  }, [appliedInitialTeamId, initialTeamId, localTeams])

  useEffect(() => {
    setSkillPickerMemberId(null)
    setActiveSubtab('members')
  }, [selectedTeamId])

  useEffect(() => {
    if (selectedTeamId && localTeams.some(team => team.id === selectedTeamId)) return
    if (initialTeamId && localTeams.some(team => team.id === initialTeamId)) return
    setSelectedTeamId(localTeams[0]?.id ?? '')
  }, [initialTeamId, selectedTeamId, localTeams])

  const selectedTeam = useMemo(
    () => localTeams.find(team => team.id === selectedTeamId) ?? localTeams[0],
    [selectedTeamId, localTeams],
  )
  const activeVersion = selectedTeam?.activeVersion
  const members = useMemo(() => fallbackMembers(selectedTeam), [selectedTeam])
  const routingRules = useMemo(
    () => getRoutingRules(activeVersion?.routingPolicy),
    [activeVersion],
  )
  const teamMemory = activeVersion?.teamMemory ?? []

  const skillOptions = useMemo<SkillPickerOption[]>(() => [
    ...skills
      .filter(skill => skill.enabled)
      .map(skill => ({
        key: `managed:${skill.id}`,
        source: 'managed' as const,
        id: skill.id,
        name: skill.name,
        description: skill.description,
        providerCompat: skill.providerCompat,
      })),
    ...globalSkills.map(skill => ({
      key: `${skill.sourceType}:${skill.sourcePath}`,
      source: skill.sourceType,
      name: skill.name,
      description: skill.description,
      sourcePath: skill.sourcePath,
      providerCompat: skill.providerCompat ?? PROVIDER_OPTIONS.map(option => option.value),
    })),
  ], [globalSkills, skills])

  async function onSaveTeamSettings(teamId: string, patch: TeamSettingsPatch) {
    const response = await fetch(`${API}/api/teams/${teamId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await response.json().catch(() => ({})) as TeamListItem & { error?: string }
    if (!response.ok) throw new Error(data.error ?? '保存失败')
    setLocalTeams(previous => previous.map(team => team.id === data.id ? data : team))
    onUpdated(data)
  }

  function saveSelected(patch: TeamSettingsPatch) {
    if (!selectedTeam) return Promise.resolve()
    return onSaveTeamSettings(selectedTeam.id, patch)
  }

  function saveMembers(nextMembers: TeamMemberSnapshot[]) {
    return saveSelected({ version: { memberSnapshots: nextMembers } })
  }

  function saveRoutingRules(nextRules: RoutingRule[]) {
    if (!activeVersion) return Promise.resolve()
    return saveSelected({ version: { routingPolicy: buildRoutingPolicy(activeVersion.routingPolicy, nextRules) } })
  }

  function updateRoutingRule(index: number, update: Partial<RoutingRule>) {
    const nextRules = routingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...update } : rule)
    return saveRoutingRules(nextRules)
  }

  function addRoutingRule() {
    const fallbackRole = members[0]?.roleLabel || members[0]?.name || '成员角色'
    return saveRoutingRules([...routingRules, { when: '新的触发条件', memberRole: fallbackRole }])
  }

  function removeRoutingRule(index: number) {
    return saveRoutingRules(routingRules.filter((_rule, ruleIndex) => ruleIndex !== index))
  }

  function saveTeamMemory(nextMemory: string[]) {
    return saveSelected({ version: { teamMemory: nextMemory } })
  }

  function updateTeamMemory(index: number, value: string) {
    const nextMemory = teamMemory.map((item, itemIndex) => itemIndex === index ? value : item).filter(item => item.trim())
    return saveTeamMemory(nextMemory)
  }

  function addTeamMemory() {
    return saveTeamMemory([...teamMemory, '新的团队记忆'])
  }

  function removeTeamMemory(index: number) {
    return saveTeamMemory(teamMemory.filter((_item, itemIndex) => itemIndex !== index))
  }

  function updateMember(memberId: string, update: Partial<TeamMemberSnapshot>) {
    const nextMembers = members.map(member => member.id === memberId ? { ...member, ...update } : member)
    return saveMembers(nextMembers)
  }

  function onSelectMemberSkill(member: TeamMemberSnapshot, optionKey: string) {
    const option = skillOptions.find(item => item.key === optionKey)
    if (!option) return Promise.resolve()
    const currentRefs = getMemberSkillRefs(member, skills)
    const nextRefs = Array.from(new Map(
      [...currentRefs, optionToSkillRef(option)].map(ref => [skillRefKey(ref), ref]),
    ).values())
    setSkillPickerMemberId(null)
    return updateMember(member.id, {
      skillIds: skillIdsFromRefs(nextRefs),
      skillRefs: nextRefs,
    })
  }

  function onRemoveMemberSkill(member: TeamMemberSnapshot, refKey: string) {
    const nextRefs = getMemberSkillRefs(member, skills).filter(ref => skillRefKey(ref) !== refKey)
    return updateMember(member.id, {
      skillIds: skillIdsFromRefs(nextRefs),
      skillRefs: nextRefs,
    })
  }

  if (localTeams.length === 0) {
    return (
      <section className="flex h-full items-center justify-center bg-surface-muted p-6 text-center">
        <div>
          <p className="text-[15px] font-bold text-ink">Team 设置</p>
          <p className="mt-2 text-[13px] text-ink-soft">还没有可用 Team。</p>
        </div>
      </section>
    )
  }

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-surface lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-bg p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <h2 className="sr-only">Team 设置</h2>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Team · {localTeams.length}</p>
          </div>
        </div>
        <div className="space-y-1">
          {localTeams.map(team => {
            const selected = team.id === selectedTeam?.id
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeamId(team.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selected ? 'border-accent/25 bg-surface text-ink shadow-sm' : 'border-transparent text-ink-soft hover:border-line hover:bg-surface hover:text-ink'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-bold">{team.name}</span>
                  <span className="ml-auto shrink-0 rounded-md border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-faint">
                    v{team.activeVersion.versionNumber}
                  </span>
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                  <UsersRound className="h-3.5 w-3.5" aria-hidden />
                  {team.members.length} 成员 · 最近更新
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {selectedTeam && activeVersion && (
        <section className="min-w-0 overflow-y-auto p-6 custom-scrollbar lg:p-8">
          <div className="flex flex-col gap-4 border-b border-line pb-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="max-w-full truncate font-display text-[28px] font-bold leading-tight text-ink">{selectedTeam.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono text-[11px] font-bold text-accent">
                  <GitBranch className="h-3.5 w-3.5" aria-hidden />
                  当前版本 v{activeVersion.versionNumber}
                </span>
                <span className="inline-flex rounded-full border border-line bg-surface-muted px-2.5 py-1 font-mono text-[11px] font-bold text-ink-faint">
                  {members.length} 成员 · max-A2A {activeVersion.maxA2ADepth ?? 5}
                </span>
              </div>
              <EditableText
                value={selectedTeam.description ?? activeVersion.description ?? ''}
                placeholder="点击补充 Team 说明"
                multiline
                className="mt-1 max-w-3xl px-0 text-[13px] leading-6 text-ink-soft hover:bg-transparent"
                onSave={value => saveSelected({ description: value, version: { description: value } })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                title="克隆为新 Team"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink-soft opacity-60"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                克隆为新 Team
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-5 overflow-x-auto border-b border-line text-[13px] text-ink-soft custom-scrollbar">
            {TEAM_SUBTABS.map(item => (
              <button
                key={item.id}
                type="button"
                aria-selected={activeSubtab === item.id}
                onClick={() => setActiveSubtab(item.id)}
                className={`shrink-0 border-b-2 px-0 pb-2 transition-colors ${
                  activeSubtab === item.id
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent hover:text-ink'
                }`}
              >
                {item.id === 'members' ? <>成员（{members.length}）</> : item.label}
              </button>
            ))}
          </div>

          {activeSubtab === 'members' ? (
            <section className="mt-4 space-y-2.5">
              {members.map(member => {
                const memberSkillRefs = getMemberSkillRefs(member, skills)
                const availableSkillOptions = skillOptions.filter(option => (
                  isSkillOptionCompatibleWithProvider(option, member.provider)
                  && !new Set(memberSkillRefs.map(skillRefKey)).has(option.key)
                ))
                const color = getAgentColor(member.name)

                return (
                  <div
                    key={member.id}
                    className="member-card rounded-xl border-y border-r border-l-[3px] border-y-line border-r-line border-l-accent/40 bg-surface px-4 py-4 shadow-sm transition-colors hover:border-l-accent/70"
                  >
                    <div className="grid gap-3.5 md:grid-cols-[2.75rem_minmax(0,1fr)]">
                      <AgentAvatar
                        name={member.name}
                        color={color.bg}
                        textColor={color.text}
                        size={38}
                        className="mt-0.5 shrink-0 rounded-full ring-2 ring-surface"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="sr-only">成员名称</span>
                              <span className="sr-only">成员名称：给这个成员起一个好识别的名字，例如 信息搜集专员、风险审查员。</span>
                              <div className="min-w-0 max-w-[18rem]">
                                <EditableText
                                  value={member.name}
                                  placeholder="成员名称"
                                  className="px-0 py-0 text-[14px] font-semibold hover:bg-transparent"
                                  onSave={value => updateMember(member.id, { name: value })}
                                />
                              </div>
                              <Edit2 className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                            </div>
                            <span className="sr-only">角色分工：一句话说明它在 Team 里的身份，例如 信息搜集、方案设计、审查把关。</span>
                            <div className="mt-1 max-w-[28rem]">
                              <EditableText
                                value={member.roleLabel}
                                placeholder="角色分工"
                                className="px-0 py-0 text-[11px] text-ink-soft hover:bg-transparent"
                                onSave={value => updateMember(member.id, { roleLabel: value })}
                              />
                            </div>
                          </div>
                          <div className="member-toolbar member-action-bar grid shrink-0 gap-1.5 rounded-lg border border-line bg-surface-muted/60 p-1.5 shadow-sm sm:grid-cols-[auto_auto]">
                            <span className="sr-only">执行工具：选择这个成员实际调用哪个 CLI 工具，例如 OpenCode 或 Codex CLI。</span>
                            <span className="member-provider-select inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface pl-2 pr-1 transition-colors hover:border-accent/30">
                              <span className="shrink-0 text-[10px] font-bold text-ink-faint">执行工具</span>
                              <CustomSelect<ProviderName>
                                value={member.provider}
                                onChange={provider => void updateMember(member.id, { provider })}
                                options={PROVIDER_OPTIONS}
                                ariaLabel={`选择 ${member.name} 的执行工具`}
                                className="w-[8.75rem]"
                                buttonClassName="h-7 cursor-pointer gap-1 rounded-md border-transparent bg-transparent px-2 py-0 text-[11px] hover:border-transparent hover:bg-surface-muted focus:ring-2 focus:ring-accent/20"
                                menuClassName="right-auto min-w-[9rem]"
                              />
                            </span>
                            <span className="sr-only">角色灵魂：给执行工具看的完整工作要求，适合写边界、步骤、输出格式和注意事项。</span>
                            <span className="role-soul-edit inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2 transition-colors hover:border-accent/30">
                              <Edit2 className="h-3 w-3 shrink-0 text-ink-faint" aria-hidden />
                              <EditableText
                                value={member.systemPrompt}
                                placeholder="角色灵魂"
                                multiline
                                monospace
                                displayLabel="角色灵魂"
                                alwaysUseDialog
                                longTextDialogTitle="编辑角色灵魂"
                                className="h-6 w-auto cursor-pointer whitespace-nowrap rounded-md border border-transparent bg-transparent px-0 py-0 text-[11px] font-semibold text-ink-soft hover:bg-transparent hover:text-accent focus:ring-2 focus:ring-accent/20"
                                onSave={value => updateMember(member.id, { systemPrompt: value })}
                              />
                            </span>
                          </div>
                        </div>

                        <div className="member-field-grid mt-3 grid gap-x-5 gap-y-3 border-t border-line pt-3 md:grid-cols-2">
                          <div className="min-w-0">
                            <div className="member-field-label">
                              <FieldLabel help="负责什么：写清楚它主要产出什么，例如 搜集资料、写方案、做审查。">负责什么</FieldLabel>
                            </div>
                            <EditableText
                              value={member.responsibility ?? ''}
                              placeholder="负责什么"
                              multiline
                              longTextDialogTitle="编辑负责什么"
                              className="mt-0.5 px-0 text-[12.5px] leading-5 hover:bg-transparent"
                              onSave={value => updateMember(member.id, { responsibility: value })}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="member-field-label">
                              <FieldLabel help="什么时候用它：写清楚什么情况下该找它，例如 用户要查资料时。">什么时候用它</FieldLabel>
                            </div>
                            <EditableText
                              value={member.whenToUse ?? ''}
                              placeholder="什么时候用它"
                              multiline
                              longTextDialogTitle="编辑什么时候用它"
                              className="mt-0.5 px-0 text-[12.5px] leading-5 hover:bg-transparent"
                              onSave={value => updateMember(member.id, { whenToUse: value })}
                            />
                          </div>

                          <div className="relative flex min-w-0 flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[12px] text-ink-soft md:col-span-2">
                              <div className="member-field-label">
                                <FieldLabel help="Skill：从系统维护或系统扫描到的 Skill 中选择这个成员运行时需要的能力包。">Skill</FieldLabel>
                              </div>
                            {memberSkillRefs.length === 0 ? (
                              <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-faint">未配置</span>
                            ) : (
                              memberSkillRefs.map(ref => {
                                const refKey = skillRefKey(ref)
                                return (
                                  <span
                                    key={refKey}
                                    className="inline-flex max-w-[12rem] items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-soft"
                                  >
                                    <span className="truncate">{ref.name}</span>
                                    <span className="rounded bg-surface-muted px-1 text-[10px] font-bold text-ink-faint">{skillSourceLabel(ref.source)}</span>
                                    <button
                                      type="button"
                                      onClick={() => void onRemoveMemberSkill(member, refKey)}
                                      className="inline-flex h-4 w-4 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                                      aria-label={`移除 ${member.name} 的 ${ref.name} Skill`}
                                    >
                                      <X className="h-3 w-3" aria-hidden />
                                    </button>
                                  </span>
                                )
                              })
                            )}
                            <button
                              type="button"
                              onClick={() => setSkillPickerMemberId(current => current === member.id ? null : member.id)}
                              className="inline-flex h-6 cursor-pointer items-center justify-center rounded border border-dashed border-line bg-transparent px-2 text-[11px] text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                              aria-label={`给 ${member.name} 添加 Skill`}
                            >
                              + 添加
                            </button>
                            {skillPickerMemberId === member.id && (
                              <div className="absolute left-0 top-full layer-dropdown mt-1 w-72 rounded-xl border border-line bg-surface p-2 shadow-xl">
                                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">可用 Skill</p>
                                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                  {availableSkillOptions.length === 0 ? (
                                    <p className="px-2 py-3 text-[12px] text-ink-soft">没有可添加的 Skill</p>
                                  ) : availableSkillOptions.map(option => (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => void onSelectMemberSkill(member, option.key)}
                                      className="flex w-full flex-col rounded-lg px-2 py-2 text-left text-ink transition-colors hover:bg-surface-muted"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate text-[13px] font-semibold">{option.name}</span>
                                        <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-faint">{skillSourceLabel(option.source)}</span>
                                      </span>
                                      {option.description && (
                                        <span className="mt-0.5 line-clamp-2 text-[11px] text-ink-faint">{option.description}</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          ) : activeSubtab === 'rules' ? (
            <section className="mt-4 space-y-4">
              <div className="rounded-[10px] border border-line bg-surface-muted/70 px-4 py-3.5">
                <FieldLabel help="这段内容会进入 Team 成员运行时的系统提示，决定团队如何协作、接力和收敛。">团队协作说明</FieldLabel>
                <EditableText
                  value={activeVersion.workflowPrompt ?? ''}
                  placeholder="点击编辑团队协作说明"
                  multiline
                  longTextDialogTitle="编辑团队协作说明"
                  alwaysUseDialog
                  className="mt-1 px-0 text-[12.5px] leading-6 hover:bg-transparent"
                  onSave={value => saveSelected({ version: { workflowPrompt: value } })}
                />
              </div>

              <div className="rounded-[10px] border border-line bg-surface-muted/70 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <FieldLabel help="定义什么情况应该交给哪个角色。生成 Team 时标准格式是 when -> memberRole。">协作路由规则</FieldLabel>
                    <p className="mt-1 text-[12px] leading-5 text-ink-soft">每条规则描述一个触发条件，以及应该接力给的成员角色。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void addRoutingRule()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    添加规则
                  </button>
                </div>

                <div className="mt-3 space-y-2.5">
                  {routingRules.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-line bg-surface px-3 py-3 text-[12px] text-ink-soft">暂无路由规则。</p>
                  ) : routingRules.map((rule, index) => (
                    <div key={`${rule.when}-${rule.memberRole}-${index}`} className="rounded-lg border border-line bg-surface px-3 py-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto] md:items-start">
                        <div>
                          <FieldLabel>触发条件</FieldLabel>
                          <EditableText
                            value={rule.when}
                            placeholder="例如：需求不清时"
                            multiline
                            longTextDialogTitle="编辑触发条件"
                            className="mt-0.5 px-0 text-[12.5px] leading-5 hover:bg-transparent"
                            onSave={value => updateRoutingRule(index, { when: value })}
                          />
                        </div>
                        <div>
                          <FieldLabel>交给角色</FieldLabel>
                          <EditableText
                            value={rule.memberRole}
                            placeholder="例如：需求澄清"
                            className="mt-0.5 px-0 text-[12.5px] leading-5 hover:bg-transparent"
                            onSave={value => updateRoutingRule(index, { memberRole: value })}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeRoutingRule(index)}
                          className="inline-flex h-8 items-center gap-1 self-start rounded-lg px-2 text-[11px] font-semibold text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger)]/8"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </section>
          ) : activeSubtab === 'memory' ? (
            <section className="mt-4 rounded-[10px] border border-line bg-surface-muted/70 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <FieldLabel help="保存 Team 级别的长期偏好、约束和经验，用于后续 Team 演进和协作配置。">Team 长期记忆</FieldLabel>
                  <p className="mt-1 text-[12px] leading-5 text-ink-soft">每条记忆应该是可复用的团队规则或偏好。</p>
                </div>
                <button
                  type="button"
                  onClick={() => void addTeamMemory()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  添加记忆
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                {teamMemory.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-surface px-3 py-3 text-[12px] text-ink-soft">暂无长期记忆。</p>
                ) : teamMemory.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <EditableText
                        value={item}
                        placeholder="例如：交付前必须说明验证证据"
                        multiline
                        longTextDialogTitle="编辑 Team 长期记忆"
                        className="px-0 py-0 text-[12.5px] leading-5 hover:bg-transparent"
                        onSave={value => updateTeamMemory(index, value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeTeamMemory(index)}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger)]/8"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <ConstructionPanel
              title={TEAM_SUBTABS.find(item => item.id === activeSubtab)?.label ?? '设置'}
              description={TEAM_SUBTABS.find(item => item.id === activeSubtab)?.description ?? '此区域稍后开放。'}
            />
          )}
        </section>
      )}
    </div>
  )
}
