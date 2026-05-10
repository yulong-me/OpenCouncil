'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Ban, Check, Loader2, RefreshCcw, X } from 'lucide-react'

import type { EvolutionChangeDecision, EvolutionProposal, EvolutionProposalChange } from './types'

const CHANGE_KIND_LABELS: Record<EvolutionProposalChange['kind'], string> = {
  'add-agent': '招募成员',
  'edit-agent-prompt': '成员提示词',
  'edit-team-workflow': '团队流程',
  'edit-routing-policy': '路由策略',
  'add-team-memory': '团队记忆',
  'add-validation-case': '效果检查',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '空'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function textField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function renderAfterValue(change: EvolutionProposalChange) {
  if (change.kind !== 'add-agent' || !isRecord(change.after)) {
    return (
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-muted p-3 text-[12px] leading-5">
        {stringifyValue(change.after)}
      </pre>
    )
  }

  const name = textField(change.after.name) || '新成员'
  const roleLabel = textField(change.after.roleLabel) || '成员'
  const responsibility = textField(change.after.responsibility)
  const whenToUse = textField(change.after.whenToUse)
  const systemPrompt = textField(change.after.systemPrompt)

  return (
    <div className="rounded-lg border border-line bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-ink">{name}</p>
          <p className="mt-1 text-[12px] text-ink-soft">{roleLabel}</p>
        </div>
        <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
          新增成员
        </span>
      </div>
      {responsibility && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-ink-soft">负责什么</p>
          <p className="mt-1 text-[13px] leading-6 text-ink">{responsibility}</p>
        </div>
      )}
      {whenToUse && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-ink-soft">什么时候用</p>
          <p className="mt-1 text-[13px] leading-6 text-ink">{whenToUse}</p>
        </div>
      )}
      {systemPrompt && (
        <details className="mt-4 rounded-md border border-line bg-surface px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-ink-soft">查看成员提示词</summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-5 text-ink-soft">
            {systemPrompt}
          </pre>
        </details>
      )}
    </div>
  )
}

function renderBeforeValue(change: EvolutionProposalChange) {
  if (change.kind === 'add-agent' && (change.before === null || change.before === undefined)) {
    return (
      <div className="rounded-md bg-surface-muted px-3 py-3 text-[13px] leading-5 text-ink-soft">
        当前团队还没有这个成员。
      </div>
    )
  }
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-muted p-3 text-[12px] leading-5">
      {stringifyValue(change.before)}
    </pre>
  )
}

function decisionText(decision: EvolutionProposalChange['decision']): string {
  if (decision === 'accepted') return '已采纳'
  if (decision === 'rejected') return '不采纳'
  return '待决定'
}

function decisionHelpText(change: EvolutionProposalChange): string {
  if (change.decision === 'accepted') {
    return `${change.title} 已选入本次升级，确认前仍可改为不采纳。`
  }
  if (change.decision === 'rejected') {
    return `${change.title} 不会进入本次升级，确认前仍可改为采纳。`
  }
  return '这条建议尚未决定，请选择采纳或不采纳。'
}

function friendlyErrorText(error?: string | null): string | null {
  if (!error) return null

  const normalized = error.toLowerCase()
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return '网络连接不稳定，刚才的操作没有完成，请稍后再试。'
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return '等待时间过长，刚才的操作没有完成，请稍后再试。'
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('permission')) {
    return '当前账号没有权限完成这个操作，请检查权限后再试。'
  }
  if (normalized.includes('404') || normalized.includes('not found')) {
    return '这次升级内容已经不存在或已被处理，请刷新后再看。'
  }
  if (normalized.includes('409') || normalized.includes('conflict') || normalized.includes('stale')) {
    return '这次升级状态已经变化，请刷新后再操作。'
  }

  return '刚才的操作没有完成，请稍后重试。'
}

function selectNextPendingChangeId(changes: EvolutionProposalChange[], currentChangeId?: string): string | undefined {
  const pendingChanges = changes.filter(change => !change.decision)
  if (pendingChanges.length === 0) return undefined
  const currentIndex = changes.findIndex(change => change.id === currentChangeId)
  const orderedChanges = currentIndex >= 0
    ? [...changes.slice(currentIndex + 1), ...changes.slice(0, currentIndex + 1)]
    : changes
  return orderedChanges.find(change => !change.decision)?.id ?? pendingChanges[0]?.id
}

interface EvolutionReviewModalProps {
  proposal: EvolutionProposal
  teamName?: string
  currentVersionNumber?: number
  decidingChangeId?: string | null
  merging: boolean
  rejecting?: boolean
  regenerating?: boolean
  error?: string | null
  onClose: () => void
  onDecide: (changeId: string, decision: EvolutionChangeDecision) => Promise<void>
  onMerge: () => Promise<void>
  onReject: () => Promise<void>
  onRegenerate: (feedback: string) => Promise<void>
}

export function EvolutionReviewModal({
  proposal,
  teamName,
  currentVersionNumber,
  decidingChangeId,
  merging,
  rejecting = false,
  regenerating = false,
  error,
  onClose,
  onDecide,
  onMerge,
  onReject,
  onRegenerate,
}: EvolutionReviewModalProps) {
  const focusTrapRef = useRef<HTMLDivElement>(null)
  const [activeChangeId, setActiveChangeId] = useState(proposal.changes[0]?.id)
  const [regenerationFeedback, setRegenerationFeedback] = useState('')
  const [regenerationOpen, setRegenerationOpen] = useState(false)

  useEffect(() => {
    setActiveChangeId(proposal.changes[0]?.id)
    setRegenerationFeedback('')
    setRegenerationOpen(false)
  }, [proposal.id])

  useEffect(() => {
    focusTrapRef.current?.focus()
  }, [proposal.id])

  const activeChange = useMemo(
    () => proposal.changes.find(change => change.id === activeChangeId) ?? proposal.changes[0],
    [activeChangeId, proposal.changes],
  )
  const reviewedCount = proposal.changes.filter(change => change.decision).length
  const allReviewed = reviewedCount === proposal.changes.length && proposal.changes.length > 0
  const acceptedCount = proposal.changes.filter(change => change.decision === 'accepted').length
  const rejectedCount = proposal.changes.filter(change => change.decision === 'rejected').length
  const pendingChanges = proposal.changes.filter(change => !change.decision)
  const canMerge = allReviewed && acceptedCount > 0 && proposal.status !== 'applied' && proposal.status !== 'rejected' && proposal.status !== 'expired'
  const actionInProgress = merging || rejecting || regenerating || Boolean(decidingChangeId)
  const displayError = friendlyErrorText(error)
  const currentVersionLabel = `v${currentVersionNumber ?? '?'}`
  const targetVersionLabel = `v${proposal.targetVersionNumber}`
  const remainingCount = proposal.changes.length - reviewedCount
  const teamLabel = teamName ?? '当前团队'
  const progressText = allReviewed
    ? acceptedCount > 0
      ? `已处理全部建议，采纳 ${acceptedCount} 条。`
      : '已处理全部建议，但没有采纳任何建议。'
    : `已处理 ${reviewedCount}/${proposal.changes.length} 条，还有 ${remainingCount} 条。`
  const progressPercent = proposal.changes.length > 0
    ? Math.round((reviewedCount / proposal.changes.length) * 100)
    : 0
  const activeChangeIndex = activeChange
    ? proposal.changes.findIndex(change => change.id === activeChange.id)
    : -1
  const nextPendingChangeId = proposal.changes.find(change => !change.decision && change.id !== activeChange?.id)?.id
  const mergeHelpText = allReviewed
    ? acceptedCount > 0
      ? `可以确认升级到 ${targetVersionLabel}，后续新任务会使用新版 Team。`
      : '没有采纳任何建议，不能升级。请先采纳至少一条建议，或放弃本次升级。'
    : `处理完所有建议后，才能确认升级到 ${targetVersionLabel}。`

  useEffect(() => {
    if (!activeChange?.decision) return
    const nextPendingChangeId = selectNextPendingChangeId(proposal.changes, activeChange.id)
    if (nextPendingChangeId) {
      setActiveChangeId(nextPendingChangeId)
    }
  }, [activeChange?.decision, activeChange?.id, proposal.changes])

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const root = focusTrapRef.current
    if (!root) return
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(element => !element.hasAttribute('disabled') && element.offsetParent !== null)

    if (focusable.length === 0) {
      event.preventDefault()
      root.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function handleCurrentDecision(decision: EvolutionChangeDecision) {
    if (!activeChange) return
    await onDecide(activeChange.id, decision)
  }

  async function handleBulkDecision(decision: EvolutionChangeDecision) {
    for (const change of pendingChanges) {
      await onDecide(change.id, decision)
    }
  }

  function handleContinueNext() {
    if (!nextPendingChangeId) return
    setActiveChangeId(nextPendingChangeId)
  }

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolution-review-title"
      data-testid="evolution-review-modal"
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className="fixed inset-0 layer-modal flex items-start justify-center overflow-auto bg-[color:var(--overlay-scrim)] px-4 py-[60px] text-ink"
    >
      <div className="flex max-h-[800px] w-full max-w-[880px] flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_30px_80px_-10px_rgba(20,15,8,0.4)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 pb-3 pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="evolution-review-title" className="font-display text-[22px] font-medium leading-tight text-ink">升级确认</h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{teamLabel}</span>
              <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                {currentVersionLabel} → {targetVersionLabel}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-5 text-ink-soft">
              确认后，<b className="font-semibold text-ink">新任务</b>会使用新版 Team；已有任务记录不受影响。
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="关闭改进建议"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          data-testid="evolution-review-progress"
          className="grid shrink-0 gap-2 border-b border-line/70 bg-surface-muted px-4 py-3 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-3"
        >
          <span className="shrink-0 font-mono text-[11.5px] uppercase tracking-[0.06em] text-ink-soft">
            已处理 {reviewedCount} / {proposal.changes.length}
          </span>
          <div className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="min-w-0 text-[11.5px] leading-5 text-ink-soft md:shrink-0">
            已采纳 <b className="text-[color:var(--success)]">{acceptedCount}</b> · 不采纳 <b>{rejectedCount}</b> · 待处理 <b>{remainingCount}</b>
          </span>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
          <main data-testid="evolution-review-queue" className="min-h-0 overflow-auto p-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-accent">逐条处理</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">一条建议处理完，再看下一条</h3>
                  <p className="mt-1 text-[13px] leading-5 text-ink-soft">
                    当前展开第 {activeChangeIndex >= 0 ? activeChangeIndex + 1 : 0} 条，先看影响，再决定采纳或不采纳。
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase text-ink-muted">Queue</p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">{reviewedCount}/{proposal.changes.length} 已处理</p>
                </div>
              </div>

              <div data-testid="evolution-change-list" className="space-y-3">
                {proposal.changes.map((change, index) => {
                  const active = change.id === activeChange?.id
                  if (!active) {
                    return (
                      <button
                        key={change.id}
                        type="button"
                        onClick={() => setActiveChangeId(change.id)}
                        className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-muted"
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-md border text-[12px] font-semibold ${
                          change.decision === 'accepted'
                            ? 'border-accent bg-accent text-on-accent'
                            : change.decision === 'rejected'
                              ? 'border-line bg-surface-muted text-ink-soft'
                              : 'border-line text-ink-soft'
                        }`}>
                          {change.decision === 'accepted' ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{change.title}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-ink-soft">
                            {CHANGE_KIND_LABELS[change.kind]} · {change.impact}
                          </span>
                        </span>
                        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                          change.decision === 'accepted'
                            ? 'bg-accent/10 text-accent'
                            : change.decision === 'rejected'
                              ? 'bg-surface-muted text-ink-soft'
                              : 'bg-surface-muted text-ink-muted'
                        }`}>
                          {decisionText(change.decision)}
                        </span>
                      </button>
                    )
                  }

                  return (
                    <article key={change.id} className="rounded-lg border border-accent/40 bg-surface shadow-sm">
                      <div className="grid gap-4 border-b border-line px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-[12px] font-bold text-on-accent">
                              {index + 1}
                            </span>
                            <span className="rounded-md bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
                              {CHANGE_KIND_LABELS[change.kind]}
                            </span>
                            <span className="rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink-soft">
                              {decisionText(change.decision)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{change.title}</h3>
                          <p className="mt-2 text-[13px] leading-6 text-ink-soft">{change.impact}</p>
                        </div>
                        <div className="grid auto-rows-min gap-2 self-start sm:grid-cols-2 lg:w-72">
                          <button
                            type="button"
                            data-testid="evolution-accept-current"
                            onClick={() => { void handleCurrentDecision('accepted') }}
                            disabled={actionInProgress || change.decision === 'accepted'}
                            className="inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
                          >
                            {decidingChangeId === change.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {change.decision === 'accepted' ? '已采纳' : change.decision === 'rejected' ? '改为采纳' : '采纳这条建议'}
                          </button>
                          <button
                            type="button"
                            data-testid="evolution-reject-current"
                            onClick={() => { void handleCurrentDecision('rejected') }}
                            disabled={actionInProgress || change.decision === 'rejected'}
                            className="inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60"
                          >
                            {decidingChangeId === change.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            {change.decision === 'rejected' ? '已不采纳' : '不采纳'}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 p-4">
                        <section className="rounded-lg border border-line bg-nav-bg/60 p-4">
                          <p className="text-[12px] font-semibold text-ink-soft">建议理由</p>
                          <p className="mt-2 text-[14px] leading-6 text-ink">{change.why}</p>
                        </section>
                        <section className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-lg border border-line bg-nav-bg/60 p-4">
                            <p className="text-[12px] font-semibold text-ink-soft">当前状态</p>
                            <div className="mt-2">{renderBeforeValue(change)}</div>
                          </div>
                          <div className="rounded-lg border border-line bg-nav-bg/60 p-4">
                            <p className="text-[12px] font-semibold text-ink-soft">调整后</p>
                            <div className="mt-2">{renderAfterValue(change)}</div>
                          </div>
                        </section>
                        <section className="rounded-lg border border-line bg-nav-bg/60 p-4">
                          <p className="text-[12px] font-semibold text-ink-soft">参考依据</p>
                          <p className="mt-2 break-words text-[12px] leading-5 text-ink-soft">
                            来自本次讨论中的 {change.evidenceMessageIds.length} 条消息。这里不展示消息编号，避免干扰判断。
                          </p>
                        </section>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </main>

          <aside className="min-h-0 w-full border-t border-line bg-surface-muted/70 p-4 md:w-[320px] md:overflow-auto md:border-l md:border-t-0" aria-label="升级确认台">
            {activeChange && (
              <section className="rounded-lg border border-line bg-surface p-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">当前这一条</p>
                <p className="mt-2 font-display text-[16px] font-medium leading-6 text-ink">{activeChange.title}</p>
                <p className="mt-2 text-[12px] leading-5 text-ink-soft">{decisionHelpText(activeChange)}</p>
              </section>
            )}

            <section className="mt-4 rounded-lg border border-line bg-surface p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">升级摘要</p>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-soft">
                当前版本：<span className="font-mono text-ink">{currentVersionLabel}</span><br />
                升级到：<span className="font-mono font-semibold text-accent">{targetVersionLabel}</span><br />
                生效范围：<b>新任务</b> · 旧记录不受影响
                {proposal.feedback ? (
                  <>
                    <br />
                    你的原始意见：「{proposal.feedback}」
                  </>
                ) : null}
              </p>
            </section>

            <section className="mt-4 rounded-lg border border-line bg-surface p-4">
              <p className="text-[12px] font-semibold text-ink-soft">为什么建议改进</p>
              <p className="mt-2 text-[13px] leading-6 text-ink">{proposal.summary}</p>
            </section>

            {pendingChanges.length > 1 && (
              <section className="mt-4 rounded-lg border border-line bg-surface p-4">
                <p className="text-[12px] font-semibold text-ink-soft">批量处理剩余建议</p>
                <p className="mt-2 text-[12px] leading-5 text-ink-soft">
                  还剩 {pendingChanges.length} 条待决定，可以一次性采纳或不采纳。
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    data-testid="evolution-accept-all-pending"
                    onClick={() => { void handleBulkDecision('accepted') }}
                    disabled={actionInProgress}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    采纳剩余
                  </button>
                  <button
                    type="button"
                    data-testid="evolution-reject-all-pending"
                    onClick={() => { void handleBulkDecision('rejected') }}
                    disabled={actionInProgress}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    不采纳剩余
                  </button>
                </div>
              </section>
            )}

            <section className="mt-4 rounded-lg border border-line bg-surface p-4">
              <p className="text-[12px] font-semibold text-ink-soft">其他选择</p>
              <p className="mt-2 text-[12px] leading-5 text-ink-soft">不满意这版，可以补充意见重新生成；也可以放弃本次升级。</p>
              {!regenerationOpen ? (
                <button
                  type="button"
                  onClick={() => setRegenerationOpen(true)}
                  disabled={actionInProgress}
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  重新生成一版
                </button>
              ) : (
                <div className="mt-4">
                  <label className="text-[12px] font-semibold text-ink-soft" htmlFor="team-evolution-regeneration-feedback">
                    你希望怎么改
                  </label>
                  <textarea
                    id="team-evolution-regeneration-feedback"
                    value={regenerationFeedback}
                    onChange={event => setRegenerationFeedback(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-line bg-nav-bg px-3 py-2 text-[13px] leading-5 text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
                    placeholder="例如：视觉设计师还要负责封面图，重新生成一版。"
                  />
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setRegenerationOpen(false)}
                      disabled={regenerating}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => { void onRegenerate(regenerationFeedback) }}
                      disabled={actionInProgress || !regenerationFeedback.trim()}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      重新生成一版
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => { void onReject() }}
                disabled={actionInProgress}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted hover:text-[color:var(--danger)] disabled:cursor-wait disabled:opacity-60"
              >
                {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                放弃本次升级
              </button>
            </section>
          </aside>
        </div>

        <div className="grid shrink-0 gap-3 border-t border-line bg-surface-muted px-5 py-4 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink" aria-live="polite">{mergeHelpText}</p>
            {displayError && (
              <p className="mt-1 text-[12px] leading-5 text-[color:var(--danger)]" aria-live="polite">
                {displayError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted"
            >
              保存并稍后处理
            </button>
            <button
              type="button"
              onClick={handleContinueNext}
              disabled={!nextPendingChangeId || actionInProgress}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              继续下一条
            </button>
            <button
              type="button"
              data-testid="evolution-confirm-upgrade"
              onClick={() => { void onMerge() }}
              disabled={!canMerge || actionInProgress}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {remainingCount > 0 ? <>确认升级 Team · 还需处理 {remainingCount} 条</> : '确认升级 Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
