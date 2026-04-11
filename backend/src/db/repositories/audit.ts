import { db } from '../db.js';
import { v4 as uuid } from 'uuid';

export interface AuditLog {
  id: string;
  timestamp: number;
  agentId?: string;
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export const auditRepo = {
  log(action: string, detail?: string, agentId?: string, metadata?: Record<string, unknown>): AuditLog {
    const entry: AuditLog = {
      id: uuid(),
      timestamp: Date.now(),
      agentId,
      action,
      detail,
      metadata,
    };
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, agent_id, action, detail, metadata)
      VALUES (@id, @timestamp, @agentId, @action, @detail, @metadata)
    `).run({
      id: entry.id,
      timestamp: entry.timestamp,
      agentId: entry.agentId ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
    return entry;
  },

  list(limit = 100): AuditLog[] {
    const rows = db.prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as Record<string, unknown>[];
    return rows.map(r => ({
      id: r.id as string,
      timestamp: r.timestamp as number,
      agentId: r.agent_id as string | undefined,
      action: r.action as string,
      detail: r.detail as string | undefined,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
    }));
  },
};
