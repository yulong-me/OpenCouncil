'use client'

import { memo, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { ChevronDown, Wrench, Copy, Maximize2, FileVideo, Music2, Loader2 } from 'lucide-react'
import {
  TIME_FORMATTER,
  extractMentions,
  getAgentColor,
  mdComponents,
  type Agent,
  type DiscussionState,
  type Message,
  type ToolCall,
} from '../lib/agents'
import { getMessageInvocationUsage } from '../lib/telemetry'
import { BubbleSection } from './BubbleSection'
import { AgentAvatar } from './AgentAvatar'
import { ErrorBubble, type AgentRunErrorEvent } from './ErrorBubble'
import { BubbleErrorBoundary } from './BubbleErrorBoundary'
import { MetadataBadge } from './MetadataBadge'
import { getWorkspaceMediaUrl } from '../lib/workspace'

const userMarkdownComponents = {
  ...mdComponents,
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 break-words text-bg">{children}</p>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="mb-2 mt-3 text-base font-bold text-bg first:mt-0">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="mb-2 mt-3 text-sm font-bold text-bg first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-bg first:mt-0">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-2 list-disc space-y-0.5 pl-5 text-bg">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-bg">{children}</ol>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="my-2 border-l-2 border-bg/35 pl-3 italic text-bg/80">{children}</blockquote>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-bg underline underline-offset-2 opacity-90 hover:opacity-100">{children}</a>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-2 overflow-x-auto rounded-lg bg-bg/10 p-3 font-mono text-xs text-bg">{children}</pre>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="rounded bg-bg/10 px-1.5 py-0.5 font-mono text-[0.85em] text-bg">{children}</code>,
}

type MediaAttachmentKind = 'video' | 'audio'

interface MediaAttachment {
  path: string
  name: string
  kind: MediaAttachmentKind
  sourceUrl: string
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'webm'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac'])
const MEDIA_PATH_PATTERN = /(^|[\s([`'"：:])((?:\/[^\n\r`'"<>|]+?)\.(?:mp4|m4v|mov|webm|mp3|m4a|aac|wav|ogg|flac))(?=$|[\s)\]`'"，。；;,.!?！?<>])/gi

function mediaKindForPath(path: string): MediaAttachmentKind | null {
  const extension = path.split('.').pop()?.toLowerCase()
  if (!extension) return null
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio'
  return null
}

function fileNameForPath(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

function extractMediaAttachments(content: string): MediaAttachment[] {
  const attachments: MediaAttachment[] = []
  const seen = new Set<string>()

  for (const match of content.matchAll(MEDIA_PATH_PATTERN)) {
    const path = match[2]?.trim()
    if (!path || seen.has(path)) continue

    const kind = mediaKindForPath(path)
    if (!kind) continue

    seen.add(path)
    attachments.push({
      path,
      kind,
      name: fileNameForPath(path),
      sourceUrl: getWorkspaceMediaUrl(path),
    })
  }

  return attachments
}

interface MessageListProps {
  roomId?: string
  messages: Message[]
  agents: Agent[]
  state: DiscussionState
  teamId?: string
  teamName?: string
  loading?: boolean
  sending: boolean
  messageErrorMap: Record<string, AgentRunErrorEvent>
  orphanErrors: AgentRunErrorEvent[]
  showScrollBtn: boolean
  containerRef: RefObject<HTMLDivElement>
  onScroll: () => void
  onScrollToBottom: () => void
  onPrefillMention: (agent: Agent) => void
  onRetryFailedMessage: (error: AgentRunErrorEvent) => void
  onRestoreFailedInput: (content?: string) => void
  onCopyFailedPrompt: (content?: string) => void
  onTryAnotherAgent: (error: AgentRunErrorEvent, nextAgentId: string) => void
}

interface MessageBubbleProps {
  msg: Message
  agentNames: string[]
  agentNameSet: Set<string>
  agentById: Map<string, Agent>
  handoffInfo?: A2AHandoffInfo
  state: DiscussionState
  sending: boolean
  runError?: AgentRunErrorEvent
  hoveredToolCall: string | null
  expandedToolCall: string | null
  hoverTimerRef: MutableRefObject<number | null>
  onHoverToolCall: (key: string | null) => void
  onToggleExpandedToolCall: (key: string | null) => void
  onRetryFailedMessage: (error: AgentRunErrorEvent) => void
  onRestoreFailedInput: (content?: string) => void
  onCopyFailedPrompt: (content?: string) => void
  onTryAnotherAgent: (error: AgentRunErrorEvent, nextAgentId: string) => void
}

interface A2AHandoffInfo {
  fromAgentName: string
  depth: number
}

function getMentionTargets(msg: Message, agentNames: string[], agentNameSet: Set<string>) {
  const mentions = msg.effectiveMentions ?? extractMentions(msg.content, agentNames)
  return mentions.filter(name => agentNameSet.has(name))
}

function getHandoffOffsetClass(handoffInfo?: A2AHandoffInfo) {
  if (!handoffInfo) return ''
  const depth = Math.min(Math.max(handoffInfo.depth, 1), 3)
  if (depth === 1) return 'ml-4 md:ml-6'
  if (depth === 2) return 'ml-7 md:ml-10'
  return 'ml-10 md:ml-14'
}

function getStreamingStatusLabel(msg: Message, hasToolCalls: boolean, state: DiscussionState) {
  if (state === 'DONE') return '已结束'
  if (msg.thinking?.trim() && !msg.content.trim()) return '思考中…'
  if (msg.content.trim()) return '输出中…'
  if (hasToolCalls) return '处理中…'
  return '等待响应'
}

function MediaAttachments({ attachments }: { attachments: MediaAttachment[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3 space-y-3">
      {attachments.map(attachment => (
        <section key={attachment.path} className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/60 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                {attachment.kind === 'video' ? <FileVideo className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-ink">
                  {attachment.kind === 'video' ? '视频文件' : '音频文件'} · {attachment.name}
                </p>
                <p className="truncate text-[11px] text-ink-soft/70" title={attachment.path}>
                  {attachment.path}
                </p>
              </div>
            </div>
            <a
              href={attachment.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-accent"
            >
              打开
            </a>
          </div>
          <div className="bg-black/5 p-3">
            {attachment.kind === 'video' ? (
              <video controls preload="metadata" className="max-h-[420px] w-full rounded-lg bg-black" src={attachment.sourceUrl} />
            ) : (
              <audio controls preload="metadata" className="w-full" src={attachment.sourceUrl} />
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

function ChatLoadingSkeleton() {
  return (
    <div className="flex min-h-44 items-center justify-center px-4" aria-busy="true" aria-label="加载聊天记录">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface px-4 py-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
          加载聊天记录…
        </div>
        <div className="space-y-3">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-3 w-full animate-pulse rounded-full bg-surface-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-surface-muted" />
        </div>
      </div>
    </div>
  )
}

export const MessageList = memo(function MessageList({
  roomId,
  messages,
  agents,
  state,
  teamId,
  teamName,
  loading = false,
  sending,
  messageErrorMap,
  orphanErrors,
  showScrollBtn,
  containerRef,
  onScroll,
  onScrollToBottom,
  onPrefillMention,
  onRetryFailedMessage,
  onRestoreFailedInput,
  onCopyFailedPrompt,
  onTryAnotherAgent,
}: MessageListProps) {
  const [hoveredToolCall, setHoveredToolCall] = useState<string | null>(null)
  const [expandedToolCall, setExpandedToolCall] = useState<string | null>(null)
  const hoverTimerRef = useRef<number | null>(null)

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  )
  const agentNames = useMemo(() => agents.map(a => a.name), [agents])
  const agentNameSet = useMemo(() => new Set(agentNames), [agentNames])
  const agentById = useMemo(() => new Map(agents.map(agent => [agent.id, agent])), [agents])
  const handoffByMessageId = useMemo(() => {
    const handoffMap = new Map<string, A2AHandoffInfo>()
    let previousAgentMessage: Message | null = null

    for (const msg of sortedMessages) {
      const isUser = msg.agentRole === 'USER'
      const isSystem = msg.type === 'system'

      if (isUser) {
        previousAgentMessage = null
        continue
      }
      if (isSystem) continue

      if (previousAgentMessage) {
        const targets = getMentionTargets(previousAgentMessage, agentNames, agentNameSet)
        if (targets.includes(msg.agentName)) {
          const previousHandoff = handoffMap.get(previousAgentMessage.id)
          handoffMap.set(msg.id, {
            fromAgentName: previousAgentMessage.agentName,
            depth: Math.min((previousHandoff?.depth ?? 0) + 1, 3),
          })
        }
      }

      previousAgentMessage = msg
    }

    return handoffMap
  }, [agentNameSet, agentNames, sortedMessages])

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 md:px-8 md:py-6 md:space-y-6 custom-scrollbar" ref={containerRef} onScroll={onScroll}>
      {sortedMessages.map(msg => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          agentNames={agentNames}
          agentNameSet={agentNameSet}
          agentById={agentById}
          handoffInfo={handoffByMessageId.get(msg.id)}
          state={state}
          sending={sending}
          runError={messageErrorMap[msg.id] ?? msg.runError}
          hoveredToolCall={hoveredToolCall}
          expandedToolCall={expandedToolCall}
          hoverTimerRef={hoverTimerRef}
          onHoverToolCall={setHoveredToolCall}
          onToggleExpandedToolCall={setExpandedToolCall}
          onRetryFailedMessage={onRetryFailedMessage}
          onRestoreFailedInput={onRestoreFailedInput}
          onCopyFailedPrompt={onCopyFailedPrompt}
          onTryAnotherAgent={onTryAnotherAgent}
        />
      ))}

      {orphanErrors.map(roomError => (
        <div key={roomError.traceId} className="mb-6">
          <ErrorBubble
            error={roomError}
            retryDisabled={sending}
            restoreDisabled={false}
            onRetry={() => onRetryFailedMessage(roomError)}
            onRestore={() => onRestoreFailedInput(roomError.originalUserContent)}
            onCopy={() => onCopyFailedPrompt(roomError.originalUserContent)}
            alternateAgents={agents
              .filter(agent => agent.role === 'WORKER' && agent.id !== (roomError.toAgentId ?? roomError.agentId))
              .map(agent => ({ id: agent.id, name: agent.name }))}
            onTryAnotherAgent={(nextAgentId) => onTryAnotherAgent(roomError, nextAgentId)}
          />
        </div>
      ))}

      {loading && roomId && sortedMessages.length === 0 && (
        <ChatLoadingSkeleton />
      )}

      {!loading && sortedMessages.length === 0 && roomId && (
        <div className="flex min-h-[24rem] items-center justify-center px-4 py-8 text-center text-ink-soft">
          <div className="w-full max-w-[560px]">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">· 现场已就绪 ·</p>
            <h2 className="font-display text-[36px] font-normal leading-[1.15] text-ink">
              从 <span className="italic text-accent">@一位专家</span> 开始
            </h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[13px] leading-6 text-ink-soft">
              {teamId === 'software-development'
                ? (
                    <>
                      每条消息都需要明确收件人。软件开发任务建议先找
                      <strong className="font-medium text-ink">主架构师</strong>
                      出方案，再让
                      <strong className="font-medium text-ink">挑战架构师</strong>
                      找茬收敛；达成一致后交给
                      <strong className="font-medium text-ink">实现工程师</strong>
                      ，最后由
                      <strong className="font-medium text-ink">Reviewer</strong>
                      做质量门禁。
                    </>
                  )
                : `${teamName ?? '当前 Team'} 会按成员职责协作。先 @ 最适合启动任务的成员，说清目标、交付物和边界；后续接力会在房间里可见。`}
            </p>
            {agents.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {agents.slice(0, 5).map(agent => {
                  const agentColors = getAgentColor(agent.name)
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      data-empty-room-agent-pill="true"
                      onClick={() => onPrefillMention(agent)}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 text-[12px] font-medium text-ink shadow-sm transition-colors hover:border-accent/45 hover:bg-surface-muted hover:text-accent"
                    >
                      <AgentAvatar
                        name={agent.name}
                        color={agentColors.bg}
                        textColor={agentColors.text}
                        size={20}
                        className="rounded-full"
                      />
                      <span className="font-mono text-ink-faint">@</span>
                      <span>{agent.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {teamId === 'software-development' && (
              <div className="mx-auto mt-7 rounded-[10px] border border-dashed border-line bg-surface-muted/70 px-4 py-3 text-left text-[12px] leading-6 text-ink-soft">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">建议这样开场</p>
                <p className="mt-1.5">
                  <span className="font-semibold text-accent">@主架构师</span> 我们要把 thermal_curve.py 重构成可注入的策略类，
                  目标：减少散热 if/else 嵌套；交付：方案文档 + 关键接口；边界：保持现有热阈值不变。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {showScrollBtn && (
        <button
          onClick={onScrollToBottom}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 layer-local-float bg-accent text-on-accent px-4 py-2 rounded-full text-xs font-medium shadow-lg hover:bg-accent-deep transition-colors flex items-center gap-1.5"
        >
          <ChevronDown className="w-3.5 h-3.5" /> 回到底部
        </button>
      )}
    </div>
  )
})

const MessageBubble = memo(function MessageBubble({
  msg,
  agentNames,
  agentNameSet,
  agentById,
  handoffInfo,
  state,
  sending,
  runError,
  hoveredToolCall,
  expandedToolCall,
  hoverTimerRef,
  onHoverToolCall,
  onToggleExpandedToolCall,
  onRetryFailedMessage,
  onRestoreFailedInput,
  onCopyFailedPrompt,
  onTryAnotherAgent,
}: MessageBubbleProps) {
  const isUser = msg.agentRole === 'USER'
  const isSystem = msg.type === 'system'
  const isStreaming = !isUser && !isSystem && (msg.type === 'streaming' || msg.duration_ms === undefined)
  const hasToolCalls = Boolean(msg.toolCalls?.length)
  const streamingStatusLabel = getStreamingStatusLabel(msg, hasToolCalls, state)
  const hasOutput = Boolean(msg.content.trim() || msg.thinking?.trim() || hasToolCalls)
  const agentColor = getAgentColor(msg.agentName).bg
  const handoffOffsetClass = getHandoffOffsetClass(handoffInfo)
  const formattedTime = TIME_FORMATTER.format(new Date(msg.timestamp))
  const hasDurationStat = typeof msg.duration_ms === 'number' && msg.duration_ms > 0
  const hasCostStat = typeof msg.total_cost_usd === 'number' && msg.total_cost_usd > 0
  const hasInputTokensStat = typeof msg.input_tokens === 'number' && msg.input_tokens > 0
  const hasOutputTokensStat = typeof msg.output_tokens === 'number' && msg.output_tokens > 0
  const hasLegacyUsageStats = !isStreaming && (
    hasDurationStat || hasCostStat || hasInputTokensStat || hasOutputTokensStat
  )
  const invocationUsage = getMessageInvocationUsage(msg)
  const mediaAttachments = useMemo(
    () => isStreaming ? [] : extractMediaAttachments(msg.content),
    [isStreaming, msg.content],
  )

  const validMentions = useMemo(() => {
    if (isUser) return []
    if (msg.effectiveMentions) {
      return msg.effectiveMentions.filter(name => agentNameSet.has(name))
    }
    return extractMentions(msg.content, agentNames).filter(name => agentNameSet.has(name))
  }, [agentNameSet, agentNames, isUser, msg.content, msg.effectiveMentions])
  const alternateAgents = useMemo(
    () => runError
      ? Array.from(agentById.values())
          .filter(agent => agent.role === 'WORKER' && agent.id !== (runError.toAgentId ?? runError.agentId))
          .map(agent => ({ id: agent.id, name: agent.name }))
      : [],
    [agentById, runError],
  )

  if (isUser) {
    const toRecipient = msg.toAgentId ? agentById.get(msg.toAgentId) : null
    const toColors = toRecipient ? getAgentColor(toRecipient.name) : null
    return (
      <div className="message-enter mb-4 flex justify-end gap-3 items-start md:mb-6">
        <div className="w-full max-w-[82%] md:max-w-[720px]">
          <div className="mb-1.5 flex items-center justify-end gap-2 text-[11.5px] text-ink-soft">
            <span className="font-medium text-ink-soft">你</span>
            {toRecipient && toColors && (
              <>
                <span className="text-ink-faint">→</span>
                <span className="flex items-center gap-1 font-medium" style={{ color: toColors.bg }}>
                <AgentAvatar name={toRecipient.name} color={toColors.bg} textColor={toColors.text} size={12} className="w-3 h-3 rounded-full" />
                  @{toRecipient.name}
                </span>
              </>
            )}
            <span className="h-1 w-1 rounded-full bg-ink-faint/45" aria-hidden />
            <span className="font-mono text-[11px]">{formattedTime}</span>
            {isStreaming && (
              <span className="flex items-center gap-1 font-medium text-accent">
                <span className="tone-focus-dot inline-block h-1.5 w-1.5 rounded-full animate-focus-pulse" aria-hidden />
                发送中…
              </span>
            )}
          </div>
          <div className="rounded-[12px_12px_4px_12px] bg-ink px-4 py-3.5 text-bg shadow-sm">
            <BubbleErrorBoundary agentName={msg.agentName}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={userMarkdownComponents}
              >
                {msg.content}
              </ReactMarkdown>
            </BubbleErrorBoundary>
            <MediaAttachments attachments={mediaAttachments} />
          </div>
        </div>
      </div>
    )
  }

  if (isSystem) {
    return (
      <div className="flex justify-center mb-3">
        <div className="text-xs px-4 py-2 rounded-lg bg-surface/60 border border-line text-ink-soft max-w-[85%] text-center">
          {msg.content}
        </div>
      </div>
    )
  }

  if (runError && !hasOutput) {
    return (
      <div className={`message-enter group relative flex gap-2 pr-2 mb-4 items-start md:mb-6 md:gap-3 md:pr-0 ${handoffOffsetClass}`}>
        {handoffInfo && (
          <span
            data-a2a-handoff-rail="true"
            className="pointer-events-none absolute -left-4 top-0 h-8 w-4 rounded-bl-lg border-b border-l border-line md:-left-5 md:h-10 md:w-5"
            aria-hidden
          />
        )}
        <div className="h-7 w-7 rounded-full flex-shrink-0 shadow-sm mt-1 overflow-hidden md:h-8 md:w-8">
          <AgentAvatar name={msg.agentName} color={agentColor} size={28} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1 md:max-w-[760px]">
          {handoffInfo && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5">
                由 @{handoffInfo.fromAgentName} 召唤
              </span>
            </div>
          )}
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-semibold" style={{ backgroundColor: `${agentColor}14`, color: agentColor }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agentColor }} />
              {msg.agentName}
            </span>
            <span className="text-[11px] text-ink-soft">
              {formattedTime}
            </span>
          </div>
          <ErrorBubble
            error={runError}
            retryDisabled={sending}
            restoreDisabled={false}
            onRetry={() => onRetryFailedMessage(runError)}
            onRestore={() => onRestoreFailedInput(runError.originalUserContent)}
            onCopy={() => onCopyFailedPrompt(runError.originalUserContent)}
            alternateAgents={alternateAgents}
            onTryAnotherAgent={(nextAgentId) => onTryAnotherAgent(runError, nextAgentId)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`message-enter group relative flex gap-2 pr-2 mb-4 items-start md:mb-6 md:gap-3 md:pr-0 ${handoffOffsetClass}`}>
      {handoffInfo && (
        <span
          data-a2a-handoff-rail="true"
          className="pointer-events-none absolute -left-4 top-0 h-8 w-4 rounded-bl-lg border-b border-l border-line md:-left-5 md:h-10 md:w-5"
          aria-hidden
        />
      )}
      <div className="h-7 w-7 rounded-full flex-shrink-0 shadow-sm mt-1 overflow-hidden md:h-8 md:w-8">
        <AgentAvatar name={msg.agentName} color={agentColor} size={28} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 md:max-w-[760px]">
        {handoffInfo && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5">
              由 @{handoffInfo.fromAgentName} 召唤
            </span>
          </div>
        )}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-semibold" style={{ backgroundColor: `${agentColor}14`, color: agentColor }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agentColor }} />
            {msg.agentName}
          </span>
          <span className="text-[11px] text-ink-soft">
            {formattedTime}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: agentColor }}>
              <span className="animate-focus-pulse">● {streamingStatusLabel}</span>
            </span>
          )}
        </div>
        <div
          className="rounded-[4px_12px_12px_12px] border border-l-2 border-line bg-surface px-4 py-3.5 shadow-sm"
          style={{ borderLeftColor: agentColor, backgroundColor: `${agentColor}08` }}
        >
          <BubbleErrorBoundary agentName={msg.agentName}>
            <BubbleSection label="思考过程" icon="brain" content={msg.thinking ?? ''} isStreaming={isStreaming} agentColor={agentColor} />
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <ToolCalls
                msgId={msg.id}
                toolCalls={msg.toolCalls}
                agentColor={agentColor}
                hoveredToolCall={hoveredToolCall}
                expandedToolCall={expandedToolCall}
                hoverTimerRef={hoverTimerRef}
                onHoverToolCall={onHoverToolCall}
                onToggleExpandedToolCall={onToggleExpandedToolCall}
              />
            )}
            <BubbleSection label="回复" icon="output" content={msg.content} isStreaming={isStreaming} agentColor={agentColor} />
            <MediaAttachments attachments={mediaAttachments} />
          </BubbleErrorBoundary>
          {runError && (
            <div className="mt-3">
              <ErrorBubble
                error={runError}
                retryDisabled={sending}
                restoreDisabled={false}
                onRetry={() => onRetryFailedMessage(runError)}
                onRestore={() => onRestoreFailedInput(runError.originalUserContent)}
                onCopy={() => onCopyFailedPrompt(runError.originalUserContent)}
                alternateAgents={alternateAgents}
                onTryAnotherAgent={(nextAgentId) => onTryAnotherAgent(runError, nextAgentId)}
              />
            </div>
          )}
          {isStreaming && (
            <div className="mt-3 flex items-center gap-2 border-t border-line/70 pt-2 text-[11px] font-medium" style={{ color: agentColor }}>
              <span className="h-1.5 w-1.5 rounded-full animate-focus-pulse" style={{ backgroundColor: agentColor }} />
              <span>{streamingStatusLabel}</span>
            </div>
          )}
        </div>
        {validMentions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
            <span>接力 →</span>
            {validMentions.map(name => (
              <span
                key={name}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: `${agentColor}18`, color: agentColor }}
              >
                @{name}
              </span>
            ))}
          </div>
        )}
        {!isStreaming && invocationUsage && (
          <MetadataBadge usage={invocationUsage} />
        )}
        {!isStreaming && !invocationUsage && hasLegacyUsageStats && (
          <div className="mt-1.5 px-3 py-1.5 bg-surface border border-line rounded-lg text-[11px] text-ink-soft flex flex-wrap gap-x-4 gap-y-1 max-w-fit">
            {hasDurationStat && <span>⏱ {(msg.duration_ms! / 1000).toFixed(1)}s</span>}
            {hasCostStat && <span>💰 ${msg.total_cost_usd!.toFixed(4)}</span>}
            {hasInputTokensStat && <span>📥 {msg.input_tokens}</span>}
            {hasOutputTokensStat && <span>📤 {msg.output_tokens}</span>}
          </div>
        )}
      </div>
    </div>
  )
})

interface ToolCallsProps {
  msgId: string
  toolCalls: ToolCall[]
  agentColor: string
  hoveredToolCall: string | null
  expandedToolCall: string | null
  hoverTimerRef: MutableRefObject<number | null>
  onHoverToolCall: (key: string | null) => void
  onToggleExpandedToolCall: (key: string | null) => void
}

const ToolCalls = memo(function ToolCalls({
  msgId,
  toolCalls,
  agentColor,
  hoveredToolCall,
  expandedToolCall,
  hoverTimerRef,
  onHoverToolCall,
  onToggleExpandedToolCall,
}: ToolCallsProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-xs font-medium mb-2 px-2 py-1 rounded-lg" style={{ color: agentColor, backgroundColor: `${agentColor}10` }}>
        <Wrench className="w-3 h-3" />
        <span>工具调用</span>
        <span className="text-[11px] opacity-50 font-normal tracking-wider">{toolCalls.length} 次</span>
      </div>
      <div className="ml-2 pl-3.5 border-l-2 font-mono text-[13px] flex flex-wrap gap-2 items-center" style={{ borderColor: `${agentColor}40` }}>
        {toolCalls.map((tool, i) => {
          const key = `${msgId}-${tool.callId ?? i}`
          const isHovered = hoveredToolCall === key
          const isExpanded = expandedToolCall === key
          return (
            <div key={tool.callId ?? i} className="relative">
              <span
                className="text-[11px] font-bold px-2 py-1 rounded cursor-help whitespace-nowrap"
                style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
                onMouseEnter={() => {
                  if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
                  onHoverToolCall(key)
                }}
                onMouseLeave={() => {
                  hoverTimerRef.current = window.setTimeout(() => onHoverToolCall(null), 100)
                }}
              >
                {tool.toolName}
              </span>
              {isHovered && (
                <div
                  className="absolute layer-tooltip left-0 top-full mt-1 w-80 bg-surface border border-line rounded-lg shadow-xl text-xs select-text"
                  onMouseEnter={() => {
                    if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
                    onHoverToolCall(key)
                  }}
                  onMouseLeave={() => onHoverToolCall(null)}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-line">
                    <span className="font-medium text-ink-soft">{tool.toolName}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onToggleExpandedToolCall(isExpanded ? null : key)}
                        className="p-1 rounded hover:bg-surface-muted text-ink-soft hover:text-ink transition-colors"
                        title={isExpanded ? '收起' : '全屏'}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(tool.toolInput, null, 2))}
                        className="p-1 rounded hover:bg-surface-muted text-ink-soft hover:text-ink transition-colors"
                        title="复制全部"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <pre className={`text-[11px] text-ink whitespace-pre-wrap break-all p-3 ${isExpanded ? 'max-h-none overflow-y-visible' : 'max-h-48 overflow-y-auto'}`}>{JSON.stringify(tool.toolInput, null, 2)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
