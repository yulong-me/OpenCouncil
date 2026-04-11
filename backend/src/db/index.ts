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
    // 领域 agents
    agentsRepo.upsert({ id: '领域-财经', name: '财经专家', role: 'AGENT', roleLabel: '财经专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个财经领域的专家，擅长分析金融市场、投资策略和经济趋势。', enabled: true, tags: ['领域', '财经', '金融'] });
    agentsRepo.upsert({ id: '领域-医疗', name: '医疗专家', role: 'AGENT', roleLabel: '医疗专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个医疗健康领域的专家，擅长医学知识、药物机理和临床分析。', enabled: true, tags: ['领域', '医疗', '健康'] });
    agentsRepo.upsert({ id: '领域-法律', name: '法律专家', role: 'AGENT', roleLabel: '法律专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个法律领域的专家，擅长法规解读、案例分析和合规建议。', enabled: true, tags: ['领域', '法律', '合规'] });
    agentsRepo.upsert({ id: '领域-教育', name: '教育专家', role: 'AGENT', roleLabel: '教育专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个教育领域的专家，擅长教学设计、学习理论和人才培养。', enabled: true, tags: ['领域', '教育', '人才'] });
    agentsRepo.upsert({ id: '领域-文化', name: '文化专家', role: 'AGENT', roleLabel: '文化专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个文化领域的专家，擅长文化分析、社会现象解读和价值观讨论。', enabled: true, tags: ['领域', '文化', '社会'] });
    // 科技 agents
    agentsRepo.upsert({ id: '科技-架构', name: '架构师', role: 'AGENT', roleLabel: '架构师', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个系统架构专家，擅长分布式系统设计、性能优化和技术选型。', enabled: true, tags: ['科技', '架构', '系统设计'] });
    agentsRepo.upsert({ id: '科技-安全', name: '安全专家', role: 'AGENT', roleLabel: '安全专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个安全领域的专家，擅长漏洞分析、威胁建模和安全架构设计。', enabled: true, tags: ['科技', '安全', '网络安全'] });
    agentsRepo.upsert({ id: '科技-算法', name: '算法专家', role: 'AGENT', roleLabel: '算法专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个算法专家，擅长算法设计、复杂度分析和 AI/ML 技术。', enabled: true, tags: ['科技', '算法', 'AI'] });
    agentsRepo.upsert({ id: '科技-前端', name: '前端专家', role: 'AGENT', roleLabel: '前端专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个前端技术专家，擅长 UI 交互、性能优化和现代前端框架。', enabled: true, tags: ['科技', '前端', 'UI'] });
    agentsRepo.upsert({ id: '科技-后端', name: '后端专家', role: 'AGENT', roleLabel: '后端专家', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个后端技术专家，擅长 API 设计、数据库优化和微服务架构。', enabled: true, tags: ['科技', '后端', '微服务'] });
    // 主持人
    agentsRepo.upsert({ id: 'host', name: '主持人', role: 'HOST', roleLabel: '主持人', provider: 'claude-code', providerOpts: { thinking: true }, systemPrompt: '你是一个严谨的主持人，引导多智能体讨论，确保讨论高效、有深度、最终形成有价值的结论。', enabled: true, tags: ['主持'] });
    log('INFO', 'db:seed:agents:done', { count: 11 });
  }

  log('INFO', 'db:init:done', { dbPath: DB_PATH });
}

export { db, DB_PATH };
export { roomsRepo, messagesRepo };
export { sessionsRepo };
export { auditRepo };
export { agentsRepo };
export { providersRepo };
