---
feature_ids: [F001]
related_features: []
topics: [multi-agent, collaboration, platform, 智囊团, 状态机]
doc_kind: spec
created: 2026-04-09
updated: 2026-04-09
---

# F001: Multi-Agent Collaboration Platform（AI 智囊团）

> Status: spec | Owner: 宪宪

## Why

现在的 AI 助手都是"单打独斗"——用户问一个问题，AI 给一个答案，没有真正的多视角碰撞。复杂的审稿分析、方案决策、架构设计，全靠用户自己想。

**我们想做一个"AI 智囊团"**：用户开一个讨论室，一个主持人 Agent 引导，多个专业 Agent 调查事实、辩论观点、收敛结论，最终交付结构化文档。三个臭皮匠，顶个诸葛亮。

## What

一个智能讨论空间，以**状态机**驱动，主持人 Agent 编排，多个专业 Agent 协作，最终产出结构化报告。

## 状态机设计

```
┌─────────┐  用户确认  ┌──────────┐  用户确认  ┌────────┐  用户确认  ┌────────────┐  用户确认  ┌────┐
│  INIT   │ ─────────> │ RESEARCH  │ ─────────> │ DEBATE │ ─────────> │ CONVERGING │ ─────────> │DONE│
└─────────┘            └──────────┘            └────────┘            └────────────┘            └────┘
                         ↑                                                        │
                         └────────────── 用户选择继续调查 ────────────────────────┘
                         ↑                                                        │
                         └────────────── 用户选择继续辩论 ────────────────────────┘
```

**禁止**：任何状态不允许回到 INIT。

### 状态说明

| 状态 | 参与方 | 主持人做什么 | 用户能做什么 |
|------|--------|-------------|--------------|
| INIT | 主持人 + 用户 | 分析问题意图，拆解调查议题，展示给用户确认 | 确认 / 修改议题 |
| RESEARCH | 主持人 + 被调度 Agent | 并行调度 Agent 调查，收集结论，展示摘要 | 确认进入辩论 / 继续调查 |
| DEBATE | 主持人 + 全量 Agent | 分发调查结论，发起辩论，旁听总结立场 | 确认进入收敛 / 继续辩论 / 回调查 |
| CONVERGING | 主持人 + 用户 | 展示共识与分歧，提出收敛建议 | 确认收敛 / 继续辩论 / 继续调查 |
| DONE | 主持人 | 生成结构化报告，通知所有 Agent，重置状态 | — |

### Agent 角色（3 个）

- **主持人**：不调查，只编排。system prompt 包含状态机逻辑、用户引导话术、结论分发策略
- **Agent A**：专业领域调查 + 辩论，可被主持人调度
- **Agent B**：专业领域调查 + 辩论，可被主持人调度

所有 Agent 均通过 `claude -p` 非交互模式调用（child_process）。

### 讨论流程（时序）

```
用户 ─> 主持人(INIT): 分析问题，拆解议题 ─> 用户确认
用户 ─> 主持人(RESEARCH): 并行调度 A、B 调查 ─> 收集结论 ─> 展示摘要 ─> 用户确认
用户 ─> 主持人(DEBATE): 分发结论，发起辩论 ─> A、B 自由辩论 ─> 旁听总结 ─> 用户确认
用户 ─> 主持人(CONVERGING): 展示共识/分歧 ─> 用户判断 ─> 确认收敛
主持人(DONE): 生成结构化报告 ─> 用户
```

## 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 前端 | Next.js (port 3003) | 全栈一体 |
| 后端 | Express (port 3004) | 状态机 + Agent 调度 |
| Agent 调用 | Claude Code CLI (`claude -p`) | child_process，每 Agent 独立进程 |
| Agent 数量 | 3 个 | 主持人 + Agent A + Agent B |
| 状态机位置 | Express 后端 | 主持人调用时传入当前状态 |
| 消息流方式 | 轮询 2s | MVP，SSE 后续加 |
| 报告格式 | 结构化 Markdown | 主持人生成，前端展示 |

## Acceptance Criteria

- [ ] AC-1: 状态机完整运行 INIT → RESEARCH → DEBATE → CONVERGING → DONE
- [ ] AC-2: 主持人 Agent 正确编排流程（不自己调查，只调度和引导）
- [ ] AC-3: RESEARCH 阶段 A、B 并行调查，结论汇总给主持人
- [ ] AC-4: DEBATE 阶段 A、B 基于调查结论自由辩论，主持人旁听总结
- [ ] AC-5: CONVERGING 阶段清晰展示共识与分歧，用户拍板收敛
- [ ] AC-6: DONE 阶段生成结构化报告（背景、调查结论、分歧、建议）
- [ ] AC-7: 用户可在 RESEARCH/DEBATE/CONVERGING 阶段选择下一步
- [ ] AC-8: Web App 本地可运行（localhost）

## Dependencies

- 前端：Next.js (App Router, port 3003)
- 后端：Express (port 3004)
- Agent 调用：Claude Code CLI (`claude -p` 非交互模式)
- 环境：Node.js, pnpm

## Open Questions

- [ ] Q1: Agent A/B 的领域角色是固定（Architect/Reviewer）还是用户自定义？
- [ ] Q2: RESEARCH 阶段 Agent 调用 MCP 工具（搜索等）还是纯 LLM 推理？
- [ ] Q3: 报告保存方式（下载 / localStorage / 不保存）？
- [ ] Q4: MVP 是否跳过 CONVERGING（DEBATE 后直接 DONE）？
