import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { backfillMissingBuiltinProviders } from '../src/db/builtinProviderCatalog.js';
import { BUILTIN_PROVIDER_DEFINITIONS } from '../src/config/builtinProviders.js';
import type { ProviderConfig } from '../src/config/providerConfig.js';

const existingProvider = (name: string): ProviderConfig => ({
  name,
  label: name,
  cliPath: `/usr/local/bin/${name}`,
  defaultModel: 'custom-model',
  contextWindow: 123456,
  apiKey: 'user-key',
  baseUrl: 'https://example.test',
  timeout: 99,
  thinking: false,
  lastTested: 123,
  lastTestResult: { success: true, version: 'ok' },
});

describe('builtin provider catalog backfill', () => {
  it('inserts missing builtin providers without touching existing provider rows', () => {
    const existing = new Set(['claude-code', 'opencode']);
    const getProvider = vi.fn((name: string) => (
      existing.has(name) ? existingProvider(name) : undefined
    ));
    const insertProviderIfNotExists = vi.fn();

    const inserted = backfillMissingBuiltinProviders({
      getProvider,
      insertProviderIfNotExists,
    }, BUILTIN_PROVIDER_DEFINITIONS);

    expect(inserted).toBe(1);
    expect(insertProviderIfNotExists).toHaveBeenCalledTimes(1);
    expect(insertProviderIfNotExists).toHaveBeenCalledWith(
      'codex',
      expect.objectContaining({
        label: 'Codex CLI',
        cliPath: 'codex',
      }),
    );
    expect(insertProviderIfNotExists).not.toHaveBeenCalledWith(
      'opencode',
      expect.anything(),
    );
    expect(insertProviderIfNotExists).not.toHaveBeenCalledWith(
      'claude-code',
      expect.anything(),
    );
  });

  it('runs during initDB even when bootstrap seed has already completed', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'opencouncil-provider-backfill-'));
    vi.resetModules();
    vi.stubEnv('OPENCOUNCIL_RUNTIME_ROOT', runtimeRoot);

    const { db } = await import('../src/db/db.js');
    const { initSchema } = await import('../src/db/migrate.js');

    try {
      initSchema();
      db.prepare("INSERT INTO app_meta (key, value) VALUES ('bootstrap_seed_version', '1')").run();
      db.prepare("INSERT INTO app_meta (key, value) VALUES ('builtin_agent_catalog_version', '6')").run();
      db.prepare(`
        INSERT INTO agents (id, name, role, role_label, provider, provider_opts, system_prompt, enabled, tags)
        VALUES ('existing-agent', 'Existing Agent', 'WORKER', 'Worker', 'opencode', '{}', 'Existing prompt', 1, '[]')
      `).run();
      db.prepare(`
        INSERT INTO teams (id, name, description, builtin, active_version_id, created_at, updated_at)
        VALUES ('existing-team', 'Existing Team', '', 0, 'existing-team-v1', 1, 1)
      `).run();
      db.prepare(`
        INSERT INTO providers (name, label, cli_path, default_model, context_window, api_key, base_url, timeout, thinking)
        VALUES
          ('claude-code', 'Custom Claude', '/custom/claude', 'custom-sonnet', 111, 'keep-key', 'https://claude.test', 12, 0),
          ('opencode', 'Custom OpenCode', '/custom/opencode', 'custom-open', 222, '', '', 34, 1)
      `).run();

      const { initDB } = await import('../src/db/index.js');
      initDB();

      const codex = db.prepare('SELECT name, label, cli_path FROM providers WHERE name = ?').get('codex') as Record<string, unknown> | undefined;
      const claude = db.prepare('SELECT label, cli_path, default_model, context_window, api_key, base_url, timeout, thinking FROM providers WHERE name = ?').get('claude-code') as Record<string, unknown>;
      const catalogVersion = db.prepare("SELECT value FROM app_meta WHERE key = 'builtin_provider_catalog_version'").get() as { value: string } | undefined;

      expect(codex).toMatchObject({
        name: 'codex',
        label: 'Codex CLI',
        cli_path: 'codex',
      });
      expect(claude).toMatchObject({
        label: 'Custom Claude',
        cli_path: '/custom/claude',
        default_model: 'custom-sonnet',
        context_window: 111,
        api_key: 'keep-key',
        base_url: 'https://claude.test',
        timeout: 12,
        thinking: 0,
      });
      expect(catalogVersion?.value).toBe('1');
    } finally {
      db.close();
      vi.unstubAllEnvs();
      vi.resetModules();
      rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });
});
