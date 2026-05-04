import { describe, expect, it } from 'vitest';

import {
  buildSettingsHref,
  resolveSettingsReturnPath,
  resolveSettingsTab,
} from '../../frontend/lib/settingsTabs.ts';

describe('settings tab helpers', () => {
  it('accepts only supported settings tabs', () => {
    expect(resolveSettingsTab('team')).toBe('team');
    expect(resolveSettingsTab('teams')).toBe('team');
    expect(resolveSettingsTab('agent')).toBe('team');
    expect(resolveSettingsTab('agents')).toBe('team');
    expect(resolveSettingsTab('provider')).toBe('provider');
    expect(resolveSettingsTab('providers')).toBe('provider');
    expect(resolveSettingsTab('unknown')).toBe('team');
    expect(resolveSettingsTab(null)).toBe('team');
  });

  it('allows only local return paths', () => {
    expect(resolveSettingsReturnPath('/room/abc')).toBe('/room/abc');
    expect(resolveSettingsReturnPath('/settings?tab=skill')).toBe('/settings?tab=skill');
    expect(resolveSettingsReturnPath('https://example.com')).toBe('/');
    expect(resolveSettingsReturnPath('//evil.example')).toBe('/');
    expect(resolveSettingsReturnPath('room/abc')).toBe('/');
  });

  it('builds a skill settings link that preserves the caller path', () => {
    expect(buildSettingsHref('skill', '/room/abc')).toBe('/settings?tab=skill&returnTo=%2Froom%2Fabc');
    expect(buildSettingsHref('skill', 'https://example.com')).toBe('/settings?tab=skill');
  });
});
