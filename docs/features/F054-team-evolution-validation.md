---
feature_ids: [F054]
related_features: [F001, F023, F052, F053]
topics: [team, evolution, eval, validation, rollback, quality]
doc_kind: spec
created: 2026-05-01
---

# F054: Team Evolution Validation Loop（进化验证闭环）

> **Status**: implemented-v1 | **Owner**: codex | **Priority**: P1

## Why

F053 让 Team 可以提出 EVO PR 并合并成新版本，但如果没有验证闭环，“进化”仍可能只是改配置：

- Team 说自己改好了，但没人验证同类失败是否真的不会重演。
- 用户只能靠直觉审 prompt diff，无法判断新版本是否更可靠。
- 版本越多，越需要知道哪些版本解决了哪些失败样例。

F054 的目标是把 Team Evolution 从“改动审阅”升级为“有证据的进化”：

> 每次失败都可以沉淀成 validation case；Team 新版本合并前可以预检；历史版本能用同一批样例比较表现。

## 需求点 Checklist

| ID | 需求点（铲屎官原话/转述） | AC 编号 | 验证方式 | 状态 |
|----|---------------------------|---------|----------|------|
| R1 | `add-validation-case` 不只是记录文字，而能成为后续回归样例 | AC-A1, AC-A2 | test / manual | [x] |
| R2 | 合并 Team 新版本前，用户能看到验证结果 | AC-B1, AC-B2 | screenshot / test | [x] |
| R3 | Team 历史能展示每个版本解决了哪些失败样例 | AC-C1, AC-C2 | screenshot | [x] |
| R4 | 版本回滚有证据支持，而不是只按时间回滚 | AC-C3 | manual / test | [x] |
| R5 | Team 可以更主动地提出进化建议，但不能无人值守 merge | AC-D1, AC-D2 | review / test | [~] V1 仅入口/proposal，不自动 merge |

### 覆盖检查
- [x] 每个需求点都能映射到至少一个 AC
- [x] 每个 AC 都有验证方式
- [x] 前端需求已准备需求→证据映射表

## What

### Phase A: Validation Case 数据模型

把 F053 的 `add-validation-case` 升级为一等对象。

```text
ValidationCase
= id
+ teamId
+ sourceRoomId
+ sourceProposalId
+ failureSummary
+ inputSnapshot
+ expectedBehavior
+ assertionType
+ createdFromChangeId
+ status
```

Validation Case 来源：

- 用户接受 `add-validation-case` change
- 用户在 Team 历史里手动添加
- 系统从高置信失败复盘中建议添加

V3 不要求所有 case 都自动执行。可以先支持两类：

1. **Checklist case**：人工可读的期望行为，用于 Reviewer 显示
2. **Replay case**：可用固定输入重新跑 Team，比较输出是否满足 rubric

### Phase B: Merge 前预检

EVO Reviewer 在合并前增加 Validation 区域：

```text
Validation
3 个相关样例

✓ Reviewer 必须给出验证证据
✓ 实现工程师不能直接声明完成
? 长链路任务需要先问用户是否继续
```

预检策略：

- V3 先支持用户点击“运行预检”
- 系统用 target TeamVersion draft 跑相关 validation cases
- 结果展示为 pass / fail / needs-review
- 失败不一定硬阻断 merge，但必须显性提醒

### Phase C: Version Quality Timeline

Team 版本历史不只展示“什么时候升级”，还展示“为什么升级、验证了什么”：

```text
软件开发团队 v4
来源：EVO-001
接受改动：4 / 6
新增验证样例：2
预检结果：3 pass / 1 needs-review
[查看改动] [回滚到此版本]
```

回滚时展示影响：

- 回滚后会失去哪些 accepted changes
- 哪些 validation cases 在老版本上曾失败
- 新房间会默认使用哪个版本

### Phase D: 更主动的进化建议

在 F052 / F053 / F054 都稳定后，Team 可以更主动地建议复盘，但仍不能自动 merge。

主动触发信号：

- 多次相似负反馈
- 同一个 validation case 多次失败
- 某成员长期未被路由或过度被路由
- Reviewer 经常缺少实质证据
- 用户多次手动修正同类输出

主动行为只到 Proposal：

```text
Team 发现最近 3 次软件开发任务都缺少验证证据，建议生成 EVO。
[查看建议] [忽略]
```

## User Experience

### EVO Reviewer 增加验证面板

在 F053 的右侧详情或底部合并区增加：

- 相关 validation cases
- 预检按钮
- 预检结果
- 失败样例的证据链接

### Team 历史页增强

用户看到每个版本：

- 改了什么
- 解决了什么失败
- 新增了哪些 validation cases
- 当前是否仍有未解决样例

### Team Run 后复盘增强

如果当前输出触发已有 validation case，房间内提示：

```text
这次运行命中了历史样例：Reviewer 缺少验证证据
Team 建议复盘并生成 EVO
```

## Acceptance Criteria

### Phase A（Validation Case 数据模型）
- [x] AC-A1: 系统存在 ValidationCase 持久化模型，关联 Team、Room、Proposal 和 Change
- [x] AC-A2: 接受 `add-validation-case` change 后会创建 validation case
- [x] AC-A3: Validation case 至少包含输入快照、期望行为和失败摘要

### Phase B（Merge 前预检）
- [x] AC-B1: EVO Reviewer 能展示与 proposal 相关的 validation cases
- [x] AC-B2: 用户可以对 draft TeamVersion 运行预检
- [x] AC-B3: 预检结果以 pass / fail / needs-review 展示，并保存到 proposal
- [x] AC-B4: 有失败预检时，merge 前必须显性确认

### Phase C（Version Quality Timeline）
- [x] AC-C1: Team 历史显示每个版本来源的 EVO、接受改动数和 validation 结果
- [x] AC-C2: Team 历史能查看某个版本新增或影响的 validation cases
- [x] AC-C3: 回滚前显示该版本相对当前版本的验证差异

### Phase D（更主动的进化建议）
- [~] AC-D1: 系统能基于重复失败信号生成“建议复盘”提示（V1 为房间入口和待审 proposal 提示）
- [x] AC-D2: 主动建议只创建 proposal 或复盘入口，不允许自动 merge
- [~] AC-D3: 用户可以忽略主动建议，且短时间内不重复打扰（V1 无后台主动弹出，因此无重复打扰）

## Dependencies

- **Blocked by**: F053（必须先有 EVO Proposal、Change、Decision、Merge）
- **Blocked by**: F052（必须先有 TeamVersion 作为验证目标）
- **Related**: F023（validation case 可要求某些 Skill 参与，但不能混入 Skill 真相源）

## Risk

| 风险 | 缓解 |
|------|------|
| Eval 过度复杂，拖慢 Team Evolution 主线 | V3 分 checklist case 与 replay case，先支持可解释预检 |
| 预检结果不稳定，用户反而不信任 | 结果用 pass / fail / needs-review，不把模型判断伪装成确定事实 |
| 主动建议变成噪音 | 只在重复失败或明确命中 case 时提示，并允许忽略 |
| 用户误以为系统会自动进化 | 所有文案坚持“建议 / proposal / merge”，不使用自动合并 |

## Open Questions

| # | 问题 | 状态 |
|---|------|------|
| OQ-1 | Replay case 第一版是否真实调用 provider，还是先用离线 rubric 审查历史输出？ | ⬜ 未定 |
| OQ-2 | 预检失败是否能硬阻断 merge，还是只提示风险？ | ⬜ 未定，推荐先只提示风险 |
| OQ-3 | Validation case 是否允许用户编辑 expected behavior？ | ⬜ 未定 |

## Key Decisions

| # | 决策 | 理由 | 日期 |
|---|------|------|------|
| KD-1 | V3 才做 validation loop | 防止 F053 的 PR 闭环被 eval 复杂度拖住 |
| KD-2 | 主动进化建议不能自动 merge | 保留用户控制权，避免团队自行漂移 |
| KD-3 | 预检结果允许 needs-review | 避免把不稳定模型判断包装成确定测试结果 |

## Timeline

| 日期 | 事件 |
|------|------|
| 2026-05-01 | 立项，作为 Team Evolution 第三版 |
| 2026-05-01 | V1 实现：ValidationCase 持久化、draft preflight、失败确认合并、quality timeline API、EVO Review 验证面板 |

## Implementation Notes

- V1 preflight 是本地可解释 checklist：检查 draft TeamVersion 的 workflow、routing policy、team memory、member prompts 是否包含 validation case 的 expected behavior。
- `replay` case 在 V1 标记为 `needs-review`，不会伪装成确定性自动测试。
- 失败 preflight 不硬阻断，但 `merge` 必须传入显式确认；前端也要求用户勾选确认。
- 主动复盘 V1 保持在房间内 “让 Team 复盘 / 查看 EVO PR” 入口和 proposal 流程，不做无人值守自动 merge。

## Validation Evidence

- `pnpm --dir backend exec vitest run tests/teams.test.ts tests/rooms.http.test.ts tests/scenes.test.ts tests/team-evolution.test.ts`：75 tests passed
- `pnpm --dir backend exec tsc --noEmit`：passed
- `pnpm --dir frontend exec tsc --noEmit`：passed

## Review Gate

- Phase A: 需要 review ValidationCase 是否能从 F053 accepted change 正确生成
- Phase B: 需要真实 proposal 的预检截图和保存结果
- Phase C: 需要验证 Team 历史能解释版本质量变化
- Phase D: 需要限制主动建议频率，避免房间噪音

## Links

| 类型 | 路径 | 说明 |
|------|------|------|
| **Feature** | `docs/features/F052-team-foundation.md` | V1：Team 和 TeamVersion 基础 |
| **Feature** | `docs/features/F053-team-evolution-pr.md` | V2：EVO PR 审阅和合并 |
