import { beforeEach, describe, expect, it, vi } from 'vitest';

const providersRepoMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  updateTestResult: vi.fn(),
}));

vi.mock('../src/db/repositories/providers.js', () => ({
  providersRepo: providersRepoMock,
}));

import { deleteProvider, getAllProviders, getProvider, updateTestResult } from '../src/config/providerConfig.js';

describe('provider config repository reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providersRepoMock.list.mockReturnValue({});
    providersRepoMock.get.mockReturnValue(undefined);
  });

  it('does not synthesize builtin Codex config when legacy databases do not have a codex row', () => {
    expect(getProvider('codex')).toBeUndefined();
  });

  it('returns only provider rows persisted in the database', () => {
    providersRepoMock.list.mockReturnValue({
      codex: {
        name: 'codex',
        label: 'My Codex',
        cliPath: '/opt/bin/codex',
        defaultModel: 'gpt-5.2',
        contextWindow: 123,
        apiKey: '',
        baseUrl: '',
        timeout: 30,
        thinking: false,
        lastTested: null,
        lastTestResult: null,
      },
    });

    const providers = getAllProviders();

    expect(Object.keys(providers)).toEqual(['codex']);
    expect(providers.codex).toMatchObject({
      label: 'My Codex',
      cliPath: '/opt/bin/codex',
      contextWindow: 123,
      thinking: false,
    });
  });

  it('does not resurrect a deleted builtin provider from fallback config', () => {
    deleteProvider('codex');

    expect(providersRepoMock.delete).toHaveBeenCalledWith('codex');
    expect(getProvider('codex')).toBeUndefined();
  });

  it('delegates test result updates to persisted provider rows only', () => {
    updateTestResult('codex', { success: true, version: 'ok' });

    expect(providersRepoMock.updateTestResult).toHaveBeenCalledWith('codex', {
      success: true,
      version: 'ok',
    });
  });
});
