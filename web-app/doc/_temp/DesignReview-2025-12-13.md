# 设计评审报告 - P1 任务设计方案

**评审日期**: 2025-12-13  
**评审范围**: 任务 #5、#9、#13 的临时设计文档  
**评审依据**: [Architecture.md](../Architecture.md) 和 [CoreArchitecture.md](../design/CoreArchitecture.md)

---

## 评审方法

基于项目既定的设计原则，采用自顶向下的方法审视临时设计文档，识别违背原则的设计决策并提出改进建议。

---

## 1. 核心设计原则（来自 Architecture.md）

### 1.1 分层架构原则

```
App Layer (应用层)
    ↓ 单向依赖
Pages Layer (页面层)
    ↓ 单向依赖
Features Layer (特性层)
    ↓ 单向依赖
Core Layer (核心层)
```

**关键规则**：

- ✅ 上层可依赖下层
- ❌ 下层不可依赖上层
- ❌ Core 层不可依赖 Features 层
- ✅ Core 层是纯业务逻辑，不依赖 React

### 1.2 事件驱动原则

**通信分层规则**（2025-12-05 重构确立）：

```
UI Layer ↔ Feature/Core Layer
  通信方式: EventBus (mitt)
  - UI 发送命令事件 (command:*)
  - Core/Feature 发布状态事件 (state:*)

Core Interface ↔ Implementation Layer
  通信方式: 直接调用 + 回调函数
  - Feature 调用 Interface 方法
  - Implementation 通过回调向上报告
```

**核心原则**：

- ❌ **Implementation 层不应直接使用 EventBus**
- ✅ Implementation 层通过回调报告，由 Feature 层发布事件
- ✅ 技术实现层不应知道业务层的事件系统

### 1.3 策略模式原则

**开闭原则**（Open-Closed Principle）：

- ✅ 新增素材类型无需修改 ModelFactory
- ✅ 每个策略类专注一种类型（单一职责）
- ✅ 策略可独立单元测试
- ✅ 支持运行时动态注册

### 1.4 渲染器抽象原则

**解耦原则**：

- ✅ 业务代码不直接依赖 Three.js
- ✅ 只定义当前需要的接口（不过度设计）
- ✅ Implementation 层（ThreeRenderer）不应知道业务事件系统

### 1.5 双模型系统原则

**性能与精度分离**：

- Visual 模型：简化几何体，用于实时渲染（60 FPS）
- Compute 模型：完整几何描述，用于 FEA 分析（离线）

---

## 2. 任务 #5 & #9 设计评审（ParametricGeometryGeneration.md）

### 2.1 ✅ 符合原则的设计

#### 1. 策略模式正确应用

```typescript
class ProfileInstanceStrategy implements InstanceStrategy {
  createSceneObject(asset, options): SceneObject {
    // ...
  }
}
```

✅ **符合开闭原则**：新增策略无需修改 ModelFactory  
✅ **单一职责**：策略专注型材类型的实例化逻辑

#### 2. 渲染器抽象正确扩展

```typescript
interface IRenderer {
  createExtrudedMesh(params: ExtrusionParams): MeshHandle;
  updateExtrudedMeshLength(mesh: MeshHandle, newLength: number): void;
  applyMachiningOps(mesh: MeshHandle, ops: MachiningOp[]): void;
}
```

✅ **抽象合理**：返回 `MeshHandle` 而非直接暴露 `THREE.Mesh`  
✅ **渐进式抽象**：只定义当前需要的接口，不过度设计

#### 3. 双模型系统正确应用

```typescript
visual: {
  mesh: simplifiedMesh,  // 简化几何体用于渲染
}

compute: {
  geometry: {
    svgPath: string,
    length: number,
    machiningOps: MachiningOperation[]
  }
}
```

✅ **职责清晰**：Visual 用于渲染，Compute 用于 FEA  
✅ **性能优化**：渲染模型可以 LOD 优化

### 2.2 ⚠️ 需要明确的设计问题

#### 问题 1：SVGPathParser 的位置不合理

**当前设计**：

```typescript
// src/core/renderer/threejs/utils/SVGPathParser.ts
export class SVGPathParser {
  static parseToShape(svgPath: string): THREE.Shape { ... }
}
```

**违背原则**：

- ❌ **违背渲染器抽象原则**：`SVGPathParser` 返回 `THREE.Shape`，直接依赖 Three.js
- ❌ **违背分层原则**：SVG 解析是业务逻辑，不应在 Implementation 层

**正确位置**：

```typescript
// src/core/geometry/SVGPathParser.ts
export interface IShape {
  // 抽象形状接口
}

export class SVGPathParser {
  static parse(svgPath: string): IShape { ... }
}

// src/core/renderer/threejs/ThreeGeometryAdapter.ts
export class ThreeGeometryAdapter {
  static shapeToThreeShape(shape: IShape): THREE.Shape { ... }
}
```

**改进方案**：

- ✅ 在 `core/geometry/` 创建与渲染器无关的几何解析
- ✅ 在 `core/renderer/threejs/adapters/` 创建 Three.js 适配器
- ✅ ProfileInstanceStrategy 使用抽象的 `IShape`，由 Renderer 适配

#### 问题 2：CSG 操作的层级不清晰

**当前设计**：

```typescript
// 文档中未明确 CSG 操作的位置
applyMachiningOperations(mesh, operations);
```

**潜在问题**：

- ⚠️ CSG 操作应该在哪一层执行？
- ⚠️ 是在 Strategy 层还是 Renderer 层？
- ⚠️ 如何保证与渲染器无关？

**建议方案**：

```typescript
// src/core/object/strategies/ProfileInstanceStrategy.ts
class ProfileInstanceStrategy {
  createSceneObject(asset, options): SceneObject {
    // 1. 解析几何（抽象层）
    const baseGeometry = SVGPathParser.parse(asset.crossSection.path);

    // 2. 创建 Compute 模型（完整几何描述）
    const compute = {
      geometry: {
        baseShape: baseGeometry,
        extrusionLength: options.userParams.length,
        machiningOps: options.machiningOps || [],
      },
    };

    // 3. 请求 Renderer 创建 Visual 模型
    const mesh = this.renderer.createExtrudedMesh({
      geometry: baseGeometry,
      length: options.userParams.length,
      machiningOps: options.machiningOps,
      simplified: true, // 简化渲染
    });

    return { id, visual: { mesh }, compute };
  }
}
```

✅ **职责清晰**：

- Strategy 负责组织数据
- Renderer 负责执行具体的 CSG 运算（技术细节）
- Compute 模型保留完整描述（用于 FEA）

#### 问题 3：材质创建的职责不明确

**当前设计**：

```typescript
const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
```

**违背原则**：

- ❌ Strategy 层直接创建 Three.js 材质，违背渲染器抽象

**正确方案**：

```typescript
// Strategy 层只定义抽象材质属性
const materialProps: MaterialProperties = {
  type: 'metal',
  color: 0xcccccc,
  metalness: 0.7,
  roughness: 0.3,
};

// 请求 Renderer 创建材质
const mesh = this.renderer.createExtrudedMesh({
  geometry: baseGeometry,
  material: materialProps, // 抽象属性
});
```

---

## 3. 任务 #13 设计评审（AnchorConstraintSystem.md & Scenarios.md）

### 3.1 ✅ 符合原则的设计

#### 1. 服务职责划分清晰

```typescript
class AnchorService {
  /* 锚点生成与查询 */
}
class SnappingService {
  /* 吸附计算 */
}
class AssemblyService {
  /* 装配创建 */
}
class ConstraintService {
  /* 约束管理 */
}
class ConstraintSolver {
  /* 约束求解 */
}
```

✅ **单一职责**：每个服务职责明确  
✅ **可测试性**：服务可独立单元测试  
✅ **分层合理**：所有服务在 Core 层

#### 2. 数据结构符合双模型原则

```typescript
interface AlignmentPoint {
  id: string;
  position: Vector3; // 轻量级，用于运行时求解
  axis: Vector3;
}

interface HoleAlignment {
  connectorHoleId: string;
  profileId: string;
  targetType: AlignmentType;
  // 完整描述，用于序列化和 FEA
}
```

✅ **性能优化**：运行时使用轻量级 `AlignmentPoint`  
✅ **精度保证**：Compute 层保留完整的 `HoleAlignment` 描述

### 3.2 ❌ 违背原则的设计

#### 严重问题 1：锚点存储位置违背分层原则

**当前设计**：

```typescript
// 锚点在 visual 层缓存（mesh.userData.alignmentCache）
mesh.userData.alignmentCache = alignmentPoints;
```

**违背原则**：

- ❌ **严重违背分层原则**：Core 层的业务数据存储在 Visual 层（Three.js mesh）
- ❌ **耦合渲染库**：锚点数据依赖 Three.js 的 `userData`
- ❌ **难以替换**：切换到 Babylon.js 时锚点数据丢失
- ❌ **测试困难**：单元测试需要创建 Three.js mesh

**正确方案**：

```typescript
// src/core/anchor/AnchorService.ts
class AnchorService {
  private anchorCache = new Map<string, AnchorPoint[]>(); // objectId -> anchors

  generateProfileAnchors(
    profileId: string,
    sceneObject: SceneObject
  ): AnchorPoint[] {
    const anchors = this.computeAnchors(sceneObject);
    this.anchorCache.set(profileId, anchors); // 存储在 Core 层
    return anchors;
  }

  updateAnchorsAfterTransform(objectId: string, transform: Transform): void {
    const anchors = this.anchorCache.get(objectId);
    if (!anchors) return;

    // 更新锚点位置（基于 SceneObject，不依赖 mesh）
    anchors.forEach(anchor => {
      anchor.position = this.transformPoint(anchor.localPosition, transform);
    });
  }
}
```

✅ **分层正确**：锚点数据在 Core 层管理，不依赖渲染库  
✅ **易于测试**：不需要创建 Three.js 对象  
✅ **易于替换**：与渲染器无关

#### 严重问题 2：约束求解器的数据依赖不清晰

**当前设计**：

```typescript
// 文档中提到"运行时使用轻量级 AlignmentPoint"
// 但未明确 AlignmentPoint 从何而来
```

**潜在问题**：

- ⚠️ AlignmentPoint 是从 Visual 模型提取还是从 Compute 模型计算？
- ⚠️ 如果从 Visual 提取，会耦合渲染库
- ⚠️ 如果从 Compute 计算，性能是否足够？

**建议方案**：

```typescript
// src/core/constraint/ConstraintSolver.ts
class ConstraintSolver {
  solve(
    constraints: Constraint[],
    sceneObjects: Map<string, SceneObject>
  ): SolveResult {
    // 1. 从 SceneObject 的 compute 模型提取对齐点（不依赖 Visual）
    const alignmentPoints = this.extractAlignmentPoints(sceneObjects);

    // 2. 求解约束
    const solution = this.runSolver(constraints, alignmentPoints);

    return solution;
  }

  private extractAlignmentPoints(
    sceneObjects: Map<string, SceneObject>
  ): Map<string, AlignmentPoint[]> {
    const result = new Map();

    sceneObjects.forEach((obj, id) => {
      // 从 compute.geometry 提取（不依赖 visual.mesh）
      const anchors = this.computeAnchorsFromGeometry(obj.compute.geometry);
      result.set(id, anchors);
    });

    return result;
  }
}
```

✅ **不依赖渲染器**：从 `SceneObject.compute` 提取锚点  
✅ **性能可控**：按需计算，可缓存到 AnchorService  
✅ **易于测试**：不需要渲染器实例

#### 中等问题 3：AssemblyService 的层级归属不明确

**当前设计**：

```typescript
class AssemblyService {
  // 验证对齐可行性（孔规格、孔/槽是否存在）
  // 生成约束（fixed/sliding 等）并交给 ConstraintService
  // 生成紧固件实例（bolt, t-nut, set-screw）
  // 计算并放置连接件（transform）
  // 创建可视化（ghost bracket, guides）
}
```

**问题**：

- ⚠️ AssemblyService 既负责业务逻辑（约束创建）又负责可视化（ghost bracket）
- ⚠️ 违背单一职责原则
- ⚠️ 可视化逻辑应该在 Features 层或 Renderer

**建议重构**：

```typescript
// src/core/assembly/AssemblyService.ts（Core 层）
class AssemblyService {
  createAssembly(connectorId: string, alignments: HoleAlignment[]): Assembly {
    // 1. 验证对齐可行性
    this.validate(alignments);

    // 2. 生成约束
    const constraints = this.generateConstraints(alignments);

    // 3. 生成紧固件实例
    const fasteners = this.generateFasteners(alignments);

    // 4. 计算连接件位置
    const transform = this.solveTransform(alignments);

    // 5. 返回抽象的 Assembly 对象（不包含可视化）
    return { id, connectorId, alignments, constraints, fasteners, transform };
  }
}

// src/features/designer/services/AssemblyVisualizationService.ts（Features 层）
class AssemblyVisualizationService {
  showPreview(assembly: Assembly): void {
    // 创建 ghost bracket（半透明预览）
    const ghostMesh = this.renderer.createPreview(assembly);

    // 显示辅助线和尺寸标注
    this.showAlignmentGuides(assembly);
  }
}
```

✅ **职责清晰**：AssemblyService 纯业务逻辑，可视化在 Features 层  
✅ **分层正确**：Core 不依赖渲染  
✅ **可测试**：业务逻辑可独立测试

#### 轻微问题 4：事件通信机制未明确

**当前设计**：

```
文档中未说明各服务之间如何通信
```

**潜在问题**：

- ⚠️ AnchorService、ConstraintService 等是否发布事件？
- ⚠️ 如果发布事件，是否符合通信分层规则？

**建议明确**：

```typescript
// Core 层服务：通过回调报告状态变化
class ConstraintService {
  public onConstraintAdded?: (constraint: Constraint) => void;
  public onConstraintSolved?: (result: SolveResult) => void;

  addConstraint(constraint: Constraint): void {
    // ... 添加逻辑
    this.onConstraintAdded?.(constraint); // 回调报告
  }
}

// Features 层：连接回调与 EventBus
class ConstraintManager {
  constructor(private constraintService: ConstraintService) {
    // 连接回调与事件发布
    this.constraintService.onConstraintAdded = constraint => {
      publishState('state:constraint:added', { constraint });
    };
  }
}
```

✅ **符合通信分层规则**：Core 通过回调，Features 发布事件  
✅ **易于替换**：Core 不依赖 EventBus  
✅ **清晰架构**：每层使用合适的通信方式

---

## 4. 场景分析文档评审（AnchorConstraintScenarios.md）

### 4.1 ✅ 优秀的设计

✅ **全面的场景分析**：覆盖了 6 大类场景（装配、编辑、冲突、性能、交互、一致性）  
✅ **问题驱动**：识别了 4 个关键问题（孔规格、深度、求解失败、遮挡）  
✅ **多方案对比**：每个问题提供 2-3 个解决方案  
✅ **技术细节充分**：包含评分函数、容差管理、FEA 考虑

### 4.2 ⚠️ 建议补充

建议增加以下内容：

1. **性能场景的具体指标**
   - 大量约束：多少个约束算"大量"？100? 1000?
   - 实时拖拽：目标帧率？60 FPS？
   - 建议：添加性能基准和降级策略

2. **撤销/重做的实现细节**
   - 约束状态如何序列化？
   - 撤销时如何恢复约束求解状态？
   - 建议：设计 Command 模式支持撤销/重做

3. **与现有架构的集成**
   - 这些服务如何注册到 CoreServiceProvider？
   - 是否需要新的生命周期管理？
   - 建议：明确与 ObjectManager、AssetService 的交互

---

## 5. 总体评价

### 5.1 设计优点

1. ✅ **第一性原理抽象**：T-slot + Hole 的物理原子抽象非常精准
2. ✅ **策略模式正确应用**：ProfileInstanceStrategy 符合开闭原则
3. ✅ **双模型系统贯彻**：Visual/Compute 分离清晰
4. ✅ **场景分析全面**：考虑了实际使用中的各种问题
5. ✅ **技术选型合理**：svg-path-parser、three-bvh-csg 都是成熟方案

### 5.2 需要改进的设计（按严重程度）

#### 🔴 严重违背原则（必须修改）

1. **锚点数据存储在 mesh.userData**
   - 违背：分层原则、渲染器抽象原则
   - 影响：难以测试、难以替换渲染器
   - 修改：移到 AnchorService 管理

2. **SVGPathParser 返回 THREE.Shape**
   - 违背：渲染器抽象原则
   - 影响：业务逻辑耦合 Three.js
   - 修改：创建抽象 IShape 和 Adapter

#### 🟡 中等问题（建议优化）

3. **AssemblyService 职责过重**
   - 违背：单一职责原则
   - 影响：可测试性下降
   - 修改：拆分业务逻辑和可视化

4. **约束求解器数据来源不清晰**
   - 违背：分层原则（如果依赖 Visual）
   - 影响：潜在的耦合风险
   - 修改：明确从 Compute 模型提取

#### 🟢 轻微问题（可考虑）

5. **事件通信机制未明确**
   - 影响：可能违背通信分层规则
   - 修改：使用回调模式，由 Features 层发布事件

6. **性能指标和降级策略缺失**
   - 影响：大规模场景下可能性能不足
   - 修改：补充性能基准和优化策略

---

## 6. 推荐的修改优先级

### Phase 1: 修复严重违背原则的设计（本周）

- [ ] 重构锚点存储：从 mesh.userData 移到 AnchorService
- [ ] 创建几何抽象层：IShape 接口 + ThreeGeometryAdapter
- [ ] 明确 CSG 操作层级：Strategy 组织数据，Renderer 执行

### Phase 2: 优化中等问题（下周）

- [ ] 拆分 AssemblyService：业务逻辑 vs 可视化
- [ ] 明确约束求解数据来源：从 Compute 模型提取
- [ ] 设计事件通信机制：回调模式 + EventBus

### Phase 3: 补充轻微问题（迭代优化）

- [ ] 添加性能基准和测试
- [ ] 设计 Command 模式支持撤销/重做
- [ ] 文档化与现有架构的集成方式

---

## 7. 修改后的架构草图

### 7.1 几何处理层级（任务 #5, #9）

```
┌─────────────────────────────────────────────────┐
│ Core Layer (业务逻辑)                            │
│                                                 │
│ core/geometry/                                  │
│   ├─ SVGPathParser.ts      (IShape)            │
│   ├─ GeometryDescriptor.ts (抽象几何描述)       │
│   └─ MachiningOperation.ts (加工操作定义)       │
│                                                 │
│ core/object/strategies/                         │
│   └─ ProfileInstanceStrategy.ts                 │
│       - 解析 SVG -> IShape                      │
│       - 创建 Compute 模型                       │
│       - 请求 Renderer 创建 Visual               │
└─────────────────────────────────────────────────┘
              ↓ 回调
┌─────────────────────────────────────────────────┐
│ Renderer Layer (技术实现)                       │
│                                                 │
│ core/renderer/threejs/                          │
│   ├─ ThreeGeometryAdapter.ts                   │
│   │   - IShape -> THREE.Shape                  │
│   ├─ ThreeCSGService.ts                        │
│   │   - 执行 three-bvh-csg 运算                │
│   └─ ThreeRenderer.ts                          │
│       - createExtrudedMesh()                   │
│       - applyMachiningOps()                    │
└─────────────────────────────────────────────────┘
```

### 7.2 锚点约束层级（任务 #13）

```
┌─────────────────────────────────────────────────┐
│ Core Layer (业务逻辑)                            │
│                                                 │
│ core/anchor/                                    │
│   ├─ AnchorService.ts                          │
│   │   - anchorCache: Map<objectId, Anchor[]>  │
│   │   - generateAnchors(sceneObject)          │
│   │   - updateAnchors(transform)              │
│   │   - onAnchorsUpdated?: callback           │
│   │                                            │
│   └─ SnappingService.ts                        │
│       - calculateSnap(position, config)       │
│       - onSnapOccurred?: callback             │
│                                                 │
│ core/assembly/                                  │
│   └─ AssemblyService.ts                        │
│       - createAssembly(alignments)            │
│       - validate(alignments)                  │
│       - onAssemblyCreated?: callback          │
│                                                 │
│ core/constraint/                                │
│   ├─ ConstraintService.ts                     │
│   │   - addConstraint(constraint)             │
│   │   - onConstraintAdded?: callback          │
│   │                                            │
│   └─ ConstraintSolver.ts                      │
│       - solve(constraints, sceneObjects)      │
│       - extractAlignmentPoints(compute)       │
└─────────────────────────────────────────────────┘
              ↓ 回调
┌─────────────────────────────────────────────────┐
│ Features Layer (业务协调 + 事件发布)             │
│                                                 │
│ features/designer/services/                     │
│   ├─ AnchorManager.ts                          │
│   │   - 连接 AnchorService 回调 -> EventBus   │
│   │   - publishState('state:anchor:...')      │
│   │                                            │
│   ├─ AssemblyVisualizationService.ts          │
│   │   - showPreview(assembly)                 │
│   │   - showAlignmentGuides()                 │
│   │                                            │
│   └─ ConstraintManager.ts                     │
│       - 连接 ConstraintService 回调 -> EventBus│
└─────────────────────────────────────────────────┘
              ↓ EventBus
┌─────────────────────────────────────────────────┐
│ UI Layer (组件)                                 │
│                                                 │
│   - AnchorVisualizer (显示锚点标记)             │
│   - SnappingIndicator (显示吸附反馈)            │
│   - ConstraintAnnotation (显示约束标注)         │
└─────────────────────────────────────────────────┘
```

---

## 8. 结论

当前的临时设计文档展现了扎实的第一性原理思考和全面的场景分析，但在**分层架构**和**渲染器抽象**两个核心原则上存在若干违背。主要问题集中在：

1. **数据存储位置不当**（锚点存储在 mesh.userData）
2. **技术实现泄漏到业务层**（SVGPathParser 返回 THREE.Shape）
3. **职责边界模糊**（AssemblyService 兼顾业务和可视化）

这些问题如果不修正，将导致：

- 难以替换渲染器（耦合 Three.js）
- 难以单元测试（依赖渲染器实例）
- 代码难以维护（职责混乱）

**建议**：在开始实现前，先完成 Phase 1 的设计修正，确保架构清晰后再编码。这将节省大量返工时间，并保证代码质量。

---

**下一步行动**：

1. 讨论并确认设计修正方案
2. 更新临时文档中的设计
3. 创建接口定义和类型（TypeScript）
4. 开始 Phase 1 实现（任务 #5）
