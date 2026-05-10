'use client'

import { Bolt, ChevronRight, Layers, Sparkles, UsersRound, type LucideIcon } from 'lucide-react'

import type { SettingsTab } from '@/lib/settingsTabs'

const SETTINGS_NAV_ITEMS: Array<{
  tab: SettingsTab
  label: string
  hint: string
  icon: LucideIcon
}> = [
  { tab: 'team', label: 'Team', hint: '成员、分工、规则', icon: UsersRound },
  { tab: 'provider', label: 'Provider', hint: 'CLI 路径、测试', icon: Bolt },
  { tab: 'team-architect', label: 'Team Architect', hint: '生成 Team 方案', icon: Sparkles },
  { tab: 'skill', label: 'Skill', hint: '可复用能力', icon: Layers },
]

export function SettingsTabSwitcher({
  tab,
  onChange,
}: {
  tab: SettingsTab
  onChange: (tab: SettingsTab) => void
}) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-nav-bg px-3.5 py-5">
      <div className="px-1.5 pb-3.5 font-display text-[22px] font-medium leading-tight text-ink">设置</div>
      <nav className="space-y-0.5" aria-label="设置导航">
        {SETTINGS_NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = tab === item.tab
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onChange(item.tab)}
              className={`flex w-full items-center gap-2 rounded-[7px] border px-2.5 py-2 text-left transition-colors ${
                active
                  ? 'border-line bg-surface text-ink shadow-sm'
                  : 'border-transparent text-ink-soft hover:border-line hover:bg-surface hover:text-ink'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-accent' : 'text-ink-soft'}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-4 text-ink">{item.label}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-ink-faint">{item.hint}</span>
              </span>
              {active && <ChevronRight className="h-3 w-3 shrink-0 text-ink-soft" aria-hidden />}
            </button>
          )
        })}
      </nav>
      <div className="mt-3 px-1.5 py-2.5 text-[11px] leading-5 text-ink-faint">
        关闭后回到当前页面
      </div>
    </aside>
  )
}
