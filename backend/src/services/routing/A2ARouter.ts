/**
 * A2A Router — Agent-to-Agent @mention 解析与路由
 *
 * 核心职责：
 * 1. 解析消息中的 @mention（行首检测）
 * 2. 追踪 A2A 深度，防止无限递归
 * 3. 达到深度上限时，协作链自动截断，等待用户指令
 */

import type { A2AContext, A2ARouteResult } from '../../types.js';
import { store } from '../../store.js';
import { getAgent } from '../../config/agentConfig.js';
import { scenesRepo } from '../../db/repositories/scenes.js';

/**
 * 获取 Room 的有效最大 A2A 深度
 * 优先级：room.maxA2ADepth > scene.maxA2ADepth > 5
 * 0 = 无限
 */
function getEffectiveMaxDepth(roomId: string, roomMaxDepth: number | null, sceneId: string): number {
  if (roomMaxDepth !== null) return roomMaxDepth;
  const scene = scenesRepo.get(sceneId);
  return scene?.maxA2ADepth ?? 5;
}

/**
 * 解析消息中的 @mention（只匹配行首，排除 code block 内容）
 *
 * @example
 * scanForA2AMentions("好的，我来处理\n@opencode 请帮我 review", ["opencode"])
 * // => ['opencode']
 *
 * scanForA2AMentions("```\n@opencode 请帮我\n```\n@architect 继续", ["architect"])
 * // => ['architect'] （code block 内的被排除）
 *
 * 支持含空格的完整名字：
 * scanForA2AMentions("@Ilya Sutskever 怎么说", ["Ilya Sutskever"])
 * // => ['Ilya Sutskever']
 */
export function scanForA2AMentions(text: string, agentNames: string[] = []): string[] {
  // 排除 code block 内容（```...``` 或 `...` 包裹的内容）
  const withoutCodeBlocks = text
    // 匹配 ``` 开头的 code block
    .replace(/```[\s\S]*?```/g, '')
    // 匹配行内 `code` 片段
    .replace(/`[^`]+`/g, '');

  const seen = new Set<string>();
  const names: string[] = [];

  // Build patterns per agent name — handles spaces, middle-dots, and partial matches
  // Sort longest-first so "@Ilya Sutskever" is matched before "@Ilya"
  const matchers: Array<{ name: string; pattern: RegExp }> = agentNames
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(name => ({ name, pattern: buildAgentMentionPattern(name) }));

  for (let i = 0; i < withoutCodeBlocks.length; i++) {
    if (withoutCodeBlocks[i] !== '@') continue;

    // Line-start check: everything between previous newline and this @ must be whitespace-only
    const lineStart = withoutCodeBlocks.lastIndexOf('\n', i - 1) + 1;
    const before = withoutCodeBlocks.slice(lineStart, i);
    if (!/^[ \t]*$/.test(before)) continue;

    const rest = withoutCodeBlocks.slice(i + 1);
    let matchedName: string | null = null;
    let consumed = 0;

    for (const { name, pattern } of matchers) {
      const result = pattern.exec(rest);
      if (!result) continue;
      const tailIdx = result[0].length;
      const nextChar = rest[tailIdx];
      // Tail boundary: next char must be whitespace, punctuation, or end-of-string
      if (nextChar !== undefined && !/[\s)\]】}>,.!?;:，。！？；：]/.test(nextChar)) continue;
      matchedName = name;
      consumed = result[0].length;
      break;
    }

    if (!matchedName) continue;
    if (!seen.has(matchedName)) {
      seen.add(matchedName);
      names.push(matchedName);
    }
    i += consumed;
  }

  return names;
}

const MIDDLE_DOT_PATTERN = /[·・•‧⋅･.．]/;

function buildAgentMentionPattern(agentName: string): RegExp {
  let pattern = '^';
  for (const char of agentName.trim()) {
    if (/\s/.test(char)) {
      pattern += '\\s+';
      continue;
    }
    if (MIDDLE_DOT_PATTERN.test(char)) {
      pattern += '[·・•‧⋅･.．\\s]*';
      continue;
    }
    pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(pattern, 'iu');
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
  const room = store.get(params.roomId);
  const effectiveMaxDepth = room
    ? getEffectiveMaxDepth(params.roomId, room.maxA2ADepth, room.sceneId)
    : 5;

  // 0 = 无限模式，不做深度检查
  if (effectiveMaxDepth > 0 && params.depth >= effectiveMaxDepth) {
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
  const room = store.get(roomId);
  const agentNames = room ? room.agents.map(a => a.name) : [];
  const mentions = scanForA2AMentions(message, agentNames);

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

  // 获取有效深度上限
  const effectiveMaxDepth = room
    ? getEffectiveMaxDepth(roomId, room.maxA2ADepth, room.sceneId)
    : 5;

  // 0 = 无限模式，不做深度检查
  if (effectiveMaxDepth > 0 && depth >= effectiveMaxDepth) {
    return { routes: validRoutes, handoff: true };
  }

  return { routes: validRoutes, handoff: false };
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
