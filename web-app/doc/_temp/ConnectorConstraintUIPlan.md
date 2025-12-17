# 连接件/约束 UI 接入方案（Toolbar 主驱动）

## 1. 背景与目标

- 现状：Toolbar 上按钮无效，UI 未接通 Core；约束求解能力已完成（P5）。
- 目标：在 UI 中完成“连接件放置 + 约束求解”的最小闭环，并由用户明确点选要使用的约束位置。
- 范围：仅 Toolbar 流程，不使用右键快捷；MVP 仅点对点约束、默认 L-Bracket 2020。

## 2. 交互流程（MVP）

1. 用户开启“约束模式”（Toolbar 开关）。
2. 用户在场景中点选两次（对象或锚点）：形成一条“候选约束”（点对点）。
   - 若点到对象则取该对象的首个锚点作为锚点引用（MVP 简化）。
   - 支持多条候选约束并列存在。
3. 用户在 Toolbar 下拉选择连接件型号（MVP：L-Bracket 2020）。
4. 用户点击场景中的某条“候选约束”高亮（或列表项）：执行放置
   - 创建连接件 SceneObject
   - 依据选中的候选约束创建点对点约束
   - 调用 ConstraintService.solveConstraints 求解定位
5. 反馈：Console/Toast 告知成功/冲突/缺少选择；不要求可视化 Gizmo。

## 3. 命令与状态

- 命令（UI -> Features -> Core）：
  - `command:assembly:enter-constraint-mode` { enabled: boolean }
  - `command:assembly:add-constraint-draft` { objectAId, objectBId, anchorAId?, anchorBId? }
  - `command:assembly:set-active-constraint` { constraintDraftId }
  - `command:assembly:place-connector-on-active-constraint` { connectorAssetId }
- 状态（Features 层维护）：
  - `constraintModeEnabled: boolean`
  - `constraintDrafts: DraftConstraint[]`（锚点对 + id + 可视化/标签）
  - `activeDraftId: string | null`
- 约束求解：调用 ConstraintManager/ConstraintService；不改 Core。

## 4. 组件与文件落点（建议）

- UI
  - Toolbar 按钮/下拉：`src/features/designer/ui/Toolbar/CommandToolbar.tsx`（或现有 Toolbar 文件）
  - 候选约束列表/高亮（MVP 可 Console + 简单列表组件）
- Features
  - 命令处理：`src/features/designer/commands/AssemblyCommandHandler.ts`
  - 约束草稿状态：`ConstraintDraftStore`（可放在 features/designer/services 或 store）
- Core：复用 AnchorService/ConstraintService，无需修改。

## 5. MVP 行为细则

- 锚点拾取：优先显式 anchorId；若无则取对象锚点数组第一项。
- 放置前置条件：必须有 activeDraftId 且选择了 connectorAssetId；否则提示并中止。
- 求解失败/冲突：提示 conflicts 列表；连接件仍创建但位置可选择不应用（MVP 可直接应用并提示）。
- 清空：提供“清空候选约束”命令/按钮。

## 6. 测试计划（Vitest）

- add-constraint-draft：选两个对象生成 Draft，数量+1。
- place-connector-on-active-constraint：
  - 创建连接件 SceneObject；
  - 创建点对点约束；
  - 求解 success=true；
  - 位置变化 ≠ 初始；锚点距离 ~0。

## 7. 后续扩展（非 MVP）

- 约束类型选择（点对点/轴对齐/距离）。
- 锚点选择器 UI（不依赖“首锚点”简化）。
- 连接件选择面板（多型号）。
- 约束/锚点可视化 Gizmo、HUD 列表。
- 冲突可视化与批量放置。

## 8. 开发步骤（执行顺序）

1. 新增命令与 handler（enter-mode/add-draft/set-active/place-connector）。
2. 建立 Draft 状态存储与基础 API（增/删/清空/设 active）。
3. Toolbar UI：模式开关、连接件下拉、放置按钮、清空按钮；禁用逻辑。
4. 集成 AnchorService/ConstraintService 调用，完成放置求解链路。
5. 添加 Vitest 集成测试（无 renderer）。
6. 控制台/Toast 反馈结果。
