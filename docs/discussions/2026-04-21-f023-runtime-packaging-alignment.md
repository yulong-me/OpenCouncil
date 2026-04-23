---
feature_ids: [F023]
related_features: [F002, F006, F018]
topics: [runtime, build, packaging, workspace, provider, skill]
doc_kind: discussion
created: 2026-04-21
---

# 2026-04-21 F023 Runtime Packaging Alignment

## Goal

收敛一个前置判断：

在 F023 Skill System 开工前，OpenCouncil 是否只需要补一条 `build` 命令，还是必须先建立一层正式的 Runtime App Root / `start` 运行语义。

本轮不实现，只回答三件事：

1. F023 对运行目录和打包语义到底要求了什么
2. 当前 OpenCouncil 与这些要求的真实差距在哪里
3. 应该先补什么基础能力，才能让 F023 Phase 1 有稳定落点

## Executive Summary

结论很明确：**只补 `pnpm build` 不足以支撑 F023**。

F023 真正要求的不是“能编译”，而是“存在一个可运行的 Runtime App Root，并且系统维护的可变目录都相对它布局”。这直接影响：

1. managed skills 的真相源目录
2. room default workspace 的默认位置
3. provider runtime dir 的生成位置
4. provider 执行时如何同时看到 skill 注入视图和实际 workspace

`~/work/clowder-ai/` 给出的可复用模式也不是“多一个 build 脚本”，而是：

```text
workspace build
+ production start
+ runtime root / direct runtime mode
= 可运行应用目录
```

因此，OpenCouncil 若要按 F023 落地，建议先补一层 **Runtime Foundation**：

1. 明确 runtime path resolver
2. 增加 root-level `start` 生产入口
3. 把 data / workspaces / provider-runtime 的根统一到 runtime app root
4. 让 provider adapter 接受 `providerRuntimeDir` 与 `effectiveWorkspace` 双输入

在这层基础稳定之前，直接做 F023 的 Skill Catalog / bindings / UI，后面大概率还要返工运行时路径和 provider 启动方式。

## F023 Requirement Readback

F023 已经把边界写得很清楚：

1. **Runtime App Root 不是当前源码 checkout**
   它应当更接近 `clowder-ai` 的 runtime worktree，或发布后的可运行目录。

2. **系统维护的可变目录都必须相对 Runtime App Root 布局**
   包括：
   - `backend/data/skills/managed/`
   - `backend/data/provider-runtime/`
   - `backend/workspaces/`

3. **Provider Runtime Dir 是执行前生成的运行视图**
   它不是 skill 真相源，也不是实际 workspace。

4. **Provider 必须同时看到两类东西**
   - provider-native skill injection 目录
   - 实际要工作的 workspace

5. **Skill 注入主路径是 provider-native discovery**
   Phase 1 的主路径不是把 skill 正文继续拼进 prompt，而是让 provider 原生看到：
   - `.claude/skills`
   - `.opencode/skills`

对应到 F023 AC，受影响最大的不是 UI，而是以下几条：

- AC-2: managed skill 真相源位于 Runtime App Root 可变数据目录
- AC-3: Room 默认 workspace 位于 Runtime App Root 下
- AC-9: 运行前生成 provider runtime dir
- AC-10 / AC-11: skill 通过软链接注入 provider-native 目录，而不是复制

## Current OpenCouncil State

### 1. `build` 现在只解决编译，不解决运行态

当前仓库已经有：

- root `pnpm build`
- `backend build` -> `tsc`
- `frontend build` -> `next build`

这层已经足够完成“编译产物生成”，但还没有形成 F023 所需的运行态边界：

- 没有 root `pnpm start`
- 没有统一的 runtime path resolver
- 没有 provider runtime dir 生成逻辑
- 没有“从 runtime app root 启动”的生产链路

### 2. 默认 workspace 仍然绑定当前源码仓库

当前默认 Room workspace 直接写在当前 checkout 下：

```text
{project_root}/backend/workspaces/room-<roomId>/
```

这说明系统今天默认假设：

- 当前工作目录就是运行目录
- 当前源码仓库就是系统的持久化根

这和 F023 的“Runtime App Root 不等于当前 checkout”是冲突的。

### 3. Provider 启动仍然只有 `workspace` 坐标，没有 `providerRuntimeDir`

当前 Claude / OpenCode provider adapter 的启动参数只有：

- `cwd`
- `workspace`
- session / model / timeout

也就是说，现有执行模型里只有“工作目录”这一层概念，没有“skill 注入运行视图”这一层。

这会直接卡住 F023 的核心要求：

```text
provider runtime dir 是 skill 注入视图
effective workspace 是实际工作对象
二者必须同时可见
```

### 4. Builtin agent seed 仍依赖源码仓库里的 `.agents/skills`

当前 builtin perspective agent 的 seed 是在 fresh DB 启动时，直接读取 repo 下：

```text
.agents/skills/<skill-id>-perspective/SKILL.md
```

这本身不违反 F023，因为 F023 Phase 1 也明确说“先不把 perspective skills 迁入 managed catalog”。

但它带来一个运行态要求：

- 一旦未来引入 runtime app root / 发布目录
- fresh DB 初始化时仍必须能读到这批只读 seed 资产

否则会出现：

```text
build 成功
+ app 可启动
- fresh bootstrap 缺少 builtin prompt 资产
= 初始 agent seed 失败
```

所以 F023 之前不只要考虑 data dir，还要考虑 runtime 里哪些只读资源必须随应用一起可见。

## What Clowder-AI Actually Solves

参考 `~/work/clowder-ai/`，它真正提供的是三层分离：

### 1. `build` 只负责生成运行产物

- root `build` 聚合 workspace packages
- API 输出 `dist/`
- Web 输出 `.next/`

### 2. `start` 负责生产运行语义

它不是继续 `next dev` / `tsx watch`，而是：

- API 跑编译后的产物
- Web 跑 `next start`
- 需要时先做 production build

### 3. 运行目录与开发 checkout 可分离

`clowder-ai` 有两种模式：

1. runtime worktree
2. direct runtime

它们的共同点不是“必须用 worktree”，而是：

**运行时存在一个明确的 app root，启动脚本围绕它组织数据目录、服务进程和生产模式。**

这对 OpenCouncil 的启发是：

- 不一定要一开始就复制 `clowder-ai` 的 runtime worktree
- 但必须尽快建立“runtime app root”这个抽象
- 至少要让 direct mode 也具备稳定的运行根语义

## Gap Analysis Against F023

### Gap A: 缺少 Runtime App Root 抽象

当前系统里虽然有 `backend/data`、`backend/workspaces` 这些目录，但它们是靠相对源码路径硬编码出来的，不是通过“运行根”推导出来的。

结果是：

- dev 跑得通
- build 跑得通
- 但 F023 想要的“运行态可迁移性”还不存在

### Gap B: 缺少 production `start` 闭环

如果没有 root-level `start`，就没有一个稳定入口能表达：

- 从哪里启动 backend
- 从哪里启动 frontend
- data/workspaces/provider-runtime 根在哪
- 启动的是 dev 模式还是 prod 模式

这会让 F023 的 runtime assembly 落在不稳定土壤上。

### Gap C: Provider 只有 workspace，没有 runtime injection view

这是 F023 的最大实现缺口。

只把 `workspace` 传给 provider，无法满足：

- `.claude/skills` / `.opencode/skills` 原生发现
- external workspace 与 provider runtime dir 同时可见

### Gap D: Seed 资产仍耦合源码仓库

未来无论是 runtime worktree 还是发布目录，都必须回答：

1. `.agents/skills/*-perspective/` 如何进入可运行目录
2. 这些 seed 资产是复制、软链接，还是安装时随包携带
3. fresh bootstrap 时如何确保路径稳定

这个问题不需要在 F023 Phase 1 完全解决“managed 化”，但必须在 runtime foundation 里先有路径策略。

## Recommended Decision

建议把 F023 前的基础工作显式定义为 **Phase 0: Runtime Foundation**。

这不是另开一个无关 feature，而是 F023 的前置实现条件。

### Decision 1: 明确术语

在 OpenCouncil 里区分三件事：

1. `build`
   只负责编译产物

2. `start`
   负责从 runtime app root 启动应用

3. `package`
   当前语境下不指 OS 安装包，而指“形成一个可运行 app root 的方式”

这样可以避免“打包”一词混用成：

- Web build
- 生产启动
- 桌面安装包

### Decision 2: 先做 direct runtime，不强依赖 runtime worktree

`clowder-ai` 的 runtime worktree 模式很有价值，但对 OpenCouncil 来说不是 F023 的最小前置条件。

建议先做：

- direct runtime app root
- root `start`
- runtime path resolver

等 F023 跑通后，再决定是否补：

- runtime worktree
- 版本固定目录
- 更正式的发布目录复制链路

### Decision 3: Provider adapter 必须升级为“双坐标输入”

F023 落地时，provider 启动层至少要能接收：

- `providerRuntimeDir`
- `effectiveWorkspace`

不论最终实现是：

- 以 `providerRuntimeDir` 为 `cwd`，把 workspace 挂进去
- 还是在 adapter 层同时传递两个可见目录

都不能继续只有一个 `workspace` 参数。

### Decision 4: Builtin seed 资产要纳入 runtime 可见性设计

虽然 F023 Phase 1 不迁移 builtin perspective skills 到 managed catalog，但 runtime foundation 仍要保证：

- fresh DB 启动时
- builtin agent seed 仍可读取其 SKILL 资产

这要求启动/发布链路明确：

- 哪些资源是 runtime 只读资产
- 它们位于 runtime root 的什么位置

## Proposed Execution Path

### Step 1: Runtime Path Resolver

新增统一路径层，负责推导：

- `runtimeAppRoot`
- `dataDir`
- `managedSkillsDir`
- `providerRuntimeBaseDir`
- `roomWorkspaceBaseDir`

要求：

- 当前 checkout direct run 能工作
- 未来切到 runtime worktree / 发布目录时不需要大改业务代码

### Step 2: Root Production Start

在 OpenCouncil 根目录增加正式的生产入口：

- `backend start`
- `frontend start`
- `pnpm start`

其职责不是 dev watcher，而是：

- 启动编译后的 backend
- 启动 `next start`
- 以 runtime root 为基准组织运行目录

### Step 3: Provider Runtime Dir Entry

在 provider adapter 之前加一层运行装配入口：

- 输入：room / provider / workspace / effective skills
- 输出：provider runtime dir

这一步即使先不完整实现 skill assembly，也应该把接口先定下来。

### Step 4: Seed Asset Path Strategy

把 builtin perspective prompt 的读取路径从“直接猜当前 repo 路径”改成“从 runtime 可见 seed 目录解析”。

这样才能保证后面无论：

- direct runtime
- runtime worktree
- 未来发布目录

fresh bootstrap 的结果都一致。

### Step 5: 在此基础上再做 F023 Phase 1

等 Runtime Foundation 稳定后，再做：

1. managed skills catalog
2. workspace discovery
3. agent / room bindings
4. effective skill set merge
5. provider-native soft-link injection
6. minimal UI

## Rejected Path

不建议采用下面这条路径：

```text
先做 skill catalog / bindings / UI
+ 暂时继续用当前 workspace 作为 provider cwd
+ 之后再补 runtime root / provider runtime dir
```

原因：

1. 会导致 F023 最关键的 runtime assembly 只能先做半套
2. 后续 provider adapter 与路径层还要重构一次
3. managed skill 真相源目录也可能跟着返工

这条路径短期看起来快，长期会重复拆地基。

## Approval Items

建议先拍板这 3 件事，再进入实现：

1. 是否接受“F023 之前先做 Runtime Foundation”这个顺序
2. 是否接受 Phase 0 先采用 direct runtime，而不是立即做 runtime worktree
3. 是否统一术语：当前讨论里的“打包”优先指 runtime app root / production start 语义，不指桌面安装包

如果这 3 条成立，后续实现顺序就可以稳定为：

```text
Runtime Foundation
-> F023 backend runtime assembly
-> F023 UI / bindings / catalog
```

## Recommendation

建议批准这份判断，并把它作为 F023 的前置讨论结论。

真正需要先补的不是另一条 `build` 命令，而是一层能承载 Skill System 的运行时地基。
