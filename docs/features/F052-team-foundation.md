---
feature_ids: [F052]
related_features: [F001, F016, F018, F023]
topics: [team, scene, room, versioning, product-model]
doc_kind: spec
created: 2026-05-01
---

# F052: Team Foundation（从场景到可版本化团队）

> **Status**: spec | **Owner**: codex | **Priority**: P0

## Why

当前 OpenCouncil 的用户入口是“场景”。场景能表达协作模式，但不足以承载“团队会复盘、提出改进 PR、合并后变成下一版团队”的心智。

新的产品北极星是：

> OpenCouncil 不是让你调 prompt，而是让你组建一支 Team。Team 每次工作后可以复盘，提出自己的改进 PR，用户审阅合并后变成下一版团队，自主进化。

因此第一版不是先做进化 PR，而是先把用户可见对象从 Scene 升级为 Team，并让每次 Room 都明确绑定一个不可变的 Team Version。没有这个基础，后续“合并到 v4”“回滚到 v3”“旧房间不漂移”都没有稳定落点。

## 需求点 Checklist

| ID | 需求点（铲屎官原话/转述） | AC 编号 | 验证方式 | 状态 |
|----|---------------------------|---------|----------|------|
| R1 | 用户感知上从“选场景”变成“选 Team” | AC-A1, AC-B1 | screenshot / manual | [ ] |
| R2 | Team 是可复用模板，不只是 prompt 文案 | AC-A2, AC-A3 | review / test | [ ] |
| R3 | 每个房间是一次 Team Run，并 pinned 到创建时的 Team Version | AC-B2, AC-B3 | test / manual | [ ] |
| R4 | 新房间默认使用 Team 当前 active version，旧房间不因升级自动漂移 | AC-B4 | test | [ ] |
| R5 | 保留现有 Scene 数据的兼容迁移路径 | AC-C1, AC-C2 | migration test / manual | [ ] |

### 覆盖检查
- [ ] 每个需求点都能映射到至少一个 AC
- [ ] 每个 AC 都有验证方式
- [ ] 前端需求已准备需求→证据映射表

## Version Plan

Team Evolution 总体拆成 3 个用户可感知版本：

| 版本 | Feature | 用户看到的变化 | 不做什么 |
|------|---------|----------------|----------|
| V1 | F052 Team Foundation | 创建房间时选择 Team；房间显示 Team 名称和版本；旧房间锁定创建时版本 | 不生成 EVO PR |
| V2 | F053 Team Evolution PR | Team 可在负反馈/手动复盘后提出 EVO PR，用户逐条审阅并合并成新版本 | 不做自动上线，不做复杂 eval 门禁 |
| V3 | F054 Evolution Validation Loop | 每次进化沉淀验证样例，合并前可预检，版本质量有证据 | 不做完全无人值守自改 |

## What

### Phase A: Team 数据模型

引入用户可见的一等对象 **Team**。Team 不是 Agent，也不是 Skill，而是一次协作模板：

```text
Team
= name / description
+ default members
+ team workflow
+ routing policy
+ team memory summary
+ skills / capabilities bindings
+ active version pointer
```

同时引入不可变快照 **TeamVersion**：

```text
TeamVersion
= teamId
+ versionNumber
+ member snapshot
+ member prompt snapshot
+ workflow snapshot
+ routing policy snapshot
+ team memory snapshot
+ createdBy / createdFrom
```

原则：

- Team 是用户选择的入口。
- TeamVersion 是运行时真相源。
- Team 当前版本可以更新；历史版本不可变。
- Room 创建时引用某个 TeamVersion，而不是运行时追随最新 Team。

### Phase B: Room 变成 Team Run

把房间产品语义改成 **Team Run**：

```text
Room = 一次 TeamVersion 的运行实例
```

用户在创建房间时选择 Team。系统默认使用该 Team 的 active version，例如 `软件开发团队 v3`。房间 Header 显示：

- Team 名称
- pinned version
- 当前成员
- 后续进化状态 chip 的预留位置

旧房间默认继续 pinned 在创建时版本。Team 升级后，新房间默认使用新版本；旧房间需要用户显式选择“升级到 vN”。

### Phase C: Scene 兼容迁移

现有 Scene 继续作为底层兼容来源，但用户界面逐步不再把它作为核心概念。

迁移策略：

1. 每个 builtin scene 生成一个 builtin Team。
2. Scene prompt 迁入 TeamVersion 的 `workflow` / `teamProtocol` 快照。
3. 现有 `rooms.scene_id` 继续可读，用于兼容老房间。
4. 新房间优先写入 `team_id` 和 `team_version_id`。
5. 在迁移完成前，prompt assembly 可以从 TeamVersion 回退到 Scene。

## User Experience

### 创建房间

旧体验：

```text
选择场景：软件开发
```

新体验：

```text
选择 Team：软件开发团队
当前版本：v3
成员：需求负责人 / 主架构师 / 实现工程师 / Reviewer
最近进化：3 天前
```

### 房间 Header

```text
软件开发团队 · v3
需求负责人 / 主架构师 / 实现工程师 / Reviewer
```

### Team 设置

新增 Team Settings 的基础页：

- 基本信息
- 当前版本
- 成员列表
- 团队工作流
- 路由策略摘要
- 团队记忆摘要
- 版本历史入口（V1 只展示，不做 EVO PR）

## Acceptance Criteria

### Phase A（Team 数据模型）
- [ ] AC-A1: 后端存在 Team 与 TeamVersion 的持久化模型，TeamVersion 为不可变快照
- [ ] AC-A2: Team 至少包含成员、团队工作流、路由策略、团队记忆摘要的版本化字段
- [ ] AC-A3: Team 有 active version pointer，新建版本不会覆盖历史版本

### Phase B（Room 变成 Team Run）
- [ ] AC-B1: 创建房间 UI 的主入口文案从“场景”改为“Team”
- [ ] AC-B2: 新房间保存 `teamId` 与 `teamVersionId`
- [ ] AC-B3: 房间 Header 显示 Team 名称和 pinned version
- [ ] AC-B4: Team active version 改变后，旧房间仍使用创建时的 pinned version

### Phase C（Scene 兼容迁移）
- [ ] AC-C1: builtin scenes 可以生成等价 builtin Teams
- [ ] AC-C2: 旧房间只带 `sceneId` 时仍可正常打开和执行
- [ ] AC-C3: prompt assembly 优先使用 TeamVersion；缺失时兼容回退到 Scene

## Dependencies

- **Evolved from**: F016（Scene 提供现有房间协作协议和 prompt 注入基础）
- **Related**: F018（主流程 prompt 体验需要迁入 Team 工作流）
- **Related**: F023（Skill 仍是能力层，不并入 Team prompt）
- **Blocked by**: 无

## Risk

| 风险 | 缓解 |
|------|------|
| 直接把 Scene 改名 Team，实际模型没变 | AC 要求 TeamVersion 不可变快照和 Room pinned version，避免只做文案替换 |
| 迁移破坏旧房间 | 保留 `sceneId` 兼容读取，prompt assembly 支持回退路径 |
| Team 与 Skill 边界混乱 | Team 表达“谁一起怎么协作”，Skill 表达“遇到某类任务怎么做” |
| Team 升级导致历史房间行为漂移 | Room 固定引用 TeamVersion，升级必须显式 |

## Open Questions

| # | 问题 | 状态 |
|---|------|------|
| OQ-1 | TeamVersion 是否存完整快照，还是存 patch + base version？ | ⬜ 未定，V1 推荐完整快照 |
| OQ-2 | 旧 Scene 设置页是否保留为高级入口，还是完全迁移到 Team 设置？ | ⬜ 未定 |
| OQ-3 | builtin Team 是否允许用户直接编辑，还是沿用“复制为自定义 Team”策略？ | ⬜ 未定 |

## Key Decisions

| # | 决策 | 理由 | 日期 |
|---|------|------|------|
| KD-1 | Team 取代 Scene 成为用户入口 | Team 才能自然承载成员、工作流、记忆、版本和进化 |
| KD-2 | Room pinned 到 TeamVersion | 防止 Team 升级后历史房间行为漂移 |
| KD-3 | V1 不做 EVO PR | 先建立版本化对象，否则进化合并没有稳定目标 |

## Timeline

| 日期 | 事件 |
|------|------|
| 2026-05-01 | 立项，拆出 Team Evolution 三版本路线 |

## Review Gate

- Phase A: 需要 review 数据模型是否能支撑 F053 的 EVO PR 合并
- Phase B: 需要截图验证创建房间和房间 Header 的用户入口已从 Scene 变为 Team
- Phase C: 需要用旧房间数据验证兼容路径

## Links

| 类型 | 路径 | 说明 |
|------|------|------|
| **Feature** | `docs/features/F016-agent-scenes.md` | 当前 Scene 模型来源 |
| **Feature** | `docs/features/F053-team-evolution-pr.md` | 下一版：Team 提出 EVO PR |
| **Feature** | `docs/features/F054-team-evolution-validation.md` | 第三版：进化验证闭环 |
