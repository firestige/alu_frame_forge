# 锚点与约束系统设计（临时文档）

> **状态**: 临时草案（基于第一性原理）
> **创建时间**: 2025-12-13

---

## 1 概述

本设计基于对铝型材装配的第一性原理抽象：可用来连接的物理原子只有两类——`T-slot`（滑动槽）与“孔”（through hole / threaded hole / set-screw）。所有连接件本质上是“有孔的部件”，装配即将连接件的孔与型材的槽或孔对齐并用紧固件约束。

目标：

- 支持典型装配（L型、T型、十字、三通等）并保证可扩展性
- 约束求解对运行时高效（使用轻量级对齐点）
- FEA/导出使用完整几何与孔规格（compute 层按需提供）
- 支持交互（吸附、拖拽、滑动）与可视化

---

## 2 核心数据结构（TypeScript 样式）

// 基础枚举与类型

```ts
type ThreadSpec = 'M3' | 'M4' | 'M5' | 'M6' | 'M8';

enum FastenerType {
  BOLT = 'bolt',
  T_NUT = 't-nut',
  SET_SCREW = 'set-screw',
}

enum HoleType {
  CLEAR = 'clear-hole',
  THREADED = 'threaded-hole',
  SET_SCREW = 'set-screw-hole',
}
```

### 2.1 型材连接特性（Compute 层）

```ts
interface ProfileConnectionFeatures {
  endFaceTappable: boolean; // 端面是否可攻丝
  endFaceThreadSpec: ThreadSpec[];
  endFaceMaxDepth: number;

  sideDrillable: boolean; // 侧面可打通孔

  tSlotConfig?:
    | {
        faces: ('top' | 'bottom' | 'left' | 'right')[];
        slotProfile: {
          neckWidth: number;
          headWidth: number;
          neckDepth: number;
          headDepth: number;
        };
      }
    | undefined;
}
```

### 2.2 连接件（ConnectorAsset）——本质为有孔的部件

```ts
interface ConnectorHole {
  id: string;
  localPosition: Vector3; // 相对于连接件局部坐标
  localAxis: Vector3; // 孔轴方向
  holeType: HoleType;
  spec: {
    diameter: number;
    depth: number;
    threadSpec?: ThreadSpec;
    isThrough: boolean;
  };
  setScrewDirection?: Vector3; // 仅set-screw
}

interface ConnectorAsset extends Asset {
  family: string;
  holes: ConnectorHole[];
  isInternalConnector?: boolean; // 插入T槽并用顶丝固定的连接件
}
```

### 2.3 运行时轻量级对齐（用于约束求解 / 渲染）

```ts
interface AlignmentPoint {
  id: string; // 对应 connectorHoleId 或 profileHoleId 或 tSlotId
  position: Vector3; // 世界坐标
  axis: Vector3; // 方向（轴向）
}
```

### 2.4 装配/约束描述

```ts
type AlignmentType = 'to-end-face-tap' | 'to-side-hole' | 'to-t-slot';

interface HoleAlignment {
  connectorHoleId: string;
  profileId: string;
  targetType: AlignmentType;
  targetId?: string; // profile端面/侧孔/槽ID
  slotPosition?: number; // 若对齐到槽，记录沿槽位置
}

interface Assembly {
  id: string;
  connectorId: string;
  holeAlignments: HoleAlignment[];
  fasteners: FastenerInstance[]; // 生成的紧固件
  transform: Transform; // 连接件在场景中的变换
}

interface FastenerInstance {
  type: FastenerType;
  threadSpec?: ThreadSpec;
  length: number;
  position: Vector3;
  axis: Vector3;
}
```

### 2.5 约束类型样例

- `fixed-joint`: 固定连接（位置+角度锁定）
- `sliding-joint`: 沿某轴可滑动（记录范围与当前位置）
- `corner-joint` / `t-joint-sliding`: 高层语义组合，用于创建 L/T 装配（由若干基本约束组合）

---

## 3 服务与模块设计

### 3.1 AnchorService

职责：生成并维护锚点集合（AlignmentPoint），提供查询最近锚点、按对象更新锚点位置等接口。

关键方法：

- `generateProfileAnchors(profileId, sceneObject)` — 生成端点、截面角点、截面中心、侧面吸附点（snapPoints）
- `findNearestAnchor(worldPos, threshold)` — 返回最近锚点
- `updateAnchorsAfterTransform(objectId, transform)` — 在对象变换后更新锚点世界坐标

实现细节：

- 锚点在 visual 层缓存（mesh.userData.alignmentCache），且在 AnchorService 中保有索引以加速查找。

### 3.2 SnappingService

职责：依据配置（anchorSnap, gridSnap, angleSnap）对拖拽/变换的提议位置进行修正。

流程：

1. 查询 AnchorService 找到最近锚点（优先级最高）
2. 若无锚点且启用 gridSnap，则网格吸附
3. 返回最终位置并提供可视化数据（高亮锚点/尺寸标注）

### 3.3 AssemblyService

职责：通用装配创建器。输入为 `connectorId` 与若干 `holeAlignments`，负责：

- 验证对齐可行性（孔规格、孔/槽是否存在）
- 生成约束（fixed/sliding 等）并交给 ConstraintService
- 生成紧固件实例（bolt, t-nut, set-screw）
- 计算并放置连接件（transform）
- 创建可视化（ghost bracket, guides）

### 3.4 ConstraintService 与 ConstraintSolver

职责：管理约束集合，提供求解接口。

设计要点：

- 约束分层：结构性约束（assembly）优先于位置约束
- 运行时求解使用轻量级 `AlignmentPoint`（位置/轴）进行解析求解（解析/闭式解），尽量避免昂贵迭代
- 对于冲突或多自由度耦合问题，使用小规模迭代求解器（Gauss-Seidel 风格）并提供优先级管理

API 示例：

- `addConstraint(constraint)`
- `solveConstraints(changedObjectId, proposedTransform)` → 返回调整后的 transform
- `validateConstraints()` → 返回冲突报告

### 3.5 ConstraintSolver 实现策略

- 简单约束（点对点对齐、法向对齐）：使用闭式变换（向量旋转 + 平移）
- 滑动约束：限制自由度为1，应用投影到滑动轴并夹紧到范围
- 复杂耦合约束：收集受影响对象、构建局部系统、使用有限步迭代，阈值终止

优化：

- 仅在必要时触发全局求解，常规拖拽采用局部求解和吸附修正

---

## 4 交互与可视化

### 4.1 Gizmos

- `AnchorGizmo`：鼠标悬停/选择时显示锚点（小球），支持高亮
- `SlidingGizmo`：显示滑轨、滑块与位置标记
- `AssemblyPreview`：放置连接件时显示透明预览（ghost）并高亮匹配孔/槽

### 4.2 EventBus 事件

```text
command:assembly:create
command:assembly:updateTJointPosition
state:anchor:nearestFound
state:anchor:snapped
state:assembly:created
state:constraint:conflict
```

### 4.3 UI 组件

- AssemblyPanel：选择连接件、选择型材孔/槽、启动装配
- ExtrusionPanel：与型材挤出交互集成（已在参数化文档）
- ConstraintInspector：展示约束列表、优先级与冲突信息

---

## 5 典型场景实现（L型与T型）

### 5.1 L型（角码固定）

- 用户选择两根型材的端面锚点（AnchorService 提供端面 AlignmentPoint）
- AssemblyService 验证角码资产孔与端面规格兼容
- 生成 `fixed-joint` 约束与螺栓实例，创建角码 SceneObject（visual + compute）并置入场景
- ConstraintService 执行局部对齐求解并锁定位置

### 5.2 T型（滑动）

- 用户选择主型材侧面（FaceAnchor）和从型材端面
- AssemblyService 创建 `t-joint-sliding` 约束，记录滑动轴与范围
- UI 展示 SlidingGizmo，用户拖拽时 SnappingService 对齐到面上的 snapPoints
- 拖拽结束时更新约束参数（currentPosition），并在 compute 层记录紧固件信息

---

## 6 双模型（Visual / Compute）映射

- Visual 层保存轻量级 AlignmentPoint（mesh.userData.alignmentCache）并供运行时约束求解使用；快速、低内存
- Compute 层保存连接件/型材的孔规格与完整几何，供 FEA 导出与精确分析使用
- 约束求解与交互始终优先使用 Visual 缓存；FEA 准备时按需读取 Compute

---

## 7 流程分阶段实现计划

Phase A - 基础

- 生成锚点（端点、截面角点、面吸附点）
- AnchorService + AlignmentCache（visual.userData）
- 简单点对点对齐求解（ConstraintService 基础）

Phase B - 装配与紧固

- 定义 ConnectorAsset.holes、实现 AssemblyService
- 生成固定/滑动约束与紧固件实例
- UI Panel + AssemblyPreview

Phase C - 高级求解与冲突管理

- 实现局部迭代求解器，优先级管理
- 约束冲突检测与可视化

Phase D - FEA & 导出

- 将 compute 层完整几何与孔导出为 FEA 网格
- 验证孔/槽对结构刚度的影响

---

## 8 风险与注意点

- 锚点同步：object transform 变化需及时更新 alignment cache
- 内置连接件（顶丝）要区分isInternalConnector，处理顶丝与T槽对齐
- 滑动时大量高频事件需节流（16ms）并尽量局部求解
- FEA需求会暴露孔/槽对强度影响，compute 层描述必须完整且准确

---

## 9 参考与下一步

- 参考：项目现有 `SceneObject` 双模型设计、Anchor/TransformController 实现
- 下一步：生成临时文档到 `doc/_temp/AnchorConstraintSystem.md`（已完成），请审阅
