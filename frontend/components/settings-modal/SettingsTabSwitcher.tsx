'use client'

import { BrainCircuit, Server, UsersRound } from 'lucide-react'

import type { SettingsTab } from '@/lib/settingsTabs'

export function SettingsTabSwitcher({
  tab,
  onChange,
}: {
  tab: SettingsTab
  onChange: (tab: SettingsTab) => void
}) {
  return (
    <div className="flex max-w-[calc(100vw-5rem)] gap-1 overflow-x-auto settings-surface rounded-xl p-1 custom-scrollbar">
      <button
        type="button"
        onClick={() => onChange('team')}
        className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${tab === 'team' ? 'shadow-sm text-ink' : 'text-ink-soft hover:text-ink'}`}
      >
        <UsersRound className="w-3.5 h-3.5" aria-hidden />
        Team
      </button>
      <button
        type="button"
        onClick={() => onChange('provider')}
        className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${tab === 'provider' ? 'shadow-sm text-ink' : 'text-ink-soft hover:text-ink'}`}
      >
        <Server className="w-3.5 h-3.5" aria-hidden />
        CLI 连接
      </button>
      <button
        type="button"
        onClick={() => onChange('skill')}
        className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${tab === 'skill' ? 'shadow-sm text-ink' : 'text-ink-soft hover:text-ink'}`}
      >
        <BrainCircuit className="w-3.5 h-3.5" aria-hidden />
        Skill
      </button>
    </div>
  )
}
