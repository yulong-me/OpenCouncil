'use client'

import { Plus, MessageSquare, X } from 'lucide-react'
import {
  AGENT_COLORS,
  DEFAULT_AGENT_COLOR,
  formatRelativeTime,
  type Agent,
  type DiscussionState,
} from '../lib/agents'

interface SidebarRoom {
  id: string
  topic: string
  createdAt: number
  state: DiscussionState
}

interface RoomListSidebarProps {
  rooms: SidebarRoom[]
  currentRoomId?: string
  roomsAgentsMap: Record<string, Agent[]>
  roomsLastToAgentMap: Record<string, string | undefined>
  onNewRoom: () => void
  onSelectRoom: (roomId: string) => void
  mobileMenuOpen?: boolean
  onToggleMobileMenu?: () => void
  onCloseMobileMenu?: () => void
}

function RoomItem({
  room,
  isActive,
  roomsAgentsMap,
  roomsLastToAgentMap,
  onClick,
}: {
  room: SidebarRoom
  isActive: boolean
  roomsAgentsMap: Record<string, Agent[]>
  roomsLastToAgentMap: Record<string, string | undefined>
  onClick: () => void
}) {
  const lastToAgentId = roomsLastToAgentMap[room.id]
  const roomAgents = roomsAgentsMap[room.id] || []
  const lastRecipient = lastToAgentId ? roomAgents.find(a => a.id === lastToAgentId) : null
  const lastRecipientColors = lastRecipient
    ? AGENT_COLORS[lastRecipient.name] || DEFAULT_AGENT_COLOR
    : null

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-xl mb-2 cursor-pointer transition-colors border ${
        isActive ? 'bg-surface-muted border-line' : 'border-transparent hover:bg-surface-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-medium text-ink truncate flex-1 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
          {room.topic}
        </p>
        <span
          className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            room.state === 'RUNNING'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-ink-soft/10 text-ink-soft'
          }`}
        >
          {room.state === 'RUNNING' ? '进行中' : '已完成'}
        </span>
      </div>
      {lastRecipient && lastRecipientColors && (
        <div className="mt-1.5 flex items-center gap-1 ml-5.5">
          <span className="text-[10px] text-ink-soft">正在和</span>
          <img
            src={lastRecipientColors.avatar}
            alt=""
            className="w-3.5 h-3.5 rounded-full"
          />
          <span className="text-[10px] font-medium" style={{ color: lastRecipientColors.bg }}>
            {lastRecipient.name}
          </span>
          <span className="text-[10px] text-ink-soft">对话</span>
        </div>
      )}
      <p className="text-[11px] text-ink-soft mt-1 ml-5.5">
        {formatRelativeTime(room.createdAt)}
      </p>
    </div>
  )
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function RoomListSidebarDesktop({
  rooms,
  currentRoomId,
  roomsAgentsMap,
  roomsLastToAgentMap,
  onNewRoom,
  onSelectRoom,
}: Omit<RoomListSidebarProps, 'mobileMenuOpen' | 'onToggleMobileMenu' | 'onCloseMobileMenu'>) {
  return (
    <div className="hidden md:flex w-[280px] bg-surface border-r border-line flex-col z-20">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-ink">讨论历史</h2>
        <button
          onClick={onNewRoom}
          className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-ink hover:text-accent hover:bg-line transition-colors"
          title="发起讨论"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {rooms.map(room => (
          <RoomItem
            key={room.id}
            room={room}
            isActive={room.id === currentRoomId}
            roomsAgentsMap={roomsAgentsMap}
            roomsLastToAgentMap={roomsLastToAgentMap}
            onClick={() => onSelectRoom(room.id)}
          />
        ))}
        {rooms.length === 0 && (
          <p className="text-xs text-ink-soft text-center mt-6">暂无讨论记录</p>
        )}
      </div>
    </div>
  )
}

// ─── Mobile overlay menu ──────────────────────────────────────────────────────

export function RoomListSidebarMobile({
  rooms,
  currentRoomId,
  roomsAgentsMap,
  roomsLastToAgentMap,
  onNewRoom,
  onSelectRoom,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: RoomListSidebarProps) {
  if (!mobileMenuOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onToggleMobileMenu}>
      <div
        className="w-[80%] max-w-[300px] h-full bg-surface border-r border-line flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">讨论历史</h2>
          <button
            onClick={onCloseMobileMenu}
            aria-label="关闭菜单"
            className="p-2 text-ink-soft hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3">
          <button
            onClick={() => { onNewRoom(); onCloseMobileMenu?.() }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white hover:bg-accent-deep transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            发起新讨论
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {rooms.map(room => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={room.id === currentRoomId}
              roomsAgentsMap={roomsAgentsMap}
              roomsLastToAgentMap={roomsLastToAgentMap}
              onClick={() => { onSelectRoom(room.id); onCloseMobileMenu?.() }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
