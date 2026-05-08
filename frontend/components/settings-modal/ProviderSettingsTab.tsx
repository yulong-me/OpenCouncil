'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Edit2, Loader2, Play, Plus, Save, X, XCircle } from 'lucide-react'

import { API_URL } from '@/lib/api'
import { debug, info, warn } from '@/lib/logger'
import { CustomSelect } from '../ui/CustomSelect'

import {
  PROVIDER_DOTS,
  PROVIDER_SWATCHES,
  type ProviderName,
  type ProviderConfig,
  type ProviderReadiness,
} from './types'

const API = API_URL

const READINESS_META = {
  ready: { label: 'Ready', className: 'tone-success-pill border' },
  cli_missing: { label: 'CLI 未安装', className: 'tone-danger-panel border' },
  untested: { label: '待测试', className: 'tone-warning-pill border' },
  test_failed: { label: '测试失败', className: 'tone-danger-panel border' },
} as const

function TeamArchitectProviderSetting({
  providers,
  teamArchitectProvider,
  onTeamArchitectProviderChange,
}: {
  providers: Record<string, ProviderConfig>
  teamArchitectProvider: ProviderName
  onTeamArchitectProviderChange: (provider: ProviderName) => void
}) {
  const [draftProvider, setDraftProvider] = useState<ProviderName>(teamArchitectProvider)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setDraftProvider(teamArchitectProvider)
  }, [teamArchitectProvider])

  const providerOptions = Object.values(providers)
    .filter(provider => provider.name === 'claude-code' || provider.name === 'opencode' || provider.name === 'codex')
    .map(provider => ({
      value: provider.name as ProviderName,
      label: provider.label,
      description: provider.cliPath,
    }))

  async function saveTeamArchitectProvider() {
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API}/api/system-settings/team-architect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: draftProvider }),
      })
      const data = await response.json() as { provider?: ProviderName; error?: string }
      if (!response.ok || !data.provider) throw new Error(data.error || '保存失败')
      onTeamArchitectProviderChange(data.provider)
      info('ui:settings:team_architect_provider_saved', { provider: data.provider })
    } catch (error) {
      warn('ui:settings:team_architect_provider_save_failed', { error })
      setSaveError((error as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[16px] font-bold text-ink">Team Architect Provider</p>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
              仅影响"生成 Team 方案"
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。
          </p>
          <p className="sr-only">Team 方案生成</p>
          <p className="sr-only">生成 Team 方案时使用哪一个执行工具。这里会影响“生成 Team 方案”按钮，不影响已有 Team 成员。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto]">
          <CustomSelect<ProviderName>
            value={draftProvider}
            options={providerOptions}
            onChange={setDraftProvider}
            ariaLabel="选择 Team 方案生成执行工具"
            className="min-w-56"
            buttonClassName="py-2.5 text-[13px]"
          />
          {saveError && <p className="tone-danger-text mt-2 text-[11px]">{saveError}</p>}
          <button
            type="button"
            onClick={saveTeamArchitectProvider}
            disabled={saving || draftProvider === teamArchitectProvider || providerOptions.length === 0}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-[12px] font-bold text-bg transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? '保存中…' : '保存 Team 方案生成工具'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProviderDetail({
  provider,
  readiness,
  onUpdate,
  onRefreshReadiness,
}: {
  provider: ProviderConfig
  readiness?: ProviderReadiness
  onUpdate?: (provider: ProviderConfig) => void
  onRefreshReadiness?: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(provider.lastTestResult)
  const [editing, setEditing] = useState(false)
  const [editCliPath, setEditCliPath] = useState(provider.cliPath)
  const [editContextWindow, setEditContextWindow] = useState(String(provider.contextWindow || 200000))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const readinessMeta = readiness ? READINESS_META[readiness.status] : null

  useEffect(() => {
    setResult(provider.lastTestResult)
  }, [provider])

  useEffect(() => {
    setEditCliPath(provider.cliPath)
    setEditContextWindow(String(provider.contextWindow || 200000))
  }, [provider])

  function handleTest() {
    setTesting(true)
    info('ui:settings:provider_test', { provider: provider.name })
    fetch(`${API}/api/providers/${provider.name}/test`, { method: 'POST' })
      .then(response => response.json())
      .then((nextResult: ProviderConfig['lastTestResult']) => {
        debug('ui:settings:provider_test_result', {
          provider: provider.name,
          success: Boolean(nextResult?.success),
        })
        setResult(nextResult)
        setTesting(false)
        onRefreshReadiness?.()
      })
      .catch(error => {
        warn('ui:settings:provider_test_failed', { provider: provider.name, error })
        setResult({ success: false, error: error.message })
        setTesting(false)
      })
  }

  async function handleSave() {
    setSaveError('')
    setSaving(true)
    try {
      const response = await fetch(`${API}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: provider.name,
          label: provider.label,
          cliPath: editCliPath,
          defaultModel: provider.defaultModel,
          contextWindow: Math.max(Number(editContextWindow) || 200000, 1),
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
          timeout: provider.timeout,
          thinking: provider.thinking,
        }),
      })
      const updated = await response.json() as ProviderConfig
      if (!response.ok) throw new Error(updated.lastTestResult?.error || '保存失败')
      onUpdate?.(updated)
      onRefreshReadiness?.()
      setResult(null)
      setEditing(false)
      info('ui:settings:provider_saved', { provider: provider.name })
    } catch (error) {
      warn('ui:settings:provider_save_failed', { provider: provider.name, error })
      setSaveError((error as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setEditCliPath(provider.cliPath)
    setEditContextWindow(String(provider.contextWindow || 200000))
    setSaveError('')
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold ${PROVIDER_SWATCHES[provider.name as keyof typeof PROVIDER_SWATCHES]}`}
          >
            {provider.label.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="max-w-full truncate font-display text-[28px] font-bold leading-tight text-ink">{provider.label}</h2>
              {readinessMeta && (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${readinessMeta.className}`}>
                  {readinessMeta.label}
                </span>
              )}
              <span className="font-mono text-[11px] text-ink-faint">{provider.name}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-soft">
              本地 CLI · {provider.defaultModel || '默认模型'} · {provider.lastTested ? '已有测试记录' : '尚未测试'}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted"
          >
            <Edit2 className="h-3.5 w-3.5" aria-hidden />
            编辑
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">CLI 路径</p>
          {editing ? (
            <input
              type="text"
              value={editCliPath}
              onChange={event => setEditCliPath(event.target.value)}
              placeholder="claude"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[12px] text-ink">{provider.cliPath}</p>
          )}
          {readiness?.resolvedPath && (
            <p className="mt-1.5 break-all font-mono text-[10.5px] text-ink-faint">resolved · {readiness.resolvedPath}</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint">Context Window</p>
          {editing ? (
            <input
              type="number"
              min={1}
              step={1000}
              value={editContextWindow}
              onChange={event => setEditContextWindow(event.target.value)}
              placeholder="200000"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[12px] text-ink">
              {(provider.contextWindow || 200000).toLocaleString()} tokens
            </p>
          )}
          <p className="mt-1.5 text-[10.5px] text-ink-faint">上下文窗口越大，并发越受限。建议设为模型上限。</p>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {saveError && <p className="tone-danger-text mr-auto text-[11px]">{saveError}</p>}
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-[12px] text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving
              || (
                editCliPath === provider.cliPath
                && Math.max(Number(editContextWindow) || 200000, 1) === (provider.contextWindow || 200000)
              )
            }
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-accent px-3 text-[12px] font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-line bg-surface-muted p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink">连通性测试</h3>
            <p className="mt-1 text-[12px] text-ink-soft">运行状态：{readiness?.message || '尚未测试'}</p>
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            )}
            {testing ? '测试中…' : result ? '重新测试 Provider' : '测试 Provider'}
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg bg-ink px-4 py-3 font-mono text-[11.5px] leading-6 text-bg">
          <div><span className="text-accent">$</span> {provider.cliPath} --version</div>
          {result?.cli && <div><span className="text-accent">$</span> {result.cli}</div>}
          {result?.output && <div className="whitespace-pre-wrap break-all text-bg/75">{result.output}</div>}
          {result?.error && <div className="whitespace-pre-wrap break-all text-[color:var(--danger)]">{result.error}</div>}
          {!result && <div className="text-bg/70">{readiness?.resolvedPath || provider.cliPath}</div>}
          <div>
            {result?.success || readiness?.status === 'ready' ? (
              <span className="text-accent">OK ✓</span>
            ) : (
              <span className="text-[color:var(--warning)]">WAIT</span>
            )}
            {' '}
            {result?.success || readiness?.status === 'ready' ? 'ready for Team' : 'needs test before Team'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProviderSettingsTab({
  providers,
  readiness,
  selectedProvider,
  teamArchitectProvider,
  onSelectProvider,
  onUpdateProvider,
  onTeamArchitectProviderChange,
  onRefreshReadiness,
}: {
  providers: Record<string, ProviderConfig>
  readiness: Record<string, ProviderReadiness>
  selectedProvider: string | null
  teamArchitectProvider: ProviderName
  onSelectProvider: (providerName: string) => void
  onUpdateProvider: (provider: ProviderConfig) => void
  onTeamArchitectProviderChange: (providerName: ProviderName) => void
  onRefreshReadiness: () => void
}) {
  const providerList = Object.values(providers)
  const currentProvider = selectedProvider ? providers[selectedProvider] : null

  return (
    <div className="grid min-h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-line bg-surface lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-bg p-3 lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Provider · {providerList.length}</p>
          <button
            type="button"
            disabled
            title="新建 Provider 即将开放"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft opacity-60"
            aria-label="新建 Provider"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="space-y-1">
          {providerList.map(provider => {
            const statusLabel = readiness[provider.name] ? READINESS_META[readiness[provider.name].status].label : '待测试'
            return (
            <button
              type="button"
              key={provider.name}
              onClick={() => onSelectProvider(provider.name)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selectedProvider === provider.name ? 'border-accent/25 bg-surface text-ink shadow-sm' : 'border-transparent text-ink-soft hover:border-line hover:bg-surface hover:text-ink'}`}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROVIDER_DOTS[provider.name as keyof typeof PROVIDER_DOTS]}`}
                  />
                  <span className="truncate text-[13px] font-bold">{provider.label}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${readiness[provider.name] ? READINESS_META[readiness[provider.name].status].className : 'tone-warning-pill border'}`}>
                  {statusLabel}
                </span>
              </span>
              <span className="mt-1.5 block truncate font-mono text-[10.5px] text-ink-faint">{provider.name}</span>
            </button>
            )
          })}
        </div>
      </aside>

      {currentProvider ? (
        <section className="min-w-0 overflow-y-auto p-4 custom-scrollbar lg:p-6">
          <div className="space-y-5">
            <ProviderDetail
              provider={currentProvider}
              readiness={readiness[currentProvider.name]}
              onUpdate={onUpdateProvider}
              onRefreshReadiness={onRefreshReadiness}
            />
            <TeamArchitectProviderSetting
              providers={providers}
              teamArchitectProvider={teamArchitectProvider}
              onTeamArchitectProviderChange={onTeamArchitectProviderChange}
            />
          </div>
        </section>
      ) : (
        <section className="p-6 text-[13px] text-ink-soft">没有可配置的 Provider。</section>
      )}
    </div>
  )
}
