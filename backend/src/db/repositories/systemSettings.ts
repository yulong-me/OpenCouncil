import { db } from '../db.js';
import type { ProviderName } from './agents.js';

const TEAM_ARCHITECT_PROVIDER_KEY = 'team_architect_provider';
const SUPPORTED_PROVIDER_NAMES = new Set<ProviderName>(['claude-code', 'opencode', 'codex']);
const DEFAULT_TEAM_ARCHITECT_PROVIDER: ProviderName = 'claude-code';

export function normalizeTeamArchitectProvider(value: unknown): ProviderName | null {
  if (typeof value !== 'string') return null;
  const provider = value.trim() as ProviderName;
  return SUPPORTED_PROVIDER_NAMES.has(provider) ? provider : null;
}

export const systemSettingsRepo = {
  getTeamArchitectProvider(): ProviderName {
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(TEAM_ARCHITECT_PROVIDER_KEY) as { value: string } | undefined;
    return normalizeTeamArchitectProvider(row?.value) ?? DEFAULT_TEAM_ARCHITECT_PROVIDER;
  },

  setTeamArchitectProvider(provider: ProviderName): ProviderName {
    const normalized = normalizeTeamArchitectProvider(provider);
    if (!normalized) {
      throw new Error('Invalid Team Architect provider');
    }
    db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run(TEAM_ARCHITECT_PROVIDER_KEY, normalized);
    return normalized;
  },
};
