# 锚点与约束系统设计

> **状态**: ✅ Phase 1-5 实现完成 (2025-12-14)
> **创建时间**: 2025-12-13
> **实现版本**: v0.1.0

---

## 实现总结

### 完成进度

- ✅ **Phase 1: Geometry Abstraction** (12 tests) - 2025-12-13
- ✅ **Phase 2: Strategy Refactoring** (18 tests) - 2025-12-13
- ✅ **Phase 3: Anchor System** (11 tests) - 2025-12-14
- ✅ **Phase 4: Constraint System** (16 tests) - 2025-12-14
- ✅ **Phase 5: Features Layer Integration** (15 tests) - 2025-12-14
- ⏳ **Phase 6: UI Components & Visualization** - 待实现

**总计**: 72 tests passing

### 核心架构

本系统采用分层架构，遵循单向依赖原则：

```
UI Layer (React Components)
    ↓
Features Layer (AnchorManager, ConstraintManager)
    ↓
Core Layer (AnchorService, ConstraintService)
    ↓
Renderer Layer (ThreeJS Adapters)
```

### 关键设计模式

1. **Adapter Pattern** - 几何转换层隔离 Three.js 依赖
2. **Factory Pattern** - 材质创建统一接口
3. **Callback Pattern** - Core → Features 通信（维持单向依赖）
4. **Observer Pattern** - EventBus 实现事件驱动
5. **Facade Pattern** - Features 层简化 Core API

---

## 1 概述

本设计基于对铝型材装配的第一性原理抽象：可用来连接的物理原子只有两类——`T-slot`（滑动槽）与“孔”（through hole / threaded hole / set-screw）。所有连接件本质上是“有孔的部件”，装配即将连接件的孔与型材的槽或孔对齐并用紧固件约束。

目标：

- 支持典型装配（L型、T型、十字、三通等）并保证可扩展性
- 约束求解对运行时高效（使用轻量级对齐点）
- FEA/导出使用完整几何与孔规格（compute 层按需提供）
- 支持交互（吸附、拖拽、滑动）与可视化

---

## 实现细节

### Phase 1-2: 几何抽象层

**目标**: 解除 Core 层对 Three.js 的直接依赖

**实现文件**:

- [core/geometry/types.ts](../src/core/geometry/types.ts) - IShape, ICurve, MaterialProperties
- [core/geometry/SVGPathParser.ts](../src/core/geometry/SVGPathParser.ts) - SVG Path → IShape
- [core/renderer/threejs/adapters/ThreeGeometryAdapter.ts](../src/core/renderer/threejs/adapters/ThreeGeometryAdapter.ts) - IShape → THREE.Shape
- [core/renderer/threejs/adapters/ThreeMaterialFactory.ts](../src/core/renderer/threejs/adapters/ThreeMaterialFactory.ts) - MaterialProperties → THREE.Material

**关键代码**:

```typescript
// Renderer-agnostic geometry interface
export interface IShape {
  curves: ICurve[];
  closed: boolean;
}

export type ICurve =
  | ILineCurve
  | IQuadraticBezierCurve
  | ICubicBezierCurve
  | IArcCurve;

// Adapter converts to Three.js
export class ThreeGeometryAdapter {
  shapeToThreeShape(shape: IShape): THREE.Shape {
    const threeShape = new THREE.Shape();
    // Convert each curve type to THREE.js equivalents
    for (const curve of shape.curves) {
      switch (curve.type) {
        case 'line' /* ... */:
          break;
        case 'quadratic-bezier' /* ... */:
          break;
        // ...
      }
    }
    return threeShape;
  }
}
```

**测试覆盖**: 12 tests (geometry parsing) + 18 tests (strategy refactoring)

### Phase 3: AnchorService

**目标**: 实现锚点生成、查询、更新的 Core 服务

**实现文件**:

- [core/anchor/types.ts](../src/core/anchor/types.ts) - AnchorType, AnchorPoint interface
- [core/anchor/AnchorService.ts](../src/core/anchor/AnchorService.ts) - Map-based storage

**核心 API**:

```typescript
export class AnchorService {
  // Generate anchors from SceneObject geometry
  generateAnchors(objectId: string, sceneObject: SceneObject): AnchorPoint[];

  // Find nearest anchor within threshold
  findNearestAnchor(
    position: Vector3,
    threshold: number,
    objectId?: string
  ): AnchorQueryResult | null;

  // Find all anchors within radius
  findAnchorsInRadius(
    position: Vector3,
    radius: number,
    objectId?: string
  ): AnchorQueryResult[];

  // Update anchors after transform
  updateAnchorsAfterTransform(
    objectId: string,
    transform: {
      position: Vector3;
      rotation?: { x: number; y: number; z: number };
    }
  ): void;

  // Callbacks (Core → Features communication)
  onAnchorsUpdated?: (objectId: string, anchors: AnchorPoint[]) => void;
  onNearestAnchorFound?: (result: AnchorQueryResult | null) => void;
}
```

**锚点类型**:

- `end` - 端点
- `midpoint` - 中点
- `corner` - 截面角点
- `center` - 中心点
- `snap` - 吸附点

**测试覆盖**: 11 tests

### Phase 4: ConstraintService

**目标**: 实现约束管理与求解的 Core 服务

**实现文件**:

- [core/constraint/types.ts](../src/core/constraint/types.ts) - Constraint types, priority system
- [core/constraint/ConstraintService.ts](../src/core/constraint/ConstraintService.ts) - Constraint management

**约束类型**:

```typescript
export type ConstraintType =
  | 'fixed-joint' // 固定连接（位置+角度锁定）
  | 'point-to-point' // 点对点对齐
  | 'axis-align' // 轴对齐（平行/垂直）
  | 'sliding-joint' // 沿轴滑动
  | 'angle' // 角度约束
  | 'distance'; // 距离约束

export type ConstraintPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
```

**核心 API**:

```typescript
export class ConstraintService {
  // Add constraint with validation
  addConstraint(constraint: Constraint): boolean;

  // Remove constraint
  removeConstraint(constraintId: string): boolean;

  // Solve constraints for object transform
  solveConstraints(
    changedObjectId: string,
    proposedTransform: {
      position: Vector3;
      rotation?: { x: number; y: number; z: number };
    }
  ): ConstraintSolveResult | null;

  // Validate constraint feasibility
  validateConstraint(constraint: Constraint): ConstraintValidationResult;

  // Detect conflicting constraints
  detectConflicts(): string[];

  // Callbacks
  onConstraintAdded?: (constraint: Constraint) => void;
  onConstraintRemoved?: (constraintId: string) => void;
  onSolveCompleted?: (result: ConstraintSolveResult) => void;
  onConflictDetected?: (conflicts: string[]) => void;
}
```

**优先级系统**:

- `CRITICAL` (1000) - 结构性约束，必须满足
- `HIGH` (100) - 装配约束
- `NORMAL` (10) - 对齐约束
- `LOW` (1) - 可选约束

**测试覆盖**: 16 tests

### Phase 5: Features Layer Integration

**目标**: 创建 Facade 层连接 Core 服务与 EventBus

**实现文件**:

- [features/designer/services/AnchorManager.ts](../src/features/designer/services/AnchorManager.ts) - Facade + EventBus integration
- [features/designer/services/ConstraintManager.ts](../src/features/designer/services/ConstraintManager.ts) - Facade + Observer pattern

**AnchorManager**:

```typescript
export class AnchorManager {
  constructor(eventBus: EventBus, config?: AnchorManagerConfig) {
    this.anchorService = new AnchorService();
    this.setupCallbacks(); // Connect callbacks to EventBus
  }

  private setupCallbacks(): void {
    this.anchorService.onAnchorsUpdated = (objectId, anchors) => {
      this.eventBus.emit('state:anchor:updated', {
        objectId,
        anchorCount: anchors.length,
      });
    };
    // ...
  }

  // Simplified Facade API
  generateAnchors(objectId: string, sceneObject: SceneObject): void;
  findNearestAnchor(
    position: Vector3,
    threshold?: number
  ): AnchorQueryResult | null;
  // ...
}
```

**ConstraintManager**:

```typescript
export class ConstraintManager {
  constructor(
    eventBus: EventBus,
    anchorManager: AnchorManager,
    config?: ConstraintManagerConfig
  ) {
    this.constraintService = new ConstraintService();
    this.setupCallbacks(); // Connect callbacks to EventBus
    this.setupAnchorService(); // Inject AnchorService
  }

  // Assembly helpers
  createLJointAssembly(
    profileAId: string,
    profileBId: string,
    connectorId: string
  ): boolean;
  createTJointAssembly(
    mainProfileId: string,
    sideProfileId: string,
    position: number
  ): boolean;
  updateTJointPosition(constraintId: string, newPosition: number): void;
}
```

**EventBus Events**:

```typescript
// Anchor events
'state:anchor:updated';
'state:anchor:nearestFound';
'command:anchor:enableSnapping';
'command:anchor:disableSnapping';

// Constraint events
'state:constraint:added';
'state:constraint:removed';
'state:constraint:solved';
'state:constraint:conflict';
'state:constraint:enabledChanged';

// Assembly commands
'command:assembly:createLJoint';
'command:assembly:createTJoint';
'command:assembly:updateTJointPosition';

// Transform updates
'command:object:updateTransform';
```

**测试覆盖**: 15 tests

---

## 2 核心数据结构（原始设计）

**注意**: 以下为设计阶段的理想数据结构，当前实现为 Phase 1-5 的简化版本，完整实现（连接件孔规格、紧固件等）将在后续 Phase 推进。

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

## 7 实现路线图

### 已完成 (Phase 1-5) ✅

- ✅ Phase 1: Geometry Abstraction - 解除 Core 层对 Three.js 的直接依赖
- ✅ Phase 2: Strategy Refactoring - 使用抽象几何重构 ProfileInstanceStrategy
- ✅ Phase 3: Anchor System - 实现 AnchorService (Map-based storage, callback pattern)
- ✅ Phase 4: Constraint System - 实现 ConstraintService (6 constraint types, priority system)
- ✅ Phase 5: Features Integration - AnchorManager & ConstraintManager (Facade + EventBus)

### 进行中 (Phase 6) 🚧

- [ ] 实现锚点可视化组件（AnchorGizmo）
- [ ] 实现约束可视化（智能辅助线、距离/角度标注）
- [ ] 实现 AssemblyPanel UI 组件
- [ ] 实现 ConstraintInspector UI 组件
- [ ] 集成到 ThreeRenderer 和 TransformControls

### 待实现 (Phase 7+) ⏳

- [ ] 完整连接件系统（ConnectorAsset with holes）
- [ ] 紧固件生成（FastenerInstance）
- [ ] 高级约束求解器（迭代求解、冲突管理）
- [ ] 网格吸附 & 角度吸附
- [ ] T 型滑动装配完整实现
- [ ] FEA 导出（完整几何 + 孔规格）

---

## 8 技术决策记录

### 为什么使用 Callback Pattern 而非 EventBus？

**问题**: Core 层如何通知 Features 层状态变化？

**选项**:

1. Core 层直接依赖 EventBus（违反分层原则）
2. Features 层轮询 Core 层（低效）
3. Callback Pattern（当前方案）

**决策**: 使用 Callback Pattern

**理由**:

- 保持 Core 层零依赖（renderer-agnostic, framework-agnostic）
- Callback 由 Features 层在构造时注入，Core 层仅调用回调
- Features 层负责将 Callback 转换为 EventBus 事件
- 清晰的单向依赖：Core ← Features ← UI

**示例**:

```typescript
// Core layer (zero EventBus dependency)
class AnchorService {
  onAnchorsUpdated?: (objectId: string, anchors: AnchorPoint[]) => void;

  generateAnchors(objectId: string, sceneObject: SceneObject): AnchorPoint[] {
    const anchors = /* ... */;
    this.onAnchorsUpdated?.(objectId, anchors); // Callback
    return anchors;
  }
}

// Features layer (bridges Core → EventBus)
class AnchorManager {
  constructor(eventBus: EventBus) {
    this.anchorService = new AnchorService();
    this.anchorService.onAnchorsUpdated = (objectId, anchors) => {
      this.eventBus.emit('state:anchor:updated', { objectId, anchorCount: anchors.length });
    };
  }
}
```

### 为什么使用 Map 而非 mesh.userData？

**问题**: 锚点存储位置？

**决策**: AnchorService 使用 `Map<objectId, AnchorPoint[]>`

**理由**:

- Core 层不应依赖 Three.js 的 `mesh.userData`（违反分层原则）
- Map 存储更高效，支持批量查询（findAnchorsInRadius）
- 未来可迁移到其他渲染器（如 Babylon.js）无需重构
- mesh.userData 可作为 Visual 层的缓存优化（待实现）

### 为什么需要 Geometry Abstraction？

**问题**: SVGPathParser 直接生成 THREE.Shape 不行吗？

**决策**: 引入 IShape/ICurve 抽象层

**理由**:

- 原设计违反了 Core 层的 renderer-independence 原则
- 未来可能支持多渲染器（Babylon.js, WebGPU）
- 抽象层使 Core 层可独立测试（无需初始化 WebGL）
- 符合 Adapter 模式最佳实践

---

## 9 风险与注意点

- 锚点同步：object transform 变化需及时更新 alignment cache
- 内置连接件（顶丝）要区分isInternalConnector，处理顶丝与T槽对齐
- 滑动时大量高频事件需节流（16ms）并尽量局部求解
- FEA需求会暴露孔/槽对强度影响，compute 层描述必须完整且准确

---

## 9 风险与注意点

- ✅ **已解决**: 锚点同步 - 实现了 `updateAnchorsAfterTransform` 方法
- ✅ **已解决**: Core 层依赖隔离 - 通过 Callback Pattern 和 Adapter Pattern
- ⚠️ **待处理**: 锚点可视化性能优化（大场景下可能有数千个锚点）
- ⚠️ **待处理**: 约束求解性能（当前为基础版本，需优化到 O(n) 复杂度）
- ⚠️ **待处理**: 滑动时大量高频事件需节流（16ms）并尽量局部求解
- 🔮 **未来**: FEA需求会暴露孔/槽对强度影响，compute 层描述必须完整且准确

---

## 10 参考与下一步

### 参考文档

- [CoreArchitecture.md](../design/CoreArchitecture.md) - 分层架构设计
- [RenderingSystem.md](../design/RenderingSystem.md) - 渲染器抽象
- [StateManagement.md](../design/StateManagement.md) - EventBus 设计

### 参考实现

- Blender Snapping System - 强大的吸附系统
- SketchUp Inference Engine - 智能推理引擎
- Fusion 360 Constraints - 约束系统
- FreeCAD Sketcher - 参数化约束

### 下一步工作

1. 实现锚点可视化（AnchorGizmo）
2. 实现约束可视化（智能辅助线）
3. 创建 AssemblyPanel UI 组件
4. 集成到 TransformControls 交互
5. 性能优化（锚点查询、约束求解）

### 移动计划

- 本文档将在 Phase 6 完成后移动到 `doc/design/AnchorConstraintSystem.md`
- 当前保留在 `doc/_temp/` 作为 Phase 1-5 实现记录

---

## 附录 A: 测试覆盖清单

### Geometry Abstraction (12 tests)

- ✅ SVGPathParser basic commands (M, L, H, V)
- ✅ SVGPathParser curves (C, Q, A)
- ✅ ThreeGeometryAdapter shape conversion
- ✅ ThreeMaterialFactory material creation

### Strategy Refactoring (18 tests)

- ✅ ProfileInstanceStrategy with abstract geometry
- ✅ ThreeRenderer.createExtrudedMesh integration
- ✅ Material properties application

### Anchor System (11 tests)

- ✅ AnchorService.generateAnchors (end, midpoint, corner, center, snap)
- ✅ AnchorService.findNearestAnchor with threshold
- ✅ AnchorService.findAnchorsInRadius
- ✅ AnchorService.updateAnchorsAfterTransform
- ✅ Callback pattern (onAnchorsUpdated, onNearestAnchorFound)

### Constraint System (16 tests)

- ✅ ConstraintService.addConstraint with validation
- ✅ ConstraintService.removeConstraint
- ✅ ConstraintService.solveConstraints (point-to-point, axis-align)
- ✅ ConstraintService.detectConflicts
- ✅ Priority system (LOW, NORMAL, HIGH, CRITICAL)
- ✅ Callback pattern (onConstraintAdded, onSolveCompleted, onConflictDetected)

### Features Integration (15 tests)

- ✅ AnchorManager EventBus integration
- ✅ ConstraintManager EventBus integration
- ✅ Assembly commands (createLJoint, createTJoint)
- ✅ Configuration management
- ✅ Statistics API

**总计**: 72 tests (100% passing)

---

## 附录 B: 事件流程图

```
User Action (Drag Object)
    ↓
TransformControls (UI Layer)
    ↓
AnchorManager.findNearestAnchor() (Features Layer)
    ↓
AnchorService.findNearestAnchor() (Core Layer)
    ↓
[Callback] onNearestAnchorFound
    ↓
EventBus.emit('state:anchor:nearestFound') (Features Layer)
    ↓
UI Update (Highlight Anchor Gizmo)
```

```
User Action (Add Constraint)
    ↓
ConstraintManager.addConstraint() (Features Layer)
    ↓
ConstraintService.addConstraint() (Core Layer)
    ↓
[Callback] onConstraintAdded
    ↓
EventBus.emit('state:constraint:added') (Features Layer)
    ↓
ConstraintService.solveConstraints() (Core Layer)
    ↓
[Callback] onSolveCompleted
    ↓
EventBus.emit('state:constraint:solved') (Features Layer)
    ↓
EventBus.emit('command:object:updateTransform') (Features Layer)
    ↓
ThreeRenderer.updateObjectTransform() (Renderer Layer)
```

---

**文档版本**: v0.1.0 (Phase 1-5 Complete)  
**最后更新**: 2025-12-14  
**维护者**: AI Development Team
