---
feature_ids: [F023]
related_features: [F001, F006, F052]
topics: [skill, runtime, workspace, room, provider, settings]
doc_kind: spec
created: 2026-04-20
updated: 2026-04-21
---

# F023: Skill System（Runtime App + Provider-native Skill Injection）

> Status: spec | Owner: codex

## Why

当前 OpenCouncil 已经有：

- `team`：房间协作模式与成员组合
- `agent.systemPrompt`：参与者身份职责
- `workspace`：工作对象目录

但还没有真正的平台级 Skill System。这导致 5 个问题：

1. **缺少可复用能力层**：workflow / best practice / knowledge 只能塞进 `systemPrompt`
2. **`team` 与 `skill` 语义混淆**：房间工作模式和能力包职责混在一起
3. **平台无法维护 skill**：缺少 catalog、启停、绑定、来源和使用情况
4. **Agent / Room / Workspace 缺少统一合并规则**：同一 agent 在不同房间和目录下的技能集合不可预测
5. **运行时注入路径缺失**：即使平台知道“哪些 skill 生效”，provider 也还没有一个稳定、原生可发现的技能目录视图

本 Feature 的目标不是再加一层 prompt 文本，而是补齐：

```text
真相源（skills）
→ 配置层（catalog + bindings）
→ 运行装配层（runtime assembly）
→ provider-native discovery
```

## 外部调研结论

主流 agent 平台对 Skill 的抽象已经比较收敛：

1. Skill 不是人格 prompt，而是**可复用、可组合、可按需装载的能力包**
2. Skill 真相源通常是**文件系统 bundle**
3. Skill 的正确装载方式是 **progressive disclosure**
4. provider 最终更稳定的消费方式是**原生技能目录发现**，而不是把全部正文塞进 prompt

对本项目最关键的结论是：

- Skill Catalog 只负责“知道有哪些 skill”
- Effective Skill Set 只负责“本次该带哪些 skill”
- 真正让 provider 可用的是 **Runtime Skill Assembly**

## What

引入独立的 **Skill System**，让 OpenCouncil 可以：

1. 维护 Skill Catalog（查看 / 新建 / 编辑 / 删除 / 启停）
2. 给 Agent 绑定默认 Skills
3. 给 Room 绑定显式 Skills
4. 从当前工作目录自动发现 project-local Skills
5. 在执行前生成 provider-native 的运行视图，把生效技能注入：
   - `.claude/skills/`
   - `.opencode/skills/`
6. 且注入方式是**软链接**，不是硬复制

## 非目标（Phase 1 不做）

1. 不做 Skill Marketplace / 远程下载 / 第三方发布中心
2. 不做多文件 bundle 的完整 Web IDE
3. 不做 user-home 全局 skill 扫描 UI
4. 不强行把现有 builtin perspective agents 在 Phase 1 迁移成 skill bindings
5. 不把 skill bundle 内容复制进运行目录；只做软链接注入
6. 不要求首版支持“运行中无感切换 workspace 并热更新 effective skills”

## 术语边界

### Team

Room 级团队配置。回答“谁一起做事、如何协作”。

### Agent

参与者身份与职责。回答“谁在做事”。

### Skill

可复用能力包。回答“遇到某类任务时怎么做”。

### Runtime App Root

程序实际运行的应用目录。

它不是当前开发 checkout，而是类似 `clowder-ai` 的 `cat-cafe-runtime` worktree，或者发布后的打包运行目录。可以把它理解成“可运行的 app root”，语义上更接近运行态的 `dist`，而不是抽象的系统存储根。

### Provider Runtime Dir

某个 Room / Provider 在执行前由系统组装出的运行视图目录。

它只负责让 provider 原生发现 skills，不是真相源，也不等于整个 Runtime App Root。

### Room Workspace

Room 默认工作目录，由平台维护。

在当前 OpenCouncil 实现里，默认形态对齐为：

```text
<runtimeAppRoot>/backend/workspaces/room-<roomId>/
```

### External Workspace

用户手动选择的外部目录。它可以成为本次工作的目标目录，但不改变 Runtime App Root 的系统归属。

## 结论摘要

1. **Skill 是一等配置实体**，独立于 Team 和 Agent
2. **Runtime App Root 是运行中的应用目录**，不是当前源码 checkout
3. **所有系统维护的可变目录都必须相对 Runtime App Root 布局**
4. **Room 默认工作目录是 Runtime App Root 下的一块系统管理目录**
5. **执行前还会额外组装 Provider Runtime Dir**
6. **用户可选择 external workspace 工作，但 provider 必须同时看到 skill 注入视图和实际 workspace**
7. **执行前必须先做 Effective Skill Set 计算**
8. **Skill 注入采用 provider-native 目录 + 软链接**

## Runtime App 结构

Runtime App Root 是程序实际运行的目录。为避免和当前源码仓库混淆，本 spec 只约束“相对布局”，不强绑某个顶层目录名。

Phase 1 推荐的对齐方式如下：

```text
<runtimeAppRoot>/
  backend/
    data/
      muti-agent.db
      skills/
        managed/
          <skill-name>/
            SKILL.md
            references/
            scripts/
      provider-runtime/
        rooms/
          <roomId>/
            claude/
              .claude/skills/*
            opencode/
              .opencode/skills/*

    workspaces/
      room-<roomId>/
```

说明：

- `backend/data/skills/managed/` 是平台维护 skill 的真相源
- `backend/workspaces/room-<roomId>/` 是当前默认房间工作区
- `backend/data/provider-runtime/rooms/<roomId>/<provider>/` 是 provider 运行视图
- 运行视图中的 skill 目录只放**软链接**

如果 Phase 1 实现最终选了别的具体目录名，也必须满足同样的边界：

1. managed skills 位于 Runtime App Root 内
2. Room 默认 workspace 位于 Runtime App Root 内
3. provider runtime dir 位于 Runtime App Root 内
4. 三者不是同一个目录

## 真相源与存储

### 1. Managed Skills（平台维护）

真相源位于：

```text
<runtimeAppRoot>/backend/data/skills/managed/<skill-name>/SKILL.md
```

约束：

- `skill-name` 必须匹配：`^[a-z0-9]+(-[a-z0-9]+)*$`
- 平台新建 skill 时自动创建目录和 `SKILL.md`
- `references/`、`scripts/`、`assets/` 可存在，但 Phase 1 仅保证保留，不做完整 Web 编辑

### 2. Workspace-discovered Skills（目录自带）

扫描来源：

- `<effectiveWorkspace>/.agents/skills/*/SKILL.md`
- `<effectiveWorkspace>/.claude/skills/*/SKILL.md`
- `<effectiveWorkspace>/.opencode/skills/*/SKILL.md`

扫描规则：

- 对 external workspace：向上扫描到 git worktree 根；若无 git 根，则停在用户显式选择的 workspace 根
- 对 room default workspace：**不得越过 `backend/workspaces/room-<roomId>/` 边界继续向上扫描**
- 只读，不写回，不覆盖
- 同名 collision 时“更近目录优先”

### 3. 数据库索引

#### `skills`

```ts
interface SkillRecord {
  id: string
  name: string
  description: string
  sourceType: 'managed' | 'workspace'
  sourcePath: string
  enabled: boolean
  readOnly: boolean
  builtin: boolean
  providerCompat: Array<'claude-code' | 'opencode'>
  updatedAt: number
  checksum: string
}
```

说明：

- `managed` = 平台维护
- `workspace` = 扫描快照
- workspace skill 可作为 catalog 中的只读项出现，但**Room / Agent 显式绑定只允许绑定 managed skills**

#### `agent_skill_bindings`

```ts
interface AgentSkillBinding {
  agentId: string
  skillId: string
  mode: 'auto' | 'required'
  enabled: boolean
  createdAt: number
}
```

#### `room_skill_bindings`

```ts
interface RoomSkillBinding {
  roomId: string
  skillId: string
  mode: 'auto' | 'required'
  enabled: boolean
  createdAt: number
}
```

规则：

- `skillId` 始终指向 **managed skill**
- workspace-discovered skills 不允许被显式绑定，只能被自动发现并合并
- 公开 API 若使用 `skillName`，必须先解析到唯一的 managed `skillId`

## Effective Skill Set

### 合并来源

```text
Room explicit managed skills
+ Workspace discovered skills
+ Agent default managed skills
= Effective Skill Set
```

### 优先级

```text
Room explicit > Workspace discovered > Agent default
```

### 重算时机

1. Room 创建时
2. Room 显式 skill bindings 更新时
3. Agent 默认 skill 更新后，下次执行前
4. workspace 变化后，下次执行前
5. 每次 provider 执行前

### 冲突规则

1. 同名 `Room explicit` 覆盖 `Workspace discovered`
2. 同名 `Workspace discovered` 覆盖 `Agent default`
3. 被禁用 skill 不进入最终集合
4. provider 不兼容 skill 不进入最终集合

## Runtime Skill Assembly

这是本 Feature 的核心。

平台不是把 skill 内容拼进 prompt，而是在执行前组装一个 provider-native 的运行视图。

### 输入

- `roomId`
- `provider`
- `effectiveWorkspace`
- `effectiveSkills`

### 输出

对每个 provider 生成一个 `Provider Runtime Dir`：

```text
<runtimeAppRoot>/backend/data/provider-runtime/rooms/<roomId>/claude/
<runtimeAppRoot>/backend/data/provider-runtime/rooms/<roomId>/opencode/
```

其中：

- `claude/.claude/skills/<skill-name>` → 软链接到真实 skill bundle
- `opencode/.opencode/skills/<skill-name>` → 软链接到真实 skill bundle

### 注入方式

- 必须使用**软链接**
- 不允许把 skill bundle 复制一份进 provider runtime dir
- provider runtime dir 是运行视图，不是真相源

### Workspace 对齐

系统存在两个坐标系：

1. **Runtime App 坐标系**：系统运行目录及其维护的可变目录
2. **Workspace 坐标系**：本次任务要处理的实际目录

执行时必须保证：

- provider-native skills 在 provider runtime dir 下可发现
- 本次工作的 workspace 也在 provider 可见范围内

Phase 1 允许实现层通过以下任一方式满足这个约束：

- 以 provider runtime dir 为主目录，并把 external workspace 以符号链接或镜像入口暴露进去
- 或由 ProviderAdapter 显式把 provider runtime dir 与 effective workspace 一起挂载进 provider 可见范围

但无论实现细节如何，**spec 的约束是不变的**：

- provider runtime dir 是 skill 注入视图
- effective workspace 是实际工作对象
- 二者必须同时可见

## Provider 注入模型

### Phase 1

Phase 1 采用 **provider-native skill injection as primary path**。

也就是说：

- 主要路径不是“prompt 里给 skill 绝对路径”
- 主要路径是“provider 直接在 `.claude/skills` / `.opencode/skills` 看到这些 skill”

`required / auto` 仍然保留，但语义调整为：

- `required`: 一定进入 effective set，且在 runtime summary 中显式标注为 required
- `auto`: 进入 effective set，但只作为可选技能出现

### Phase 2

若后续 provider 需要更细粒度的原生配置，可再加 `ProviderSkillAdapter`，但这只是扩展，不改变 Phase 1 的 runtime assembly 主路径。

## API 设计

### Skill Catalog

#### `GET /api/skills`

返回 managed skills 列表。

#### `POST /api/skills`

创建 managed skill：

```json
{
  "name": "pr-review-checklist",
  "description": "Review pull requests with project-specific gates",
  "content": "---\\nname: pr-review-checklist\\ndescription: ...\\n---\\n# ..."
}
```

行为：

- 校验 `name`
- 创建 `<runtimeAppRoot>/backend/data/skills/managed/<name>/SKILL.md`
- 建立索引记录

#### `PUT /api/skills/:name`

更新 managed skill 的 `SKILL.md` 和 metadata。

#### `DELETE /api/skills/:name`

删除 managed skill；若仍被 Agent / Room 绑定则返回 `409 SKILL_IN_USE`。

### Workspace Discovery

#### `POST /api/skills/discover`

请求：

```json
{ "workspacePath": "/Users/yulong/work/my-project" }
```

返回：

```json
{
  "workspacePath": "/Users/yulong/work/my-project",
  "skills": [
    {
      "name": "pdf",
      "description": "Use when tasks involve PDFs",
      "sourcePath": "/Users/yulong/work/my-project/.agents/skills/pdf/SKILL.md",
      "sourceType": "workspace",
      "readOnly": true
    }
  ]
}
```

### Agent Binding

#### `GET /api/agents/:id/skills`

返回 Agent 默认 managed skill bindings。

#### `PUT /api/agents/:id/skills`

全量更新 Agent 默认技能绑定。

### Room Binding

#### `GET /api/rooms/:id/skills`

返回：

- Room 显式 managed bindings
- 最近一次 workspace discovery
- 最终 effective skills

#### `PUT /api/rooms/:id/skills`

更新 Room 显式 managed skill bindings。

### Room Creation

#### `POST /api/rooms`

若 CreateRoomModal 允许在创建时选 `Room Skills`，则 room create API 必须支持原子化写入：

```json
{
  "topic": "F023 方案讨论",
  "workerIds": ["dev-architect", "dev-reviewer"],
  "workspacePath": "/Users/yulong/work/other-repo",
  "teamId": "software-development",
  "roomSkills": [
    { "skillName": "request-review", "mode": "required", "enabled": true }
  ]
}
```

不允许前端先创建 room 再二次 PUT skills 作为唯一路径。

## 前端设计

### 1. Settings 新增 `Skill` Tab

功能：

- managed skills 列表
- 新建 / 编辑 / 删除 / 启停
- 显示使用情况（被哪些 Agent / Room 绑定）

说明：

- Phase 1 的 Settings 只以 managed skills 为主
- workspace-discovered skills 放在 Room / CreateRoomModal 的上下文里展示，不作为全局平台资产编辑

### 2. Agent 设置增加 `Default Skills`

- 多选 managed skills
- 每个 skill 可选 `auto` / `required`

### 3. CreateRoomModal 增加 `Room Skills`

流程：

1. 选择 workspace
2. 触发 discover
3. 展示“目录发现技能（只读）”
4. 允许勾选 Room 显式 managed skills
5. 创建 room 时一次性提交

### 4. Room 内显示 Effective Skills

显示：

- Required Skills
- Auto Skills
- Workspace discovered count
- 来源标签：Room / Workspace / Agent

## 与 Team / Agent Prompt 的关系

当前已有：

```text
Team Workflow Prompt
+ Agent Prompt
+ Runtime Context
```

本 Feature 之后，逻辑应变为：

```text
Team Workflow Prompt
+ Agent Prompt
+ Runtime Context
+ Provider-native Skill Discovery
```

说明：

- Team 继续表达房间工作模式、成员和协作协议
- Agent Prompt 继续表达身份职责
- Skill 不再以“主路径 prompt 拼接正文”的方式注入
- prompt 中可以保留一段精简 skill summary，但那是辅助说明，不是真正的注入主路径

## 向后兼容

1. 不删除现有 `system_prompt`
2. 不修改 Team 工作流语义
3. 现有 builtin perspective agents 继续按原逻辑工作
4. 旧 Room / Agent 没有 skill bindings 时，行为与今天一致
5. Seed-once 原则保持不变
6. Phase 1 不把当前 repo `.agents/skills/*-perspective/` 自动纳入 managed skill catalog

## 实施 Phase

### Phase 1（本次批准后的范围）

1. Runtime App / Provider Runtime Dir 结构定义
2. Managed Skills 真相源落到 Runtime App Root 的可变数据目录
3. Workspace discovery API
4. Agent / Room managed skill bindings
5. Runtime Skill Assembly
6. Provider-native `.claude/skills` / `.opencode/skills` 软链接注入
7. Settings / CreateRoomModal / RoomView 的最小 UI

### Phase 2（后续）

1. user-home global skill scan
2. builtin perspective skills 迁移到 bindings
3. 多文件 bundle Web 编辑
4. 更高级的 ProviderSkillAdapter 能力

## Acceptance Criteria

- [ ] AC-1: 平台存在独立 Skill Catalog，支持 managed skill 的创建、编辑、删除、启停
- [ ] AC-2: managed skill 真相源位于 Runtime App Root 的可变数据目录，而不是数据库文本字段
- [ ] AC-3: Room 默认工作目录在未指定 external workspace 时位于 Runtime App Root 下
- [ ] AC-4: 用户可选择 external workspace 作为本次任务工作对象
- [ ] AC-5: Agent 设置页支持默认 managed skill bindings
- [ ] AC-6: Room 创建/设置支持显式 managed room skill bindings
- [ ] AC-7: 指定 workspace 后，后端能发现 project-local skills，并在前端以只读方式展示
- [ ] AC-8: 每次执行前都按 `Room > Workspace > Agent` 规则计算 Effective Skill Set
- [ ] AC-9: 运行前系统会在 Runtime App Root 下生成 provider runtime dir
- [ ] AC-10: 生效 skill 会以软链接形式注入 `.claude/skills` / `.opencode/skills`
- [ ] AC-11: skill 注入不依赖硬复制
- [ ] AC-12: 未配置 skill 的旧房间和旧 agent 行为不回归

## Risks

1. **Runtime App / Workspace 双坐标系复杂度**：必须严格区分系统运行目录和用户工作目录
2. **同名冲突**：workspace skill 与 managed skill 可能重名
3. **外部 workspace 可见性**：provider 运行视图必须同时看到 skill 注入目录和实际工作目录
4. **catalog 膨胀**：若 effective skills 过多，会增加 UI 和运行视图复杂度

## Open Questions

- [ ] Q1: external workspace 暴露给 provider runtime dir 时，采用符号链接入口还是 ProviderAdapter 显式挂载？
- [ ] Q2: `backend/data/provider-runtime/rooms/<roomId>/<provider>/` 是否长期复用，还是按执行批次重建？
- [ ] Q3: builtin perspective skills 何时从 repo `.agents/skills/*-perspective` 迁入 Runtime App Root 下的 managed catalog？

## Related Discussions

- [2026-04-21 F023 Runtime Packaging Alignment](../discussions/2026-04-21-f023-runtime-packaging-alignment.md)

## References

- [Anthropic: Skills](https://platform.claude.com/docs/en/managed-agents/skills)
- [Anthropic: Agent Skills in the SDK](https://platform.claude.com/docs/en/agent-sdk/skills)
- [OpenCode: Agent Skills](https://opencode.ai/docs/skills)
- [Agent Skills Specification](https://agentskills.io/specification)
