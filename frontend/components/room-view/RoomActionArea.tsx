'use client'

import type { RefObject } from 'react'
import { CheckCircle2, FileText, Plus, Sparkles } from 'lucide-react'

import type { Agent, DiscussionState, OutgoingQueueItem } from '@/lib/agents'
import { OutgoingMessageQueue } from '../OutgoingMessageQueue'
import { RoomComposer, type RoomComposerHandle } from '../RoomComposer'

interface RoomActionAreaProps {
  roomId?: string
  state: DiscussionState
  busyAgents: Agent[]
  outgoingQueue: OutgoingQueueItem[]
  recallableQueueItemId: string | null
  composerDraft: string
  sending: boolean
  sendError: string | null
  agents: Agent[]
  lastActiveWorkerId: string | null
  messageCount: number
  participantCount: number
  composerRef: RefObject<RoomComposerHandle | null>
  onCancelQueuedItem: (itemId: string) => void
  onRecallQueuedItem: (itemId: string) => void
  onSend: (content: string) => Promise<boolean>
  onSendError: (message: string, timeoutMs?: number) => void
  onDraftChange: (draft: string) => void
  onRecipientSelected: (agentId: string | null) => void
  onCreateEvolutionProposal: () => void
  onStartNewRoom: () => void
}

export function RoomActionArea({
  roomId,
  state,
  busyAgents,
  outgoingQueue,
  recallableQueueItemId,
  composerDraft,
  sending,
  sendError,
  agents,
  lastActiveWorkerId,
  messageCount,
  participantCount,
  composerRef,
  onCancelQueuedItem,
  onRecallQueuedItem,
  onSend,
  onSendError,
  onDraftChange,
  onRecipientSelected,
  onCreateEvolutionProposal,
  onStartNewRoom,
}: RoomActionAreaProps) {
  if (state === 'DONE') {
    return (
      <div className="border-t border-line bg-nav-bg px-4 py-4 md:px-8">
        <div
          className="rounded-[12px] border border-line bg-surface px-5 py-4 shadow-sm"
          style={{
            backgroundImage: 'linear-gradient(135deg, color-mix(in srgb, var(--success) 11%, transparent) 0%, var(--surface) 52%)',
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--success)]/25 bg-[color:var(--success)]/12 px-2.5 py-1 text-[12px] font-semibold text-[color:var(--success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  任务已结束
                </span>
                <span className="text-[12.5px] text-ink-soft">
                  共 <b>{messageCount}</b> 条消息 · <b>{participantCount}</b> 位成员参与
                </span>
              </div>
              <p className="mt-2 font-display text-[18px] font-medium leading-7 text-ink">
                下次让 Team 做得更好 — 提一条改进意见。
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={onCreateEvolutionProposal}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-on-accent transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                提一条改进意见
              </button>
              <button
                type="button"
                onClick={onStartNewRoom}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-accent/45 hover:text-accent"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                以这次为起点开新任务
              </button>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-end gap-1.5 rounded-md px-1 py-0.5 text-[11.5px] text-ink-faint disabled:cursor-not-allowed"
                title="结论摘要需要独立总结入口，当前版本暂不自动生成"
              >
                <FileText className="h-3 w-3" aria-hidden />
                让 Team 总结一份结论 <span aria-hidden>·</span> <i>暂未启用</i>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line bg-bg px-[22px] py-[14px] pb-[18px]">
      {roomId ? (
        <>
          <OutgoingMessageQueue
            items={outgoingQueue}
            recallableItemId={recallableQueueItemId}
            inputHasDraft={composerDraft.trim().length > 0}
            onCancel={onCancelQueuedItem}
            onRecall={onRecallQueuedItem}
          />
          <RoomComposer
            ref={composerRef as RefObject<RoomComposerHandle>}
            roomId={roomId}
            agents={agents}
            lastActiveWorkerId={lastActiveWorkerId}
            sending={sending}
            queueMode={busyAgents.length > 0}
            sendError={sendError}
            onSend={onSend}
            onSendError={onSendError}
            onDraftChange={onDraftChange}
            onRecipientSelected={onRecipientSelected}
          />
        </>
      ) : null}
    </div>
  )
}
