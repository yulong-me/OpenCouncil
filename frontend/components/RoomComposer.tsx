'use client'

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AtSign,
  Loader2,
  Paperclip,
  Send,
  Zap,
} from 'lucide-react'
import {
  extractUserMentionsFromAgents,
  findActiveMentionTrigger,
  getAgentColor,
  insertMention,
  type Agent,
} from '../lib/agents'
import { telemetry } from '../lib/logger'
import { AgentAvatar } from './AgentAvatar'
import MentionPicker from './MentionPicker'

export interface RoomComposerHandle {
  focus: () => void
  getDraft: () => string
  hasDraft: () => boolean
  setDraft: (value: string) => void
  prefillMention: (agent: Agent) => void
}

interface RoomComposerProps {
  roomId?: string
  agents: Agent[]
  lastActiveWorkerId: string | null
  sending: boolean
  queueMode?: boolean
  sendError: string | null
  onSend: (rawContent: string) => Promise<boolean>
  onSendError: (message: string, timeoutMs?: number) => void
  onDraftChange?: (value: string) => void
  onRecipientSelected: (agentId: string | null) => void
}

export const RoomComposer = memo(forwardRef<RoomComposerHandle, RoomComposerProps>(function RoomComposer({
  roomId,
  agents,
  lastActiveWorkerId,
  sending,
  queueMode = false,
  sendError,
  onSend,
  onSendError,
  onDraftChange,
  onRecipientSelected,
}, ref) {
  const [userInput, setUserInput] = useState('')
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIdx, setMentionStartIdx] = useState(-1)
  const [mentionHighlightIdx, setMentionHighlightIdx] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingInputRef = useRef({ value: '', cursor: 0 })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compositionRef = useRef(false)

  const agentNames = useMemo(() => agents.map(a => a.name), [agents])
  const selectedRecipient = useMemo(() => {
    const mentionNames = extractUserMentionsFromAgents(userInput, agentNames)
    const targetName = mentionNames[0]
    return targetName ? agents.find(agent => agent.name === targetName) ?? null : null
  }, [agentNames, agents, userInput])
  const selectedRecipientColors = selectedRecipient
    ? getAgentColor(selectedRecipient.name)
    : null

  const filteredAgents = useMemo(() => {
    const base = mentionQuery
      ? agents.filter(a => a.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      : agents
    if (!lastActiveWorkerId || mentionQuery) return base
    return [
      ...base.filter(a => a.id === lastActiveWorkerId),
      ...base.filter(a => a.id !== lastActiveWorkerId),
    ]
  }, [agents, mentionQuery, lastActiveWorkerId])

  const openMentionPicker = useCallback((mentionAtIdx: number, query: string, filteredCount?: number) => {
    setMentionPickerOpen(true)
    setMentionQuery(query)
    setMentionStartIdx(mentionAtIdx)
    const defaultHighlight = query === '' && (filteredCount ?? 0) > 1
      ? (filteredCount ?? 1) - 1
      : 0
    setMentionHighlightIdx(defaultHighlight)
  }, [])

  const closeMentionPicker = useCallback(() => {
    setMentionPickerOpen(false)
    setMentionQuery('')
    setMentionStartIdx(-1)
  }, [])

  const focus = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  const setDraft = useCallback((value: string) => {
    setUserInput(value)
    pendingInputRef.current = { value, cursor: value.length }
  }, [])

  const prefillMention = useCallback((agent: Agent) => {
    setUserInput(current => current.trim() ? current : `@${agent.name} `)
    onRecipientSelected(agent.id)
    closeMentionPicker()
    focus()
  }, [closeMentionPicker, focus, onRecipientSelected])

  useImperativeHandle(ref, () => ({
    focus,
    getDraft: () => userInput,
    hasDraft: () => Boolean(userInput.trim()),
    setDraft,
    prefillMention,
  }), [focus, prefillMention, setDraft, userInput])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxH = 200
    const newH = Math.min(ta.scrollHeight, maxH)
    ta.style.height = `${newH}px`
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [userInput])

  useEffect(() => {
    onDraftChange?.(userInput)
  }, [onDraftChange, userInput])

  useEffect(() => {
    onRecipientSelected(selectedRecipient?.id ?? null)
  }, [onRecipientSelected, selectedRecipient?.id])

  useEffect(() => {
    if (!mentionPickerOpen) return
    const onMouseDown = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      if (textareaRef.current?.contains(target)) return
      if (target.closest('[data-mention-picker="1"]')) return
      closeMentionPicker()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [mentionPickerOpen, closeMentionPicker])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (filteredAgents.length === 0) {
      setMentionHighlightIdx(0)
      return
    }
    setMentionHighlightIdx(current => Math.min(current, filteredAgents.length - 1))
  }, [filteredAgents.length])

  const runMentionDetection = useCallback((value: string, cursor: number) => {
    const activeMention = findActiveMentionTrigger(value, cursor, agentNames)
    if (activeMention) {
      const filteredCount = activeMention.query.length > 0
        ? agents.filter(a => a.name.toLowerCase().includes(activeMention.query.toLowerCase())).length
        : agents.length
      openMentionPicker(activeMention.start, activeMention.query, filteredCount)
    } else {
      closeMentionPicker()
    }
  }, [agentNames, agents, closeMentionPicker, openMentionPicker])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionStart ?? val.length
    setUserInput(val)
    pendingInputRef.current = { value: val, cursor }

    if (compositionRef.current) return

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const { value, cursor: c } = pendingInputRef.current
      runMentionDetection(value, c)
      debounceTimerRef.current = null
    }, 150)
  }, [runMentionDetection])

  const handleCompositionStart = useCallback(() => {
    compositionRef.current = true
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    compositionRef.current = false
    const val = e.currentTarget.value
    const cursor = e.currentTarget.selectionStart ?? val.length
    pendingInputRef.current = { value: val, cursor }
    runMentionDetection(val, cursor)
  }, [runMentionDetection])

  const selectMentionAgent = useCallback((agentName: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const cursor = ta.selectionStart ?? userInput.length
    const selectionCursor = mentionStartIdx >= 0 ? cursor : 0
    const insertionStart = mentionStartIdx >= 0 ? mentionStartIdx : 0
    const existingRecipientPattern = selectedRecipient
      ? new RegExp(`^@${selectedRecipient.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`)
      : null
    const baseInput = mentionStartIdx >= 0
      ? userInput
      : existingRecipientPattern
        ? userInput.replace(existingRecipientPattern, '')
        : userInput
    const { nextValue, nextCursor } = insertMention(baseInput, insertionStart, selectionCursor, agentName)
    setDraft(nextValue)
    closeMentionPicker()
    const target = agents.find(a => a.name === agentName)
    if (target) {
      onRecipientSelected(target.id)
      telemetry('ui:mention:pick', { roomId, agentName, agentId: target.id, agentRole: target.role })
    }
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(nextCursor, nextCursor)
    }, 0)
  }, [agents, closeMentionPicker, mentionStartIdx, onRecipientSelected, roomId, selectedRecipient, setDraft, userInput])

  const openRecipientPicker = useCallback(() => {
    setMentionStartIdx(-1)
    setMentionQuery('')
    setMentionHighlightIdx(0)
    setMentionPickerOpen(true)
    focus()
  }, [focus])

  const submitDraft = useCallback(async () => {
    if (sending) return
    const content = userInput.trim()
    if (!content) return
    if (extractUserMentionsFromAgents(content, agentNames).length === 0) {
      openRecipientPicker()
      onSendError('先 @ 选择一位 Team 成员')
      focus()
      return
    }
    setMentionPickerOpen(false)
    const sent = await onSend(content)
    if (sent) {
      setDraft('')
    }
  }, [agentNames, focus, onSend, onSendError, openRecipientPicker, sending, setDraft, userInput])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void submitDraft()
      return
    }
    if (!mentionPickerOpen) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void submitDraft()
      }
      return
    }
    const count = filteredAgents.length
    if (count === 0) {
      if (e.key === 'Escape') { e.preventDefault(); closeMentionPicker() }
      else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        closeMentionPicker()
        void submitDraft()
      }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionHighlightIdx(i => (i + 1) % count) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionHighlightIdx(i => (i - 1 + count) % count) }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (filteredAgents[mentionHighlightIdx]) selectMentionAgent(filteredAgents[mentionHighlightIdx].name)
    } else if (e.key === 'Escape') { e.preventDefault(); closeMentionPicker() }
  }, [closeMentionPicker, filteredAgents, mentionHighlightIdx, mentionPickerOpen, selectMentionAgent, submitDraft])

  const canSend = Boolean(userInput.trim()) && !sending
  const shortcutHint = mentionPickerOpen ? '↵ 选择 · esc 取消' : '⌘↵ 发送 · ⇧↵ 换行'

  return (
    <div className="relative flex flex-col gap-2">
      {sendError && <div className="tone-danger-text px-1 text-xs">{sendError}</div>}
      {mentionPickerOpen && (
        <MentionPicker
          agents={filteredAgents}
          highlightIndex={mentionHighlightIdx}
          onSelect={selectMentionAgent}
          onHighlight={setMentionHighlightIdx}
        />
      )}
      <div className="app-islands-input rounded-[18px] border border-line bg-surface px-2.5 py-2 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/[0.22] md:rounded-xl md:px-3 md:py-2.5">
        <div className="mb-1 flex items-center justify-between gap-2 md:mb-2">
          {selectedRecipient && selectedRecipientColors ? (
            <div
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-caption font-medium"
              style={{
                borderColor: `${selectedRecipientColors.bg}42`,
                backgroundColor: `${selectedRecipientColors.bg}12`,
                color: selectedRecipientColors.bg,
              }}
            >
              <AgentAvatar
                name={selectedRecipient.name}
                color={selectedRecipientColors.bg}
                textColor={selectedRecipientColors.text}
                size={16}
                className="rounded-full"
              />
              <span className="min-w-0 truncate">@{selectedRecipient.name}</span>
            </div>
          ) : (
            <button
              type="button"
              data-recipient-ghost="true"
              onClick={openRecipientPicker}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-line bg-surface-muted px-2.5 py-1.5 text-caption font-medium text-ink-soft transition-colors hover:border-accent/55 hover:text-accent"
            >
              先 @ 选一位 Team 成员
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          className="min-h-10 md:min-h-16 max-h-48 w-full resize-none border-0 bg-transparent px-1 py-1 text-body text-ink placeholder:text-ink-faint focus:outline-none"
          placeholder={selectedRecipient ? `告诉 ${selectedRecipient.name} 这次要做什么` : '告诉 Team 这次要做什么，或先 @ 选择成员'}
          value={userInput}
          onChange={handleInputChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleInputKeyDown}
          disabled={sending}
          aria-label="输入消息"
        />
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openRecipientPicker}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-muted hover:text-accent"
              aria-label="@点名"
              title="@点名"
            >
              <AtSign className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-ink-faint"
              aria-label="附件"
              title="附件"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-ink-faint"
              aria-label="Skill"
              title="Skill"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="ml-1 hidden font-mono text-[10px] text-ink-faint md:inline">{shortcutHint}</span>
          </div>
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-full md:rounded-lg px-0 text-[12px] font-semibold transition-colors md:w-auto md:px-3 ${
              canSend
                ? 'bg-accent text-white hover:bg-accent-deep'
                : 'cursor-not-allowed border border-line bg-surface-muted text-ink-soft'
            }`}
            onClick={() => void submitDraft()}
            disabled={!canSend}
            aria-label={queueMode ? '加入队列' : '发送'}
            title={queueMode ? '加入队列' : '发送'}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">发送</span>
          </button>
        </div>
      </div>
    </div>
  )
}))
