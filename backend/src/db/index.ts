import { db, DB_PATH } from './db.js';
import { initSchema, migrateFromJson } from './migrate.js';
import { roomsRepo, messagesRepo } from './repositories/rooms.js';
import { sessionsRepo } from './repositories/sessions.js';
import { auditRepo } from './repositories/audit.js';
import { agentsRepo } from './repositories/agents.js';
import { providersRepo } from './repositories/providers.js';
import { log } from '../log.js';

/** Initialize DB: apply schema, migrate JSON configs, seed defaults if empty */
export function initDB(): void {
  initSchema();
  migrateFromJson();

  // Seed default provider if empty
  const providers = providersRepo.list();
  if (Object.keys(providers).length === 0) {
    providersRepo.upsert('claude-code', {
      label: 'Claude Code',
      cliPath: 'claude',
      defaultModel: 'claude-sonnet-4-6',
      apiKey: '',
      baseUrl: '',
      timeout: 90,
      thinking: true,
    });
    providersRepo.upsert('opencode', {
      label: 'OpenCode',
      cliPath: '~/.opencode/bin/opencode',
      defaultModel: 'MiniMax-M2.7',
      apiKey: '',
      baseUrl: '',
      timeout: 90,
      thinking: true,
    });
    log('INFO', 'db:seed:providers:done');
  }

  // Seed default agents if empty
  const agents = agentsRepo.list();
  if (agents.length === 0) {
    agentsRepo.upsert({ id: 'claude-sonnet', name: 'Sonnet', role: 'HOST', roleLabel: '主持人', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个严谨的主持人，引导多智能体讨论。', enabled: true });
    agentsRepo.upsert({ id: 'claude-opus', name: 'Opus', role: 'AGENT', roleLabel: '研究员', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个深度研究员，善于调查和分析。', enabled: true });
    agentsRepo.upsert({ id: 'gemini-flash', name: 'Gemini Flash', role: 'AGENT', roleLabel: '辩论员', provider: 'opencode', providerOpts: { model: 'google/gemini-2-0-flash', thinking: false }, systemPrompt: '你是一个善于辩论的专家。', enabled: true });
    log('INFO', 'db:seed:agents:done');
  }

  log('INFO', 'db:init:done', { dbPath: DB_PATH });
}

export { db, DB_PATH };
export { roomsRepo, messagesRepo };
export { sessionsRepo };
export { auditRepo };
export { agentsRepo };
export { providersRepo };
