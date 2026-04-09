---
feature_ids: [F001]
related_features: []
topics: [multi-agent, collaboration, platform, 智囊团]
doc_kind: spec
created: 2026-04-09
---

# F001: Multi-Agent Collaboration Platform（AI 智囊团）

> Status: spec | Owner: 宪宪

## Why

现在的 AI 助手都是"单打独斗"——用户问一个问题，AI 给一个答案，没有真正的多视角碰撞。复杂的审稿分析、方案决策、架构设计，全靠用户自己想。

**我们想做一个"AI 智囊团"**：用户开一个讨论室，选一个场景，几个 Agent 各执己见、互相辩论，最终给出更全面的结论。三个臭皮匠，顶个诸葛亮。

## What

一个智能讨论空间，让多个 AI Agent 从不同角度各抒己见、互相辩论，最终由用户做决策。核心原则：

1. **多视角 > 单视角**：单一 AI 受限于训练，碰撞才能发现盲点
2. **各执己见，不是和稀泥**：Agent 坚守立场，用户做最终决策
3. **场景驱动，不是聊天驱动**：用户选"要做什么"，系统组织讨论流程
4. **结果可追溯**：每个观点有记录，用户知道结论怎么来的

### 核心功能

#### 讨论室（Discussion Room）
- 用户创建讨论室，选择场景
- 系统凑齐相关 Agent，制定讨论计划
- Agent 们各执己见、互相辩论
- 最终综合多视角结论，用户决策

#### 场景系统（Scenario System）
- 场景 1：审稿意见分析（研究价值 + 可行性 + 创新性）
- 场景 2：开发方案讨论（架构 + 风险 + 更好思路）
- 场景 3：工作流编排（自动凑 Agent + 制定计划）
- 场景 4：**自定义讨论（用户定义场景 + 邀请 Agent + 定制流程）** ← MVP

#### Agent 角色定义
- **Architect**：架构视角，擅长系统设计和长远规划
- **Reviewer**：可行性视角，擅长风险评估和细节审查
- **Designer**：创新性视角，擅长打破常规和寻找更好思路
- **Custom**：用户自定义角色和立场

### MVP 范围（Phase 1）
- 场景 4（自定义讨论）优先实现
- 最小可用流程：创建讨论室 → 添加 Agent → 发起讨论 → 查看结论
- Web App 前端
- 基础讨论记录和追溯

## Acceptance Criteria

- [ ] AC-1: 用户可以创建讨论室，填写标题和描述
- [ ] AC-2: 用户可以选择邀请哪些 Agent（至少 Architect / Reviewer / Designer / Custom）
- [ ] AC-3: 用户可以为每个 Agent 定义立场/角色描述
- [ ] AC-4: Agent 们按顺序各抒己见，可以互相引用和辩论
- [ ] AC-5: 最终结论页面清晰展示各 Agent 观点和整体结论
- [ ] AC-6: 讨论过程可追溯，每个观点标注来源 Agent
- [ ] AC-7: Web App 可在本地运行（localhost）

## Design Gate

**设计稿**：`designs/F001-multi-agent-platform.pen`（@gemini25 设计）

**确认内容**：
- 两栏布局：左侧配置栏（Topic + 2 Agent + Start） + 右侧辩论流
- Agent 颜色区分：Architect（蓝 #DBEAFE）/ Reviewer（紫 #FDF4FF）
- 消息气泡带角色标签（"Architect" / "Reviewer"），可追溯
- 辩论状态标签（"In Progress"）
- 输入区固定底部

**架构决策**（铲屎官拍板）：

| 决策 | 选择 | 理由 |
|------|------|------|
| 前端 | Next.js (port 3003) | 全栈一体，SSR + API routes |
| 后端 | Express (port 3004) | 轻量 API 层，前后端分离 |
| Agent 调用 | Claude Code CLI (`-p` 非交互) | child_process 驱动，每 Agent 独立进程 |
| MVP Agent 数量 | 2 个 | Architect + Reviewer |
| 讨论轮数 | 1 轮 | MVP 最简 |
| 结论生成 | 嵌入消息流 | B 发言结束后，最后一条为综合结论 |
| 消息流方式 | 轮询 2s | MVP 最简，SSE 后续加 |
| Agent B 角色 | 反驳 A | "I disagree..." 风格 |

## Dependencies
- 前端：Next.js (App Router, port 3003)
- 后端：Express (port 3004)
- Agent 调用：Claude Code CLI (`claude -p` 非交互模式)
- 环境：Node.js, pnpm

## Risk
- Agent 辩论的质量依赖 prompt 工程，需要迭代调优
- Claude Code CLI 的 prompt 长度和输出格式控制需要测试
- MVP 无持久化（内存，重启丢失）

## 需求点 Checklist

- [ ] 用户可创建讨论室
- [ ] 用户可选择 Agent 角色
- [ ] 用户可自定义 Agent 立场描述
- [ ] Agent 顺序发言机制
- [ ] Agent 间互相引用/辩论机制
- [ ] 结论汇总展示
- [ ] 讨论历史可追溯
- [ ] Web App 本地可运行
