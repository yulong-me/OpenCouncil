'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Menu, Sparkles, UserPlus, Users } from 'lucide-react'

import { DepthSwitcher } from './DepthSwitcher'

interface RoomHeaderProps {
  roomId?: string
  currentRoomTopic?: string
  maxA2ADepth: number | null
  currentA2ADepth: number
  displayMaxDepth: number
  onChangeDepth: (newDepth: number | null) => void
  onToggleMobileMenu: () => void
  onOpenAgentDrawer: () => void
  onOpenInviteDrawer: () => void
  agentPanelCollapsed: boolean
  onToggleAgentPanel: () => void
  onGenerateTitleSuggestions?: () => Promise<string[]>
  onRenameRoom?: (topic: string) => Promise<void>
}

export function RoomHeader({
  roomId,
  currentRoomTopic,
  maxA2ADepth,
  currentA2ADepth,
  displayMaxDepth,
  onChangeDepth,
  onToggleMobileMenu,
  onOpenAgentDrawer,
  onOpenInviteDrawer,
  agentPanelCollapsed,
  onToggleAgentPanel,
  onGenerateTitleSuggestions,
  onRenameRoom,
}: RoomHeaderProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)

  useEffect(() => {
    setSuggestionsOpen(false)
    setTitleSuggestions([])
    setSuggestionsError(null)
    setGeneratingSuggestions(false)
    setActiveSuggestion(null)
  }, [roomId])

  useEffect(() => {
    if (!suggestionsOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [suggestionsOpen])

  async function handleGenerateTitleSuggestions() {
    if (!roomId || !onGenerateTitleSuggestions || generatingSuggestions) return

    setSuggestionsOpen(true)
    setSuggestionsError(null)
    setGeneratingSuggestions(true)
    try {
      const titles = await onGenerateTitleSuggestions()
      setTitleSuggestions(titles)
      if (titles.length === 0) {
        setSuggestionsError('暂时没有生成到标题建议')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '标题生成失败，请重试'
      setSuggestionsError(message)
      setTitleSuggestions([])
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  async function handleApplyTitleSuggestion(title: string) {
    if (!onRenameRoom || activeSuggestion) return

    setSuggestionsError(null)
    setActiveSuggestion(title)
    try {
      await onRenameRoom(title)
      setSuggestionsOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '标题更新失败，请重试'
      setSuggestionsError(message)
    } finally {
      setActiveSuggestion(null)
    }
  }

  return (
    <div
      className="h-[60px] md:h-16 bg-nav-bg border-b border-line px-4 md:px-6 flex items-center justify-between sticky top-0"
      style={{ zIndex: 20 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="md:hidden p-2 -ml-2 text-ink-soft hover:text-ink"
          onClick={onToggleMobileMenu}
          aria-label="打开讨论历史"
        >
          <Menu className="w-5 h-5" />
        </button>
        {roomId && (
          <div ref={popoverRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => { void handleGenerateTitleSuggestions() }}
              className="p-2 -ml-2 rounded-full text-ink-soft hover:text-accent hover:bg-surface-muted transition-colors"
              aria-label="AI 生成会话标题"
              title="AI 生成会话标题"
            >
              {generatingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
            {suggestionsOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-nav-bg p-3 shadow-xl">
                <div className="mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent">AI 标题建议</p>
                  <p className="mt-1 text-[12px] text-ink-soft">点任意标题，直接替换当前会话名。</p>
                </div>
                {generatingSuggestions ? (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-[12px] text-ink-soft">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成 7 个标题…
                  </div>
                ) : (
                  <div className="space-y-1">
                    {titleSuggestions.map(title => {
                      const isSaving = activeSuggestion === title
                      return (
                        <button
                          key={title}
                          type="button"
                          onClick={() => { void handleApplyTitleSuggestion(title) }}
                          disabled={Boolean(activeSuggestion)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-muted disabled:cursor-wait disabled:opacity-70"
                        >
                          <span className="min-w-0 flex-1 truncate">{title}</span>
                          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
                        </button>
                      )
                    })}
                    {!titleSuggestions.length && !suggestionsError && (
                      <p className="rounded-xl bg-surface-muted px-3 py-3 text-[12px] text-ink-soft">暂无可用标题建议。</p>
                    )}
                  </div>
                )}
                {suggestionsError && (
                  <p className="mt-2 rounded-xl bg-[color:var(--danger)]/8 px-3 py-2 text-[12px] text-[color:var(--danger)]">
                    {suggestionsError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <h1 className="min-w-0 truncate text-[15px] font-bold text-ink md:text-base">
          {currentRoomTopic || '开始新讨论'}
        </h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {roomId && (
          <DepthSwitcher
            value={maxA2ADepth}
            currentDepth={currentA2ADepth}
            maxDepth={displayMaxDepth}
            onChange={onChangeDepth}
          />
        )}
        {roomId && (
          <button
            type="button"
            onClick={onOpenAgentDrawer}
            className="md:hidden p-2 text-ink-soft hover:text-accent transition-colors"
            aria-label="查看讨论成员"
          >
            <Users className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenInviteDrawer}
          className="p-2 text-ink-soft hover:text-accent transition-colors"
          aria-label="邀请 Agent 参与讨论"
        >
          <UserPlus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onToggleAgentPanel}
          className="hidden lg:inline-flex p-2 text-ink-soft hover:text-accent transition-colors"
          aria-label={agentPanelCollapsed ? '展开讨论成员面板' : '收起讨论成员面板'}
          title={agentPanelCollapsed ? '展开讨论成员面板' : '收起讨论成员面板'}
        >
          {agentPanelCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  )
}
