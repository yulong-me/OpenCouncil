/**
 * A2A Router — Agent-to-Agent @mention 解析与路由
 *
 * 核心职责：
 * 1. 解析消息中的 @mention（行首检测）
 * 2. 追踪 A2A 深度，防止无限递归
 * 3. 达到深度上限时，触发 Manager 决策
 */

import type { A2AContext, A2ARouteResult } from '../../types.js';
import { store } from '../../store.js';
import { getAgent } from '../../config/agentConfig.js';

// A2A 最大深度 — 达到后交回 Manager 决策
export const MAX_A2A_DEPTH = 4;

/**
 * 解析消息中的 @mention（只匹配行首，防止 code block 内误触发）
 *
 * @example
 * scanForA2AMentions("好的，我来处理\n@opencode 请帮我 review")
 * // => ['opencode']
 */
export function scanForA2AMentions(text: string): string[] {
  // 匹配行首的 @agentId（word boundary 开始）
  const matches = text.match(/^@(\w+)/gm);
  if (!matches) return [];

  // 去重
  const unique = [...new Set(matches.map(m => m.slice(1)))];
  return unique;
}

/**
 * 验证 @mention 的目标 Agent 是否存在
 */
export function resolveAgent(targetId: string): { exists: boolean; agentName: string } {
  try {
    const agent = getAgent(targetId);
    if (agent) {
      return { exists: true, agentName: agent.name };
    }
  } catch {
    // ignore
  }
  return { exists: false, agentName: targetId };
}

/**
 * A2A 路由决策
 *
 * @param params A2A 上下文
 * @returns 路由结果：继续路由到 Agent，或交回 Manager
 */
export function a2aRoute(params: A2AContext): A2ARouteResult {
  if (params.depth >= MAX_A2A_DEPTH) {
    // 达到深度上限，交回 Manager
    return {
      type: 'manager_handoff',
      depth: params.depth,
      callChain: params.callChain,
      taskSummary: params.taskSummary,
    };
  }

  return {
    type: 'agent_route',
    depth: params.depth,
    callChain: params.callChain,
  };
}

/**
 * 从消息内容中解析 A2A mentions 并路由
 */
export function routeFromMessage(
  message: string,
  roomId: string,
  depth: number,
  callChain: string[]
): { routes: string[]; handoff: boolean } {
  const mentions = scanForA2AMentions(message);

  if (mentions.length === 0) {
    return { routes: [], handoff: false };
  }

  // 验证每个 mention 的目标是否存在
  const validRoutes = mentions
    .map(id => resolveAgent(id))
    .filter(r => r.exists)
    .map(r => r.agentName);

  if (validRoutes.length === 0) {
    return { routes: [], handoff: false };
  }

  // 检查是否达到深度上限
  if (depth >= MAX_A2A_DEPTH) {
    return { routes: validRoutes, handoff: true };
  }

  return { routes: validRoutes, handoff: false };
}

/**
 * 构建 Manager 兜底 prompt（当达到深度上限时）
 */
export function buildManagerFallbackPrompt(
  callChain: string[],
  taskSummary: string
): string {
  const chainStr = callChain.join(' → ');
  return `
【A2A 调用链已达上限（深度 ${MAX_A2A_DEPTH}）】

当前调用链：${chainStr}
当前任务：${taskSummary}

请决策：
1. **继续**：@mention 新的 Worker（我会重置深度计数）
2. **接管**：你直接执行或给出结论
3. **拆分**：任务太复杂，拆成多个子任务

请直接给出你的决策和行动。
`.trim();
}

/**
 * 更新 Room 的 A2A 追踪状态
 */
export function updateA2AContext(roomId: string, depth: number, callChain: string[]): void {
  const room = store.get(roomId);
  if (!room) return;

  store.update(roomId, {
    a2aDepth: depth,
    a2aCallChain: callChain,
  });
}

/**
 * 重置 A2A 计数（Manager 决定继续时）
 */
export function resetA2ADepth(roomId: string): void {
  updateA2AContext(roomId, 0, []);
}
