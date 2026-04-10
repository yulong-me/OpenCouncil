import { store } from '../store.js';
import { callAgent } from './agentCaller.js';
import { HOST_PROMPTS } from '../prompts/host.js';
import { Message, DiscussionState, AgentRole, Agent } from '../types.js';
import { v4 as uuid } from 'uuid';

function telemetry(event: string, meta: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [TELEMETRY] ${event} ${JSON.stringify(meta)}`);
}

function addMessage(roomId: string, msg: Omit<Message, 'id' | 'timestamp'>): Message | undefined {
  const room = store.get(roomId);
  if (!room) return undefined;
  const message: Message = { ...msg, id: uuid(), timestamp: Date.now() };
  store.update(roomId, { messages: [...room.messages, message] });
  return message;
}

function updateAgentStatus(roomId: string, agentId: string, status: 'idle' | 'thinking' | 'waiting' | 'done') {
  const room = store.get(roomId);
  if (!room) return;
  store.update(roomId, {
    agents: room.agents.map(a => a.id === agentId ? { ...a, status } : a)
  });
}

export async function hostReply(roomId: string, state: DiscussionState, context?: string): Promise<string> {
  const room = store.get(roomId);
  if (!room) throw new Error('Room not found');

  telemetry('state:enter', { roomId, state, agent: 'HOST' });

  let prompt = '';
  switch (state) {
    case 'INIT':
      prompt = HOST_PROMPTS.INIT(room.topic);
      break;
    case 'RESEARCH': {
      // Collect all AGENT agents' investigation statements
      const specialistAgents = room.agents.filter(a => a.role === 'AGENT');
      const statements = specialistAgents
        .map(agent => {
          const stmt = room.messages.find(m => m.agentName === agent.name && m.type === 'statement');
          return stmt ? `${agent.name}：${stmt.content}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      prompt = HOST_PROMPTS.RESEARCH(room.topic, statements);
      break;
    }
    case 'DEBATE': {
      const specialistAgents = room.agents.filter(a => a.role === 'AGENT');
      const agentNames = specialistAgents.map(a => a.name).join('、');
      const statements = specialistAgents
        .map(agent => {
          const stmt = room.messages.find(m => m.agentName === agent.name && m.type === 'statement');
          return stmt ? `${agent.name}：${stmt.content}` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      prompt = HOST_PROMPTS.DEBATE(agentNames, statements);
      break;
    }
    case 'CONVERGING': {
      const debateSummaries = room.messages.filter(m => m.type === 'summary' && m.agentRole === 'HOST');
      const latestSummary = debateSummaries[debateSummaries.length - 1]?.content || '';
      prompt = HOST_PROMPTS.CONVERGING(room.topic, latestSummary);
      break;
    }
    case 'DONE':
      const allContent = room.messages.map(m => `【${m.agentName}】${m.content}`).join('\n\n');
      prompt = HOST_PROMPTS.DONE(room.topic, allContent);
      addMessage(roomId, { agentRole: 'HOST', agentName: '主持人', content: '', type: 'report' });
      const reply = await callAgent({ domainLabel: '主持人', systemPrompt: '专业主持人，引导讨论，收敛结论', userMessage: prompt });
      addMessage(roomId, { agentRole: 'HOST', agentName: '主持人', content: reply, type: 'report' });
      store.update(roomId, { report: reply });
      telemetry('state:done', { roomId, state: 'DONE', agent: 'HOST', reportLength: reply.length });
      return reply;
  }

  updateAgentStatus(roomId, room.agents.find(a => a.role === 'HOST')!.id, 'thinking');
  const reply = await callAgent({ domainLabel: '主持人', systemPrompt: '专业主持人，引导讨论，收敛结论', userMessage: prompt });
  addMessage(roomId, { agentRole: 'HOST', agentName: '主持人', content: reply, type: 'summary' });
  updateAgentStatus(roomId, room.agents.find(a => a.role === 'HOST')!.id, 'idle');
  telemetry('state:exit', { roomId, state, agent: 'HOST', replyLength: reply.length, messageCount: room.messages.length + 1 });
  return reply;
}

export async function agentInvestigate(roomId: string, agent: Agent): Promise<string> {
  const room = store.get(roomId);
  if (!room) throw new Error('Room not found');

  telemetry('state:enter', { roomId, state: 'RESEARCH', agent: agent.name, agentId: agent.id });
  updateAgentStatus(roomId, agent.id, 'thinking');
  const findings = await callAgent({
    domainLabel: agent.domainLabel,
    systemPrompt: `专业${agent.domainLabel}，擅长调查和分析`,
    userMessage: `议题：${room.topic}\n\n请针对上述议题，从你的专业领域（${agent.domainLabel}）进行调查和分析，给出你的调查结论。`
  });
  addMessage(roomId, { agentRole: 'AGENT', agentName: agent.name, content: findings, type: 'statement' });
  updateAgentStatus(roomId, agent.id, 'done');
  telemetry('state:exit', { roomId, state: 'RESEARCH', agent: agent.name, agentId: agent.id, findingsLength: findings.length });
  return findings;
}

/** Let each specialist agent give their debate perspective on the topic */
export async function agentDebate(roomId: string, agent: Agent, debateContext: string): Promise<string> {
  const room = store.get(roomId);
  if (!room) throw new Error('Room not found');

  telemetry('state:enter', { roomId, state: 'DEBATE', agent: agent.name, agentId: agent.id });
  updateAgentStatus(roomId, agent.id, 'thinking');
  const statement = await callAgent({
    domainLabel: agent.domainLabel,
    systemPrompt: `专业${agent.domainLabel}，擅长批判性分析和辩论`,
    userMessage: `议题：${room.topic}\n\n辩论背景：\n${debateContext}\n\n请从你的专业视角，对以上辩论背景发表你的核心观点和论据。格式：\n【${agent.name}观点】\n[你的立场和论据...]`
  });
  addMessage(roomId, { agentRole: 'AGENT', agentName: agent.name, content: statement, type: 'statement' });
  updateAgentStatus(roomId, agent.id, 'idle');
  telemetry('state:exit', { roomId, state: 'DEBATE', agent: agent.name, agentId: agent.id, statementLength: statement.length });
  return statement;
}
