import { messagesRepo, sessionsRepo } from '../../db/index.js';
import { getAgent, type ProviderName } from '../../config/agentConfig.js';
import { debug, info, warn } from '../../lib/logger.js';
import { store } from '../../store.js';
import type { Agent, Message, MessageType, ToolCall } from '../../types.js';
import {
  clearActiveAgentRun,
  registerActiveAgentRun,
} from '../agentRuns.js';
import { getProvider } from '../providers/index.js';
import {
  detectRoundtableHandoff,
  getEffectiveMaxDepthForRoom,
  scanForA2AMentions,
  scanForInlineA2AMentions,
  updateA2AContext,
} from '../routing/A2ARouter.js';
import { buildRoomScopedSystemPrompt } from '../scenePromptBuilder.js';
import {
  emitStreamDelta,
  emitStreamEnd,
  emitStreamStart,
  emitThinkingDelta,
  emitToolUse,
} from '../socketEmitter.js';
import {
  assembleProviderRuntime,
  buildEffectiveSkillSummary,
  resolveEffectiveSkills,
} from '../skills.js';
import { ensureWorkspace } from '../workspace.js';
import { type AgentRequestMeta, handleAgentRunFailure } from './errors.js';
import {
  addMessage,
  addSystemMessage,
  appendMessageContent,
  buildTranscriptForAgentInvocation,
  telemetry,
  updateAgentStatus,
} from './shared.js';

export async function generateReportInline(
  topic: string,
  allContent: string,
  worker: Agent,
  roomId: string,
): Promise<string> {
  return streamingCallAgent(
    {
      domainLabel: worker.domainLabel,
      systemPrompt: `专业${worker.domainLabel}，负责将讨论重组成结构化报告`,
      userMessage: `请基于以下讨论内容输出一份简明报告。\n\n【议题】${topic}\n\n【讨论内容】\n${allContent}`,
    },
    roomId,
    worker.id,
    worker.configId,
    worker.name,
    'report',
    'WORKER',
  );
}

export async function streamingCallAgent(
  ctx: {
    domainLabel: string;
    systemPrompt: string;
    userMessage: string;
  },
  roomId: string,
  agentId: string,
  configId: string,
  agentName: string,
  msgType: MessageType = 'summary',
  agentRole: 'MANAGER' | 'WORKER' = 'MANAGER',
  requestMeta?: AgentRequestMeta,
): Promise<string> {
  let providerName: ProviderName = 'claude-code';
  let msg: Message | undefined;
  let msgId = '';
  let streamStarted = false;
  let accumulated = '';
  let accumulatedThinking = '';
  let duration_ms = 0;
  let total_cost_usd = 0;
  let input_tokens = 0;
  let output_tokens = 0;
  let returnedSessionId = '';
  let activeRunController: AbortController | null = null;
  let activeRunRegistered = false;
  let deltaCount = 0;
  let thinkingCount = 0;
  let accumulatedToolCalls: ToolCall[] = [];

  try {
    const agentConfig = getAgent(configId);
    providerName = agentConfig?.provider ?? 'claude-code';
    const systemPrompt = agentConfig?.systemPrompt ?? ctx.systemPrompt;
    const room = store.get(roomId);

    activeRunController = new AbortController();
    registerActiveAgentRun({
      roomId,
      agentId,
      agentName,
      abortController: activeRunController,
    });
    activeRunRegistered = true;

    const workspace = await ensureWorkspace(roomId, room?.workspace);
    const skillState = await resolveEffectiveSkills({
      roomId,
      agentConfigId: configId,
      workspacePath: workspace,
      providerName,
    });
    const runtimeAssembly = await assembleProviderRuntime({
      roomId,
      providerName,
      effectiveWorkspace: workspace,
      effectiveSkills: skillState.effective,
    });

    const recentTranscript = room
      ? buildTranscriptForAgentInvocation(room, agentName)
      : undefined;

    const basePrompt = `【当前执行者】${agentName}\n【角色】${ctx.domainLabel}（${systemPrompt}）`;
    const prompt = buildRoomScopedSystemPrompt(roomId, basePrompt, {
      userMessage: ctx.userMessage,
      recentTranscript,
      roomTopic: room?.topic,
      toAgentName: agentName,
      a2aCallChain: room?.a2aCallChain,
      workspace,
      skillsSummary: buildEffectiveSkillSummary(skillState.effective),
      outputMode: msgType === 'report' ? 'report' : 'discussion',
    }) ?? `${basePrompt}\n\n${ctx.userMessage}`;

    const existingSessionId = room?.sessionIds[agentName];
    returnedSessionId = existingSessionId ?? '';
    const providerOpts: Record<string, unknown> = {
      ...(agentConfig?.providerOpts ?? {}),
      sessionId: existingSessionId,
      workspace,
      providerRuntimeDir: runtimeAssembly.providerRuntimeDir,
      roomId,
      agentName,
      firstTokenTimeoutMs: 180000,
      idleTokenTimeoutMs: 180000,
      signal: activeRunController.signal,
    };

    msg = addMessage(roomId, {
      agentRole,
      agentName,
      content: '',
      type: msgType,
    });
    msgId = msg?.id ?? '';

    info('ai:start', {
      roomId,
      agentName,
      agentRole,
      provider: providerName,
      cliPath: (agentConfig?.providerOpts as Record<string, unknown> | undefined)?.cliPath ?? '',
      promptLength: prompt.length,
      sessionId: existingSessionId ?? 'new',
      workspace,
      providerRuntimeDir: runtimeAssembly.providerRuntimeDir,
    });
    debug('stream.start', { roomId, agentId, agentName, msgId, agentRole });
    emitStreamStart(roomId, agentId, agentName, Date.now(), msgId, agentRole);
    streamStarted = true;
    updateAgentStatus(roomId, agentId, 'thinking');

    const provider = getProvider(providerName);
    for await (const event of provider(prompt, agentId, providerOpts)) {
      if (event.type === 'delta') {
        deltaCount++;
        accumulated += event.text;
        appendMessageContent(roomId, msgId, event.text);
        emitStreamDelta(roomId, agentId, event.text);
      } else if (event.type === 'thinking_delta') {
        thinkingCount++;
        accumulatedThinking += event.thinking;
        emitThinkingDelta(roomId, agentId, event.thinking);
      } else if (event.type === 'tool_use') {
        const toolCall: ToolCall = {
          toolName: event.toolName,
          toolInput: event.toolInput,
          callId: event.callId,
          timestamp: Date.now(),
        };
        accumulatedToolCalls = [...accumulatedToolCalls, toolCall];
        const roomState = store.get(roomId);
        if (roomState && msg) {
          const messageId = msg.id;
          store.update(roomId, {
            messages: roomState.messages.map(m =>
              m.id === messageId
                ? { ...m, toolCalls: accumulatedToolCalls }
                : m,
            ),
          });
        }
        emitToolUse(roomId, agentId, event.toolName, event.toolInput, event.callId, toolCall.timestamp);
      } else if (event.type === 'end') {
        duration_ms = event.duration_ms;
        total_cost_usd = event.total_cost_usd;
        input_tokens = event.input_tokens;
        output_tokens = event.output_tokens;
        if (event.sessionId) returnedSessionId = event.sessionId;
      } else if (event.type === 'error') {
        const providerError = new Error(event.message);
        (providerError as Error & { code?: string }).code = 'AGENT_PROVIDER_ERROR';
        throw providerError;
      }
    }
  } catch (err) {
    handleAgentRunFailure({
      err,
      roomId,
      agentId,
      agentName,
      providerName,
      msg,
      msgId,
      streamStarted,
      accumulated,
      accumulatedThinking,
      accumulatedToolCalls,
      requestMeta,
    });
    throw err;
  } finally {
    if (activeRunRegistered) {
      clearActiveAgentRun(roomId, agentId, activeRunController ?? undefined);
    }
  }

  if (returnedSessionId) {
    const room = store.get(roomId);
    if (room) {
      store.update(roomId, {
        sessionIds: { ...room.sessionIds, [agentName]: returnedSessionId },
      });
      sessionsRepo.upsert(agentName, roomId, returnedSessionId);
    }
  }

  if (msg) {
    const room = store.get(roomId);
    if (room) {
      store.update(roomId, {
        messages: room.messages.map(m =>
          m.id === msg.id
            ? {
                ...m,
                content: accumulated,
                thinking: accumulatedThinking,
                toolCalls: accumulatedToolCalls,
                duration_ms,
                total_cost_usd,
                input_tokens,
                output_tokens,
              }
            : m,
        ),
      });
      messagesRepo.updateContent(msg.id, accumulated, {
        thinking: accumulatedThinking,
        toolCalls: accumulatedToolCalls,
        duration_ms,
        total_cost_usd,
        input_tokens,
        output_tokens,
      });
    }
  }

  info('ai:end', {
    roomId,
    agentName,
    agentRole,
    outputSnippet: accumulated.length > 80 ? accumulated.slice(0, 80) + '…' : accumulated,
    outputLength: accumulated.length,
    duration_ms,
    total_cost_usd,
    input_tokens,
    output_tokens,
  });
  debug('stream.end', {
    roomId,
    agentId,
    agentName,
    msgId,
    duration_ms,
    deltaCount,
    thinkingCount,
    outputLen: accumulated.length,
  });
  updateAgentStatus(roomId, agentId, 'idle');
  emitStreamEnd(roomId, agentId, msgId, {
    duration_ms,
    total_cost_usd,
    input_tokens,
    output_tokens,
  });

  await a2aOrchestrate(roomId, agentId, agentName, accumulated);
  return accumulated;
}

export async function a2aOrchestrate(
  roomId: string,
  fromAgentId: string,
  fromAgentName: string,
  outputText: string,
): Promise<void> {
  const room = store.get(roomId);
  if (!room) return;

  const mentionTargets = Array.from(
    new Set(
      room.agents.flatMap(a => [a.name, a.domainLabel, a.configId].map(v => v.trim())).filter(Boolean),
    ),
  );

  let mentions: string[] = [];
  let mentionSource = 'line_start';

  if (room.sceneId === 'roundtable-forum') {
    const handoff = detectRoundtableHandoff(outputText, mentionTargets);
    if (handoff) {
      mentions = [handoff.mention];
      mentionSource = handoff.source;
      if (handoff.source === 'inline_last_line_fallback') {
        warn('a2a:mention_fallback_inline_last_line', {
          roomId,
          fromAgentName,
          mention: handoff.mention,
        });
      } else if (handoff.source === 'standalone_with_trailing_text_fallback') {
        warn('a2a:mention_fallback_trailing_text_after_standalone', {
          roomId,
          fromAgentName,
          mention: handoff.mention,
        });
      }
    } else {
      mentionSource = 'roundtable_invalid_or_missing';
      const inlineMentions = scanForInlineA2AMentions(outputText, mentionTargets);
      if (inlineMentions.length > 0) {
        warn('a2a:invalid_mention_format', {
          roomId,
          fromAgentName,
          mentions: inlineMentions,
          sceneId: room.sceneId,
        });
        addSystemMessage(
          roomId,
          `[系统提示] ${fromAgentName} 使用了非标准圆桌交棒格式。圆桌论坛请在最后一行单独写 @专家名；本轮未自动接力。`,
        );
      }
    }
  } else {
    mentions = scanForA2AMentions(outputText, mentionTargets);
  }

  debug('a2a:scan', { roomId, fromAgentName, mentions, mentionSource, sceneId: room.sceneId });
  if (mentions.length === 0) return;

  const isManager = room.agents.some(a => a.id === fromAgentId && a.role === 'MANAGER');
  const hasQuestion = /[？?]/.test(outputText);
  if (isManager && hasQuestion && mentions.length > 1) {
    debug('a2a:guard', {
      roomId,
      fromAgentName,
      mentionsCount: mentions.length + 1,
      keptMention: mentions[0],
    });
    mentions = [mentions[0]];
  }

  const currentDepth = room.a2aDepth ?? 0;
  const currentChain = room.a2aCallChain ?? [];
  const effectiveMaxDepth = getEffectiveMaxDepthForRoom(roomId);

  telemetry('a2a:detected', { roomId, fromAgentName, mentions, depth: currentDepth });

  if (effectiveMaxDepth > 0 && currentDepth >= effectiveMaxDepth) {
    telemetry('a2a:depth_limit', { roomId, depth: currentDepth, chain: currentChain });
    addSystemMessage(
      roomId,
      `[系统提醒] 已达到协作深度上限（${effectiveMaxDepth} 层），当前停止继续 @ 其他专家，请你决定下一步。`,
    );
    return;
  }

  const newChain = [...currentChain, fromAgentName];
  updateA2AContext(roomId, currentDepth + 1, newChain);

  const skippedCycleTargets: string[] = [];
  let routedCount = 0;

  for (const mention of mentions) {
    const targetAgent = room.agents.find(
      a =>
        a.name.toLowerCase() === mention.toLowerCase() ||
        a.domainLabel.toLowerCase() === mention.toLowerCase() ||
        a.configId.toLowerCase() === mention.toLowerCase(),
    );

    if (!targetAgent) {
      telemetry('a2a:agent_not_found', { roomId, mention });
      continue;
    }

    if (createsImmediatePingPong(newChain, targetAgent.name)) {
      telemetry('a2a:skip_cycle', { roomId, target: targetAgent.name, chain: newChain });
      skippedCycleTargets.push(targetAgent.name);
      continue;
    }

    telemetry('a2a:route', {
      roomId,
      from: fromAgentName,
      to: targetAgent.name,
      depth: currentDepth + 1,
    });

    const filteredOutput = outputText
      .replace(new RegExp(`@${targetAgent.name}(?![\\w])`, 'g'), targetAgent.name)
      .replace(new RegExp(`@${targetAgent.domainLabel}(?![\\w])`, 'g'), targetAgent.domainLabel);

    const a2aPrompt = `【A2A 协作请求】

来自：${fromAgentName}
调用链：${newChain.join(' → ')}
议题：${room.topic}

${fromAgentName} 的输出：
${filteredOutput}

你是 ${targetAgent.domainLabel}。请基于以上上下文继续短打推进：先给结论或反驳，再补 1 个核心理由。
详细论证放到思考过程；回复区不要写成长文。
如果需要其他专家参与，请使用行首 @mention 格式（不要 @ 自己）。`;

    await streamingCallAgent(
      {
        domainLabel: targetAgent.domainLabel,
        systemPrompt: `专业${targetAgent.domainLabel}，执行具体任务`,
        userMessage: a2aPrompt,
      },
      roomId,
      targetAgent.id,
      targetAgent.configId,
      targetAgent.name,
      'statement',
      'WORKER',
    );
    routedCount++;
  }

  if (routedCount === 0 && skippedCycleTargets.length > 0) {
    addSystemMessage(
      roomId,
      `[系统提醒] 检测到重复协作链路，已跳过 ${skippedCycleTargets.map(name => `@${name}`).join('、')}，避免讨论原地打转。请引入新专家或由你来决定下一步。`,
    );
  }
}

function createsImmediatePingPong(callChain: string[], targetAgentName: string): boolean {
  if (callChain.length < 3) return false;

  const currentSpeaker = callChain[callChain.length - 1];
  const previousSpeaker = callChain[callChain.length - 2];
  const speakerBeforePrevious = callChain[callChain.length - 3];

  return speakerBeforePrevious === currentSpeaker && previousSpeaker === targetAgentName;
}
