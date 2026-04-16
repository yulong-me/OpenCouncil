'use client'

import { X, CornerDownLeft } from 'lucide-react'
import { type OutgoingQueueItem, AGENT_COLORS, DEFAULT_AGENT_COLOR } from '../lib/agents'

export interface OutgoingMessageQueueProps {
  items: OutgoingQueueItem[]
  dispatchingId: string | null
  onCancel: (itemId: string) => void
  onRecall: (itemId: string) => void
  inputHasDraft: boolean
  agents: { id: string; name: string }[]
}

export default function OutgoingMessageQueue({
  items,
  dispatchingId,
  onCancel,
  onRecall,
  inputHasDraft,
}: OutgoingMessageQueueProps) {
  if (items.length === 0) return null

  return (
    <div className="px-4 md:px-8 py-2 bg-surface/80 backdrop-blur-sm rounded-xl border border-line shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider shrink-0">
          发送队列
        </span>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isDispatching = item.status === 'dispatching' || item.id === dispatchingId
          const colors = AGENT_COLORS[item.toAgentName] || DEFAULT_AGENT_COLOR

          return (
            <div
              key={item.id}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-line bg-surface-muted/30 hover:bg-surface-muted/50 transition-all"
            >
              {/* Queue position */}
              <span className="text-[10px] font-semibold text-ink-soft/50 tabular-nums">
                {index + 1}
              </span>

              {/* Agent tag */}
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `${colors.bg}15`,
                  color: colors.bg,
                }}
              >
                @{item.toAgentName}
              </span>

              {/* Content preview */}
              <span className="text-[12px] text-ink-soft max-w-[120px] md:max-w-[200px] truncate">
                {item.content.length > 60 ? item.content.slice(0, 60) + '...' : item.content}
              </span>

              {/* Status indicator */}
              {isDispatching && (
                <span className="text-[10px] text-ink-soft/60 animate-pulse">
                  发送中…
                </span>
              )}

              {/* Action buttons (shown on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                {/* Recall button - only for last item */}
                <button
                  onClick={() => onRecall(item.id)}
                  disabled={!isLast || inputHasDraft}
                  title={
                    inputHasDraft
                      ? '输入框有草稿，无法撤回'
                      : !isLast
                        ? '只能撤回最后一条'
                        : '撤回'
                  }
                  className={`p-1 rounded transition-colors ${
                    !isLast || inputHasDraft
                      ? 'text-ink-soft/30 cursor-not-allowed'
                      : 'text-ink-soft hover:text-ink hover:bg-surface-muted'
                  }`}
                >
                  <CornerDownLeft size={12} />
                </button>

                {/* Cancel button */}
                <button
                  onClick={() => onCancel(item.id)}
                  title="取消"
                  className="p-1 rounded text-ink-soft/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
