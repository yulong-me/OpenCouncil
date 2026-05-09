'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Edit2, Loader2, Play, Plus, Save, XCircle } from 'lucide-react'

import { API_URL } from '@/lib/api'
import { debug, info, warn } from '@/lib/logger'

import {
  PROVIDER_DOTS,
  PROVIDER_SWATCHES,
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

const PROVIDER_TEST_PROMPT = '说一个简单的词，比如"你好"'

function formatCommandPart(part: string): string {
  if (/^[^\s"']+$/.test(part)) return part
  return JSON.stringify(part)
}

function formatCommand(cli: string, args: string[] = []): string {
  return [cli, ...args].filter(Boolean).map(formatCommandPart).join(' ')
}

function ProviderRunDetails({
  command,
  status,
  result,
  tone = 'neutral',
}: {
  command: string
  status: string
  result: string
  tone?: 'neutral' | 'success' | 'danger'
}) {
  const statusClass = tone === 'success'
    ? 'text-accent'
    : tone === 'danger'
    ? 'text-[color:var(--danger)]'
    : 'text-bg/80'

  return (
    <div className="mt-3 space-y-3 overflow-hidden rounded-lg bg-ink px-4 py-3 font-mono text-[11.5px] leading-6 text-bg">
      <div>
        <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg/45">执行命令</p>
        <pre className="whitespace-pre-wrap break-all"><span className="text-accent">$</span> {command}</pre>
      </div>
      <div>
        <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg/45">执行状态</p>
        <p className={statusClass}>{status}</p>
      </div>
      <div>
        <p className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-bg/45">执行结果</p>
        <pre className="whitespace-pre-wrap break-all text-bg/75">{result}</pre>
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
  onRefreshReadiness?: () => Promise<void> | void
}) {
  const [checkingCommand, setCheckingCommand] = useState(false)
  const [commandCheckStarted, setCommandCheckStarted] = useState(false)
  const [commandCheckStatus, setCommandCheckStatus] = useState('')
  const [commandCheckError, setCommandCheckError] = useState('')
  const [promptTesting, setPromptTesting] = useState(false)
  const [promptTestStarted, setPromptTestStarted] = useState(false)
  const [promptTestCommand, setPromptTestCommand] = useState('')
  const [result, setResult] = useState(provider.lastTestResult)
  const [editing, setEditing] = useState(false)
  const [editCliPath, setEditCliPath] = useState(provider.cliPath)
  const [editContextWindow, setEditContextWindow] = useState(String(provider.contextWindow || 200000))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const readinessMeta = readiness ? READINESS_META[readiness.status] : null

  useEffect(() => {
    setResult(provider.lastTestResult)
    setCommandCheckStarted(false)
    setCommandCheckStatus('')
    setCommandCheckError('')
    setPromptTestStarted(false)
    setPromptTestCommand('')
  }, [provider])

  useEffect(() => {
    setEditCliPath(provider.cliPath)
    setEditContextWindow(String(provider.contextWindow || 200000))
  }, [provider])

  async function handleCommandCheck() {
    setCommandCheckStarted(true)
    setCheckingCommand(true)
    setCommandCheckStatus('执行中…')
    setCommandCheckError('')
    info('ui:settings:provider_command_check', { provider: provider.name })
    try {
      await onRefreshReadiness?.()
      setCommandCheckStatus('执行完成')
    } catch (error) {
      warn('ui:settings:provider_command_check_failed', { provider: provider.name, error })
      setCommandCheckError((error as Error).message || '命令检查失败')
      setCommandCheckStatus('执行失败')
    } finally {
      setCheckingCommand(false)
    }
  }

  async function loadPromptTestCommand() {
    const response = await fetch(`${API}/api/providers/${provider.name}/preview`)
    const preview = await response.json() as { cli?: string; args?: string[]; error?: string }
    if (!response.ok) throw new Error(preview.error || '获取执行命令失败')
    const args = (preview.args || []).map(arg => arg === '<prompt>' ? PROVIDER_TEST_PROMPT : arg)
    return formatCommand(preview.cli || provider.cliPath, args)
  }

  async function handlePromptTest() {
    setPromptTestStarted(true)
    setPromptTesting(true)
    setResult(null)
    setPromptTestCommand('获取执行命令中…')
    info('ui:settings:provider_test', { provider: provider.name })
    let command = formatCommand(provider.cliPath, [PROVIDER_TEST_PROMPT])
    try {
      command = await loadPromptTestCommand()
    } catch (error) {
      warn('ui:settings:provider_preview_failed', { provider: provider.name, error })
    }
    setPromptTestCommand(command)

    try {
      const response = await fetch(`${API}/api/providers/${provider.name}/test`, { method: 'POST' })
      const nextResult = await response.json() as ProviderConfig['lastTestResult'] & { error?: string }
      if (!response.ok) throw new Error(nextResult?.error || '测试失败')
      debug('ui:settings:provider_test_result', {
        provider: provider.name,
        success: Boolean(nextResult?.success),
      })
      if (nextResult?.cli) setPromptTestCommand(nextResult.cli)
      setResult(nextResult)
      await onRefreshReadiness?.()
    } catch (error) {
      warn('ui:settings:provider_test_failed', { provider: provider.name, error })
      setResult({ success: false, error: (error as Error).message || '测试失败' })
    } finally {
      setPromptTesting(false)
    }
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

  function getCommandCheckStatus() {
    if (checkingCommand) return '执行中…'
    if (commandCheckError) return '执行失败'
    if (readiness?.cliAvailable) return '执行成功'
    if (readiness) return '执行失败'
    return commandCheckStatus || '等待执行'
  }

  function getCommandCheckResult() {
    if (checkingCommand) return '等待结果…'
    if (commandCheckError) return commandCheckError
    if (readiness?.cliAvailable) {
      return `${readiness.resolvedPath || provider.cliPath}\nOK · command found`
    }
    if (readiness) return `${readiness.message || 'command not found'}\nFAIL · command not found`
    return commandCheckStatus || '暂无结果'
  }

  function getCommandCheckTone(): 'neutral' | 'success' | 'danger' {
    if (checkingCommand) return 'neutral'
    if (commandCheckError) return 'danger'
    if (readiness?.cliAvailable) return 'success'
    if (readiness) return 'danger'
    return 'neutral'
  }

  function getPromptStatus() {
    if (promptTesting) return '执行中…'
    if (result?.success) return '执行成功'
    if (result) return '执行失败'
    return '等待执行'
  }

  function getPromptResult() {
    if (promptTesting) return '等待结果…'
    if (!result) return '暂无结果'
    const lines = [result.output, result.error].filter(Boolean)
    return lines.length > 0 ? lines.join('\n') : '命令结束，但没有输出。'
  }

  function getPromptTone(): 'neutral' | 'success' | 'danger' {
    if (promptTesting || !result) return 'neutral'
    return result.success ? 'success' : 'danger'
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
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-accent px-3 text-[12px] font-bold text-on-accent transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      )}

      <div
        data-testid="provider-test-stack"
        className="mt-5 space-y-4"
      >
        <section className="rounded-xl border border-line bg-surface-muted p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-[16px] font-bold text-ink">1. 命令是否存在</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                只解析 CLI 路径，不会调用模型或发送 prompt。
              </p>
            </div>
            <button
              type="button"
              onClick={handleCommandCheck}
              disabled={checkingCommand}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {checkingCommand ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              )}
              {checkingCommand ? '检查中…' : '检查命令是否存在'}
            </button>
          </div>

          {commandCheckStarted && (
            <ProviderRunDetails
              command={`command -v ${provider.cliPath}`}
              status={getCommandCheckStatus()}
              result={getCommandCheckResult()}
              tone={getCommandCheckTone()}
            />
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface-muted p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-display text-[16px] font-bold text-ink">2. 命令能否运行实际的 Prompt</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                会启动 Provider CLI，并发送测试 prompt：{PROVIDER_TEST_PROMPT}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePromptTest}
              disabled={promptTesting}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-3 text-[12px] font-bold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {promptTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              )}
              {promptTesting ? '运行中…' : result ? '重新运行测试 Prompt' : '运行测试 Prompt'}
            </button>
          </div>

          {promptTestStarted && (
            <ProviderRunDetails
              command={promptTestCommand || '获取执行命令中…'}
              status={getPromptStatus()}
              result={getPromptResult()}
              tone={getPromptTone()}
            />
          )}
        </section>
      </div>
    </div>
  )
}

export function ProviderSettingsTab({
  providers,
  readiness,
  selectedProvider,
  onSelectProvider,
  onUpdateProvider,
  onRefreshReadiness,
}: {
  providers: Record<string, ProviderConfig>
  readiness: Record<string, ProviderReadiness>
  selectedProvider: string | null
  onSelectProvider: (providerName: string) => void
  onUpdateProvider: (provider: ProviderConfig) => void
  onRefreshReadiness: () => Promise<void> | void
}) {
  const providerList = Object.values(providers)
  const currentProvider = selectedProvider ? providers[selectedProvider] : null

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-surface lg:grid-cols-[250px_minmax(0,1fr)]">
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

      <section className="min-w-0 overflow-y-auto p-6 custom-scrollbar lg:p-8">
        <div className="space-y-5">
          {currentProvider ? (
            <ProviderDetail
              provider={currentProvider}
              readiness={readiness[currentProvider.name]}
              onUpdate={onUpdateProvider}
              onRefreshReadiness={onRefreshReadiness}
            />
          ) : (
            <div className="rounded-xl border border-line bg-surface-muted p-4 text-[13px] text-ink-soft">没有可配置的 Provider。</div>
          )}
        </div>
      </section>
    </div>
  )
}
