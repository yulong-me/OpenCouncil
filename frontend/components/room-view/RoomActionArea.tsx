'use client'

import type { RefObject } from 'react'
import { ArrowRight, CheckCircle2, FileText, Sparkles } from 'lucide-react'

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
      <div className="bg-nav-bg border-t border-line px-4 py-4 md:px-8">
        <div className="rounded-lg border border-line bg-surface px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                <span>任务已结束 · 共 {messageCount} 条消息 · {participantCount} 位成员参与</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-muted px-3 py-2 text-[12px] font-semibold text-ink-faint"
                title="结论摘要需要独立总结入口，当前版本暂不自动生成"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                让 Team 总结一份结论
              </button>
              <button
                type="button"
                onClick={onCreateEvolutionProposal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-accent/45 hover:text-accent"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                提一条改进意见
              </button>
              <button
                type="button"
                onClick={onStartNewRoom}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-accent/45 hover:text-accent"
              >
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                以这次为起点，开新任务
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-nav-bg border-t border-line px-4 md:px-8 py-4 flex flex-col gap-3">
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
