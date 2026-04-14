---
feature_ids: [F006]
related_features: [F0043]
topics: [workspace, multi-agent]
doc_kind: spec
created: 2026-04-14
---

# F006: 创建 Room 时可选工作目录

> Status: spec | Owner: TBD

## Why

当前每个 Room 的工作目录由系统自动生成在 `workspaces/room-{roomId}/`，用户无法指定。对于有明确工作项目的场景（如代码审查、技术调研），用户希望：
- 指定已有的工作目录，agent 直接在该目录下操作
- 避免 agent 在错误的目录下工作
- 支持跨项目协作（linked workspace）

## What

### 前端改动（CreateRoomModal）

在发起讨论弹窗中增加"工作目录"输入字段：

```
┌─────────────────────────────────┐
│  发起讨论                        │
├─────────────────────────────────┤
│  讨论主题                        │
│  ┌───────────────────────────┐  │
│  │ 自由讨论                   │  │
│  └───────────────────────────┘  │
│                                 │
│  工作目录（可选）                 │
│  ┌───────────────────────────┐  │
│  │ /Users/.../project        │  │
│  └───────────────────────────┘  │
│  留空则自动创建临时工作区          │
│                                 │
│        取消        发起讨论      │
└─────────────────────────────────┘
```

- 输入框支持手动输入绝对路径
- 提供"浏览"按钮打开系统文件选择器（可选增强）
- 默认 placeholder 提示"留空则使用默认目录"
- 输入验证：必须是绝对路径（以 `/` 开头）

### 后端改动

**POST /api/rooms** 请求体新增可选字段：

```json
{
  "topic": "自由讨论",
  "workspacePath": "/Users/yulong/work/my-project"
}
```

**backend/src/routes/rooms.ts**：
- 接收 `workspacePath` 参数
- 若指定：验证路径存在且为目录，写入 `room.workspace`
- 若留空：使用现有自动生成逻辑 `workspaces/room-{id}/`

**backend/src/db/repositories/rooms.ts**：
- `Room` 类型增加可选 `workspace` 字段
- `create()` 支持传入自定义 workspace

**backend/src/services/workspace.ts**：
- `ensureWorkspace()` 优先使用 room 绑定的 workspacePath
- 新增 `validateWorkspacePath()` 做安全检查（防止路径遍历）

**Agent CLI 调用**：
- `claudeCode.ts` / `opencode.ts` 使用 room 绑定的 workspace 作为 `cwd`
- 优先级：room.workspace > 默认 workspaces/room-{id}/

## Acceptance Criteria

- [ ] AC-1: 创建 Room 时可填入自定义 workspace 路径
- [ ] AC-2: 留空时使用自动生成的 `workspaces/room-{id}/`
- [ ] AC-3: agent CLI 的 cwd 指向 room 绑定的 workspace
- [ ] AC-4: 无效路径（不存在/非目录）给出明确错误提示
- [ ] AC-5: 工作目录信息持久化到数据库，重启后保持

## Dependencies

- F0043（可观测性日志）：workspace 路径会写入 debug 日志

## Risk

- 路径遍历安全：必须校验 workspacePath 不含 `../` 等逃逸序列
- 权限问题：agent 用户需对指定目录有读写权限

## Open Questions

- 是否支持从已有 git worktree 列表中选择？（类 clowder-ai linked roots）
- 自定义 workspace 的 room 在归档时是否也移动到 `workspaces-archive/`？
