# 参数化实体生成系统设计

> **文档状态**: 临时设计文档（待审核）  
> **创建日期**: 2025-12-13  
> **关联任务**: Task 5 (ProfileInstanceStrategy), Task 9 (Machining Operations)

---

## 1. 概述

参数化实体生成系统负责将型材资产（ProfileAsset）转换为可渲染和可计算的3D实体。系统基于**双模型架构**，同时支持高性能渲染和高精度FEA分析。

### 1.1 核心目标

- ✅ 从SVG截面路径生成真实的3D型材几何体
- ✅ 支持实时交互式长度调整（WYSIWYG）
- ✅ 支持加工操作（打孔、倒角、攻丝等）
- ✅ 分离渲染模型（简化）和计算模型（完整）
- ✅ 支持欧洲标准型材（包含圆弧截面）

### 1.2 架构原则

**第一性原理**：

- 型材 = 截面（SVG Path） + 长度（Length）
- 加工操作 = CSG布尔运算（减法）

**双模型分离**：

- **Visual模型**：简化几何体，用于实时渲染（60 FPS）
- **Compute模型**：完整几何描述，用于FEA分析（离线）

---

## 2. SVG截面解析

### 2.1 技术选型

**选择**: `svg-path-parser` 库

**原因**：

- ✅ 支持完整的SVG Path命令（M, L, C, A, Z等）
- ✅ 支持圆弧（Arc）- 欧洲型材需求
- ✅ TypeScript友好，有完整类型定义
- ✅ 成熟稳定，广泛使用

**替代方案**（不采用）：

- ❌ 手动解析：无法处理贝塞尔曲线和圆弧
- ❌ `parse-svg-path`：功能较弱，无TypeScript支持

### 2.2 解析流程

```typescript
// src/core/renderer/threejs/utils/SVGPathParser.ts
import parseSVGPath from 'svg-path-parser';
import * as THREE from 'three';

export class SVGPathParser {
  /**
   * 将SVG路径字符串转换为Three.js Shape
   * @param svgPath SVG路径字符串（如 "M0,0 L20,0 L20,20 L0,20 Z"）
   * @returns THREE.Shape 实例
   */
  static parseToShape(svgPath: string): THREE.Shape {
    const commands = parseSVGPath(svgPath);
    const shape = new THREE.Shape();

    commands.forEach((cmd, index) => {
      switch (cmd.code) {
        case 'M': // MoveTo
          shape.moveTo(cmd.x, cmd.y);
          break;

        case 'L': // LineTo
          shape.lineTo(cmd.x, cmd.y);
          break;

        case 'C': // CubicBezierCurve
          shape.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          break;

        case 'A': // Arc（欧洲型材关键）
          shape.absarc(
            cmd.x,
            cmd.y,
            cmd.rx, // 半径
            this.calculateStartAngle(cmd),
            this.calculateEndAngle(cmd),
            !cmd.sweep
          );
          break;

        case 'Z': // ClosePath
          shape.closePath();
          break;
      }
    });

    return shape;
  }

  /**
   * 验证SVG路径是否闭合
   */
  static isClosedPath(svgPath: string): boolean {
    return svgPath.trim().toUpperCase().endsWith('Z');
  }
}
```

### 2.3 示例数据

```typescript
// 2020型材截面示例
const profile2020SVG = `
  M 0,0 
  L 20,0 
  L 20,20 
  L 0,20 
  Z
`;

// 欧洲型材（带圆角）
const europeanProfileSVG = `
  M 0,2 
  A 2,2 0 0,1 2,0
  L 18,0
  A 2,2 0 0,1 20,2
  L 20,18
  A 2,2 0 0,1 18,20
  L 2,20
  A 2,2 0 0,1 0,18
  Z
`;
```

---

## 3. 拉伸几何体生成

### 3.1 IRenderer接口扩展

```typescript
// src/core/renderer/renderer-types.ts

/**
 * 拉伸参数
 */
export interface ExtrusionParams {
  /** SVG截面路径 */
  svgPath: string;

  /** 拉伸长度（mm） */
  length: number;

  /** 是否生成简化模型（用于渲染） */
  simplified?: boolean;

  /** 材质参数 */
  material?: {
    color?: number;
    metalness?: number;
    roughness?: number;
  };
}

/**
 * 网格句柄（抽象引用）
 */
export interface MeshHandle {
  id: string;
  type: 'mesh';
}

/**
 * 渲染器接口（扩展）
 */
export interface IRenderer {
  // ... 现有方法 ...

  /**
   * 创建拉伸网格
   * @param params 拉伸参数
   * @returns 网格句柄（抽象引用，不暴露Three.js细节）
   */
  createExtrudedMesh(params: ExtrusionParams): MeshHandle;

  /**
   * 更新拉伸网格的长度
   * @param mesh 网格句柄
   * @param newLength 新长度（mm）
   */
  updateExtrudedMeshLength(mesh: MeshHandle, newLength: number): void;

  /**
   * 应用加工操作（CSG减法）
   * @param mesh 网格句柄
   * @param operations 加工操作列表
   */
  applyMachiningOperations(
    mesh: MeshHandle,
    operations: MachiningOperation[]
  ): void;
}
```

### 3.2 ThreeRenderer实现

```typescript
// src/core/renderer/threejs/ThreeRenderer.ts

export class ThreeRenderer implements IRenderer {
  private meshes = new Map<string, THREE.Mesh>();

  createExtrudedMesh(params: ExtrusionParams): MeshHandle {
    // 1. 解析SVG路径
    const shape = SVGPathParser.parseToShape(params.svgPath);

    // 2. 创建拉伸几何体
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: params.length,
      bevelEnabled: false,
      steps: params.simplified ? 1 : 10, // 简化模式：少分段
      curveSegments: params.simplified ? 8 : 32, // 简化模式：少曲线段
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 3. 优化几何体
    if (params.simplified) {
      geometry.computeVertexNormals(); // 平滑法线
    } else {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }

    // 4. 创建材质
    const material = new THREE.MeshStandardMaterial({
      color: params.material?.color || 0xcccccc,
      metalness: params.material?.metalness || 0.8,
      roughness: params.material?.roughness || 0.2,
      side: THREE.DoubleSide,
    });

    // 5. 创建网格
    const mesh = new THREE.Mesh(geometry, material);

    // 6. 存储和返回句柄
    const handle: MeshHandle = {
      id: this.generateMeshId(),
      type: 'mesh',
    };

    this.meshes.set(handle.id, mesh);
    this.scene.add(mesh);

    return handle;
  }

  updateExtrudedMeshLength(mesh: MeshHandle, newLength: number): void {
    const threeMesh = this.meshes.get(mesh.id);
    if (!threeMesh) return;

    const geometry = threeMesh.geometry as THREE.ExtrudeGeometry;

    // 方案A：缩放Z轴（快速但不精确）
    const currentDepth = geometry.parameters.depth;
    const scale = newLength / currentDepth;
    threeMesh.scale.z = scale;

    // 方案B：重建几何体（精确但慢）
    // const newGeometry = this.rebuildExtrudeGeometry(geometry, newLength);
    // threeMesh.geometry.dispose();
    // threeMesh.geometry = newGeometry;
  }
}
```

---

## 4. ProfileInstanceStrategy更新

### 4.1 注入IRenderer

```typescript
// src/core/object/strategies/ProfileInstanceStrategy.ts

export class ProfileInstanceStrategy implements InstanceStrategy {
  constructor(
    private renderer: IRenderer // ✅ 注入渲染器接口
  ) {}

  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.PROFILE;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    const profileAsset = asset as ProfileAsset;
    const length =
      options.userParams.length || profileAsset.defaultLength || 1000;

    // ✅ 调用渲染器创建拉伸网格
    const visualMesh = this.renderer.createExtrudedMesh({
      svgPath: profileAsset.crossSection.svgPath,
      length,
      simplified: true, // 渲染用简化模型
    });

    // ✅ Compute模型：完整描述（不生成网格）
    const computeGeometry: ExtrudedProfileGeometry = {
      type: 'extruded_profile',
      crossSection: profileAsset.crossSection.svgPath,
      length,
      machiningOps: options.machiningOps || [],
      material: profileAsset.material,
    };

    // ✅ 返回SceneObject（双模型）
    return {
      id: this.generateId(),
      name: options.name || profileAsset.name,
      assetId: profileAsset.id,
      assetType: AssetType.PROFILE,
      transform: options.transform || {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: { length },
      machiningOps: options.machiningOps || [],

      // Visual模型（简化）
      visual: {
        mesh: visualMesh, // MeshHandle（抽象引用）
        isVisible: true,
      },

      // Compute模型（完整）
      compute: {
        geometry: computeGeometry,
        material: profileAsset.material,
        connections: [],
        mass: this.calculateMass(profileAsset, length),
      },

      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    const profileAsset = asset as ProfileAsset;
    const newLength = sceneObject.userParams.length as number;

    // ✅ 更新Visual模型
    this.renderer.updateExtrudedMeshLength(
      sceneObject.visual.mesh as MeshHandle,
      newLength
    );

    // ✅ 更新Compute模型
    const computeGeom = sceneObject.compute.geometry as ExtrudedProfileGeometry;
    computeGeom.length = newLength;
    computeGeom.machiningOps = sceneObject.machiningOps;

    sceneObject.metadata.updatedAt = new Date();
  }
}
```

---

## 5. 实时交互式长度调整

### 5.1 ExtrusionGizmo控制器

```typescript
// src/core/renderer/threejs/ThreeExtrusionGizmo.ts

export class ThreeExtrusionGizmo implements IExtrusionGizmo {
  private lengthHandle: THREE.Mesh; // 端面拖拽手柄
  private dimensionLabel: THREE.Sprite; // 尺寸标注
  private currentObjectId: string | null = null;

  // 回调函数（向上层报告）
  public onLengthChanging?: (length: number) => void;
  public onLengthChanged?: (finalLength: number) => void;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera
  ) {
    this.createLengthHandle();
    this.createDimensionLabel();
  }

  private createLengthHandle(): void {
    // 创建球形手柄
    this.lengthHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
      })
    );

    this.lengthHandle.userData.draggable = true;
    this.lengthHandle.userData.type = 'extrusion-handle';
  }

  attachToObject(objectId: string, nativeObject: unknown): void {
    this.currentObjectId = objectId;
    const mesh = nativeObject as THREE.Mesh;

    // 计算端面位置
    const bbox = new THREE.Box3().setFromObject(mesh);
    const endPosition = new THREE.Vector3(0, 0, bbox.max.z);

    this.lengthHandle.position.copy(endPosition);
    this.scene.add(this.lengthHandle);
  }

  onDrag(delta: THREE.Vector3): void {
    if (!this.currentObjectId) return;

    // 计算新长度
    const newLength = this.lengthHandle.position.z;

    // 🔑 实时回调（高频，节流处理）
    this.onLengthChanging?.(newLength);

    // 更新尺寸标注
    this.updateDimensionLabel(newLength);
  }

  onDragEnd(): void {
    if (!this.currentObjectId) return;

    const finalLength = this.lengthHandle.position.z;

    // 🔑 完成回调（低频）
    this.onLengthChanged?.(finalLength);
  }

  detach(): void {
    this.scene.remove(this.lengthHandle);
    this.currentObjectId = null;
  }
}
```

### 5.2 ExtrusionService（Feature层）

```typescript
// src/features/designer/services/ExtrusionService.ts

export class ExtrusionService {
  private extrusionGizmo: IExtrusionGizmo;

  constructor(
    private renderer: IRenderer,
    private renderSync: RenderSyncService
  ) {
    this.extrusionGizmo = renderer.createExtrusionGizmo();
    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    // 拖拽中（高频）- 节流处理
    this.extrusionGizmo.onLengthChanging = throttle((length: number) => {
      publishState('state:extrusion:lengthChanging', { length });
    }, 16); // 60 FPS

    // 拖拽完成（低频）
    this.extrusionGizmo.onLengthChanged = (finalLength: number) => {
      publishCommand('command:extrusion:updateLength', { length: finalLength });
    };
  }

  startInteractiveExtrusion(profileId: string): void {
    const nativeObject = this.renderSync.getNativeObject(profileId);
    this.extrusionGizmo.attachToObject(profileId, nativeObject);

    publishState('state:extrusion:interactive', { active: true });
  }

  confirmLength(profileId: string, length: number): void {
    // 提交到ObjectManager（持久化）
    publishCommand('command:object:updateParams', {
      objectId: profileId,
      params: { length },
    });

    this.extrusionGizmo.detach();
    publishState('state:extrusion:interactive', { active: false });
  }
}
```

### 5.3 性能优化策略

**方案A：缩放变换（推荐用于实时预览）**

```typescript
// 优点：极快（O(1)）
// 缺点：不精确（影响截面形状）
mesh.scale.z = newLength / originalLength;
```

**方案B：顶点增量更新**

```typescript
// 优点：精确
// 缺点：较慢（O(n)，n=顶点数）
const vertices = geometry.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
  vertices[i + 2] *= newLength / originalLength;
}
geometry.attributes.position.needsUpdate = true;
```

**方案C：重建几何体**

```typescript
// 优点：最精确
// 缺点：最慢（完全重建）
const newGeometry = new THREE.ExtrudeGeometry(shape, { depth: newLength });
mesh.geometry.dispose();
mesh.geometry = newGeometry;
```

**推荐策略**：

- 实时拖拽：使用方案A（缩放）
- 确认后：使用方案C（重建）

---

## 6. 加工操作系统（CSG）

### 6.1 技术选型

**选择**: `three-bvh-csg` 库

**原因**：

- ✅ 基于BVH（边界体积层次）的高性能CSG
- ✅ 与Three.js深度集成
- ✅ 支持Union、Subtract、Intersect操作
- ✅ 活跃维护，性能优异

### 6.2 加工操作类型

```typescript
// src/core/object/types/machining.ts

export enum MachiningOpType {
  HOLE = 'hole', // 打孔
  THREAD = 'thread', // 攻丝
  CHAMFER = 'chamfer', // 倒角
  SLOT = 'slot', // 开槽
  CUTOUT = 'cutout', // 镂空
}

export interface MachiningOperation {
  id: string;
  type: MachiningOpType;
  position: Vector3; // 加工位置
  params: Record<string, unknown>;
}

// 打孔操作
export interface HoleOperation extends MachiningOperation {
  type: MachiningOpType.HOLE;
  params: {
    diameter: number; // 孔径（mm）
    depth: number; // 深度（mm）
    isThrough: boolean; // 是否贯穿
  };
}

// 攻丝操作
export interface ThreadOperation extends MachiningOperation {
  type: MachiningOpType.THREAD;
  params: {
    diameter: number;
    depth: number;
    threadSpec: 'M3' | 'M4' | 'M5' | 'M6' | 'M8';
  };
}
```

### 6.3 CSG实现

```typescript
// src/core/renderer/threejs/ThreeRenderer.ts

import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';

export class ThreeRenderer implements IRenderer {
  private csgEvaluator = new Evaluator();

  applyMachiningOperations(
    meshHandle: MeshHandle,
    operations: MachiningOperation[]
  ): void {
    const mesh = this.meshes.get(meshHandle.id);
    if (!mesh) return;

    // 转换为Brush（CSG对象）
    const baseBrush = new Brush(mesh.geometry);

    operations.forEach(op => {
      switch (op.type) {
        case MachiningOpType.HOLE:
          this.applyHole(baseBrush, op as HoleOperation);
          break;
        case MachiningOpType.CHAMFER:
          this.applyChamfer(baseBrush, op);
          break;
      }
    });

    // 执行CSG运算
    const result = this.csgEvaluator.evaluate(baseBrush, new Brush());

    // 更新网格
    mesh.geometry.dispose();
    mesh.geometry = result;
  }

  private applyHole(brush: Brush, op: HoleOperation): void {
    // 创建圆柱体作为减去的几何体
    const holeGeometry = new THREE.CylinderGeometry(
      op.params.diameter / 2,
      op.params.diameter / 2,
      op.params.depth,
      32
    );

    const holeBrush = new Brush(holeGeometry);
    holeBrush.position.copy(op.position);
    holeBrush.updateMatrixWorld();

    // 执行减法运算
    this.csgEvaluator.evaluate(brush, holeBrush, SUBTRACTION, brush);
  }
}
```

---

## 7. 双模型数据流

### 7.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    SceneObject                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐         ┌─────────────────┐      │
│  │  Visual Model   │         │  Compute Model  │      │
│  │  (轻量级)        │         │  (完整描述)      │      │
│  ├─────────────────┤         ├─────────────────┤      │
│  │ mesh: Handle    │         │ geometry: {     │      │
│  │   (简化网格)     │         │   type: 'ext..' │      │
│  │ isVisible: true │         │   crossSection  │      │
│  │                 │         │   length        │      │
│  │ 用途:            │         │   machiningOps  │      │
│  │ - 实时渲染       │         │   material }    │      │
│  │ - 约束求解       │         │                 │      │
│  │                 │         │ 用途:            │      │
│  │ 大小:            │         │ - FEA分析       │      │
│  │ ~1KB            │         │ - 精确计算       │      │
│  └─────────────────┘         │                 │      │
│                              │ 大小:            │      │
│                              │ ~100 bytes      │      │
│                              └─────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 7.2 使用场景

**场景1：实时渲染**

```typescript
// 使用 visual.mesh
renderer.render(sceneObjects.map(obj => obj.visual.mesh));
```

**场景2：约束求解**

```typescript
// 使用 visual.mesh 的变换信息
const position = getMeshPosition(sceneObject.visual.mesh);
constraintSolver.solve(position, targetPosition);
```

**场景3：FEA导出**

```typescript
// 使用 compute.geometry
const feaData = sceneObjects.map(obj => ({
  crossSection: obj.compute.geometry.crossSection,
  length: obj.compute.geometry.length,
  machiningOps: obj.compute.geometry.machiningOps,
  material: obj.compute.material,
}));
```

---

## 8. 实现优先级

### Phase 1: 基础拉伸（核心功能）

- [ ] SVGPathParser实现（支持M, L, C, A, Z）
- [ ] IRenderer.createExtrudedMesh接口
- [ ] ThreeRenderer.createExtrudedMesh实现
- [ ] ProfileInstanceStrategy更新（使用IRenderer）
- [ ] 单元测试（矩形、圆角矩形）

### Phase 2: 实时交互

- [ ] ThreeExtrusionGizmo实现（拖拽手柄）
- [ ] ExtrusionService实现（回调处理）
- [ ] UI面板（长度输入 + 拖拽按钮）
- [ ] 性能优化（缩放vs重建）

### Phase 3: 加工操作

- [ ] 集成three-bvh-csg库
- [ ] 实现打孔操作（圆柱减法）
- [ ] 实现倒角操作（圆锥减法）
- [ ] 实现攻丝操作（螺纹纹理）
- [ ] 加工操作UI

### Phase 4: 高级功能

- [ ] LOD优化（距离自适应）
- [ ] 网格缓存（避免重复生成）
- [ ] 批量加工操作
- [ ] 加工操作撤销/重做

---

## 9. 性能指标

| 指标                | 目标值           | 测试场景             |
| ------------------- | ---------------- | -------------------- |
| 单个型材生成时间    | < 50ms           | 2020型材, 1000mm长度 |
| 实时拖拽帧率        | 60 FPS           | 10个型材同时显示     |
| 加工操作响应        | < 200ms          | 单个打孔操作         |
| 内存占用（Visual）  | < 1KB/对象       | 简化网格             |
| 内存占用（Compute） | < 100 bytes/对象 | 参数描述             |

---

## 10. 技术风险与缓解

| 风险                     | 影响         | 缓解措施                     |
| ------------------------ | ------------ | ---------------------------- |
| SVG解析失败（复杂路径）  | 型材无法生成 | 预处理验证 + 降级到矩形      |
| CSG性能差（复杂加工）    | 操作卡顿     | 异步处理 + 进度提示          |
| 内存泄漏（几何体未释放） | 浏览器崩溃   | 生命周期管理 + dispose()     |
| 圆弧解析错误（欧洲型材） | 截面变形     | svg-path-parser库 + 单元测试 |

---

## 11. 参考资料

- [Three.js ExtrudeGeometry文档](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)
- [svg-path-parser GitHub](https://github.com/hughsk/svg-path-parser)
- [three-bvh-csg GitHub](https://github.com/gkjohnson/three-bvh-csg)
- [SVG Path Specification](https://www.w3.org/TR/SVG/paths.html)
