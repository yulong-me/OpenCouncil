---
feature_ids: [OPT001]
related_features: [F013]
topics: [performance, input, mention-picker, ime]
doc_kind: optimization
created: 2026-04-17
status: completed
fixed: 2026-04-18
---

# OPT001: 输入框卡顿优化

> Status: completed | Severity: 中 | Fixed: 2026-04-18

## Why

在输入框打字时感到明显卡顿，IME（拼音输入法）场景下尤为严重。影响用户体验和输入效率。

## Root Cause

每次按键触发最多 **5 次 `setState`** → 连锁 React re-render：

```
用户按一个键
  → setUserInput()                      [1次 re-render]
  → findActiveMentionTrigger()
    → agents.map(a => a.name)            [每次重建数组]
    → 正则匹配
    → openMentionPicker() / closeMentionPicker()
      → setMentionPickerOpen()           [+1次 re-render]
      → setMentionQuery()                [+1次 re-render]
      → setMentionStartIdx()             [+1次 re-render]
      → setMentionHighlightIdx()         [+1次 re-render]
```

**IME 输入时**，每个拼音音节都会触发 `onChange`，导致疯狂抖动。
通过 `onCompositionStart` / `onCompositionEnd` 事件做硬门控：
composition 进行期间跳过 mention 检测；composition 结束后直接同步触发检测，不依赖 debounce。

## Bottlenecks

| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|
| 高 | `handleInputChange` | IME 组合输入：每音节触发一次 `onChange` → 连锁反应 | ✅ `onCompositionStart/End` 硬门控 + debounce 双保险 |
| 高 | `handleInputChange` | MentionPicker 开关：每键最多 4 次 `setState` | ✅ 150ms debounce |
| 中 | `handleInputChange` | `agents.map(a => a.name)` 每键重建 | ✅ `useMemo(agents.map(a => a.name), [agents])` |
| 中 | `filteredAgents` useMemo | `mentionQuery` 每变一次就重算 | ✅ `query.length >= 1` 门槛 |
| 低 | textarea CSS | `transition-all` 每次 re-render 重新计算样式 | ✅ 移除 `transition-all` |

## Solution

### P0（必须）

1. **Debounce `findActiveMentionTrigger` + `open/closeMentionPicker`**（150ms）
   - 减少每键的 state updates 数量
   - 与 composition 门控配合：composition 期间跳过，结束后同步检测

2. **`agents.map(a => a.name)` → `useMemo` 稳定引用**
   - `const agentNames = useMemo(() => agents.map(a => a.name), [agents])`
   - 避免每次 `handleInputChange` 重建数组

### P1（建议）

3. **MentionPicker 只在 `query.length >= 1` 时才打开**
   - 减少空查询时开 picker 的抖动

4. **去掉 textarea 的 `transition-all`**
   - 每次 re-render 的样式重算可避免

## Affected Files

- `frontend/components/RoomView_new.tsx`
  - `handleInputChange` 函数（主要修改点）
  - `handleCompositionStart` / `handleCompositionEnd`（IME 硬门控）
  - `filteredAgents` useMemo
  - `openMentionPicker` / `closeMentionPicker`

## Known Limitations / Next

~~1. 目前没有 `onCompositionStart/onCompositionEnd` 门控，IME 仍是”debounce 降频”而非”提交后检测”。~~
~~2. debounce 定时器未在 `useEffect` 中统一清理（仅在下次输入时 clear）；建议补 unmount 清理。~~

✅ 双项均已在 2026-04-18 收口。

## Test Plan

- [x] 普通打字：无卡顿感
- [x] IME 拼音输入：较优化前明显改善，完成后可正确触发 mention picker
- [x] mention picker 打开/关闭：响应正常
- [x] 提及多个 agent 后发送：功能正常
