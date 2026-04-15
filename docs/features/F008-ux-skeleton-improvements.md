---
feature_ids: [F008]
related_features: []
topics: [UX, Frontend, CSS]
doc_kind: plan
created: 2026-04-15
---

# F008: UX Skeleton Improvements Implementation Plan

**Feature:** F008 — `docs/features/F008-ux-skeleton-improvements.md`
**Goal:** 修复当前系统的核心输入、空间布局、阅读心流和架构信息等骨架级 UX 问题，提升大屏阅读体验与小屏可用性。
**Acceptance Criteria:** 
- [ ] AC-1: 底部输入框实现自动高度适应（Auto-resize），并具有最大高度限制和内部滚动条。
- [ ] AC-2: 优化 `MentionQueue` 渲染位置（移至输入框内部或重构绝对定位），消除输入区的视觉跳动。
- [ ] AC-3: 扩展大屏下消息气泡的最大宽度限制，防止大段代码过早折行。
- [ ] AC-4: 小屏幕设备下，Agent 面板不应直接隐藏，可通过 Drawer 或菜单调出。
- [ ] AC-5: 剥离 `AgentPanel` 底部原生的 Debug 日志，将其转移至独立的设置或单独的控制台入口，降低认知负担。
- [ ] AC-6: 确保大模型“思考过程” (Thinking) 默认折叠，以避免干扰阅读心流（仅在流式生成或明确点击时展开）。
**Architecture:** 
- 采用 React 现有的组件组合，针对 `RoomView_new.tsx` 中的 `<textarea>` 替换为支持自动增长尺寸的组件或手写原生 JS 计算。
- 重构 `AgentPanel` 为响应式：大屏侧边栏，小屏 Drawer（复用现有的 Drawer 模式）。
- 重置气泡宽度（如 `md:max-w-[85%] lg:max-w-[90%]`）。
**Tech Stack:** React, TailwindCSS, lucide-react
**前端验证:** Yes

---

### Task 1: 底部输入框自适应高度与 Mention 队列优化

**Files:**
- Modify: `frontend/components/RoomView_new.tsx`

**Step 1: 引入自动增长逻辑**
- 在 `RoomView_new.tsx` 中为 `textarea` 添加输入事件处理，动态调整 `height` 样式，设置 `max-height` 限制。
- 将 `MentionQueue` 的位置重构为绝对定位或在弹性容器内不挤压 `textarea` 高度。

### Task 2: 消息气泡宽度扩容

**Files:**
- Modify: `frontend/components/BubbleSection.tsx`

**Step 1: 修改气泡最大宽度**
- 查找 `max-w-[75%]` 等写死的类名，更新为 `max-w-[85%] xl:max-w-[90%]` 以提升宽屏下的代码块可读性。
- 确认 Thinking 折叠逻辑（`isExpanded`）符合 AC-6 预期。

### Task 3: 剥离 Debug 日志与优化 Agent 面板

**Files:**
- Modify: `frontend/components/AgentPanel.tsx`
- Modify: `frontend/components/SettingsModal.tsx` (or similar)
- Modify: `frontend/components/RoomView_new.tsx`

**Step 1: 迁移 Debug 日志**
- 从 `AgentPanel.tsx` 移除 `debugLogs` 相关的渲染区域。
- 如果需要保留，可通过顶部的统一配置栏或独立的 `Debug Drawer` 组件触发。

**Step 2: 增加小屏适配 Drawer**
- 修改 `AgentPanel` 外部容器，在 `lg` 以下断点提供一个汉堡菜单按钮来打开装载 `AgentPanel` 的 Drawer，防止移动端丢失上下文信息。
