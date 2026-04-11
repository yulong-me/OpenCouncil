import { db } from '../db.js';
import { type AgentConfig } from '../../config/agentConfig.js';

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
    };
  },

  upsert(agent: AgentConfig): void {
    db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, role, role_label, provider, provider_opts, system_prompt, enabled)
      VALUES (@id, @name, @role, @roleLabel, @provider, @providerOpts, @systemPrompt, @enabled)
    `).run({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      roleLabel: agent.roleLabel,
      provider: agent.provider,
      providerOpts: JSON.stringify(agent.providerOpts),
      systemPrompt: agent.systemPrompt,
      enabled: agent.enabled ? 1 : 0,
    });
  },

  delete(id: string): void {
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  },
};
