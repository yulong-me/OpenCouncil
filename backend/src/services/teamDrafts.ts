import { spawn } from 'child_process';
import { getProvider as getProviderConfig, type ProviderConfig } from '../config/providerConfig.js';
import { buildProviderReadiness } from './providerReadiness.js';
import { systemSettingsRepo } from '../db/repositories/systemSettings.js';
import { sanitizeDraftFromUntrustedSource } from '../db/repositories/teams.js';
import type { ProviderName } from '../db/repositories/agents.js';
import type { TeamDraft } from '../types.js';

export interface TeamDraftAgentInput {
  goal: string;
  schemaName: string;
  schema: Record<string, unknown>;
  safetyConstraints: string[];
  prompt: string;
  runtime?: TeamDraftAgentRuntimeOptions;
}

export interface TeamDraftAgentGenerateOptions {
  onDelta?: (text: string) => void;
}

export interface TeamDraftAgentClient {
  generateDraft(input: TeamDraftAgentInput, options?: TeamDraftAgentGenerateOptions): Promise<unknown>;
}

export type TeamArchitectPermissionMode = 'acceptEdits' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan' | 'auto';

export interface TeamDraftAgentRuntimeOptions {
  /** null means no timeout. undefined means use provider timeout. */
  timeoutSeconds?: number | null;
  permissionMode?: TeamArchitectPermissionMode;
  allowedTools?: string[];
}

interface GenerateTeamDraftOptions {
  agentClient?: TeamDraftAgentClient;
  onDelta?: (text: string) => void;
}

class TeamDraftAgentOutputError extends Error {
  constructor() {
    super('Team Architect output invalid');
  }
}

class TeamDraftGenerationError extends Error {
  code = 'TEAM_DRAFT_AGENT_FAILED';

  constructor() {
    super('生成 Team 方案失败，请重试');
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

const READ_ONLY_TEAM_ARCHITECT_TOOLS = ['Read', 'Grep', 'Glob', 'LS'];
const TEAM_ARCHITECT_PERMISSION_MODES = new Set<TeamArchitectPermissionMode>([
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
  'auto',
]);

function parsePositiveTimeoutSeconds(value: string | undefined): number | null | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (raw === '0' || /^none$/i.test(raw) || /^unlimited$/i.test(raw) || /^false$/i.test(raw)) {
    return null;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function parsePermissionMode(value: string | undefined): TeamArchitectPermissionMode | undefined {
  const mode = value?.trim() as TeamArchitectPermissionMode | undefined;
  return mode && TEAM_ARCHITECT_PERMISSION_MODES.has(mode) ? mode : undefined;
}

function parseAllowedTools(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed.split(/[,\s]+/).map(item => item.trim()).filter(Boolean);
}

export function getTeamArchitectRuntimeFromEnv(): TeamDraftAgentRuntimeOptions {
  return {
    timeoutSeconds: parsePositiveTimeoutSeconds(process.env.TEAM_ARCHITECT_TIMEOUT_SECONDS),
    permissionMode: parsePermissionMode(process.env.TEAM_ARCHITECT_PERMISSION_MODE),
    allowedTools: parseAllowedTools(process.env.TEAM_ARCHITECT_ALLOWED_TOOLS),
  };
}

function resolveRuntimeOptions(input: TeamDraftAgentInput): Required<Pick<TeamDraftAgentRuntimeOptions, 'permissionMode' | 'allowedTools'>> & Pick<TeamDraftAgentRuntimeOptions, 'timeoutSeconds'> {
  const envRuntime = getTeamArchitectRuntimeFromEnv();
  return {
    timeoutSeconds: input.runtime && 'timeoutSeconds' in input.runtime
      ? input.runtime.timeoutSeconds
      : envRuntime.timeoutSeconds,
    permissionMode: input.runtime?.permissionMode ?? envRuntime.permissionMode ?? 'plan',
    allowedTools: input.runtime?.allowedTools ?? envRuntime.allowedTools ?? READ_ONLY_TEAM_ARCHITECT_TOOLS,
  };
}

export function buildTeamArchitectCliArgs(
  input: TeamDraftAgentInput,
  model?: string,
  providerName: ProviderName = 'claude-code',
  thinking = true,
): string[] {
  const runtime = resolveRuntimeOptions(input);
  if (providerName === 'codex') {
    const args = [
      'exec',
      '--json',
      '--color',
      'never',
      '--skip-git-repo-check',
      '-s',
      'read-only',
      '-c',
      `model_reasoning_effort=${thinking ? 'high' : 'low'}`,
    ];
    if (model?.trim()) args.push('-m', model.trim());
    args.push(input.prompt);
    return args;
  }
  if (providerName === 'opencode') {
    const args = ['run', '--format', 'json'];
    if (thinking) args.push('--thinking');
    args.push('--', input.prompt);
    return args;
  }
  const args = [
    '-p',
    input.prompt,
    '--verbose',
    '--output-format=stream-json',
    '--include-partial-messages',
    '--no-session-persistence',
    '--permission-mode',
    runtime.permissionMode,
    '--tools',
    runtime.allowedTools.join(','),
  ];
  if (model?.trim()) args.push('--model', model.trim());
  return args;
}

export function resolveTeamArchitectTimeoutMs(input: TeamDraftAgentInput, providerTimeoutSeconds: number | undefined): number | null {
  const runtime = resolveRuntimeOptions(input);
  if (runtime.timeoutSeconds === null) return null;
  const timeoutSeconds = runtime.timeoutSeconds ?? providerTimeoutSeconds;
  return timeoutSeconds && timeoutSeconds > 0 ? timeoutSeconds * 1000 : null;
}

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
    'TeamDraft 输出 JSON Schema：',
    JSON.stringify(TEAM_DRAFT_SCHEMA, null, 2),
    '输出必须是严格 JSON；所有 required 字段都必须出现；不要 Markdown，不要解释，不要代码块。',
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

function extractClaudeEventText(parsed: Record<string, unknown>): { kind: 'delta' | 'message'; text: string } | null {
  const eventType = getRecordText(parsed, ['type']);
  if (eventType === 'stream_event') {
    const event = isRecord(parsed.event) ? parsed.event : undefined;
    const delta = isRecord(event?.delta) ? event.delta : undefined;
    if (event?.type === 'content_block_delta' && delta?.type === 'text_delta') {
      return { kind: 'delta', text: getRecordText(delta, ['text']) };
    }
  }
  if (eventType === 'assistant') {
    const message = isRecord(parsed.message) ? parsed.message : undefined;
    const content = Array.isArray(message?.content) ? message.content as Record<string, unknown>[] : [];
    const text = content
      .filter(block => block.type === 'text')
      .map(block => getRecordText(block, ['text']))
      .join('');
    return text ? { kind: 'message', text } : null;
  }
  if (eventType === 'result') {
    const text = getRecordText(parsed, ['result']);
    return text ? { kind: 'message', text } : null;
  }
  return null;
}

function getRecordText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function extractCodexEventText(parsed: Record<string, unknown>): { kind: 'delta' | 'message'; text: string } | null {
  const current = isRecord(parsed.msg) ? parsed.msg : parsed;
  const eventType = getRecordText(current, ['type']);
  if (eventType === 'agent_message_delta') {
    return { kind: 'delta', text: getRecordText(current, ['delta', 'text']) };
  }
  if (eventType === 'agent_message') {
    return { kind: 'message', text: getRecordText(current, ['text', 'message']) };
  }
  if (eventType === 'item.completed' || eventType === 'item.updated') {
    const item = isRecord(current.item) ? current.item : undefined;
    if (item?.type === 'agent_message') {
      return { kind: 'message', text: getRecordText(item, ['text']) };
    }
  }
  return null;
}

function extractOpenCodeEventText(parsed: Record<string, unknown>): { kind: 'delta' | 'message'; text: string } | null {
  const eventType = getRecordText(parsed, ['type']);
  const part = isRecord(parsed.part) ? parsed.part : undefined;
  const text = getRecordText(parsed, ['text']) || (part ? getRecordText(part, ['text']) : '');
  if (!text) return null;
  if (eventType === 'text' || eventType === 'delta') return { kind: 'delta', text };
  if (eventType === 'message') return { kind: 'message', text };
  return null;
}

function extractJsonTextFromProviderEvents(stdout: string, providerName: ProviderName): string {
  let deltaText = '';
  let messageText = '';
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const event = providerName === 'claude-code'
        ? extractClaudeEventText(parsed)
        : providerName === 'codex'
          ? extractCodexEventText(parsed)
          : providerName === 'opencode'
            ? extractOpenCodeEventText(parsed)
            : null;
      if (!event?.text) continue;
      if (event.kind === 'delta') {
        deltaText += event.text;
      } else {
        messageText = event.text;
      }
    } catch {
      // A non-event line may be the raw JSON payload; parseAgentOutput handles it below.
    }
  }
  return deltaText.trim() || messageText.trim() || stdout;
}

export function parseTeamArchitectProviderOutput(providerName: ProviderName, stdout: string): unknown {
  if (providerName === 'claude-code') {
    try {
      return parseClaudeStructuredOutput(stdout);
    } catch {
      return parseAgentOutput(extractJsonTextFromProviderEvents(stdout, providerName));
    }
  }
  return parseAgentOutput(extractJsonTextFromProviderEvents(stdout, providerName));
}

function stringifyAgentOutputForDisplay(output: unknown): string {
  if (typeof output === 'string') return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return '';
  }
}

function createTeamArchitectOutputStreamer(providerName: ProviderName, onDelta: ((text: string) => void) | undefined) {
  let lineBuffer = '';
  let emittedText = '';

  function emit(text: string) {
    if (!text) return;
    emittedText += text;
    onDelta?.(text);
  }

  function handleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const event = providerName === 'claude-code'
        ? extractClaudeEventText(parsed)
        : providerName === 'codex'
          ? extractCodexEventText(parsed)
          : providerName === 'opencode'
            ? extractOpenCodeEventText(parsed)
            : null;
      if (!event?.text) return;
      if (event.kind === 'delta' || !emittedText) emit(event.text);
    } catch {
      // Non-event output is parsed after the process exits.
    }
  }

  return {
    push(chunk: string) {
      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    },
    flush() {
      if (lineBuffer.trim()) handleLine(lineBuffer);
      lineBuffer = '';
    },
    hasEmittedText() {
      return emittedText.trim().length > 0;
    },
  };
}

function buildTeamArchitectEnv(providerName: ProviderName, providerConfig: ProviderConfig): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (providerName === 'codex') {
    if (providerConfig.apiKey) env.OPENAI_API_KEY = providerConfig.apiKey;
    if (providerConfig.baseUrl) env.OPENAI_BASE_URL = providerConfig.baseUrl;
    return env;
  }
  if (providerConfig.apiKey) env.ANTHROPIC_API_KEY = providerConfig.apiKey;
  if (providerConfig.baseUrl) env.ANTHROPIC_BASE_URL = providerConfig.baseUrl;
  return env;
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
  async generateDraft(input: TeamDraftAgentInput, options: TeamDraftAgentGenerateOptions = {}): Promise<unknown> {
    const providerName = systemSettingsRepo.getTeamArchitectProvider();
    const providerConfig = getProviderConfig(providerName);
    if (!providerConfig) {
      throw new Error('Team Architect 暂不可用：provider 未配置');
    }
    const readiness = buildProviderReadiness(providerConfig);
    if (!readiness.cliAvailable || providerConfig.lastTestResult?.success !== true) {
      throw new Error(`Team Architect 暂不可用：${readiness.message}`);
    }

    const cliPath = providerConfig.cliPath.replace(/^~/, process.env.HOME || '/root');
    const env = buildTeamArchitectEnv(providerName, providerConfig);
    const model = providerConfig.defaultModel?.trim();
    const args = buildTeamArchitectCliArgs(input, model, providerName, providerConfig.thinking);
    const timeoutMs = resolveTeamArchitectTimeoutMs(input, providerConfig.timeout);

    return await new Promise<unknown>((resolve, reject) => {
      const proc = spawn(cliPath, args, {
        cwd: process.cwd(),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const outputStreamer = createTeamArchitectOutputStreamer(providerName, options.onDelta);
      const timer = timeoutMs === null
        ? null
        : setTimeout(() => {
            timedOut = true;
            try {
              proc.kill('SIGKILL');
            } catch {
              // ignore
            }
          }, timeoutMs);

      proc.stdout?.on('data', chunk => {
        const text = chunk.toString();
        stdout += text;
        outputStreamer.push(text);
      });
      proc.stderr?.on('data', chunk => {
        stderr += chunk.toString();
      });
      proc.on('error', () => {
        if (timer) clearTimeout(timer);
        reject(new Error('Team Architect unavailable'));
      });
      proc.on('close', code => {
        if (timer) clearTimeout(timer);
        if (timedOut) {
          reject(new Error('Team Architect timed out'));
          return;
        }
        if (code !== 0) {
          const detail = stderr.trim() || stdout.trim();
          reject(new Error(detail ? `Team Architect unavailable: ${detail}` : 'Team Architect unavailable'));
          return;
        }
        try {
          outputStreamer.flush();
          const output = parseTeamArchitectProviderOutput(providerName, stdout);
          if (!outputStreamer.hasEmittedText()) {
            options.onDelta?.(stringifyAgentOutputForDisplay(output));
          }
          resolve(output);
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
    const output = await agentClient.generateDraft(input, { onDelta: options.onDelta });
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
