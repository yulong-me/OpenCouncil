---
feature_ids: [F003]
related_features: [F001]
topics: [A2A, tool-agent, collaboration, workspace, multi-agent]
doc_kind: spec
created: 2026-04-11
---

# F003: A2A 工具型 Agent 协作层

> Status: spec | Owner: 宪宪 | Reviewer: @opencode ✅

## Why

F001 当前架构是"消息型 Agent"——Agent 只输出文本，无法真正协作开发。要支持：
1. **协作软件开发** — Agent 写代码、Review、修改
2. **Code Review / Paper Review** — Agent 分析、辩论、收敛

需要升级为**工具型 Agent** + **A2A @mention 协作协议**。

## What

在 F001 基础上，新增：

1. **AgentService 抽象层** — 统一接口调用 Claude Code / OpenCode CLI
2. **Workspace Manager** — 共享工作目录，Agent 间文件共享
3. **A2A Router** — 解析 @mention，触发 Agent 间协作

## 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Agent 类型 | **工具型** | 文件操作、命令执行，真正协作开发 |
| 协作方式 | **A2A @mention** | Agent 自主通过 @mention 触发协作 |
| Host 角色 | **专门 Agent** | 通过 @mention 召集其他 Agent，强化 prompt |
| AgentService | Claude Code + OpenCode | 只做两个 CLI，提供商可插拔 |
| Workspace | `/workspace/room-{id}/` | 共享工作目录，Agent 间文件共享 |
| A2A Router | hostReply() 内部 | 作为输出过滤器，流式完成后扫描 |

---

## 核心模块

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express)                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Host Agent (主持 Agent)                              │   │
│  │  - 分析任务 → @mention 其他 Agent                     │   │
│  │  - 维护任务状态                                      │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ A2A 协作                         │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  A2A Router                                          │   │
│  │  - 解析消息中的 @mention（行首检测）                │   │
│  │  - 识别目标 Agent                                    │   │
│  │  - 触发协作链                                        │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  AgentService 抽象层                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │ ClaudeCLI   │  │ OpenCodeCLI │                   │   │
│  │  │ Service     │  │ Service     │                   │   │
│  │  └─────────────┘  └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Workspace Manager                                    │   │
│  │  - /workspace/room-{id}/ ← 共享工作目录            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## AgentService 抽象层

```typescript
// backend/src/services/agents/types.ts

interface AgentServiceOptions {
  workspace: string;           // /workspace/room-{id}
  sessionId?: string;         // 续接 session
  roomId: string;
}

interface StreamingMessage {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  duration_ms?: number;
}

interface AgentService {
  readonly id: string;           // 'claude-code' | 'opencode'
  readonly name: string;

  invoke(
    systemPrompt: string,
    userMessage: string,
    options: AgentServiceOptions
  ): AsyncGenerator<StreamingMessage>;
}
```

---

## A2A 协作流程

```
用户: "帮我实现一个 React Todo App，@opencode review"

                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Host Agent (Claude Code)                                   │
│  - 分析任务                                                  │
│  - 实现代码，写入 /workspace/room-xxx/src/App.tsx          │
│  - @opencode 请帮我 review                                  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  A2A Router (hostReply 内部)                                │
│  scanForA2AMentions(text)                                   │
│  - 行首 @agentId 检测                                       │
│  - 返回 ['opencode']                                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  OpenCode Agent                                             │
│  - workspace: /workspace/room-xxx                         │
│  - 读取 src/App.tsx → review                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
                    消息注入 room.messages
```

---

## A2A Router 规则

```typescript
// 只匹配行首 @mention，防止误触发
function scanForA2AMentions(text: string): string[] {
  const matches = text.match(/^@(\w+)/gm);
  return matches ? matches.map(m => m.slice(1)) : [];
}
```

**规则**：
- 只匹配**行首** `@agentId`（防止 code block 内的 @mention 误触发）
- 支持链式 A2A（被 @mention 的 Agent 也可以 @mention 第三个 Agent）
- MVP 先串行，并行后续支持

---

## Workspace Manager

```typescript
// backend/src/services/workspace.ts

const WORKSPACE_BASE = '/workspace';

export function getWorkspacePath(roomId: string): string {
  return `${WORKSPACE_BASE}/room-${roomId}`;
}

export async function ensureWorkspace(roomId: string): Promise<string> {
  const path = getWorkspacePath(roomId);
  await fs.mkdir(path, { recursive: true });
  return path;
}
```

**Agent CLI 调用**：
```bash
# Claude Code
claude -p --workspace /workspace/room-{id} "prompt"

# OpenCode
opencode --workspace /workspace/room-{id} "prompt"
```

---

## 实现文件清单

| 文件 | 职责 |
|------|------|
| `backend/src/services/agents/types.ts` | AgentService 接口定义 |
| `backend/src/services/agents/registry.ts` | Provider 注册表 |
| `backend/src/services/agents/providers/ClaudeCodeService.ts` | Claude Code CLI 实现 |
| `backend/src/services/agents/providers/OpenCodeService.ts` | OpenCode CLI 实现 |
| `backend/src/services/workspace.ts` | Workspace Manager |
| `backend/src/services/agents/routing/A2ARouter.ts` | A2A @mention 解析与路由 |
| `backend/src/services/stateMachine.ts` | 修改 hostReply() 集成 A2A Router |

---

## Acceptance Criteria

- [ ] AC-1: AgentService 抽象层，支持 Claude Code 和 OpenCode 两个 Provider
- [ ] AC-2: Workspace Manager 创建共享目录 `/workspace/room-{id}/`
- [ ] AC-3: Agent CLI 调用传入 `--workspace` 参数
- [ ] AC-4: A2A Router 正确解析行首 @mention
- [ ] AC-5: Host Agent 能通过 @mention 召集其他 Agent
- [ ] AC-6: 被召集的 Agent 能看到共享 workspace 中的文件

## Dependencies

- F001: Multi-Agent Platform（基础状态机和 UI）
- Backend: Express (port 3004)
- CLI: Claude Code CLI, OpenCode CLI

## Open Questions

- [x] Q1: Agent 类型？→ **工具型**
- [x] Q2: 协作方式？→ **A2A @mention**
- [x] Q3: Host 角色？→ **专门 Agent，通过 @mention 召集其他 Agent**
- [x] Q4: AgentService Provider？→ **Claude Code + OpenCode**
- [x] Q5: Workspace 共享机制？→ **文件级共享，`--workspace` 参数**
- [x] Q6: A2A Router 位置？→ **hostReply() 内部，流式完成后扫描**
