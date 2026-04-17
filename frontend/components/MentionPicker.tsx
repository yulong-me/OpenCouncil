'use client'

import { AGENT_COLORS, DEFAULT_AGENT_COLOR, type Agent } from '../lib/agents'
import { AgentAvatar } from './AgentAvatar'

interface MentionPickerProps {
  agents: Agent[]
  highlightIndex: number
  onSelect: (name: string) => void
  onHighlight: (index: number) => void
}

export default function MentionPicker({ agents, highlightIndex, onSelect, onHighlight }: MentionPickerProps) {
  return (
    <div
      data-mention-picker="1"
      className="absolute z-50 bg-surface backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
      style={{ left: 0, bottom: 'calc(100% + 6px)', minWidth: 220, maxWidth: 280 }}
      role="listbox"
      aria-label="专家候选列表"
    >
      <div className="px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-[10px] font-semibold text-ink-soft uppercase tracking-wider">选择专家</span>
      </div>
      <div className="max-h-48 overflow-y-auto custom-scrollbar">
        {agents.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-ink-soft">
            未找到匹配专家
          </div>
        )}
        {agents.map((agent, i) => {
          const colors = AGENT_COLORS[agent.name] || DEFAULT_AGENT_COLOR
          const isHighlighted = i === highlightIndex
          return (
            <button
              key={agent.id}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                isHighlighted ? 'bg-accent/10' : 'hover:bg-surface-muted/60'
              }`}
              onMouseEnter={() => onHighlight(i)}
              onClick={() => onSelect(agent.name)}
              aria-label={`选择专家 ${agent.name}`}
              aria-selected={isHighlighted}
              role="option"
            >
              <div className="w-7 h-7 rounded-full flex-shrink-0 shadow-sm overflow-hidden">
                <AgentAvatar src={colors.avatar} alt={`${agent.name} 头像`} size={28} className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-bold truncate ${isHighlighted ? 'text-accent' : 'text-ink'}`}>{agent.name}</p>
                <p className="text-[11px] text-ink-soft truncate">{agent.domainLabel}</p>
              </div>
              {isHighlighted && (
                <span className="ml-auto text-[10px] text-accent/60 font-mono shrink-0">↵</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
