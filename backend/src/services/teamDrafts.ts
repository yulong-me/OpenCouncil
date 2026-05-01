import { spawn } from 'child_process';
import { getProvider as getProviderConfig } from '../config/providerConfig.js';
import { buildProviderReadiness } from './providerReadiness.js';
import { sanitizeDraftFromUntrustedSource, teamsRepo } from '../db/repositories/teams.js';
import type { TeamDraft } from '../types.js';

export interface TeamDraftAgentInput {
  goal: string;
  schemaName: string;
  schema: Record<string, unknown>;
  safetyConstraints: string[];
  prompt: string;
}

export interface TeamDraftAgentClient {
  generateDraft(input: TeamDraftAgentInput): Promise<unknown>;
}

interface GenerateTeamDraftOptions {
  agentClient?: TeamDraftAgentClient;
}

class TeamDraftAgentOutputError extends Error {
  constructor() {
    super('Team Architect output invalid');
  }
}

class TeamDraftGenerationError extends Error {
  code = 'TEAM_DRAFT_AGENT_FAILED';

  constructor() {
    super('生成 Team 草案失败，请重试');
  }
}

const SAFETY_CONSTRAINTS = [
  'team size target: 3-5',
  'output strict JSON only',
  'members are TeamVersion snapshots, not global Agents',
  'no auto merge / auto commit / auto push / no bypass confirmation',
  'do not create a Team; return draft for user review only',
];

const TEAM_DRAFT_SCHEMA = {
  type: 'object',
  required: [
    'name',
    'mission',
    'members',
    'workflow',
    'teamProtocol',
    'routingPolicy',
    'teamMemory',
    'validationCases',
    'generationRationale',
  ],
  properties: {
    name: { type: 'string' },
    mission: { type: 'string' },
    members: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        required: ['displayName', 'role', 'responsibility', 'systemPrompt', 'whenToUse'],
        properties: {
          displayName: { type: 'string' },
          role: { type: 'string' },
          responsibility: { type: 'string' },
          systemPrompt: { type: 'string' },
          whenToUse: { type: 'string' },
          providerPreference: { type: 'string', enum: ['claude-code', 'opencode', 'codex'] },
        },
      },
    },
    workflow: { type: 'string' },
    teamProtocol: { type: 'string' },
    routingPolicy: {
      type: 'object',
      required: ['rules'],
      properties: {
        rules: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['when', 'memberRole'],
            properties: {
              when: { type: 'string' },
              memberRole: { type: 'string' },
            },
          },
        },
      },
    },
    teamMemory: { type: 'array', items: { type: 'string' } },
    validationCases: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['title', 'failureSummary', 'inputSnapshot', 'expectedBehavior', 'assertionType'],
        properties: {
          title: { type: 'string' },
          failureSummary: { type: 'string' },
          inputSnapshot: {},
          expectedBehavior: { type: 'string' },
          assertionType: { type: 'string', enum: ['checklist', 'replay'] },
        },
      },
    },
    generationRationale: { type: 'string' },
  },
};

function buildArchitectPrompt(goal: string): string {
  return [
    '你是 Team Architect Agent。你的唯一任务是根据用户目标生成一份可创建的 TeamDraft。',
    `用户目标：${goal}`,
    '硬约束：',
    ...SAFETY_CONSTRAINTS.map(item => `- ${item}`),
    '生成原则：',
    '- 成员职责必须贴合用户目标中的真实工作步骤，不要套用通用内容创作团队、软件开发团队或研究分析团队模板。',
    '- 如果目标包含搜索/搜集信息，必须有信息搜集或研究角色。',
    '- 如果目标包含话题整理/爆款选择，必须有话题策划或选题角色。',
    '- 如果目标包含视频脚本/PPT/配音/分镜，必须有视频导演或脚本导演角色。',
    '- 如果目标包含 Remotion/生成视频/输出视频路径，必须有 Remotion 或视频生成角色。',
    '- workflow 必须按用户目标的阶段顺序写，不能只写“梳理素材、写正文、审稿”。',
    '- routingPolicy 必须使用 { "rules": [{ "when": "...", "memberRole": "..." }] }，不要使用 transitionRules、stateMachine、defaultRoute。',
    'validationCases[].assertionType 只能使用 checklist 或 replay；不确定时使用 checklist。',
    '输出必须由 --json-schema 约束为严格 JSON；不要 Markdown，不要解释，不要代码块。',
  ].join('\n');
}

function extractJsonObjectText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('Team Architect 输出不是合法 JSON');
  }
  return candidate.slice(start, end + 1);
}

function parseAgentOutput(output: unknown): unknown {
  if (typeof output !== 'string') return output;
  try {
    return JSON.parse(extractJsonObjectText(output));
  } catch {
    throw new TeamDraftAgentOutputError();
  }
}

function parseClaudeStructuredOutput(stdout: string): unknown {
  try {
    const parsed = JSON.parse(stdout.trim());
    if (isRecord(parsed.structured_output)) return parsed.structured_output;
    if (typeof parsed.result === 'string') return parseAgentOutput(parsed.result);
    return parsed;
  } catch {
    throw new TeamDraftAgentOutputError();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertAgentTeamDraftContract(draft: TeamDraft): void {
  if (draft.members.length < 3 || draft.members.length > 5) {
    throw new TeamDraftAgentOutputError();
  }
  for (const member of draft.members) {
    if (
      !requireText(member.displayName)
      || !requireText(member.role)
      || !requireText(member.responsibility)
      || !requireText(member.systemPrompt)
      || !requireText(member.whenToUse)
    ) {
      throw new TeamDraftAgentOutputError();
    }
  }
  if (
    !requireText(draft.workflow)
    || !requireText(draft.teamProtocol)
    || !Array.isArray(draft.teamMemory)
    || !requireText(draft.generationRationale)
  ) {
    throw new TeamDraftAgentOutputError();
  }
  if (!isRecord(draft.routingPolicy) || !Array.isArray(draft.routingPolicy.rules) || draft.routingPolicy.rules.length < 1) {
    throw new TeamDraftAgentOutputError();
  }
  for (const rule of draft.routingPolicy.rules) {
    if (!isRecord(rule) || !requireText(rule.when) || !requireText(rule.memberRole)) {
      throw new TeamDraftAgentOutputError();
    }
  }
  if (!Array.isArray(draft.validationCases) || draft.validationCases.length < 1) {
    throw new TeamDraftAgentOutputError();
  }
  for (const validationCase of draft.validationCases) {
    if (
      !requireText(validationCase.title)
      || !requireText(validationCase.failureSummary)
      || !('inputSnapshot' in validationCase)
      || !requireText(validationCase.expectedBehavior)
      || (validationCase.assertionType !== 'checklist' && validationCase.assertionType !== 'replay')
    ) {
      throw new TeamDraftAgentOutputError();
    }
  }
}

export const defaultTeamDraftAgentClient: TeamDraftAgentClient = {
  async generateDraft(input: TeamDraftAgentInput): Promise<unknown> {
    const providerConfig = getProviderConfig('claude-code');
    if (!providerConfig) {
      throw new Error('Team Architect 暂不可用：provider 未配置');
    }
    const readiness = buildProviderReadiness(providerConfig);
    if (!readiness.cliAvailable || providerConfig.lastTestResult?.success !== true) {
      throw new Error(`Team Architect 暂不可用：${readiness.message}`);
    }

    const cliPath = (providerConfig.cliPath || 'claude').replace(/^~/, process.env.HOME || '/root');
    const env: Record<string, string> = { ...(process.env as Record<string, string>) };
    if (providerConfig.apiKey) env.ANTHROPIC_API_KEY = providerConfig.apiKey;
    if (providerConfig.baseUrl) env.ANTHROPIC_BASE_URL = providerConfig.baseUrl;
    const model = providerConfig.defaultModel?.trim();
    const args = [
      '--bare',
      '-p',
      input.prompt,
      '--output-format=json',
      '--json-schema',
      JSON.stringify(input.schema),
      '--no-session-persistence',
      '--dangerously-skip-permissions',
    ];
    if (model) args.push('--model', model);
    const timeoutMs = Math.min(providerConfig.timeout || 60, 60) * 1000;

    return await new Promise<unknown>((resolve, reject) => {
      const proc = spawn(cliPath, args, {
        cwd: process.cwd(),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, timeoutMs);

      proc.stdout?.on('data', chunk => {
        stdout += chunk.toString();
      });
      proc.on('error', () => {
        clearTimeout(timer);
        reject(new Error('Team Architect unavailable'));
      });
      proc.on('close', code => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error('Team Architect timed out'));
          return;
        }
        if (code !== 0) {
          reject(new Error('Team Architect unavailable'));
          return;
        }
        try {
          resolve(parseClaudeStructuredOutput(stdout));
        } catch (err) {
          reject(err);
        }
      });
    });
  },
};

export async function generateTeamDraftFromGoal(
  goal: string,
  options: GenerateTeamDraftOptions = {},
): Promise<TeamDraft> {
  const agentClient = options.agentClient ?? defaultTeamDraftAgentClient;
  const input: TeamDraftAgentInput = {
    goal,
    schemaName: 'TeamDraft',
    schema: TEAM_DRAFT_SCHEMA,
    safetyConstraints: SAFETY_CONSTRAINTS,
    prompt: buildArchitectPrompt(goal),
  };

  try {
    const output = await agentClient.generateDraft(input);
    const parsed = parseAgentOutput(output);
    const draft = sanitizeDraftFromUntrustedSource(parsed);
    assertAgentTeamDraftContract(draft);
    return {
      ...draft,
      generationSource: 'agent',
      fallbackReason: undefined,
    };
  } catch {
    throw new TeamDraftGenerationError();
  }
}
