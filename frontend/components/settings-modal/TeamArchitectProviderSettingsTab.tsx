'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import { API_URL } from '@/lib/api'
import { info, warn } from '@/lib/logger'
import { CustomSelect } from '../ui/CustomSelect'

import {
  type ProviderConfig,
  type ProviderName,
} from './types'

const API = API_URL

export function TeamArchitectProviderSettingsTab({
  providers,
  teamArchitectProvider,
  onTeamArchitectProviderChange,
}: {
  providers: Record<string, ProviderConfig>
  teamArchitectProvider: ProviderName
  onTeamArchitectProviderChange: (provider: ProviderName) => void
}) {
  const [draftProvider, setDraftProvider] = useState<ProviderName>(teamArchitectProvider)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    setDraftProvider(teamArchitectProvider)
  }, [teamArchitectProvider])

  const providerOptions = Object.values(providers)
    .filter(provider => provider.name === 'claude-code' || provider.name === 'opencode' || provider.name === 'codex')
    .map(provider => ({
      value: provider.name as ProviderName,
      label: provider.label,
      description: provider.cliPath,
    }))

  async function saveTeamArchitectProvider() {
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch(`${API}/api/system-settings/team-architect`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: draftProvider }),
      })
      const data = await response.json() as { provider?: ProviderName; error?: string }
      if (!response.ok || !data.provider) throw new Error(data.error || '保存失败')
      onTeamArchitectProviderChange(data.provider)
      info('ui:settings:team_architect_provider_saved', { provider: data.provider })
    } catch (error) {
      warn('ui:settings:team_architect_provider_save_failed', { error })
      setSaveError((error as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface p-6 custom-scrollbar lg:p-8">
      <div className="max-w-3xl space-y-5">
        <div className="border-b border-line pb-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Team 方案生成</p>
          <h2 className="mt-1 font-display text-[28px] font-bold leading-tight text-ink">Team Architect Provider</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink-soft">
            生成新 Team 方案时使用的执行工具。这里是唯一配置入口。
          </p>
        </div>

        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-[16px] font-bold text-ink">Team Architect Provider</p>
                <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                  仅影响"生成 Team 方案"
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。
              </p>
              <p className="sr-only">生成 Team 方案时使用哪一个执行工具。这里会影响“生成 Team 方案”按钮，不影响已有 Team 成员。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto]">
              <CustomSelect<ProviderName>
                value={draftProvider}
                options={providerOptions}
                onChange={setDraftProvider}
                ariaLabel="选择 Team 方案生成执行工具"
                className="min-w-56"
                buttonClassName="py-2.5 text-[13px]"
              />
              {saveError && <p className="tone-danger-text mt-2 text-[11px]">{saveError}</p>}
              <button
                type="button"
                onClick={saveTeamArchitectProvider}
                disabled={saving || draftProvider === teamArchitectProvider || providerOptions.length === 0}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-[12px] font-bold text-bg transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                {saving ? '保存中…' : '保存 Team 方案生成工具'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
