import { db } from '../db.js';

export type ProviderName = 'claude-code' | 'opencode';

export interface AgentConfig {
  id: string;
  name: string;
  roleLabel: string;
  role: 'MANAGER' | 'WORKER';
  provider: ProviderName;
  providerOpts: {
    thinking?: boolean;
    [key: string]: unknown;
  };
  systemPrompt: string;
  enabled: boolean;
  tags: string[];
}

export const agentsRepo = {
  list(): AgentConfig[] {
    const rows = db.prepare('SELECT * FROM agents').all() as Record<string, unknown>[];
    return rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      role: r.role as AgentConfig['role'],
      roleLabel: r.role_label as string,
      provider: r.provider as AgentConfig['provider'],
      providerOpts: JSON.parse(r.provider_opts as string),
      systemPrompt: r.system_prompt as string,
      enabled: Boolean(r.enabled),
      tags: JSON.parse(r.tags as string),
    }));
  },

  get(id: string): AgentConfig | undefined {
    const r = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!r) return undefined;
    return {
      id: r.id as string,
      name: r.name as string,
      role: r.role as AgentConfig['role'],
      roleLabel: r.role_label as string,
      provider: r.provider as AgentConfig['provider'],
      providerOpts: JSON.parse(r.provider_opts as string),
      systemPrompt: r.system_prompt as string,
      enabled: Boolean(r.enabled),
      tags: JSON.parse(r.tags as string),
    };
  },

  upsert(agent: AgentConfig): void {
    db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, role, role_label, provider, provider_opts, system_prompt, enabled, tags)
      VALUES (@id, @name, @role, @roleLabel, @provider, @providerOpts, @systemPrompt, @enabled, @tags)
    `).run({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      roleLabel: agent.roleLabel,
      provider: agent.provider,
      providerOpts: JSON.stringify(agent.providerOpts),
      systemPrompt: agent.systemPrompt,
      enabled: agent.enabled ? 1 : 0,
      tags: JSON.stringify(agent.tags),
    });
  },

  delete(id: string): void {
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  },
};
