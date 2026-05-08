import { AlertTriangle, Loader2, X } from 'lucide-react'

import { getAgentColor, type Agent } from '@/lib/agents'
import { AgentAvatar } from '../AgentAvatar'

interface EvolutionFeedbackModalProps {
  draft: string
  output: string
  error: string | null
  creating: boolean
  teamName?: string
  currentVersionNumber?: number
  busyAgents?: Agent[]
  stoppingAndSubmitting?: boolean
  onDraftChange: (draft: string) => void
  onClose: () => void
  onSubmit: (feedback: string) => void | Promise<void>
  onStopBusyAgentsAndSubmit?: (feedback: string) => void | Promise<void>
}

export function EvolutionFeedbackModal({
  draft,
  output,
  error,
  creating,
  teamName,
  currentVersionNumber,
  busyAgents = [],
  stoppingAndSubmitting = false,
  onDraftChange,
  onClose,
  onSubmit,
  onStopBusyAgentsAndSubmit,
}: EvolutionFeedbackModalProps) {
  const roomBusy = busyAgents.length > 0
  const actionInProgress = creating || stoppingAndSubmitting
  const currentVersionLabel = `v${currentVersionNumber ?? '?'}`
  const nextVersionLabel = typeof currentVersionNumber === 'number' ? `v${currentVersionNumber + 1}` : 'v?'

  return (
    <div className="fixed inset-0 layer-modal flex items-end sm:items-start justify-center bg-[color:var(--overlay-scrim)] px-0 pt-0 sm:px-4 sm:pt-20">
      <div className="flex max-h-[80dvh] w-full max-w-[580px] flex-col overflow-hidden rounded-t-[16px] rounded-b-none sm:rounded-[14px] border border-line bg-surface shadow-[0_30px_80px_-10px_rgba(20,15,8,0.35)]">
        <div className="flex h-6 shrink-0 items-center justify-center sm:hidden">
          <span className="h-1 w-9 rounded-full bg-line" aria-hidden />
        </div>

        <div className="shrink-0 border-b border-line px-4 pb-4 pt-1 sm:px-6 sm:pb-3 sm:pt-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-[20px] font-medium leading-tight text-ink sm:text-[22px]">改进这支 Team</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="关闭改进建议"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
            <span>{teamName ?? '当前 Team'}</span>
            <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-ink-soft">
              {currentVersionLabel} → {nextVersionLabel}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-6">
          <label className="block font-display text-[16px] font-medium text-ink" htmlFor="team-evolution-feedback">
            这支 Team <em>下次怎么做</em> 会更好？
          </label>
          <textarea
            id="team-evolution-feedback"
            value={draft}
            onChange={event => onDraftChange(event.target.value.slice(0, 600))}
            rows={5}
            maxLength={600}
            className="mt-2 min-h-[110px] w-full resize-none rounded-lg border border-line bg-surface-muted px-3 py-3 text-[13.5px] leading-6 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            placeholder="例如：下次先问清楚限制条件，再开始给方案。"
          />
          <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-ink-soft">
            <span>系统会自动结合现场记录归纳出 Team 升级建议</span>
            <span className="shrink-0 font-mono">{draft.length} / 600</span>
          </div>

          {roomBusy && (
            <div
              data-testid="evolution-room-busy-warning"
              className="mt-3 rounded-lg border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-2.5"
            >
              <div className="flex gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-ink">
                    当前还有 {busyAgents.length} 位成员在执行
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {busyAgents.map(agent => {
                      const color = getAgentColor(agent.name)
                      const statusLabel = agent.status === 'thinking' ? '输出中…' : '等待中'
                      return (
                        <span key={agent.id} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                          <AgentAvatar name={agent.name} color={color.bg} textColor={color.text} size={16} className="rounded-full" />
                          {agent.name} · {statusLabel}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-[color:var(--danger)]/8 px-3 py-2 text-[12px] text-[color:var(--danger)]">
              {error}
            </p>
          )}
          {(creating || output.trim().length > 0) && (
            <div className="mt-3 rounded-lg border border-line bg-surface px-3 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
                Team Architect
              </p>
              <div
                className="custom-scrollbar mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted px-3 py-2 text-[12px] leading-relaxed text-ink-soft"
                aria-live="polite"
              >
                {output}
                {creating && <span className="ml-0.5 animate-pulse text-accent">|</span>}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-line bg-surface-muted px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {roomBusy && onStopBusyAgentsAndSubmit ? (
            <button
              type="button"
              onClick={() => { void onStopBusyAgentsAndSubmit(draft) }}
              disabled={actionInProgress || !draft.trim()}
              className="order-2 sm:order-1 text-center text-[12px] font-medium text-ink-soft underline decoration-ink-faint underline-offset-4 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 sm:text-left"
            >
              {stoppingAndSubmitting ? '正在停止并生成…' : '停止当前执行并生成改进'}
            </button>
          ) : (
            <span className="order-2 sm:order-1 text-center text-[12px] text-ink-faint sm:text-left">Team Architect 会读取本次现场记录</span>
          )}
          <div className="order-1 flex w-full shrink-0 items-center gap-2 sm:order-2 sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="hidden h-9 items-center rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted sm:inline-flex"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => { void onSubmit(draft) }}
              disabled={actionInProgress || !draft.trim() || roomBusy}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              生成改进建议
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
