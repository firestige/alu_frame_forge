# 铝型材框架设计器 - 素材管理架构设计

## 文档信息

- **文档版本**: 1.0.0
- **创建日期**: 2025-11-08
- **作者**: GitHub Copilot & 项目团队
- **状态**: 已实施

## 目录

1. [背景与目标](#背景与目标)
2. [核心概念](#核心概念)
3. [架构设计](#架构设计)
4. [实现细节](#实现细节)
5. [技术优势](#技术优势)
6. [使用指南](#使用指南)
7. [未来扩展](#未来扩展)

---

## 背景与目标

### 项目背景

本项目是一个类 CAD 的铝型材框架设计器，用户可以使用预置的铝型材、紧固件、连接件等素材搭建各种框架结构。核心商业价值在于：

1. **所见即所得设计**：直观的 3D 可视化设计体验
2. **智能计算分析**：提供计算机辅助静力分析和干涉检测增值服务
3. **用户自定义**：支持用户导入自己的型材截面

### 设计目标

本次重构聚焦于**素材管理系统**，需要解决以下核心问题：

1. **数据分层**：区分素材定义（Asset）和场景实例（SceneObject）
2. **参数化建模**：铝型材通过截面拉伸，紧固件/连接件支持参数化变体
3. **双模型系统**：渲染用简化模型 + FEA 计算用完整描述
4. **加工操作**：支持打孔、切角、攻丝等操作，影响 FEA 和装配约束
5. **序列化**：支持工程文件保存（轻量）和 CAD 导出（完整）
6. **可扩展性**：易于新增素材类型和功能

---

## 核心概念

### 1. 素材（Asset）

**定义**：素材是模板或定义，描述"什么是一个 20x20 型材"或"什么是 M5 螺栓"。

**特点**：

- 只存储元数据和参数定义，不包含实例数据
- 分为内置素材和用户自定义素材
- 支持参数化定义

**类型层次**：

```
Asset (基类)
├── ProfileAsset (铝型材)
│   ├── crossSection (截面定义)
│   ├── material (材料属性)
│   └── supportedOperations (支持的加工操作)
├── FastenerAsset (紧固件)
│   ├── parameters (参数定义)
│   ├── variants (模型变体)
│   └── computeParamsMap (FEA 参数映射)
├── ConnectorAsset (连接件)
│   └── 类似 FastenerAsset
└── AccessoryAsset (配件)
    └── modelPath (静态模型)
```

### 2. 场景对象（SceneObject）

**定义**：场景对象是素材的实例化，是场景中真实存在的实体。

**特点**：

- 包含用户参数（长度、规格等）
- 包含变换信息（位置、旋转、缩放）
- 支持加工操作（仅型材）
- 采用双模型系统

**双模型系统**：

```typescript
SceneObject {
  visual: {
    mesh: Three.js Mesh  // 简化的渲染模型
    isVisible: boolean
  },
  compute: {
    geometry: ComputeGeometry  // 完整的 FEA 几何描述
    material: MaterialProperties
    connections: Connection[]
    mass: number
  }
}
```

**设计意图**：

- **渲染模型**：性能优化，使用简化几何 + LOD + 贴图
- **计算模型**：精度优先，包含完整参数和材料属性

### 3. 加工操作（MachiningOperation）

**定义**：对型材进行的后处理操作，影响几何和强度。

**类型**：

| 操作类型  | 说明 | 参数示例               |
| --------- | ---- | ---------------------- |
| `HOLE`    | 打孔 | 孔径、深度、位置、面   |
| `CHAMFER` | 切角 | 倒角长度、角度、边     |
| `THREAD`  | 攻丝 | 螺纹规格、深度、位置   |
| `NOTCH`   | 槽口 | 宽度、深度、长度、形状 |

**影响范围**：

1. **FEA 计算**：孔和槽口会降低截面强度
2. **装配约束**：螺纹孔用于连接紧固件
3. **渲染**（可选）：可以选择在渲染中显示细节

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Layer (UI)                        │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  DesignerPage    │         │  LibraryPage     │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
└───────────┼─────────────────────────────┼────────────────────┘
            │                             │
┌───────────┼─────────────────────────────┼────────────────────┐
│           │    Service Layer            │                    │
│  ┌────────▼─────────┐         ┌────────▼─────────┐         │
│  │PlacementService  │         │ AssetImporter    │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│  ┌────────▼─────────┐                                       │
│  │  ModelFactory    │◄──────── Strategies                  │
│  │  (策略模式核心)  │          ├─ ProfileInstanceStrategy  │
│  └────────┬─────────┘          ├─ FastenerInstanceStrategy │
│           │                     └─ ConnectorInstanceStrategy│
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────┼──────────────────────────────────────────────────┐
│           │    Core Layer                                    │
│  ┌────────▼─────────┐         ┌──────────────────┐         │
│  │ AssetRegistry    │         │  SceneIO         │         │
│  │ (素材注册表)     │         │  (序列化)       │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ ObjectManager    │         │  RendererCore    │         │
│  │ (对象管理)       │         │  (Three.js)      │         │
│  └──────────────────┘         └──────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### 数据流

#### 1. 素材放置流程

```
用户从素材库拖拽
    ↓
PlacementService.start(asset)
    ↓
创建 Placeholder（占位符）
    ↓
显示参数面板
    ↓
用户填写参数（长度、规格等）
    ↓
PlacementService.confirm()
    ↓
返回 SceneObjectCreateOptions
    ↓
ModelFactory.createFromAsset(assetId, options)
    ↓
选择合适的 InstanceStrategy
    ↓
Strategy.createSceneObject()
    ├─ 创建渲染模型（visual.mesh）
    └─ 创建计算模型（compute.geometry）
    ↓
返回完整的 SceneObject
    ↓
ObjectManager.add(sceneObject)
```

#### 2. 工程文件保存流程

```
用户点击保存
    ↓
获取所有 SceneObject
    ↓
ProjectSerializer.serialize(objects, metadata)
    ↓
生成 ProjectFileFormat (JSON)
    ├─ objects: [ { assetId, userParams, transform, machiningOps }, ... ]
    └─ connections: [ ... ]
    ↓
保存到本地或云端
```

#### 3. CAD 导出流程

```
用户点击导出
    ↓
获取所有 SceneObject
    ↓
CADExporter.export(objects, projectName)
    ↓
生成 CADExportFormat (JSON)
    ├─ objects: [ { geometry (完整), material, transform, mass }, ... ]
    └─ connections: [ { type, objects, parameters }, ... ]
    ↓
发送到服务端进行 FEA 分析
```

---

## 实现细节

### 1. 类型系统

#### 枚举定义 (`types/enums.ts`)

```typescript
export const AssetType = {
  PROFILE: 'profile', // 铝型材
  FASTENER: 'fastener', // 紧固件
  CONNECTOR: 'connector', // 连接件
  ACCESSORY: 'accessory', // 配件
} as const;

export const AssetSource = {
  BUILTIN: 'builtin', // 内置
  CUSTOM: 'custom', // 自定义
} as const;

export const MachiningOpType = {
  HOLE: 'hole',
  CHAMFER: 'chamfer',
  THREAD: 'thread',
  NOTCH: 'notch',
} as const;
```

#### 素材类型 (`types/asset.ts`)

**ProfileAsset 示例**：

```typescript
interface ProfileAsset extends Asset {
  type: AssetType.PROFILE;
  crossSection: {
    svgPath: string;
    width: number;
    height: number;
    wallThickness: number;
    area: number;
    momentOfInertia: { Ix: number; Iy: number };
  };
  material: {
    name: string; // "6063-T5"
    yieldStrength: number; // 160 MPa
    density: number; // 2700 kg/m³
    elasticModulus: number; // 69000 MPa
  };
  supportedOperations: MachiningOpType[];
}
```

**FastenerAsset 示例**：

```typescript
interface FastenerAsset extends Asset {
  type: AssetType.FASTENER;
  family: FastenerFamily; // 'bolt' | 'nut' | 'washer' | 'screw'
  parameters: {
    diameter: EnumParameterDef<'M5' | 'M6' | 'M8'>;
    length: RangeParameterDef;
    threadPitch: EnumParameterDef<'coarse' | 'fine'>;
  };
  variants: {
    'M5-coarse': {
      baseModel: '/models/fasteners/M5-bolt-coarse.glb';
      adjustableParams: ['length'];
    };
    // ...
  };
  computeParamsMap: (userParams) => FEAFastenerParams;
}
```

### 2. 策略模式实现

#### 策略接口

```typescript
interface InstanceStrategy {
  canHandle(asset: AnyAsset): boolean;
  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject;
  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void;
}
```

#### 型材策略

```typescript
class ProfileInstanceStrategy implements InstanceStrategy {
  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.PROFILE;
  }

  createSceneObject(asset: ProfileAsset, options): SceneObject {
    const length = options.userParams.length as number;

    // 1. 创建渲染网格（简化）
    const visualMesh = geometryFactory.createExtrudedProfile(
      asset.crossSection.svgPath,
      length,
      true // simplified
    );

    // 2. 创建计算几何（完整）
    const computeGeometry: ExtrudedProfileGeometry = {
      type: 'extruded_profile',
      crossSection: asset.crossSection.svgPath,
      length,
      machiningOps: options.machiningOps || [],
      material: asset.material,
    };

    // 3. 计算质量
    const volume = asset.crossSection.area * length; // mm³
    const mass = (asset.material.density * volume) / 1e9; // kg

    return {
      // ... SceneObject 构建
      visual: { mesh: visualMesh, isVisible: true },
      compute: { geometry: computeGeometry, material: asset.material, mass },
    };
  }
}
```

#### 紧固件策略

```typescript
class FastenerInstanceStrategy implements InstanceStrategy {
  createSceneObject(asset: FastenerAsset, options): SceneObject {
    // 1. 选择变体
    const variantKey = `${options.userParams.diameter}-${options.userParams.threadPitch}`;
    const variant = asset.variants[variantKey];

    // 2. 加载基础模型（可能需要程序化调整长度）
    const visualMesh = modelLoader.load(variant.baseModel);

    // 3. 生成 FEA 参数（不需要完整几何）
    const feaParams = asset.computeParamsMap(options.userParams);
    const computeGeometry: ParametricFastenerGeometry = {
      type: 'parametric_fastener',
      params: { fastenerType: asset.family, ...feaParams },
    };

    return {
      // ... SceneObject 构建
      visual: { mesh: visualMesh, isVisible: true },
      compute: { geometry: computeGeometry, connections: [], mass: 0.01 },
    };
  }
}
```

### 3. 序列化系统

#### 工程文件格式（轻量）

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "我的书架",
    "createdAt": "2025-11-08T10:30:00Z",
    "modifiedAt": "2025-11-08T11:45:00Z"
  },
  "objects": [
    {
      "id": "profile-001",
      "assetId": "20-2020",
      "assetSource": "builtin",
      "userParams": { "length": 1000 },
      "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0, "XYZ"] },
      "machiningOps": [
        {
          "type": "hole",
          "position": 100,
          "parameters": { "diameter": 5, "depth": -1, "face": "top" }
        }
      ]
    }
  ]
}
```

**特点**：

- 体积小（只存引用 + 参数）
- 人类可读/可编辑
- 依赖 AssetRegistry（Asset 必须存在）

#### CAD 导出格式（完整）

```json
{
  "version": "1.0.0",
  "units": "mm",
  "objects": [
    {
      "id": "profile-001",
      "type": "extruded_profile",
      "geometry": {
        "crossSection": "M 0,0 L 20,0 L 20,20 ...",
        "length": 1000,
        "machiningOps": [ ... ]
      },
      "material": {
        "name": "6063-T5",
        "yieldStrength": 160,
        "density": 2700,
        "elasticModulus": 69000
      },
      "mass": 0.54
    },
    {
      "id": "fastener-001",
      "type": "fastener",
      "params": {
        "fastenerType": "bolt",
        "diameter": "M5",
        "length": 20,
        "material": "steel"
      }
    }
  ],
  "connections": [
    {
      "type": "bolted",
      "objects": ["profile-001", "fastener-001"],
      "parameters": { "preload": 50 }
    }
  ]
}
```

**特点**：

- 自包含（包含完整几何和材料数据）
- 适合 FEA/CAD 引擎解析
- 体积大
- 不适合人类编辑

---

## 技术优势

### 1. 分层清晰

| 层次        | 职责       | 好处                   |
| ----------- | ---------- | ---------------------- |
| Asset       | 素材定义   | 避免数据冗余，支持共享 |
| SceneObject | 场景实例   | 独立管理实例状态       |
| Strategy    | 实例化逻辑 | 解耦类型特定逻辑       |

### 2. 策略模式的优势

**对比工厂模式**：

| 方面       | 工厂模式 (if/switch) | 策略模式 (策略注册) |
| ---------- | -------------------- | ------------------- |
| 扩展性     | ❌ 需修改工厂代码    | ✅ 只需添加新策略类 |
| 单一职责   | ❌ 工厂类臃肿        | ✅ 每个策略独立     |
| 测试性     | 🟡 需测试整个工厂    | ✅ 策略可独立测试   |
| 运行时扩展 | ❌ 不支持            | ✅ 可动态注册策略   |

**代码对比**：

```typescript
// ❌ 工厂模式
class ModelFactory {
  create(asset: Asset) {
    switch (asset.type) {
      case 'profile':
        return createProfile(asset);
      case 'fastener':
        return createFastener(asset);
      // 新增类型需修改这里
    }
  }
}

// ✅ 策略模式
class ModelFactory {
  private strategies = new Map<AssetType, Strategy>();

  registerStrategy(type, strategy) {
    this.strategies.set(type, strategy);
  }

  create(asset: Asset) {
    const strategy = this.strategies.get(asset.type);
    return strategy.createSceneObject(asset);
  }
}

// 新增类型只需添加策略，无需修改 ModelFactory
factory.registerStrategy(AssetType.NEW_TYPE, new NewTypeStrategy());
```

### 3. 双模型系统的优势

**性能与精度的平衡**：

```typescript
// 渲染用：简化几何
visual: {
  mesh: SimplifiedMesh,  // 低多边形 + LOD + 贴图
  vertices: 1000         // 少量顶点
}

// 计算用：完整描述
compute: {
  geometry: {
    type: 'extruded_profile',
    crossSection: DetailedSVG,  // 完整截面
    machiningOps: [...]          // 所有加工操作
  },
  material: { yieldStrength, elasticModulus, ... }
}
```

**好处**：

1. **渲染性能**：简化模型支持大量对象的流畅渲染
2. **计算精度**：完整描述保证 FEA 分析准确性
3. **灵活切换**：可根据需要选择性更新

### 4. 参数化的优势

**紧固件变体管理**：

```typescript
// 传统方案：每个规格一个文件（爆炸式增长）
models/
  M5-bolt-10mm.glb
  M5-bolt-20mm.glb
  M5-bolt-30mm.glb
  M6-bolt-10mm.glb
  ...  (数百个文件)

// 参数化方案：基础模型 + 程序调整
variants: {
  'M5-coarse': {
    baseModel: 'M5-bolt-coarse.glb',  // 仅 1 个文件
    adjustableParams: ['length']       // 程序化调整长度
  }
}
```

**好处**：

- 减少模型文件数量（几百个 → 几十个）
- 降低存储成本
- 便于批量更新

### 5. 类型安全

**TypeScript 类型推导**：

```typescript
// ✅ 类型安全的参数定义
const profileAsset: ProfileAsset = {
  type: AssetType.PROFILE,
  parameters: {
    length: {
      type: ParameterType.RANGE,
      min: 100,
      max: 3000,
      default: 1000,
    },
  },
};

// ✅ 编译时检查
const length: number = sceneObject.userParams.length; // OK

// ❌ 编译时错误
const invalid: string = sceneObject.userParams.length; // Error!
```

---

## 使用指南

### 1. 初始化系统

```typescript
// 1. 创建核心服务
const assetRegistry = new AssetRegistry();
const modelFactory = new ModelFactory(assetRegistry);

// 2. 注册策略
modelFactory.registerStrategy(
  AssetType.PROFILE,
  new ProfileInstanceStrategy(geometryFactory)
);
modelFactory.registerStrategy(
  AssetType.FASTENER,
  new FastenerInstanceStrategy(modelLoader)
);
modelFactory.registerStrategy(
  AssetType.CONNECTOR,
  new ConnectorInstanceStrategy(modelLoader)
);

// 3. 加载内置素材
const builtinAssets = await loadBuiltinAssets();
assetRegistry.registerBatch(builtinAssets);
```

### 2. 放置素材

```typescript
// 1. 开始放置
const placementService = new PlacementService();
const asset = assetRegistry.get('20-2020');
const placeholder = placementService.start(asset);

// 2. 用户设置参数
placementService.updateParameters({ length: 1000 });

// 3. 确认创建
const options = placementService.confirm();
if (options) {
  const sceneObject = modelFactory.createFromAsset(asset.id, options);
  objectManager.add(sceneObject);
}
```

### 3. 添加加工操作

```typescript
import { createHoleOperation, MachiningOpType } from '@/core/object/types';

// 在型材上打孔
const holeOp = createHoleOperation(100, {
  diameter: 5,
  depth: -1, // 通孔
  face: 'top',
  angle: 90,
});

sceneObject.machiningOps.push(holeOp);

// 更新几何体
modelFactory.updateGeometry(sceneObject);
```

### 4. 保存和导出

```typescript
// 保存工程文件
const serializer = new ProjectSerializer();
const projectData = serializer.serialize(sceneObjects, {
  name: '我的书架',
  author: '张三',
});
const json = serializer.toJSON(projectData);
localStorage.setItem('project', json);

// 导出 CAD 文件
const exporter = new CADExporter();
const cadData = exporter.export(sceneObjects, '我的书架');
const cadJson = exporter.toJSON(cadData);

// 发送到服务端进行 FEA 分析
await fetch('/api/fea/analyze', {
  method: 'POST',
  body: cadJson,
});
```

### 5. 导入用户自定义型材

```typescript
// 用户上传 DXF 文件
const dxfFile = event.target.files[0];
const svgPath = await parseDXFToSVG(dxfFile);

// 创建自定义素材
const customAsset: ProfileAsset = {
  id: generateId(),
  name: '用户自定义型材',
  type: AssetType.PROFILE,
  source: AssetSource.CUSTOM,
  crossSection: {
    svgPath,
    width: 25,
    height: 25,
    wallThickness: 2,
    area: 200,
  },
  material: {
    name: '6063-T5',
    yieldStrength: 160,
    density: 2700,
    elasticModulus: 69000,
  },
  supportedOperations: [MachiningOpType.HOLE, MachiningOpType.CHAMFER],
};

// 注册到素材库
assetRegistry.register(customAsset);
```

---

## 未来扩展

### 1. 短期计划（1-3 个月）

#### 1.1 完善加工操作

```typescript
// 支持更多加工类型
export const MachiningOpType = {
  // ... 现有类型
  GROOVE: 'groove', // 开槽
  COUNTERBORE: 'counterbore', // 沉孔
  TAP: 'tap', // 攻丝（锥度螺纹）
};

// 加工操作预设模板
const templates = {
  m5ThreadHole: createThreadOperation(0, {
    spec: 'M5',
    depth: 15,
    face: 'top',
  }),
};
```

#### 1.2 智能捕捉和对齐

```typescript
class SnappingService {
  // 自动捕捉到其他对象的端点、中点
  snap(position: Vector3): Vector3;

  // 自动对齐到轴线
  alignToAxis(position: Vector3): Vector3;

  // 自动建立连接关系
  suggestConnections(object: SceneObject): Connection[];
}
```

### 2. 中期计划（3-6 个月）

#### 2.1 装配约束系统

```typescript
// 定义装配关系
const constraint: AssemblyConstraint = {
  type: 'mate',
  objects: ['profile-001', 'profile-002'],
  faces: ['front', 'back'],
  offset: 0,
};

// 自动求解装配
constraintSolver.solve(sceneObjects, constraints);
```

#### 2.2 材料库扩展

```typescript
// 支持更多材料
const materialLibrary = {
  aluminum: {
    '6063-T5': { ... },
    '6061-T6': { ... },
    '7075-T6': { ... },  // 高强度铝合金
  },
  steel: {
    'Q235': { ... },
    '304-stainless': { ... },
  },
};

// 用户可自定义材料
materialLibrary.addCustom({
  name: '碳纤维复合材料',
  yieldStrength: 600,
  density: 1600,
  elasticModulus: 230000,
});
```

### 3. 长期计划（6-12 个月）

#### 3.1 协作功能

```typescript
// 实时协作
class CollaborationService {
  // 多人同时编辑
  shareProject(projectId: string): void;

  // 冲突解决
  resolveConflict(localChanges, remoteChanges): void;

  // 变更历史
  getHistory(): Change[];
  revertTo(changeId: string): void;
}
```

#### 3.2 AI 辅助设计

```typescript
// AI 推荐设计
class AIAssistant {
  // 根据需求生成初步设计
  generateDesign(requirements: {
    type: '书架' | '工作台' | '框架';
    dimensions: { width; height; depth };
    loadCapacity: number;
  }): SceneObject[];

  // 优化现有设计
  optimize(
    sceneObjects: SceneObject[],
    goals: {
      minimizeWeight?: boolean;
      maximizeStrength?: boolean;
      minimizeCost?: boolean;
    }
  ): SceneObject[];

  // 检测问题
  detectIssues(sceneObjects: SceneObject[]): Issue[];
}
```

#### 3.3 BOM 和成本估算

```typescript
class BOMGenerator {
  generate(sceneObjects: SceneObject[]): BillOfMaterials {
    return {
      materials: [
        { name: '20x20 铝型材', length: 5000, quantity: 4, unitPrice: 15 },
        { name: 'M5x20 螺栓', quantity: 16, unitPrice: 0.5 },
        // ...
      ],
      totalCost: 120.5,
      estimatedWeight: 3.2, // kg
      machiningCost: 35.0,
    };
  }
}
```

---

## 总结

本次架构重构实现了一个**灵活、可扩展、类型安全**的素材管理系统。核心创新包括：

1. **双模型系统**：平衡渲染性能和计算精度
2. **策略模式**：支持无限扩展新素材类型
3. **参数化建模**：减少数据冗余，提高灵活性
4. **加工操作**：支持完整的设计到制造流程
5. **双序列化格式**：满足不同场景需求

这套架构为后续功能扩展（装配约束、AI 辅助、协作等）奠定了坚实基础。

---

## 附录

### 相关文件清单

```
src/core/object/
├── types/
│   ├── enums.ts              # 枚举定义
│   ├── parameters.ts         # 参数系统
│   ├── asset.ts              # Asset 类型
│   ├── machining.ts          # 加工操作
│   ├── scene-object.ts       # SceneObject 类型
│   └── index.ts              # 统一导出
├── strategies/
│   ├── InstanceStrategy.ts   # 策略接口
│   ├── ProfileInstanceStrategy.ts
│   ├── FastenerInstanceStrategy.ts
│   ├── ConnectorInstanceStrategy.ts
│   └── index.ts
├── AssetRegistry.new.ts      # 素材注册表
├── ModelFactory.new.ts       # 模型工厂
└── SceneIO.new.ts            # 序列化系统

src/features/designer/services/
└── PlacementService.new.ts   # 放置服务
```

### 参考资料

- [Three.js 文档](https://threejs.org/docs/)
- [策略模式 - Refactoring Guru](https://refactoring.guru/design-patterns/strategy)
- [TypeScript 高级类型](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [FEA 有限元分析基础](https://en.wikipedia.org/wiki/Finite_element_method)

---

**版权声明**: 本文档为项目内部技术文档，未经许可不得外传。
