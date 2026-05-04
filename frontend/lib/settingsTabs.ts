export type SettingsTab = 'team' | 'provider' | 'skill'

export function resolveSettingsTab(value?: string | null): SettingsTab {
  if (value === 'team' || value === 'teams') return 'team'
  if (value === 'skill' || value === 'skills') return 'skill'
  if (value === 'provider' || value === 'providers') return 'provider'
  return 'team'
}

export function resolveSettingsReturnPath(value?: string | null): string {
  if (!value) return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  return value
}

export function buildSettingsHref(tab: SettingsTab, returnTo?: string | null): string {
  const params = new URLSearchParams({ tab })
  const safeReturnTo = resolveSettingsReturnPath(returnTo)
  if (safeReturnTo !== '/') {
    params.set('returnTo', safeReturnTo)
  }
  return `/settings?${params.toString()}`
}
