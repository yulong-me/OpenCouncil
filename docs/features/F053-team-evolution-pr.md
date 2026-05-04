---
feature_ids: [F053]
related_features: [F001, F016, F023, F052]
topics: [team, evolution, proposal, review, versioning, ux]
doc_kind: spec
created: 2026-05-01
---

# F053: Team Evolution PR（团队进化审阅与合并）

> **Status**: spec | **Owner**: codex | **Priority**: P0

## Why

用户今天要改进团队表现，实际只能回到 Team / Agent 设置里手动调 prompt。这要求用户理解 prompt、路由、成员职责和协作协议，门槛太高。

F053 的目标是把“调 prompt”变成“审进化 PR”：

> Team 每次工作后可以复盘，提出自己的改进 PR。用户逐条接受或拒绝，合并后产生下一版 Team。

这不是自动改自己。Team 只能提出 Proposal，用户负责审阅和合并。

## 需求点 Checklist

| ID | 需求点（铲屎官原话/转述） | AC 编号 | 验证方式 | 状态 |
|----|---------------------------|---------|----------|------|
| R1 | Team 可在负反馈或手动触发后复盘 | AC-A1, AC-A2 | manual / test | [ ] |
| R2 | 进化像 PR：有 proposal、change、decision、merge | AC-B1, AC-B2, AC-C1 | test / screenshot | [ ] |
| R3 | 用户逐条审，不是一键接受全部 | AC-B3, AC-B4 | screenshot / manual | [ ] |
| R4 | EVO 支持 6 类改动：成员、成员 prompt、工作流、路由、记忆、验证样例 | AC-A3, AC-B2 | test / review | [ ] |
| R5 | 合并后生成新 TeamVersion，新房间默认使用新版，旧房间不自动漂移 | AC-C2, AC-C3 | test | [ ] |

### 覆盖检查
- [ ] 每个需求点都能映射到至少一个 AC
- [ ] 每个 AC 都有验证方式
- [ ] 前端需求已准备需求→证据映射表

## What

### Phase A: Evolution Run 与 Proposal 生成

新增 Evolution Service，负责从一次 Team Run 里生成 EVO Proposal。

触发方式：

1. 用户在房间内发负反馈
2. 用户点击消息上的“不满意”
3. 用户点击 Header / 提案区里的“让 Team 复盘”

V2 不要求完全依赖自动情绪分类。手动触发必须存在，避免误判或噪音。

输入材料：

- TeamVersion 快照
- 房间 transcript
- 成员列表和实际发言
- A2A 路由链
- 工具结果 / 错误
- 用户负反馈原文

输出对象：

```text
EvoProposal
= id
+ teamId
+ baseVersionId
+ targetVersionNumber
+ status: draft | pending | in-review | applied | rejected | expired
+ summary
+ changes[]
```

每条 Change 必须有证据链：

```text
Change
= kind
+ title
+ why
+ evidenceMessageIds
+ targetLayer
+ before
+ after
+ impact
```

### Phase B: EVO Reviewer

复用 `B-evolution-spec.md` 里的核心 UI 心智：全屏 PR 风格审阅器。

布局：

```text
EVO-001  软件开发团队 v3 -> v4  [待审阅]

左侧：改动列表                 右侧：改动详情
[ ] 招募成员                  为什么
[ ] 改成员提示词              Before / After
[ ] 改 Team 工作流            证据消息
[ ] 改路由策略                影响范围
[ ] 沉淀团队记忆              [拒绝] [接受这条改动]
[ ] 增加验证样例
```

交互规则：

- 默认选中第一条 change
- 用户逐条 accept / reject
- 决策可以撤销
- 全部 change 有 decision 后才允许合并或关闭
- 全部拒绝时 proposal 标记 rejected，不产生新版本

### Phase C: Merge 产生新 TeamVersion

合并时只应用 accepted changes。合并结果是新的 TeamVersion，不覆盖旧版本。

V2 支持 6 类改动：

| kind | 用户看到什么 | Apply 语义 |
|------|--------------|------------|
| `add-agent` | 招募新成员卡片 | 新 TeamVersion 的 member snapshot 增加该成员 |
| `edit-agent-prompt` | 某成员 prompt diff | 新 TeamVersion 的 member prompt snapshot 更新 |
| `edit-team-workflow` | 团队工作流 diff | 新 TeamVersion 的 workflow snapshot 更新 |
| `edit-routing-policy` | 路由规则 diff | 新 TeamVersion 的 routing policy snapshot 更新 |
| `add-team-memory` | 团队共识列表 | 新 TeamVersion 的 team memory 增量更新 |
| `add-validation-case` | 失败样例摘要 | 记录 validation case；V2 只沉淀，不强制跑门禁 |

合并后：

- Proposal 状态变为 `applied`
- Team active version 指向新版本
- 新房间默认使用新版本
- 当前旧房间继续 pinned 在原版本，显示“可升级到 vN”

## User Experience

### 房间内入口

负反馈或手动复盘后，消息流末尾出现就地卡片：

```text
Team 想自我改进
这次它发现 Reviewer 没有验证代码、实现工程师过早交付，并建议 4 项改动。
[查看 EVO-001]
```

Header chip 状态：

- `团队反思中`
- `团队提议进化`
- `已合并 v4`

### 逐条审阅

每条 change 的详情都必须回答：

- 为什么改
- 证据来自哪几条消息
- 改的是哪一层
- before / after 是什么
- 合并后影响哪些新房间

### 合并成功

```text
已合并到 软件开发团队 v4
后续新房间将默认使用 v4。当前房间仍保留 v3，除非你手动升级。
```

## Acceptance Criteria

### Phase A（Evolution Run 与 Proposal 生成）
- [ ] AC-A1: 房间内存在手动“让 Team 复盘”入口
- [ ] AC-A2: 用户负反馈可以触发 evolution run，并显示“团队反思中”状态
- [ ] AC-A3: 生成的 proposal 至少支持 6 类 change kind
- [ ] AC-A4: 每条 change 都保存 evidence message ids 和 target layer

### Phase B（EVO Reviewer）
- [ ] AC-B1: Proposal card 点击后进入全屏 EVO Reviewer
- [ ] AC-B2: Reviewer 左列展示 change 列表，右侧展示当前 change 详情
- [ ] AC-B3: 用户可以逐条 accept / reject，决策状态可持久化
- [ ] AC-B4: 未审完全部 change 时不能 merge

### Phase C（Merge 产生新 TeamVersion）
- [ ] AC-C1: 至少一条 accepted change 时，用户可以 merge proposal
- [ ] AC-C2: merge 后创建新的不可变 TeamVersion，并更新 Team active version
- [ ] AC-C3: 旧房间仍 pinned 到原 TeamVersion，不自动漂移
- [ ] AC-C4: 全部拒绝时 proposal 标记 rejected，不产生新版本

## Dependencies

- **Blocked by**: F052（必须先有 Team 与 TeamVersion）
- **Related**: F023（`add-team-memory` 与 Skill 绑定需要保持边界）
- **Related**: F052（Team workflow 是进化提案的目标层）

## Risk

| 风险 | 缓解 |
|------|------|
| LLM 生成的改动没有证据，用户无法信任 | Change 必须包含 evidence message ids，没有证据不能进入 Reviewer |
| Proposal 变成自动改配置 | Team 只能提出 proposal；merge 必须由用户触发 |
| `workflow` / `routing` 只是人话 diff，运行时不生效 | F052 中 TeamVersion 必须有 workflow/routing snapshot，F053 apply 到这些字段 |
| V2 做太多 validation 机制导致延期 | `add-validation-case` 在 V2 只沉淀，强制门禁放到 F054 |

## Open Questions

| # | 问题 | 状态 |
|---|------|------|
| OQ-1 | 负反馈自动分类是否默认开启，还是只依赖显式“不满意”按钮和手动复盘？ | ⬜ 未定，推荐显式入口优先 |
| OQ-2 | Proposal 生成失败时是否允许用户手动重试并附加说明？ | ⬜ 未定 |
| OQ-3 | 单次 proposal 的 change 数是否限制为最多 6 条？ | ⬜ 未定，推荐最多 6 条 |

## Key Decisions

| # | 决策 | 理由 | 日期 |
|---|------|------|------|
| KD-1 | Evolution 采用 PR 心智模型 | 用户天然理解逐条审阅、合并、回滚 |
| KD-2 | V2 支持 6 类 change kind | 覆盖成员、提示词、工作流、路由、记忆、验证样例的核心进化面 |
| KD-3 | `add-validation-case` 先沉淀不强制门禁 | 让 V2 闭环先可用，验证门禁放到 F054 |

## Timeline

| 日期 | 事件 |
|------|------|
| 2026-05-01 | 立项，明确 EVO PR 为 Team Evolution 第二版 |

## Review Gate

- Phase A: 需要用真实房间 transcript 生成 proposal 样例
- Phase B: 需要截图验证 Reviewer 逐条审阅体验
- Phase C: 需要测试 merge 后新旧 TeamVersion 和房间 pinned 行为

## Links

| 类型 | 路径 | 说明 |
|------|------|------|
| **Feature** | `docs/features/F052-team-foundation.md` | 前置：Team 与 TeamVersion |
| **Feature** | `docs/features/F054-team-evolution-validation.md` | 下一版：验证样例与进化门禁 |
