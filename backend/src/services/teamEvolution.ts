import type {
  DiscussionRoom,
  EvolutionChangeKind,
  EvolutionProposal,
  TeamVersionConfig,
  TeamVersionMemberSnapshot,
} from '../types.js';
import { evolutionRepo, teamsRepo } from '../db/index.js';
import type { CreateEvolutionChangeInput } from '../db/repositories/teamEvolution.js';
import { defaultTeamDraftAgentClient, getTeamArchitectRuntimeFromEnv, type TeamDraftAgentClient } from './teamDrafts.js';

const CHANGE_KINDS: EvolutionChangeKind[] = [
  'add-agent',
  'edit-agent-prompt',
  'edit-team-workflow',
  'edit-routing-policy',
  'add-team-memory',
  'add-validation-case',
];

const EVOLUTION_PROPOSAL_SCHEMA = {
  type: 'object',
  required: ['summary', 'changes'],
  properties: {
    summary: { type: 'string' },
    changes: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        required: ['kind', 'title', 'why', 'targetLayer', 'before', 'after', 'impact'],
        properties: {
          kind: { type: 'string', enum: CHANGE_KINDS },
          title: { type: 'string' },
          why: { type: 'string' },
          targetLayer: { type: 'string' },
          before: {},
          after: {},
          impact: { type: 'string' },
        },
      },
    },
  },
};

const SAFETY_CONSTRAINTS = [
  'generate a proposal only; never merge or apply changes',
  'do not use fixed/template changes; every change must be based on the room evidence and user feedback',
  'supported change kinds: add-agent, edit-agent-prompt, edit-team-workflow, edit-routing-policy, add-team-memory, add-validation-case',
  'return strict JSON only',
];

interface EvolutionArchitectChange {
  kind: EvolutionChangeKind;
  title: string;
  why: string;
  targetLayer: string;
  before: unknown;
  after: unknown;
  impact: string;
}

interface EvolutionArchitectOutput {
  summary: string;
  changes: EvolutionArchitectChange[];
}

interface EvolutionArchitectOptions {
  agentClient?: TeamDraftAgentClient;
  replacesProposalId?: string;
  onDelta?: (text: string) => void;
}

export class EvolutionProposalGenerationError extends Error {
  code = 'EVOLUTION_PROPOSAL_AGENT_FAILED';

  constructor() {
    super('生成 Team 改进提案失败，请补充改进意见后重试');
    this.name = 'EvolutionProposalGenerationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function extractJsonObjectText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) throw new EvolutionProposalGenerationError();
  return candidate.slice(start, end + 1);
}

function parseAgentOutput(output: unknown): unknown {
  if (typeof output !== 'string') return output;
  try {
    return JSON.parse(extractJsonObjectText(output));
  } catch {
    throw new EvolutionProposalGenerationError();
  }
}

function lastEvidenceMessageIds(room: DiscussionRoom): string[] {
  return room.messages
    .filter(message => message.type !== 'system')
    .slice(-6)
    .map(message => message.id);
}

function lastEvidenceMessages(room: DiscussionRoom): Array<{ id: string; speaker: string; content: string }> {
  return room.messages
    .filter(message => message.type !== 'system')
    .slice(-8)
    .map(message => ({
      id: message.id,
      speaker: message.agentRole === 'USER' ? 'USER' : `${message.agentName}(${message.agentRole})`,
      content: truncate(message.content.trim(), 1200),
    }));
}

function memberSnapshotForPrompt(snapshot: TeamVersionMemberSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    name: snapshot.name,
    roleLabel: snapshot.roleLabel,
    provider: snapshot.provider,
    responsibility: snapshot.responsibility,
    whenToUse: snapshot.whenToUse,
    systemPrompt: truncate(snapshot.systemPrompt, 1600),
  };
}

function buildArchitectPrompt(room: DiscussionRoom, version: TeamVersionConfig, feedbackText: string): string {
  const payload = {
    room: {
      id: room.id,
      topic: room.topic,
      userFeedback: feedbackText,
      evidenceMessages: lastEvidenceMessages(room),
    },
    teamVersion: {
      id: version.id,
      teamId: version.teamId,
      versionNumber: version.versionNumber,
      name: version.name,
      description: version.description,
      members: version.memberSnapshots.map(memberSnapshotForPrompt),
      workflowPrompt: truncate(version.workflowPrompt, 2400),
      routingPolicy: version.routingPolicy,
      teamMemory: version.teamMemory,
    },
  };

  return [
    '你是 Team Architect Agent。你的任务是根据本次房间证据和用户意见，为当前 TeamVersion 生成一份 Evolution PR 草案。',
    '你必须自己判断要提哪些改进；不要套固定规则，不要每次都生成同样的六类 change。',
    '只生成真正能让下一版 Team 更适合用户目标的 change。没有证据支撑的 change 不要生成。',
    '用户意见是最高优先级输入；如果用户明确要求新增/修改某类成员、提示词、工作流、路由、团队记忆或验证样例，优先围绕这些点生成提案。',
    '支持的 change kind 和 after 形状：',
    '- add-agent.after: { "id": "stable-slug", "name": "...", "roleLabel": "...", "provider": "claude-code|opencode|codex", "providerOpts": {}, "systemPrompt": "...", "responsibility": "...", "whenToUse": "..." }',
    '- edit-agent-prompt.after: { "agentId": "existing-member-id", "systemPrompt": "full next prompt" }',
    '- edit-team-workflow.after: "full next workflow prompt" 或 { "workflowPrompt": "full next workflow prompt" }',
    '- edit-routing-policy.after: object，描述下一版路由策略',
    '- add-team-memory.after: string、string[] 或 { "memory": string|string[] }',
    '- add-validation-case.after: { "title": "...", "failureSummary": "...", "inputSnapshot": ..., "expectedBehavior": "...", "assertionType": "checklist|replay" }',
    '硬约束：',
    ...SAFETY_CONSTRAINTS.map(item => `- ${item}`),
    '输入上下文 JSON：',
    JSON.stringify(payload, null, 2),
    'TeamEvolutionProposal 输出 JSON Schema：',
    JSON.stringify(EVOLUTION_PROPOSAL_SCHEMA, null, 2),
    '输出必须是严格 JSON；所有 required 字段都必须出现；不要 Markdown，不要解释，不要代码块。',
  ].join('\n');
}

function assertArchitectOutput(output: unknown): asserts output is EvolutionArchitectOutput {
  if (!isRecord(output) || !requireText(output.summary) || !Array.isArray(output.changes) || output.changes.length < 1) {
    throw new EvolutionProposalGenerationError();
  }
  if (output.changes.length > 8) {
    throw new EvolutionProposalGenerationError();
  }
}

function assertChangeShape(change: unknown): asserts change is EvolutionArchitectChange {
  if (!isRecord(change)) throw new EvolutionProposalGenerationError();
  if (!CHANGE_KINDS.includes(change.kind as EvolutionChangeKind)) throw new EvolutionProposalGenerationError();
  if (!requireText(change.title) || !requireText(change.why) || !requireText(change.targetLayer) || !requireText(change.impact)) {
    throw new EvolutionProposalGenerationError();
  }
  if (!('before' in change) || !('after' in change)) {
    throw new EvolutionProposalGenerationError();
  }
}

function assertAgentPromptChange(change: EvolutionArchitectChange, version: TeamVersionConfig): void {
  const after = isRecord(change.after) ? change.after : {};
  const agentId = requireText(after.agentId) ? after.agentId.trim() : '';
  if (!agentId || !version.memberIds.includes(agentId) || !requireText(after.systemPrompt)) {
    throw new EvolutionProposalGenerationError();
  }
}

function assertAddAgentChange(change: EvolutionArchitectChange, version: TeamVersionConfig): void {
  const after = isRecord(change.after) ? change.after : {};
  const provider = after.provider;
  if (
    !requireText(after.id)
    || version.memberIds.includes(after.id.trim())
    || !requireText(after.name)
    || !requireText(after.roleLabel)
    || !requireText(after.systemPrompt)
    || (provider !== undefined && provider !== 'claude-code' && provider !== 'opencode' && provider !== 'codex')
  ) {
    throw new EvolutionProposalGenerationError();
  }
}

function assertChangeContract(change: EvolutionArchitectChange, version: TeamVersionConfig): void {
  switch (change.kind) {
    case 'add-agent':
      assertAddAgentChange(change, version);
      return;
    case 'edit-agent-prompt':
      assertAgentPromptChange(change, version);
      return;
    case 'edit-team-workflow': {
      const after = isRecord(change.after) ? change.after : {};
      if (!requireText(change.after) && !requireText(after.workflowPrompt)) throw new EvolutionProposalGenerationError();
      return;
    }
    case 'edit-routing-policy':
      if (!isRecord(change.after)) throw new EvolutionProposalGenerationError();
      return;
    case 'add-team-memory': {
      const after = isRecord(change.after) ? change.after : {};
      if (!requireText(change.after) && !Array.isArray(change.after) && !requireText(after.memory) && !Array.isArray(after.memory)) {
        throw new EvolutionProposalGenerationError();
      }
      return;
    }
    case 'add-validation-case': {
      const after = isRecord(change.after) ? change.after : {};
      const assertionType = after.assertionType;
      if (
        !requireText(after.title)
        || !requireText(after.failureSummary)
        || (!requireText(after.expectedBehavior) && !requireText(after.expectedOutcome))
        || (assertionType !== undefined && assertionType !== 'checklist' && assertionType !== 'replay')
      ) {
        throw new EvolutionProposalGenerationError();
      }
      return;
    }
  }
}

function normalizeChange(change: EvolutionArchitectChange, evidenceMessageIds: string[]): CreateEvolutionChangeInput {
  return {
    kind: change.kind,
    title: change.title.trim(),
    why: change.why.trim(),
    evidenceMessageIds,
    targetLayer: change.targetLayer.trim(),
    before: change.before,
    after: change.after,
    impact: change.impact.trim(),
  };
}

export async function createEvolutionProposalFromRoom(
  room: DiscussionRoom,
  feedback?: string,
  options: EvolutionArchitectOptions = {},
): Promise<EvolutionProposal> {
  if (!room.teamId || !room.teamVersionId) {
    throw new Error('Team-backed room required for evolution proposals');
  }

  const baseVersion = teamsRepo.getVersion(room.teamVersionId);
  if (!baseVersion) {
    throw new Error(`TeamVersion not found: ${room.teamVersionId}`);
  }

  const evidenceMessageIds = lastEvidenceMessageIds(room);
  if (evidenceMessageIds.length === 0) {
    throw new Error('At least one room message is required as proposal evidence');
  }

  const feedbackText = feedback?.trim();
  if (!feedbackText) {
    throw new Error('User feedback is required to create a Team evolution proposal');
  }

  const agentClient = options.agentClient ?? defaultTeamDraftAgentClient;
  let summary: string;
  let changes: CreateEvolutionChangeInput[];
  try {
    const runtime = getTeamArchitectRuntimeFromEnv();
    const rawOutput = await agentClient.generateDraft(
      {
        goal: `${baseVersion.name} v${baseVersion.versionNumber} evolution proposal`,
        schemaName: 'TeamEvolutionProposal',
        schema: EVOLUTION_PROPOSAL_SCHEMA,
        safetyConstraints: SAFETY_CONSTRAINTS,
        prompt: buildArchitectPrompt(room, baseVersion, feedbackText),
        runtime: {
          ...runtime,
          timeoutSeconds: runtime.timeoutSeconds ?? null,
        },
      },
      { onDelta: options.onDelta },
    );
    const output = parseAgentOutput(rawOutput);
    assertArchitectOutput(output);
    summary = truncate(output.summary.trim(), 240);
    changes = output.changes.map(change => {
      assertChangeShape(change);
      assertChangeContract(change, baseVersion);
      return normalizeChange(change, evidenceMessageIds);
    });
  } catch (err) {
    if (err instanceof EvolutionProposalGenerationError) throw err;
    throw new EvolutionProposalGenerationError();
  }

  const proposalInput = {
    roomId: room.id,
    teamId: room.teamId,
    baseVersionId: baseVersion.id,
    targetVersionNumber: evolutionRepo.latestTargetVersionNumber(room.teamId),
    summary,
    feedback: feedbackText,
    changes,
  };

  if (options.replacesProposalId) {
    return evolutionRepo.createReplacing(proposalInput, options.replacesProposalId);
  }

  return evolutionRepo.create(proposalInput);
}
