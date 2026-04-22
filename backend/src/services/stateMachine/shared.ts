import { v4 as uuid } from 'uuid';

import { roomsRepo, messagesRepo, auditRepo } from '../../db/index.js';
import { debug } from '../../lib/logger.js';
import { store } from '../../store.js';
import type { Message } from '../../types.js';
import { emitAgentStatus, emitUserMessage } from '../socketEmitter.js';

export function telemetry(event: string, meta: Record<string, unknown>) {
  auditRepo.log(event, undefined, undefined, meta);
  debug(event, meta);
}

export function addMessage(
  roomId: string,
  msg: Omit<Message, 'id' | 'timestamp'>,
): Message | undefined {
  const room = store.get(roomId);
  if (!room) return undefined;

  const message: Message = { ...msg, id: uuid(), timestamp: Date.now() };
  store.update(roomId, { messages: [...room.messages, message] });
  messagesRepo.insert(roomId, message);
  // Sync updatedAt to DB so roomsRepo.list() reflects recent activity order
  roomsRepo.update(roomId, {});
  // Emit socket event so frontend inserts user message immediately (no waiting for poll)
  emitUserMessage(roomId, message);
  return message;
}

export function addUserMessage(
  roomId: string,
  content: string,
  toAgentId?: string,
): Message | undefined {
  return addMessage(roomId, {
    agentRole: 'USER',
    agentName: '你',
    content,
    type: 'user_action',
    toAgentId,
  });
}

export function addSystemMessage(roomId: string, content: string): Message | undefined {
  return addMessage(roomId, {
    agentRole: 'WORKER',
    agentName: '系统',
    content,
    type: 'system',
  });
}

export function appendMessageContent(roomId: string, messageId: string, extra: string) {
  const room = store.get(roomId);
  if (!room) return;

  const updatedMessages = room.messages.map(m =>
    m.id === messageId ? { ...m, content: m.content + extra } : m,
  );
  store.update(roomId, { messages: updatedMessages });

  const msg = room.messages.find(m => m.id === messageId);
  if (msg) {
    messagesRepo.updateContent(messageId, msg.content + extra);
  }
  // Note: do NOT sync updatedAt here — each token delta would cause DB write amplification.
  // updatedAt is synced when a new message is added (addMessage), which is sufficient
  // for "recent activity" ordering since the list only reorders on new message arrival.
}

export function buildTranscriptForAgentInvocation(
  room: NonNullable<ReturnType<typeof store.get>>,
  agentName: string,
): string | undefined {
  const hasJoinSystemMessage = room.messages.some(
    m => m.type === 'system' && m.agentName === agentName && m.content === `${agentName} 加入了讨论`,
  );
  const hasAgentSpokenBefore = room.messages.some(
    m => m.agentName === agentName && m.type !== 'system',
  );

  const transcriptMessages = hasJoinSystemMessage && !hasAgentSpokenBefore
    ? room.messages
    : room.messages.slice(-10);

  if (transcriptMessages.length === 0) return undefined;

  return transcriptMessages
    .map(m => `【${m.agentName}】${m.content}`)
    .join('\n\n');
}

export function updateAgentStatus(
  roomId: string,
  agentId: string,
  status: 'idle' | 'thinking' | 'waiting' | 'done',
) {
  const room = store.get(roomId);
  if (!room) return;

  store.update(roomId, {
    agents: room.agents.map(a => (a.id === agentId ? { ...a, status } : a)),
  });
  emitAgentStatus(roomId, agentId, status);
}
