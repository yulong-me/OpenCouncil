/**
 * Team Prompt Builder
 *
 * Assembles the effective system prompt for every agent execution:
 *   TeamVersion workflow prompt + basePrompt (Agent/Action) + Runtime Context
 */

import { store } from '../store.js';
import { teamsRepo } from '../db/index.js';
import { getEffectiveMaxDepthForRoom } from './routing/A2ARouter.js';
import { debug, warn } from '../lib/logger.js';
import type { TeamVersionMemberSnapshot } from '../types.js';

const DEFAULT_TEAM_WORKFLOW_PROMPT = `【团队工作流】

围绕用户目标协作推进：先澄清目标和边界，再给出判断、行动和验证证据。需要同伴介入时，另起一行行首 @专家名，并说明对方需要判断的具体问题。`;

interface RuntimeContext {
  /** Current user input / task text */
  userMessage: string;
  /** A2A task text (separate from userMessage for A2A orchestration) */
  taskText?: string;
  /** Recent conversation transcript (last N messages) */
  recentTranscript?: string;
  /** Target agent name for A2A routing context */
  toAgentName?: string;
  /** A2A call chain */
  a2aCallChain?: string[];
  /** Room topic */
  roomTopic?: string;
  /** Current A2A depth */
  a2aDepth?: number;
  /** Effective max A2A depth, 0 = unlimited */
  a2aMaxDepth?: number;
  /** Current room participants shown to the recipient for collaboration routing */
  participants?: Array<{
    name: string;
    domainLabel: string;
    role?: string;
  }>;
  /** Workspace path (shown as 【工作目录】) */
  workspace?: string;
  /** Human-readable effective skill summary; provider-native discovery remains primary path */
  skillsSummary?: string;
  /** Discussion replies should stay terse; reports can opt out */
  outputMode?: 'discussion' | 'report';
}

/**
 * Build the room-scoped system prompt.
 * Returns null if the room is not found.
 */
export function buildRoomScopedSystemPrompt(
  roomId: string,
  basePrompt: string,
  runtime: RuntimeContext,
): string | null {
  const room = store.get(roomId);
  if (!room) {
    warn('team:prompt:room_missing', { roomId });
    return null;
  }

  const teamVersion = room.teamVersionId
    ? teamsRepo.getVersion(room.teamVersionId)
    : room.teamId
      ? teamsRepo.getActiveVersion(room.teamId)
      : teamsRepo.getActiveVersion('roundtable-forum');
  const workflowPrompt = teamVersion?.workflowPrompt ?? DEFAULT_TEAM_WORKFLOW_PROMPT;
  if (!teamVersion) {
    warn('team:prompt:version_missing', { roomId, teamId: room.teamId, teamVersionId: room.teamVersionId });
  }

  const parts: string[] = [];

  // 1. TeamVersion workflow prompt is pinned at room creation.
  parts.push(workflowPrompt);

  // 2. Base prompt (Agent persona prompt or system action prompt)
  parts.push(basePrompt);

  // 3. Runtime Context
  const roomRuntime: RuntimeContext = {
    ...runtime,
    roomTopic: runtime.roomTopic ?? room.topic,
    a2aDepth: runtime.a2aDepth ?? room.a2aDepth ?? 0,
    a2aMaxDepth: runtime.a2aMaxDepth ?? getEffectiveMaxDepthForRoom(roomId),
    participants: runtime.participants ?? room.agents.map(a => ({
      name: a.name,
      domainLabel: a.domainLabel,
      role: a.role,
    })),
  };
  parts.push(buildRuntimeContextString(roomRuntime));

  const prompt = parts.join('\n\n');
  debug('team:prompt:built', {
    roomId,
    teamId: room.teamId,
    teamVersionId: room.teamVersionId,
    promptSource: 'team_version',
    basePromptLength: basePrompt.length,
    promptLength: prompt.length,
    participantCount: roomRuntime.participants?.length ?? 0,
    hasWorkspace: Boolean(roomRuntime.workspace),
    hasSkillsSummary: Boolean(roomRuntime.skillsSummary),
  });

  return prompt;
}

export function resolvePinnedTeamMemberSnapshot(
  roomId: string,
  agentConfigId: string,
): TeamVersionMemberSnapshot | undefined {
  const room = store.get(roomId);
  if (!room?.teamVersionId) return undefined;

  const teamVersion = teamsRepo.getVersion(room.teamVersionId);
  return teamVersion?.memberSnapshots.find(snapshot => snapshot.id === agentConfigId);
}

export function buildAgentBasePrompt(
  roomId: string,
  agentConfigId: string,
  agentName: string,
  domainLabel: string,
  fallbackSystemPrompt: string,
): string {
  const snapshot = resolvePinnedTeamMemberSnapshot(roomId, agentConfigId);
  const effectiveName = snapshot?.name ?? agentName;
  const effectiveRoleLabel = snapshot?.roleLabel ?? domainLabel;
  const effectiveSystemPrompt = snapshot?.systemPrompt ?? fallbackSystemPrompt;
  return `【当前执行者】${effectiveName}\n【角色】${effectiveRoleLabel}（${effectiveSystemPrompt}）`;
}

function buildRuntimeContextString(runtime: RuntimeContext): string {
  const lines: string[] = ['【运行时上下文】'];

  if (runtime.workspace) {
    lines.push(`【工作目录】${runtime.workspace}`);
  }

  if (runtime.skillsSummary) {
    lines.push(`【生效 Skills】\n${runtime.skillsSummary}`);
  }

  if (runtime.roomTopic) {
    lines.push(`【议题】${runtime.roomTopic}`);
  }

  if (runtime.a2aMaxDepth !== undefined) {
    const currentDepth = runtime.a2aDepth ?? 0;
    const maxDepthLabel = runtime.a2aMaxDepth === 0 ? '∞' : `${runtime.a2aMaxDepth} 层`;
    lines.push(`【A2A 协作深度】当前 ${currentDepth} 层 / 最大 ${maxDepthLabel}`);
  }

  if (runtime.toAgentName) {
    lines.push(`【当前接收人】${runtime.toAgentName}`);
  }

  if (runtime.participants && runtime.participants.length > 0) {
    lines.push('【参与专家】');
    for (const participant of runtime.participants) {
      lines.push(`- ${participant.name}（${participant.domainLabel}）`);
    }
    lines.push('需要协作时，另起一行行首 @专家名；只是引用观点时用【专家名】。');
  }

  if (runtime.outputMode !== 'report') {
    lines.push('【回复区输出协议】');
    lines.push('- 回复区只保留结论、反驳、决定或下一步；优先 1-4 句，通常控制在 120-180 字内');
    lines.push('- 只给 1 个最核心理由，不要铺背景、不要展开成长论、不要在回复区复述完整推导');
    lines.push('- 详细论证、推导、例子、旁征博引放到思考过程；回复区不要把思考内容再重复一遍');
    lines.push('- 如果需要交棒，正文收完后直接写一行 @专家名，不要在交棒后继续补正文');
  }

  if (runtime.userMessage) {
    lines.push(`【用户输入/任务】${runtime.userMessage}`);
  }

  if (runtime.taskText) {
    lines.push(`【A2A协作任务】${runtime.taskText}`);
  }

  if (runtime.a2aCallChain && runtime.a2aCallChain.length > 0) {
    lines.push(`【调用链】${runtime.a2aCallChain.join(' → ')}`);
  }

  if (runtime.recentTranscript) {
    lines.push(`【对话记录】\n${runtime.recentTranscript}`);
  }

  return lines.join('\n');
}
