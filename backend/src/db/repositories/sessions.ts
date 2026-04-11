import { db } from '../db.js';

export const sessionsRepo = {
  upsert(agentId: string, roomId: string, sessionId: string): void {
    db.prepare(`
      INSERT OR REPLACE INTO sessions (agent_id, room_id, session_id, created_at)
      VALUES (@agentId, @roomId, @sessionId, @createdAt)
    `).run({ agentId, roomId, sessionId, createdAt: Date.now() });
  },

  getByRoom(roomId: string): Record<string, string> {
    const rows = db.prepare('SELECT agent_id, session_id FROM sessions WHERE room_id = ?').all(roomId) as {
      agent_id: string;
      session_id: string;
    }[];
    return Object.fromEntries(rows.map(r => [r.agent_id, r.session_id]));
  },

  deleteByRoom(roomId: string): void {
    db.prepare('DELETE FROM sessions WHERE room_id = ?').run(roomId);
  },
};
