interface ActiveAgentRun {
  roomId: string;
  agentId: string;
  agentName: string;
  abortController: AbortController;
  startedAt: number;
}

const activeRuns = new Map<string, ActiveAgentRun>();

function buildRunKey(roomId: string, agentId: string): string {
  return `${roomId}:${agentId}`;
}

export function registerActiveAgentRun(args: {
  roomId: string;
  agentId: string;
  agentName: string;
  abortController: AbortController;
}): void {
  const key = buildRunKey(args.roomId, args.agentId);
  const existing = activeRuns.get(key);
  if (existing) {
    const err = new Error(`Active run already exists for ${args.roomId}:${args.agentId}`);
    (err as Error & { code?: string }).code = 'AGENT_RUN_CONFLICT';
    throw err;
  }

  activeRuns.set(key, {
    ...args,
    startedAt: Date.now(),
  });
}

export function clearActiveAgentRun(
  roomId: string,
  agentId: string,
  abortController?: AbortController,
): void {
  const key = buildRunKey(roomId, agentId);
  const current = activeRuns.get(key);
  if (!current) return;
  if (abortController && current.abortController !== abortController) return;
  activeRuns.delete(key);
}

export function stopAgentRun(roomId: string, agentId: string): {
  stopped: boolean;
  agentName?: string;
  startedAt?: number;
} {
  const run = activeRuns.get(buildRunKey(roomId, agentId));
  if (!run) return { stopped: false };
  run.abortController.abort();
  return {
    stopped: true,
    agentName: run.agentName,
    startedAt: run.startedAt,
  };
}

export function hasActiveAgentRunInRoom(roomId: string): boolean {
  for (const run of activeRuns.values()) {
    if (run.roomId === roomId) return true;
  }
  return false;
}
