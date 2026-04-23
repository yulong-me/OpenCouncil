---
feature_ids: []
related_features: [F008, F009, F010, F011, F018]
topics: [UI, UX, Frontend, Governance]
doc_kind: discussion
created: 2026-04-20
---

# 2026-04-20 UI Governance Audit Review

## Goal

复核现有 UI/UX 审计结论，收敛为一份可拍板的系统级治理方案。

本轮不实现，只回答三件事：

1. 哪些问题仍然成立，且属于系统级缺口
2. 哪些问题已经被既有 feature 修掉，不应重复立项
3. 如果批准开工，最小返工路径是什么

## Executive Summary

现有审计方向大体正确，但需要收敛口径。

确认成立、应作为本轮治理入口的问题有 5 个：

1. `/` 在未选房间时仍是三栏空壳，不是可起手的首页
2. `/settings` 仍然复用 `SettingsModal`，路由页与抽屉心智模型冲突
3. 窗口/表单 primitive 缺失，导致 dialog、focus、label、autocomplete 等规范执行不一致
4. 左侧会话列表在视觉上已改进，但交互语义仍欠账
5. 右栏与顶部次级控制占比偏高，主消息区没有得到足够优先级

需要降级或改写的结论有 2 个：

1. “新讨论标题不可命名”已经不是开放问题。`CreateRoomModal` 已提供 topic 输入，`POST /api/rooms` 也保留用户 topic，相关问题已被 F010 / F018 收口。
2. “房间卡片删除只靠 hover，触屏不可发现”不应再按原表述保留。`RoomListSidebar` 的移动端删除按钮已常显；当前剩余问题是语义结构和桌面 hover/focus 一致性，而不是移动端完全不可发现。

## Confirmed Findings

### 1. 首页空态仍未成立

这是当前最值得先修的 IA 问题。

- [frontend/app/page.tsx](/Users/yulong/work/OpenCouncil/frontend/app/page.tsx:5) 直接渲染 `<RoomView />`
- [frontend/components/RoomView_new.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomView_new.tsx:1060) 只有 `roomId` 存在时才渲染 `RoomComposer`
- [frontend/components/MessageList.tsx](/Users/yulong/work/OpenCouncil/frontend/components/MessageList.tsx:143) 空态只在 `messages.length === 0 && roomId` 时显示

结果是：未选房间时，中栏只有一个空消息区，右栏仍保留，用户没有“下一步该做什么”的界面提示。

这不是文案问题，而是首页缺少独立状态定义。

### 2. `/settings` 的路由页与抽屉模型冲突

这个判断成立，而且是结构性问题。

- [frontend/components/SettingsPageClient.tsx](/Users/yulong/work/OpenCouncil/frontend/components/SettingsPageClient.tsx:17) 把路由页直接渲染为 `SettingsModal`
- [frontend/components/SettingsModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/SettingsModal.tsx:663) 仍然是带全屏 backdrop 的右侧抽屉
- [frontend/app/settings/layout.tsx](/Users/yulong/work/OpenCouncil/frontend/app/settings/layout.tsx:13) 同时又定义了一套 page layout

结果是：系统里同时存在“设置是页面”和“设置是抽屉”两种模型，但 route 入口实际走的是抽屉实现，导致宽屏下左半屏只是灰幕，不是信息空间。

### 3. Dialog / Form primitive 缺失

这比单个页面问题更底层，建议作为治理基座。

目前多个窗口各自实现关闭、焦点和表单语义：

- [frontend/components/SettingsModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/SettingsModal.tsx:571) 只有 `Escape` 关闭，没有 focus trap / focus restore
- [frontend/components/CreateRoomModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/CreateRoomModal.tsx:133) 同样只有 `Escape` 关闭
- [frontend/components/DirectoryBrowser.tsx](/Users/yulong/work/OpenCouncil/frontend/components/DirectoryBrowser.tsx:147) 也是独立的 `Escape` 监听
- [frontend/components/RoomComposer.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomComposer.tsx:286) 输入框只有 `aria-label`，没有 `name` / `autocomplete`
- [frontend/components/CreateRoomModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/CreateRoomModal.tsx:247) topic 输入没有显式 `label`
- [frontend/components/SettingsModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/SettingsModal.tsx:149) Agent 编辑表单多数字段没有 `id/htmlFor/name/autocomplete`

按 Web Interface Guidelines，这已经不是“某几个字段没补齐”，而是缺少共享 primitive，导致规则只能靠每个组件自行记忆。

### 4. 会话列表仍有语义债

这条需要更精确表述：问题在“语义结构”，不在“移动端无法删除”。

- [frontend/components/RoomListSidebar.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomListSidebar.tsx:100) 仍使用 `div role="button"` 作为整卡交互根
- 同一卡片内部又包含独立删除按钮和 workspace 按钮，形成复合交互区
- Vercel 的 guideline 明确建议：导航用 `a/Link`，操作用 `button`，避免 `div` + click handler 充当主交互元素

这里要注意：F011 当时是为了规避“button 内嵌 button”的 HTML 违规，做了局部折中；但从系统治理角度，这个折中不应成为长期终态。

### 5. 右栏和顶部次级控制权重过高

这条是设计判断，但有明确代码和截图证据支撑。

- [frontend/components/RoomView_new.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomView_new.tsx:943) 中栏是唯一主任务区
- [frontend/components/AgentPanel.tsx](/Users/yulong/work/OpenCouncil/frontend/components/AgentPanel.tsx:43) 右栏默认宽度 `320`
- [frontend/components/AgentPanel.tsx](/Users/yulong/work/OpenCouncil/frontend/components/AgentPanel.tsx:135) 右栏的核心信息只有房间 ID、参与者计数和 workspace
- [frontend/components/RoomView_new.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomView_new.tsx:957) 顶部同时容纳 A2A 深度、移动端参与者入口、邀请专家、桌面收起按钮

结论不是“右栏不该存在”，而是：

- 未选房间时不应默认占位
- 已选房间时默认宽度偏大
- 顶栏承载了过多二级控制，挤占了主路径注意力

## Adjusted Findings

### A. “新讨论标题不可命名”已关闭

现状与原审计结论不一致：

- [frontend/components/CreateRoomModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/CreateRoomModal.tsx:247) 已提供 topic 输入
- [frontend/components/CreateRoomModal.tsx](/Users/yulong/work/OpenCouncil/frontend/components/CreateRoomModal.tsx:173) 已在创建时提交用户 topic 或合理 fallback
- [docs/features/F010-create-room-ux-improvements.md](/Users/yulong/work/OpenCouncil/docs/features/F010-create-room-ux-improvements.md:1) 和 [docs/features/F018-mainflow-prompt-ux.md](/Users/yulong/work/OpenCouncil/docs/features/F018-mainflow-prompt-ux.md:1) 也已记录该方向完成

因此不建议把这条继续列为本轮治理项。

### B. “房间卡片删除只靠 hover，触屏不可发现”要改写

原表述已过时：

- [frontend/components/RoomListSidebar.tsx](/Users/yulong/work/OpenCouncil/frontend/components/RoomListSidebar.tsx:143) 桌面删除按钮是 hover/focus-in 才显
- 但移动端菜单中的删除按钮并未隐藏，因此“触屏不可发现”并不准确

保留问题应改写为：

- 桌面端操作显隐仍依赖 hover，且焦点反馈不够强
- 会话卡片的整体语义结构仍不够稳
- Settings 页表格行操作同样有 hover 才出现的问题，且比房间列表更值得优先处理

## Root Cause

这轮不建议继续 screen-by-screen 修补。根因更像三层缺口叠加：

1. 缺少页面态定义：`home / room / settings-route / in-room-settings` 没被明确区分
2. 缺少共享 primitive：dialog、field、empty state、secondary panel 各自手写
3. 缺少系统级优先级规则：主任务区、辅助区、管理区没有固定的权重分配

如果继续逐页 patch，最终只会把局部视觉抛光得更统一，但 IA 和 a11y 负债仍在。

## Proposed Execution Path

### Phase 1: Shell State & Layout

先处理最影响主流程的壳层状态。

- `/` 改为真正的 dashboard / empty state
- 未选房间时右栏默认关闭
- 顶栏只保留主路径操作，A2A 深度等二级控制后移

### Phase 2: Settings Architecture Split

把 route 级设置和 room 内 quick edit 分开。

- `/settings` 改成完整页面，不复用 `SettingsModal`
- `SettingsModal` 保留为 room 内快速配置入口，范围收窄
- 统一 route-level page shell 和 in-context modal shell 的职责

### Phase 3: Primitives

在正式 sweep 前先建立 4 个共享 primitive：

1. `DialogShell`
2. `FormField`
3. `PageEmptyState`
4. `SecondaryPanelSection`

没有这层，后面所有页面改动都只能是一次性修补。

### Phase 4: Semantic & Accessibility Sweep

最后再做统一 sweep，而不是现在就全量补字段。

- dialog 的 focus trap / restore
- form 的 `label / name / autocomplete / inline error`
- 会话列表与设置列表的交互语义
- hover / keyboard / touch 一致性

## Approval Items

建议先拍板这 3 件事，再进入实现：

1. `/settings` 是否确定改成完整页面，而不是继续复用右侧抽屉
2. `/` 是否确定改成可起手的 dashboard / empty state，并在未选房间时收起右栏
3. 是否接受“先补 primitive，再改页面”的实施顺序，而不是直接做视觉 polish

如果这 3 条都批准，本轮实现就可以直接按上面的 4 个 Phase 展开，不需要再回头推翻结构。

## Recommendation

建议批准，但要按“架构治理”立项，而不是按“再做一轮 UI polish”立项。

真正值得做的不是换皮，而是把这套界面的页面态、窗口态和表单态收成一个稳定系统。
