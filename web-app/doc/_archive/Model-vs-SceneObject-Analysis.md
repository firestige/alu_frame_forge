# Model 与 SceneObject 类型对比分析

## 概述

`Model<TMetadata>` 和 `SceneObject` 是两代架构中表示场景实例的核心类型。它们之间是**演进关系**而非继承关系，`SceneObject` 是对 `Model` 的完全重新设计。

## 设计哲学差异

### Model（旧架构）
- **单一模型思想**: 一个对象只有一个渲染表示
- **通用泛型**: 使用 `TMetadata` 泛型支持任意元数据
- **扁平结构**: 所有属性都在顶层
- **渲染耦合**: `renderObject` 直接引用渲染对象

### SceneObject（新架构）
- **双模型思想**: 分离 Visual（渲染）和 Compute（计算）两个表示
- **Asset 关联**: 通过 `assetId` 关联 Asset 定义
- **结构化**: 使用 `Transform` 聚合变换信息
- **渲染解耦**: Visual 和 Compute 是独立的模型层

---

## 详细对比

### 1. 基本标识

| 属性 | Model | SceneObject | 说明 |
|------|-------|-------------|------|
| `id` | ✅ `string` | ✅ `string` | 唯一标识符，相同 |
| `name` | ✅ `string` | ✅ `string` | 对象名称，相同 |
| **类型标识** | `type: ModelType` | `assetType: AssetType` | 改名且枚举值不同 |
| **Asset 关联** | ❌ 无 | ✅ `assetId: string`<br>`assetSource: AssetSource` | 新增：明确关联 Asset 定义 |

**关键差异**:
- `Model.type` 是简单的枚举值（`ALUMINUM_PROFILE`, `CONNECTOR`, `PANEL`, `CUSTOM`）
- `SceneObject.assetType` + `assetId` 形成更完整的身份系统，支持从 Asset 重建实例

---

### 2. 变换信息（Transform）

#### Model（扁平结构）
```typescript
interface Model {
  position: Vector3;   // 直接在顶层
  rotation: Euler;     // 直接在顶层
  scale: Vector3;      // 直接在顶层
}
```

#### SceneObject（聚合结构）
```typescript
interface SceneObject {
  transform: Transform;  // 聚合为一个对象
}

interface Transform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}
```

**优势**:
- ✅ 语义更清晰，`transform` 是一个完整的概念
- ✅ 便于整体传递和更新
- ✅ 便于序列化和反序列化
- ✅ 符合图形学和游戏引擎的标准做法（Unity/Unreal 都是这样）

---

### 3. 参数系统

| Model | SceneObject | 区别 |
|-------|-------------|------|
| `parameters: ModelParameters` | `userParams: Record<string, unknown>` | 名称更直观 |
| 预定义字段：<br>`length?`, `width?`, `height?`, `thickness?` | 完全动态，由 Asset 定义决定 | 更灵活 |
| `[key: string]: unknown` 索引签名 | 纯粹的字典类型 | 类型更纯粹 |

**示例对比**:

```typescript
// Model 方式
const model: Model = {
  parameters: {
    length: 1000,
    width: 40,
    customProp: 'value'  // 允许但没有类型提示
  }
};

// SceneObject 方式
const sceneObject: SceneObject = {
  userParams: {
    length: 1000,      // 对于型材
    diameter: 'M5',    // 对于紧固件
    threadType: 'coarse'
  }
};
```

**优势**:
- `userParams` 名称更准确（这些是用户可修改的参数）
- 不再有预定义字段的限制，完全由 Asset 定义
- 配合 Asset 的 `defaultParams` 可以实现类型提示

---

### 4. 渲染表示（核心差异）

#### Model（单一渲染模型）
```typescript
interface Model {
  renderObject: unknown;    // 直接的渲染对象引用
  isVisible: boolean;       // 可见性在顶层
}
```

#### SceneObject（双模型系统）
```typescript
interface SceneObject {
  visual: VisualModel;      // 渲染用的简化模型
  compute: ComputeModel;    // FEA/干涉检测用的完整模型
}

interface VisualModel {
  mesh: unknown;            // Three.js Mesh
  isVisible: boolean;       // 可见性在 visual 内部
  lodLevel?: number;        // LOD 优化
}

interface ComputeModel {
  geometry: ComputeGeometry;  // 完整的几何描述
  material?: MaterialProperties;
  connections: Connection[];
  mass?: number;
}
```

**架构优势**:
1. **职责分离**: 渲染和计算是两个独立的关注点
2. **性能优化**: Visual 可以用低精度网格，Compute 用高精度
3. **支持 FEA**: Compute 包含完整的物理属性（材料、质量、连接）
4. **LOD 支持**: Visual 支持多级细节优化

---

### 5. 加工操作（新增）

| Model | SceneObject |
|-------|-------------|
| ❌ 不支持 | ✅ `machiningOps: MachiningOperation[]` |

**SceneObject 支持的加工操作**:
```typescript
interface MachiningOperation {
  id: string;
  type: 'hole' | 'chamfer' | 'thread' | 'notch';
  position: Vector3;
  parameters: Record<string, unknown>;
}
```

**应用场景**:
- 型材上钻孔、倒角、攻丝、开槽
- 这些操作会影响 ComputeModel 的几何和 FEA 分析
- VisualModel 可以选择性显示（性能优化）

---

### 6. 元数据（Metadata）

#### Model（泛型）
```typescript
interface Model<TMetadata = Record<string, unknown>> {
  metadata: TMetadata;  // 类型安全的泛型
  createdAt: Date;
  updatedAt: Date;
}
```

#### SceneObject（固定结构）
```typescript
interface SceneObject {
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;  // 扩展字段
  };
}
```

**差异分析**:
- Model 使用泛型 `<TMetadata>` 提供编译时类型安全
- SceneObject 使用固定结构 + 索引签名，更简单但类型安全性降低
- 时间戳在 SceneObject 中并入 metadata，更统一

---

## 架构演进的动机

### 为什么要从 Model 迁移到 SceneObject？

#### 1. 支持 FEA 分析（首要原因）
- **Model**: 只有渲染表示，无法进行力学分析
- **SceneObject**: `ComputeModel` 包含完整的几何、材料、连接信息

#### 2. Asset 与 Instance 分离
- **Model**: 没有明确的 Asset 概念，每个实例都是独立的
- **SceneObject**: 通过 `assetId` 关联 Asset，支持：
  - 从 Asset 创建实例
  - 修改 Asset 影响所有实例
  - 共享 Asset 的默认参数和材质

#### 3. 更清晰的数据模型
- **Model**: 扁平结构，属性混杂在一起
- **SceneObject**: 
  - `transform` 聚合变换
  - `visual` 和 `compute` 分离关注点
  - `userParams` 明确参数的性质

#### 4. 支持加工操作
- **Model**: 不支持参数化加工
- **SceneObject**: `machiningOps` 支持钻孔、倒角等操作

#### 5. 扩展性
- **Model**: 添加新属性需要修改核心接口
- **SceneObject**: 通过 Asset 系统扩展新类型

---

## 迁移映射表

如何从 Model 迁移到 SceneObject：

| Model 属性 | SceneObject 等价物 | 转换方式 |
|-----------|-------------------|---------|
| `id` | `id` | 直接映射 |
| `name` | `name` | 直接映射 |
| `type` | `assetType` | 枚举值需要映射 |
| `position` | `transform.position` | 包装到 transform |
| `rotation` | `transform.rotation` | 包装到 transform |
| `scale` | `transform.scale` | 包装到 transform |
| `renderObject` | `visual.mesh` | 包装到 visual |
| `isVisible` | `visual.isVisible` | 移动到 visual |
| `parameters` | `userParams` | 重命名 |
| `metadata` | `metadata` | 时间戳并入 |
| `createdAt` | `metadata.createdAt` | 移动到 metadata |
| `updatedAt` | `metadata.updatedAt` | 移动到 metadata |

**新增必须提供的字段**:
- `assetId`: 从 Asset 注册表获取
- `assetSource`: `BUILTIN` 或 `CUSTOM`
- `machiningOps`: 初始为空数组 `[]`
- `compute`: 需要生成计算模型

---

## 代码示例对比

### 创建对象

#### Model 方式
```typescript
const model: Model = {
  id: 'obj_001',
  name: '铝型材',
  type: ModelType.ALUMINUM_PROFILE,
  renderObject: mesh,
  isVisible: true,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
  scale: { x: 1, y: 1, z: 1 },
  parameters: { length: 1000 },
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

#### SceneObject 方式
```typescript
const sceneObject: SceneObject = {
  id: 'obj_001',
  name: '铝型材',
  assetId: 'profile_2020',
  assetSource: AssetSource.BUILTIN,
  assetType: AssetType.PROFILE,
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    scale: { x: 1, y: 1, z: 1 },
  },
  userParams: { length: 1000 },
  machiningOps: [],
  visual: {
    mesh: mesh,
    isVisible: true,
  },
  compute: {
    geometry: {
      type: 'extruded_profile',
      crossSection: 'M 0,0 L 20,0 L 20,20 L 0,20 Z',
      length: 1000,
      machiningOps: [],
      material: { /* ... */ },
    },
    material: { /* ... */ },
    connections: [],
  },
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
```

### 更新位置

#### Model 方式
```typescript
model.position.x = 100;
renderer.updateObjectTransform(model.renderObject, {
  position: model.position,
});
```

#### SceneObject 方式
```typescript
sceneObject.transform.position.x = 100;
renderer.updateObjectTransform(sceneObject.visual.mesh, {
  position: sceneObject.transform.position,
});
```

---

## 总结

### 关系定位
- **不是继承关系**: SceneObject 不是 Model 的子类或扩展
- **是演进关系**: SceneObject 是对 Model 的重新设计和完全替代
- **是架构升级**: 从单一模型到双模型，从通用泛型到 Asset 系统

### 核心改进
1. ✅ **双模型系统**: Visual + Compute 分离渲染和计算
2. ✅ **Asset 系统**: 明确 Asset 定义和 SceneObject 实例的关系
3. ✅ **结构化**: Transform 聚合，视觉和计算分离
4. ✅ **扩展性**: 支持加工操作、连接关系、FEA 分析
5. ✅ **类型清晰**: `userParams` 比 `parameters` 语义更明确

### 代价
1. ⚠️ **复杂度增加**: 从 10 个字段增加到更多嵌套结构
2. ⚠️ **泛型丢失**: 失去了 `<TMetadata>` 的编译时类型安全
3. ⚠️ **迁移成本**: 需要更新所有使用 Model 的代码

### 适用场景
- **Model**: 简单的 3D 查看器，不需要物理分析
- **SceneObject**: CAD 软件、FEA 分析、参数化设计、装配约束

当前项目是铝型材框架设计器，需要支持 FEA 和干涉检测，因此选择 **SceneObject 架构是正确的决策**。
