import { db } from '../db.js';
import type { DiscussionRoom, Message } from '../../types.js';

/** Rooms CRUD */
export const roomsRepo = {
  create(room: DiscussionRoom): DiscussionRoom {
    db.prepare(`
      INSERT INTO rooms (id, topic, state, report, created_at, updated_at)
      VALUES (@id, @topic, @state, @report, @createdAt, @updatedAt)
    `).run({
      id: room.id,
      topic: room.topic,
      state: room.state,
      report: room.report ?? null,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    });
    return room;
  },

  get(id: string): DiscussionRoom | undefined {
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      topic: row.topic as string,
      state: row.state as DiscussionRoom['state'],
      report: row.report as string | undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      agents: [],
      messages: messagesRepo.listByRoom(row.id as string),
      sessionIds: {},
      a2aDepth: 0,
      a2aCallChain: [],
    };
  },

  update(id: string, partial: Partial<DiscussionRoom>): DiscussionRoom | undefined {
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return undefined;
    db.prepare(`
      UPDATE rooms SET
        topic = @topic,
        state = @state,
        report = @report,
        updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      topic: partial.topic ?? (existing.topic as string),
      state: partial.state ?? (existing.state as string),
      report: partial.report !== undefined ? partial.report : (existing.report as string | null),
      updatedAt: Date.now(),
    });
    return this.get(id);
  },

  list(): DiscussionRoom[] {
    const rows = db.prepare('SELECT id FROM rooms ORDER BY created_at DESC').all() as { id: string }[];
    return rows.map(r => this.get(r.id)!);
  },
};

/** Messages CRUD */
export const messagesRepo = {
  insert(roomId: string, msg: Message): Message {
    db.prepare(`
      INSERT INTO messages (id, room_id, agent_role, agent_name, content, timestamp, type, thinking, duration_ms, total_cost_usd, input_tokens, output_tokens, temp_msg_id)
      VALUES (@id, @roomId, @agentRole, @agentName, @content, @timestamp, @type, @thinking, @durationMs, @totalCostUsd, @inputTokens, @outputTokens, @tempMsgId)
    `).run({
      id: msg.id,
      roomId,
      agentRole: msg.agentRole,
      agentName: msg.agentName,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type,
      thinking: msg.thinking ?? null,
      durationMs: msg.duration_ms ?? null,
      totalCostUsd: msg.total_cost_usd ?? null,
      inputTokens: msg.input_tokens ?? null,
      outputTokens: msg.output_tokens ?? null,
      tempMsgId: msg.tempMsgId ?? null,
    });
    return msg;
  },

  updateContent(messageId: string, content: string, meta?: Partial<Message>): void {
    db.prepare(`
      UPDATE messages SET
        content = @content,
        thinking = @thinking,
        duration_ms = @durationMs,
        total_cost_usd = @totalCostUsd,
        input_tokens = @inputTokens,
        output_tokens = @outputTokens
      WHERE id = @id
    `).run({
      id: messageId,
      content,
      thinking: meta?.thinking ?? null,
      durationMs: meta?.duration_ms ?? null,
      totalCostUsd: meta?.total_cost_usd ?? null,
      inputTokens: meta?.input_tokens ?? null,
      outputTokens: meta?.output_tokens ?? null,
    });
  },

  listByRoom(roomId: string): Message[] {
    const rows = db.prepare(
      'SELECT * FROM messages WHERE room_id = ? ORDER BY timestamp ASC'
    ).all(roomId) as Record<string, unknown>[];
    return rows.map(r => ({
      id: r.id as string,
      agentRole: r.agent_role as Message['agentRole'],
      agentName: r.agent_name as string,
      content: r.content as string,
      timestamp: r.timestamp as number,
      type: r.type as Message['type'],
      thinking: r.thinking as string | undefined,
      duration_ms: r.duration_ms as number | undefined,
      total_cost_usd: r.total_cost_usd as number | undefined,
      input_tokens: r.input_tokens as number | undefined,
      output_tokens: r.output_tokens as number | undefined,
      tempMsgId: r.temp_msg_id as string | undefined,
    }));
  },
};
