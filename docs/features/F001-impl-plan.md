# F001 Implementation Plan

**Feature:** F001 — `docs/features/F001-multi-agent-platform.md`
**Goal:** 多 Agent 协作讨论平台，5 状态机驱动，主持人编排，专业 Agent 调查辩论，输出结构化 Markdown 报告
**Acceptance Criteria:**
- [ ] AC-1: 状态机完整运行 INIT → RESEARCH → DEBATE → CONVERGING → DONE
- [ ] AC-2: 主持人 Agent 正确编排流程（不自己调查，只调度和引导）
- [ ] AC-3: RESEARCH 阶段 A、B 并行调查，结论汇总给主持人
- [ ] AC-4: DEBATE 阶段 A、B 基于调查结论自由辩论，主持人旁听总结
- [ ] AC-5: CONVERGING 阶段清晰展示共识与分歧，用户拍板收敛
- [ ] AC-6: DONE 阶段生成结构化报告（背景、调查结论、分歧、建议）
- [ ] AC-7: 用户可在 RESEARCH/DEBATE/CONVERGING 阶段选择下一步
- [ ] AC-8: Web App 本地可运行（localhost）
**Architecture:** Express 后端维护状态机 + 主持人 Agent 编排，Next.js 前端三栏 UI，Claude Code CLI (`claude -p`) 调用三个 Agent，MCP 工具供 Agent 调查用，轮询 2s 前端拉取状态
**Tech Stack:** Next.js (7002) + Express (7001) + TypeScript + Tailwind + Claude Code CLI
**前端验证:** Yes — 完成后用 Playwright 实测完整 5 状态流程

---

## Phase 1: 项目骨架

### Task 1.1: 初始化 Next.js + Express 项目结构

**Files:**
- Create: `frontend/` (Next.js App Router)
- Create: `backend/` (Express + TypeScript)

**Step 1: 创建前端目录和 package.json**

```json
// frontend/package.json
{
  "name": "multi-agent-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 7002"
  },
  "dependencies": {
    "next": "14.x",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4",
    "autoprefixer": "^10"
  }
}
```

**Step 2: 创建后端目录和 package.json**

```json
// backend/package.json
{
  "name": "multi-agent-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts"
  },
  "dependencies": {
    "express": "^4",
    "cors": "^2.8",
    "uuid": "^9"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/express": "^4",
    "@types/cors": "^2",
    "@types/uuid": "^9",
    "tsx": "^4"
  }
}
```

**Step 3: 创建 shared types**

```typescript
// backend/src/types.ts
export type DiscussionState = 'INIT' | 'RESEARCH' | 'DEBATE' | 'CONVERGING' | 'DONE';
export type AgentRole = 'HOST' | 'SPECIALIST_A' | 'SPECIALIST_B';
export type MessageType = 'system' | 'statement' | 'question' | 'rebuttal' | 'summary' | 'report';

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  domainLabel: string;  // e.g. "历史专家"
  status: 'idle' | 'thinking' | 'waiting' | 'done';
}

export interface Message {
  id: string;
  agentRole: AgentRole | 'USER';
  agentName: string;
  content: string;
  timestamp: number;
  type: MessageType;
}

export interface DiscussionRoom {
  id: string;
  topic: string;
  state: DiscussionState;
  agents: Agent[];
  messages: Message[];
  report?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Step 4: Commit**

```bash
git add frontend/ backend/ && git commit -m "feat(F001): project skeleton [宪宪/Opus-4.6🐾]"
```

---

### Task 1.2: Express 后端骨架

**Files:**
- Create: `backend/src/server.ts`
- Create: `backend/src/store.ts` (in-memory room store)
- Create: `backend/src/routes/rooms.ts`
- Create: `backend/src/types.ts`

**Step 1: 实现内存存储**

```typescript
// backend/src/store.ts
import { DiscussionRoom } from './types.js';

const rooms = new Map<string, DiscussionRoom>();

export const store = {
  create(room: DiscussionRoom) { rooms.set(room.id, room); return room; },
  get(id: string) { return rooms.get(id); },
  update(id: string, partial: Partial<DiscussionRoom>) {
    const room = rooms.get(id);
    if (!room) return undefined;
    const updated = { ...room, ...partial, updatedAt: Date.now() };
    rooms.set(id, updated);
    return updated;
  },
  list() { return Array.from(rooms.values()); },
};
```

**Step 2: 实现主 server 和路由**

```typescript
// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { roomsRouter } from './routes/rooms.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/rooms', roomsRouter);

app.listen(7001, () => {
  console.log('Backend running on http://localhost:7001');
});
```

```typescript
// backend/src/routes/rooms.ts
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { store } from '../store.js';
import { DiscussionRoom, Agent, DiscussionState } from '../types.js';

export const roomsRouter = Router();

// POST /api/rooms — 创建讨论室
roomsRouter.post('/', (req, res) => {
  const { topic, agentADomain, agentBDomain } = req.body;
  const room: DiscussionRoom = {
    id: uuid(),
    topic,
    state: 'INIT',
    agents: [
      { id: uuid(), role: 'HOST', name: '主持人', domainLabel: '主持人', status: 'idle' },
      { id: uuid(), role: 'SPECIALIST_A', name: 'Agent A', domainLabel: agentADomain, status: 'idle' },
      { id: uuid(), role: 'SPECIALIST_B', name: 'Agent B', domainLabel: agentBDomain, status: 'idle' },
    ],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  res.json(store.create(room));
});

// GET /api/rooms/:id — 获取状态
roomsRouter.get('/:id', (req, res) => {
  const room = store.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// GET /api/rooms/:id/messages — 获取消息（轮询）
roomsRouter.get('/:id/messages', (req, res) => {
  const room = store.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ state: room.state, messages: room.messages });
});

// POST /api/rooms/:id/start — 开始讨论（触发主持人 INIT）
roomsRouter.post('/:id/start', async (req, res) => {
  const room = store.get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  // TODO: 调用主持人 Agent
  res.json({ status: 'ok' });
});
```

**Step 3: Commit**

```bash
git add backend/src/ && git commit -m "feat(F001): Express backend skeleton [宪宪/Opus-4.6🐾]"
```

---

## Phase 2: 状态机 + Agent 调用

### Task 2.1: Claude Code CLI 调用层

**Files:**
- Create: `backend/src/services/agentCaller.ts`

```typescript
// backend/src/services/agentCaller.ts
import { spawn } from 'child_process';
import { AgentRole } from '../types.js';

export interface AgentPromptContext {
  role: AgentRole;
  domainLabel: string;
  systemPrompt: string;
  userMessage: string;
}

export async function callClaudeCode(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', prompt], { timeout: 60000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude -p exited ${code}: ${stderr}`));
    });
  });
}

export async function callAgent(ctx: AgentPromptContext): Promise<string> {
  const prompt = `【角色】${ctx.domainLabel}（${ctx.systemPrompt}）

${ctx.userMessage}`;
  return callClaudeCode(prompt);
}
```

### Task 2.2: 主持人 Agent prompt 工程

**Files:**
- Create: `backend/src/prompts/host.ts`

```typescript
// backend/src/prompts/host.ts
export const HOST_PROMPTS = {
  INIT: (topic: string) => `你是一个专业的主持人（Host）。

当前议题：${topic}

请分析这个议题，拆解为 2-3 个具体的调查议题，展示给用户确认。
格式：
## 调查议题
1. [议题1]
2. [议题2]
...

请直接输出一段引导性文字，让用户确认是否进入调查阶段。`,

  RESEARCH: (topic: string, findingsA: string, findingsB: string) => `你是一个专业的主持人（Host）。

议题：${topic}

【Agent A 调查结论】
${findingsA}

【Agent B 调查结论】
${findingsB}

请总结两方的调查结论，用简洁的摘要展示给用户，并引导进入辩论阶段。
格式：
## 调查摘要
### Agent A
...
### Agent B
...

请询问用户：是否进入辩论阶段？`,

  DEBATE: (topic: string, findingsA: string, findingsB: string) => `你是一个专业的主持人（Host）。

议题：${topic}

辩论阶段开始。请分发调查结论给 Agent A 和 Agent B，发起辩论议题。
同时，旁听 Agent A 和 Agent B 的辩论，每轮结束时总结各方立场。
辩论结束后，询问用户：是否进入收敛阶段？

格式：
## 发起辩论
[分发结论，发起议题]

[旁听并总结...]`,

  CONVERGING: (topic: string, debateSummary: string) => `你是一个专业的主持人（Host）。

议题：${topic}

辩论总结：
${debateSummary}

请展示：
1. 各方共识
2. 主要分歧
3. 收敛建议

然后询问用户：确认收敛 / 继续辩论 / 继续调查？`,

  DONE: (topic: string, allFindings: string) => `你是一个专业的主持人（Host）。

议题：${topic}

请生成一份结构化报告，包含：
## 背景与问题
## 调查结论
## 辩论分歧
## 最终建议
`,
};
```

### Task 2.3: 状态机编排器

**Files:**
- Create: `backend/src/services/stateMachine.ts`

```typescript
// backend/src/services/stateMachine.ts
import { store } from '../store.js';
import { callAgent } from './agentCaller.js';
import { HOST_PROMPTS } from '../prompts/host.js';
import { Message } from '../types.js';
import { v4 as uuid } from 'uuid';

function addMessage(roomId: string, msg: Omit<Message, 'id' | 'timestamp'>) {
  const room = store.get(roomId);
  if (!room) return;
  const message: Message = { ...msg, id: uuid(), timestamp: Date.now() };
  store.update(roomId, { messages: [...room.messages, message] });
  return message;
}

export async function advanceState(roomId: string, userChoice?: string) {
  const room = store.get(roomId);
  if (!room) return;

  switch (room.state) {
    case 'INIT': {
      // 用户确认议题，进入 RESEARCH
      addMessage(roomId, { agentRole: 'HOST', agentName: '主持人', content: '议题已确认，正在调度 Agent 调查...', type: 'system' });
      store.update(roomId, { state: 'RESEARCH' });
      // 并行调度 A、B 调查
      const topic = room.topic;
      const agentA = room.agents.find(a => a.role === 'SPECIALIST_A')!;
      const agentB = room.agents.find(a => a.role === 'SPECIALIST_B')!;
      // 更新状态
      store.update(roomId, { agents: room.agents.map(a => ({ ...a, status: 'thinking' })) });
      // TODO: 并行调用 Agent A 和 B 的调查
      break;
    }
    case 'RESEARCH': {
      // 用户确认进入辩论
      store.update(roomId, { state: 'DEBATE' });
      // TODO: 主持人分发结论，发起辩论
      break;
    }
    case 'DEBATE': {
      store.update(roomId, { state: userChoice === 'continue' ? 'DEBATE' : 'CONVERGING' });
      // TODO: 辩论继续 or 进入收敛
      break;
    }
    case 'CONVERGING': {
      if (userChoice === 'converge') {
        store.update(roomId, { state: 'DONE' });
        // TODO: 主持人生成报告
      } else if (userChoice === 'debate') {
        store.update(roomId, { state: 'DEBATE' });
      }
      // userChoice === 'research' → RESEARCH
      break;
    }
    case 'DONE': {
      // 流程结束
      break;
    }
  }
}
```

**Step: Commit**

```bash
git add backend/src/services/ backend/src/prompts/ && git commit -m "feat(F001): state machine + agent prompts [宪宪/Opus-4.6🐾]"
```

---

## Phase 3: 前端 UI

### Task 3.1: Next.js 布局和全局样式

**Files:**
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/globals.css`
- Create: `frontend/app/page.tsx` (重定向到 /room)

### Task 3.2: 三栏布局

**Files:**
- Create: `frontend/app/room/[id]/page.tsx` (主讨论页面)

**三栏结构：**
- 左栏（260px）：会话列表
- 中栏（880px）：主讨论区（状态条 + 消息流 + 操作区）
- 右栏（300px）：Agent 状态

### Task 3.3: INIT 设置页

**Files:**
- Create: `frontend/app/new/page.tsx`

**UI 元素：**
- Topic 输入
- Agent A 领域自定义（输入框）
- Agent B 领域自定义（输入框）
- "开始讨论" 按钮

### Task 3.4: 消息气泡组件

**Files:**
- Create: `frontend/components/MessageBubble.tsx`

**按 agentRole 区分颜色：**
- HOST: #0071E3（蓝）
- SPECIALIST_A: #34C759（绿）
- SPECIALIST_B: #FF9500（橙）
- USER: #86868B（灰）

---

## Phase 4: 前后端集成

### Task 4.1: 前端轮询逻辑

**Files:**
- Modify: `frontend/app/room/[id]/page.tsx`

```typescript
// 2s 轮询
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`${API_BASE}/rooms/${id}/messages`);
    const data = await res.json();
    setState(data.state);
    setMessages(data.messages);
  }, 2000);
  return () => clearInterval(interval);
}, [id]);
```

### Task 4.2: 用户选择按钮

**状态 → 按钮映射：**

| 状态 | 显示按钮 |
|------|---------|
| INIT | "确认议题方向" |
| RESEARCH | "进入辩论" / "继续调查" |
| DEBATE | "进入收敛" / "继续辩论" / "回调查" |
| CONVERGING | "确认收敛" / "继续辩论" / "继续调查" |
| DONE | "下载报告" |

### Task 4.3: 报告下载

```typescript
// DONE 阶段，显示报告 + 下载按钮
function downloadReport(report: string) {
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'discussion-report.md';
  a.click();
}
```

---

## Phase 5: MCP 工具集成

### Task 5.1: MCP Server 检查和调用

**Files:**
- Modify: `backend/src/services/agentCaller.ts`

**Step: 检查 MCP 是否可用**

```typescript
// 检查 claude --mcp 是否可用
async function checkMCP(): Promise<boolean> {
  try {
    const result = await execAsync('claude --help 2>/dev/null | grep mcp');
    return true;
  } catch { return false; }
}
```

---

## Straight-Line Verification

每个 Phase 完成后自验：

| Phase | 验证 |
|-------|------|
| Phase 1 | `curl http://localhost:7001/api/rooms` 返回 `[]` |
| Phase 2 | 创建 room 后，INIT→RESEARCH 状态转移正常 |
| Phase 3 | `pnpm dev` → `localhost:7002` → 三栏布局渲染正常 |
| Phase 4 | 完整 5 状态跑通，消息实时显示 |
| Phase 5 | Agent 调用 MCP 搜索可用 |

**前端 Playwright 验证脚本：**
- 创建讨论室 → 填写议题 → 5 状态完整流程 → 下载报告
