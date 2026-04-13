---
featId: F0050
name: Agent 提及队列
doc_kind: feature
created: 2026-04-13
topics: [frontend, mention, queue, real-time]
status: proposed
---

# F0050: Agent 提及队列

## 问题背景

在多 agent 讨论中，用户发消息后不清楚"谁会被叫到"、"谁正在发言"、"谁还在等待"。当前系统只有 AgentPanel 显示 agent 状态，但：
- 没有直观展示当前被点名的 agent 排队情况
- Manager A2A 路由时用户看不到谁被主持人提名了
- 流式输出时用户不知道"还有几个 agent 要发言"

## 需求描述

在页面上显示一个队列，实时展示：
1. 哪些 agent 被点名了（等待中）
2. 哪个 agent 正在发言（发言中）
3. 哪些 agent 已完成（3 秒淡出）

点名来源：
- 用户消息中的 `@name`
- Manager 响应中解析出的 `@name`（A2A 路由）

## 技术方案

### 新增组件

**`frontend/components/MentionQueue.tsx`**

```typescript
interface QueuedMention {
  agentId: string
  agentName: string
  mentionedBy: 'user' | 'manager'  // 谁提的名
  status: 'queued' | 'thinking' | 'done'
  queuedAt: number
  doneAt?: number
}
```

状态展示：
- `queued`：灰圆点 + 白色名字，显示 "等待中"
- `thinking`：绿色脉冲点，显示 "发言中"
- `done`：3 秒后自动从队列移除（淡出动画）

### 修改 `RoomView_new.tsx`

新增 state：
```typescript
const [mentionQueue, setMentionQueue] = useState<QueuedMention[]>([])
```

Socket 事件驱动：

| 事件 | 行为 |
|------|------|
| `user_message` | 解析 `content` 中的所有 `@name`，去重后加入队列（`mentionedBy: 'user'`） |
| `stream_start` | 对应 agent status 改为 `thinking` |
| `stream_end` (MANAGER) | 解析 Manager 消息中的 `@name`，加入队列（`mentionedBy: 'manager'`），status 改为 `thinking` |
| `stream_end` | 对应 agent status 改为 `done`，3 秒后移除 |

### 解析依赖

- `extractMentions()` 已在 `frontend/lib/agents.tsx` 实现

## 关键文件

| 文件 | 操作 |
|------|------|
| `frontend/components/MentionQueue.tsx` | 新增 |
| `frontend/components/RoomView_new.tsx` | 修改（socket handlers + state + 渲染位置） |

## 验收标准

1. 用户发 `@司马迁 你来回答`：队列出现"司马迁 — 等待中"
2. Manager 开始分析后变"司马迁 — 发言中"（绿色脉冲）
3. 发言结束后 3 秒淡出
4. Manager 响应含 `@杜甫`：队列出现"杜甫 — 主持人提名"
5. 多 agent 同时在队列时按时间顺序排列
6. `pnpm build` 通过
