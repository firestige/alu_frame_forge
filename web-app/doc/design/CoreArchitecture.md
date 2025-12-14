# 核心架构设计

**最后更新**: 2025-12-05

本文档详细说明铝型材框架设计器的核心架构设计，包括分层架构、服务容器、事件驱动模式和依赖规则。

---

## 1. 分层架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                  App Layer (应用入口)                         │
│                    main.tsx                                  │
│              ┌─────────────────────┐                         │
│              │ CoreServiceProvider │ ← 应用级服务容器        │
│              └──────────┬──────────┘                         │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                  Pages Layer (路由入口)                       │
│                 pages/DesignerPage.tsx                       │
│                 pages/LibraryPage.tsx                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│           Features Layer (业务功能模块)                       │
│                                                              │
│  features/designer/                                          │
│  ├─ ui/ (UI 组件)                                            │
│  ├─ hooks/ (业务逻辑 Hooks)                                  │
│  ├─ services/ (业务服务层)                                   │
│  ├─ stores/ (Zustand 状态)                                   │
│  └─ context/ (Context Provider)                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│              Core Layer (核心能力层)                          │
│                                                              │
│  core/CoreServiceProvider.tsx ⭐ - 应用级服务容器            │
│  │ ├─ ObjectManager       - 场景对象管理（单例）            │
│  │ ├─ AssetService        - 资产服务（单例）                │
│  │ ├─ EventBus            - 事件总线（单例）                │
│  │ └─ AutoSaveService     - 自动保存服务（单例）⭐          │
│                                                              │
│  core/asset/               - 资产模板管理                    │
│  │ ├─ AssetRegistry.ts    - 素材注册表                      │
│  │ ├─ AssetService.ts     - 业务 API                        │
│  │ └─ types/              - Asset 类型定义                  │
│                                                              │
│  core/object/              - 场景对象管理                    │
│  │ ├─ ObjectManager.ts    - 对象生命周期                    │
│  │ ├─ ModelFactory.ts     - 策略模式工厂                    │
│  │ ├─ SceneIO.ts          - 序列化/反序列化                 │
│  │ ├─ entities/           - SceneObject 实体                │
│  │ └─ strategies/         - 实例化策略                      │
│                                                              │
│  core/renderer/            - 渲染器抽象                      │
│  │ ├─ renderer-types.ts   - IRenderer 接口                  │
│  │ └─ threejs/            - Three.js 实现                   │
│                                                              │
│  core/services/            - 核心服务                        │
│  │ ├─ eventBus.ts         - 事件总线（mitt）                │
│  │ ├─ storage.ts          - 持久化                          │
│  │ ├─ queryService.ts     - 数据查询                        │
│  │ └─ AutoSaveService.ts  - 自动保存 ⭐                     │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **应用级服务容器** ⭐
   - Core 服务在 App 层初始化，路由切换时保持状态
   - 解决了路由切换导致场景对象丢失的问题（2025-11-15 重大修复）

2. **分层解耦**
   - App → Pages → Features → Core，单向依赖
   - Core 层不依赖 Features 层

3. **事件驱动**
   - 通过 Event Bus 实现模块间通信
   - 避免直接依赖，降低耦合

4. **策略模式**
   - 支持多种资产类型的灵活扩展（Profile/Fastener/Connector/Accessory）
   - 新增资产类型无需修改工厂代码

5. **Context Provider**
   - 业务状态通过 Context 传递
   - UI 状态使用 Props

6. **双模型系统**
   - Visual（渲染模型）：简化 Mesh，用于高性能渲染
   - Compute（计算模型）：完整几何描述，用于 FEA 分析

---

## 2. CoreServiceProvider - 应用级服务容器

### 2.1 核心问题

**问题背景**（2025-11-14 发现）：

- 路由切换（`/designer` ↔ `/library`）导致场景对象丢失
- 根本原因：ObjectManager 在 Features 层创建，随组件卸载而销毁
- 违反架构原则：Core 层服务不应在 Features 层创建

### 2.2 解决方案

**架构调整**：在 `main.tsx` 使用 `CoreServiceProvider` 包裹 `RouterProvider`

```tsx
// src/main.tsx
<CoreServiceProvider>
  <RouterProvider router={routes} />
</CoreServiceProvider>
```

**服务接口**：

```typescript
interface CoreServices {
  objectManager: ObjectManager; // 场景对象管理（持久化）
  assetService: AssetService; // 资产服务（持久化）
  eventBus: Emitter<Events>; // 事件总线（持久化）
  autoSave: AutoSaveService; // 自动保存服务（持久化）
}
```

**实现要点**：

1. **单例模式**：`useRef` 存储服务实例，避免重复创建
2. **动态导入**：使用动态 import 避免循环依赖（`designerProjectStore`）
3. **闭包缓存**：缓存 `getProjectId` 函数，减少重复查询
4. **生命周期管理**：`useEffect` 初始化 AutoSaveService，`dispose()` 清理资源

### 2.3 使用方式

```tsx
// Pages/Features 层访问服务
const { objectManager, assetService, autoSave } = useCoreServices();

// 操作场景对象
objectManager.addObject(sceneObject);
objectManager.getAllObjects();
```

**优势**：

- ✅ 路由切换时数据不丢失（内存持久化）
- ✅ 配合 AutoSaveService 实现 localStorage 持久化
- ✅ 符合分层架构原则（Core 在 App 层初始化）

---

## 3. 事件驱动架构

### 3.1 事件总线

使用 `mitt` 库实现轻量级事件总线：

```typescript
// src/core/services/eventBus.ts
import mitt from 'mitt';

export type Events = {
  // 命令事件（Command）
  'command:create:profile': { assetId: string };
  'command:placement:start': { asset: AnyAsset };
  'command:placement:confirm': void;

  // 状态事件（State）
  'state:placement:started': void;
  'state:placement:updated': { previewPosition: Vector3 };
  'state:object:added': { objectId: string };
};

export const designerEventBus = mitt<Events>();
```

### 3.2 事件分类

#### Command 事件（命令）

- **发送方**：UI 层（用户操作）
- **接收方**：业务服务层（PlacementController、CreationService）
- **命名规范**：`command:<domain>:<action>`
- **示例**：
  - `command:create:profile` - 创建型材命令
  - `command:placement:start` - 开始放置命令
  - `command:model:delete` - 删除模型命令

#### State 事件（状态通知）

- **发送方**：业务服务层、ObjectManager
- **接收方**：UI 层（更新显示）、其他服务（同步状态）
- **命名规范**：`state:<domain>:<event>`
- **示例**：
  - `state:placement:started` - 放置模式已启动
  - `state:object:added` - 对象已添加到场景
  - `state:object:updated` - 对象属性已更新

### 3.3 使用模式

```typescript
// 发送命令
sendCommand('command:placement:start', { asset });

// 监听状态
onState('state:object:added', ({ objectId }) => {
  console.log('Object added:', objectId);
});

// 清理监听
useEffect(() => {
  const handler = () => {
    /* ... */
  };
  designerEventBus.on('state:placement:started', handler);

  return () => {
    designerEventBus.off('state:placement:started', handler);
  };
}, []);
```

### 3.4 通信原则与分层规则 ⭐

**核心原则**：不同层级使用不同的通信方式

```
┌─────────────────────────────────────────────────────┐
│  UI Layer ↔ Feature/Core Layer                      │
│  通信方式: EventBus (mitt)                          │
│  - UI 发送命令事件 (command:*)                      │
│  - Core/Feature 发布状态事件 (state:*)              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Core Interface ↔ Implementation Layer              │
│  通信方式: 直接调用 + 回调函数                      │
│  - Feature 调用 Interface 方法                      │
│  - Implementation 通过回调向上报告                  │
└─────────────────────────────────────────────────────┘
```

**案例：TransformController 架构重构（2025-12-05）**

**问题**：Implementation 层（`ThreeTransformController`）直接使用 EventBus 发布事件

```typescript
// ❌ 错误：Implementation 层依赖 EventBus
import { publishState } from '@/core/services/eventBus';

private onDraggingChanged = (event): void => {
  publishState('state:transform:draggingChanged', { dragging: true });
};
```

**为什么错误？**

1. 违反分层原则：Implementation 层不应知道业务层的事件系统
2. 不利于替换：切换到 Babylon.js 也要依赖同样的 EventBus
3. 职责混乱：技术实现层不应发布业务状态

**正确方案**：使用回调模式

```typescript
// ✅ 接口层定义回调
export interface ITransformController {
  onDraggingChanged?: (dragging: boolean) => void;
  onTransformCompleted?: (data: TransformData) => void;
  // ... 其他方法
}

// ✅ Implementation 层通过回调报告
class ThreeTransformController implements ITransformController {
  public onDraggingChanged?: (dragging: boolean) => void;
  public onTransformCompleted?: (data: TransformData) => void;

  private handleDraggingChanged = (event): void => {
    // 通过回调向上报告，不直接用 EventBus
    this.onDraggingChanged?.(dragging);
  };
}

// ✅ Feature 层设置回调并发布 EventBus 事件
class TransformService {
  private setupControllerCallbacks(): void {
    const controller = this.renderer.getTransformController();

    // 在这里连接回调和 EventBus
    controller.onDraggingChanged = dragging => {
      publishState('state:transform:draggingChanged', { dragging });
    };
  }
}
```

**通信流程**：

```
Implementation Layer (ThreeTransformController)
  ↓ 回调函数 (this.onDraggingChanged?.())
Feature Layer (TransformService)
  ↓ publishState('state:transform:...')
EventBus
  ↓ onState('state:transform:...')
UI Layer (Toolbar, StatusBar)
```

**设计收益**：

1. ✅ **分层清晰**：每层使用适合的通信方式
2. ✅ **易于替换**：Implementation 层不依赖具体的 EventBus 实现
3. ✅ **职责单一**：技术实现只关注技术细节，业务层负责事件发布
4. ✅ **可测试性**：可以 mock 回调函数进行单元测试

**其他符合此原则的模块**：

- ✅ `SelectionService` - 通过回调报告选中状态变化
- ✅ `CameraController` - 通过回调报告视角变化
- ✅ `HighlightService` - 直接调用渲染器方法，不使用 EventBus

详细实施记录见：`doc/design/Task3-Refactoring-2025-12-05.md`

---

## 4. 策略模式工厂

### 4.1 设计动机

**传统工厂模式的问题**：

- 每次新增素材类型需要修改 `switch-case`
- 违反开闭原则（Open-Closed Principle）
- 难以扩展用户自定义素材

**策略模式解决方案**：

```typescript
// 策略接口
interface InstanceStrategy {
  canHandle(asset: AnyAsset): boolean;
  createInstance(asset: AnyAsset, options: CreateOptions): SceneObject;
}

// ModelFactory 通过策略注册表创建实例
class ModelFactory {
  private strategies: InstanceStrategy[] = [];

  registerStrategy(strategy: InstanceStrategy): void {
    this.strategies.push(strategy);
  }

  createFromAsset(asset: AnyAsset, options: CreateOptions): SceneObject {
    const strategy = this.strategies.find(s => s.canHandle(asset));
    if (!strategy) throw new Error('No strategy found');
    return strategy.createInstance(asset, options);
  }
}
```

### 4.2 内置策略

- **StubProfileStrategy** - 临时实现，返回简单立方体（用于验证流程）
- **ProfileInstanceStrategy** - 型材策略（截面拉伸，待实现）
- **FastenerInstanceStrategy** - 紧固件策略（参数化螺栓/螺母）
- **ConnectorInstanceStrategy** - 连接件策略（角件、支架）

### 4.3 扩展方式

```typescript
// 新增自定义策略
class CustomPanelStrategy implements InstanceStrategy {
  canHandle(asset: AnyAsset): boolean {
    return (
      asset.type === AssetType.ACCESSORY && asset.id.startsWith('custom-panel')
    );
  }

  createInstance(asset: AnyAsset, options: CreateOptions): SceneObject {
    // 自定义创建逻辑
  }
}

// 注册到工厂
modelFactory.registerStrategy(new CustomPanelStrategy());
```

**优势**：

1. **开闭原则**：新增素材类型无需修改 ModelFactory
2. **单一职责**：每个策略类专注一种类型
3. **可测试性**：策略可独立单元测试
4. **运行时扩展**：支持动态注册用户自定义策略

---

## 5. 依赖规则

### 5.1 允许的依赖 ✅

- **Pages → Features** - 页面组件可以使用业务功能模块
- **Features → Core** - 业务模块可以使用核心能力层
- **Core 内部模块互相依赖** - 需控制循环依赖

### 5.2 禁止的依赖 ❌

- **Core → Features** - 核心层不能依赖业务层
- **Core → Pages** - 核心层不能依赖页面层
- **components/ → features/** - 通用组件不能依赖业务功能

### 5.3 依赖注入

**问题**：如何让 Core 层服务使用 Features 层的数据？

**解决方案**：依赖注入 + 回调函数

```typescript
// AutoSaveService 需要获取 projectId（来自 designerProjectStore）
// 但 Core 层不能直接依赖 Features 层

// 方案：通过构造函数注入回调
class AutoSaveService {
  constructor(
    private objectManager: ObjectManager,
    private getProjectId: () => string // 依赖注入
  ) {}

  private async saveToLocalStorage() {
    const projectId = this.getProjectId(); // 通过回调获取
    // ...
  }
}

// CoreServiceProvider 中创建实例
const autoSave = new AutoSaveService(
  objectManager,
  () => designerProjectStore.getState().projectId // 注入回调
);
```

---

## 6. 渲染器抽象层

### 6.1 设计目标

- **解耦业务逻辑与渲染库**：业务代码不直接依赖 Three.js
- **保留引擎替换能力**：未来可切换到 Babylon.js 或其他引擎
- **渐进式抽象**：只定义当前需要的接口，不过度设计

### 6.2 抽象接口

```typescript
// src/core/renderer/renderer-types.ts
export interface IRenderer {
  // 场景管理
  initialize(): void;
  dispose(): void;
  render(): void;

  // 对象管理
  addObject(mesh: unknown): string; // 返回句柄
  removeObject(handle: string): void;
  updateObjectTransform(handle: string, transform: Transform): void;

  // 相机控制
  setCameraPosition(position: Vector3): void;
  resetCamera(): void;

  // 射线检测
  raycast(ndc: Vector2): RaycastHit | null;
  raycastFromScreen(screenPos: Vector2, viewport: Viewport): RaycastHit | null;

  // 预览管理
  createPreview(asset: AnyAsset): string; // 返回预览句柄
  updatePreviewTransform(handle: string, transform: Transform): void;
  destroyPreview(handle: string): void;
}
```

### 6.3 Three.js 实现

```typescript
// src/core/renderer/threejs/ThreeRenderer.ts
export class ThreeRenderer implements IRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private objectMap = new Map<string, THREE.Object3D>();

  // 实现 IRenderer 接口...
}
```

**职责分离**：

- `SceneManager` - 场景管理、灯光、背景
- `CameraController` - 相机控制、OrbitControls
- `RaycasterService` - 射线检测
- `PreviewManager` - 预览对象管理
- `GeometryFactory` - 几何体创建

---

## 7. ObjectManager 与 Renderer 解耦

### 7.1 RenderSyncService - 桥梁模式

**问题**：ObjectManager 直接操作 Three.js 场景导致职责混乱

**解决方案**：引入 RenderSyncService 作为桥梁

```typescript
// src/features/designer/services/RenderSyncService.ts
export class RenderSyncService {
  private syncMap = new Map<string, string>(); // objectId -> renderHandle

  constructor(
    private objectManager: ObjectManager,
    private renderer: IRenderer
  ) {
    this.setupEventListeners();
    this.syncExistingObjects(); // 🆕 初始化同步
  }

  private setupEventListeners() {
    // 监听 ObjectManager 事件
    this.objectManager.on('object:added', this.handleObjectAdded);
    this.objectManager.on('object:removed', this.handleObjectRemoved);
    this.objectManager.on('object:updated', this.handleObjectUpdated);
  }

  private syncExistingObjects() {
    // 路由切换后，将 ObjectManager 中的对象同步到新的渲染器
    const allObjects = this.objectManager.getAllObjects();
    allObjects.forEach(object => {
      if (!object.visual?.mesh) return;
      const renderHandle = this.renderer.addObject(object.visual.mesh);
      this.syncMap.set(object.id, renderHandle);
    });
  }

  private handleObjectAdded = (objectId: string) => {
    const object = this.objectManager.getObject(objectId);
    if (!object?.visual?.mesh) return;

    const renderHandle = this.renderer.addObject(object.visual.mesh);
    this.syncMap.set(objectId, renderHandle);
  };
}
```

**优势**：

1. **职责清晰**：ObjectManager 不依赖 Renderer
2. **易于测试**：可 mock RenderSyncService
3. **灵活替换**：可替换渲染实现
4. **初始化同步**：解决路由切换后场景丢失问题 ⭐

---

## 8. 双模型系统

### 8.1 设计动机

**性能 vs 精度的权衡**：

- **渲染性能**：需要简化的 Mesh，支持大规模场景流畅渲染
- **计算精度**：需要完整的几何描述，保证 FEA 分析准确性

**解决方案**：分离 Visual 和 Compute 模型

### 8.2 数据结构

```typescript
interface SceneObject {
  id: string;
  name: string;
  assetId: string;

  transform: Transform; // 位置、旋转、缩放

  // Visual 模型（渲染）
  visual: {
    mesh: Three.Mesh; // 简化渲染模型（低多边形 + LOD）
    isVisible: boolean;
    material?: MaterialProperties;
  };

  // Compute 模型（计算）
  compute: {
    geometry: GeometryDescription; // 完整几何描述（截面 + 拉伸）
    machiningOps: MachiningOperation[]; // 加工操作（打孔、切角）
    connections: Connection[]; // 连接关系
    material: MaterialProperties; // 材料属性（屈服强度、密度）
  };

  userParams: Record<string, unknown>; // 用户参数（长度、直径等）
}
```

### 8.3 使用场景

#### 场景渲染（使用 Visual）

```typescript
// 添加到场景
renderer.addObject(sceneObject.visual.mesh);

// LOD 优化
if (distance > 100) {
  mesh.geometry = lowPolyGeometry;
}
```

#### FEA 导出（使用 Compute）

```typescript
// 导出完整几何描述
const exportData = {
  objects: sceneObjects.map(obj => ({
    geometry: obj.compute.geometry,
    machiningOps: obj.compute.machiningOps,
    material: obj.compute.material,
    connections: obj.compute.connections,
  })),
};

// 发送到 FEA 服务
await sendToFEAService(exportData);
```

---

## 9. 附录：术语表

| 术语                  | 说明                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| **Asset**             | 素材模板（如型材截面定义、紧固件规格）                                   |
| **SceneObject**       | 场景中的实例对象（由 Asset 创建）                                        |
| **Strategy**          | 策略模式中的策略类（负责创建特定类型的 SceneObject）                     |
| **IRenderer**         | 渲染器抽象接口（解耦业务逻辑与渲染库）                                   |
| **RenderSyncService** | ObjectManager 与 Renderer 的桥梁服务                                     |
| **CoreServices**      | 应用级单例服务（ObjectManager、AssetService、EventBus、AutoSaveService） |
| **Command 事件**      | 由 UI 层发送的命令（如创建、删除）                                       |
| **State 事件**        | 由服务层发送的状态通知（如对象已添加）                                   |

---

**相关文档**：

- [状态管理策略](./StateManagement.md) - Context Provider、Zustand、持久化
- [存储系统设计](./StorageSystem.md) - AutoSaveService、三层持久化
- [渲染系统设计](./RenderingSystem.md) - Three.js 实现、RenderSyncService
- [素材管理系统](./AssetSystem.md) - AssetRegistry、参数化定义- [资产引用完整性](./AssetReferenceIntegrity.md) - 锁定对象机制（未来功能）

---

## 10. 资产管理生命周期 ⭐

**最后更新**: 2025-12-14

### 10.1 资产来源和权限

本系统支持两种类型的资产：

| 类型     | 标识                  | 可删除 | 来源     | 用途                     |
| -------- | --------------------- | ------ | -------- | ------------------------ |
| 预置资产 | `AssetSource.BUILTIN` | ❌     | 系统内置 | 标准型材、紧固件、连接件 |
| 用户资产 | `AssetSource.CUSTOM`  | ✅     | 用户上传 | 自定义型材截面           |

**设计意图**：

- **预置资产**：保证用户始终有可用的基础素材，不能意外删除
- **用户资产**：支持定制化需求，可以管理（删除、编辑）

### 10.2 资产加载流程

```
应用启动（main.tsx）
    ↓
CoreServiceProvider 初始化
    ↓
创建 AssetService 实例
    ↓
调用 AssetService.initialize()
    ↓
执行 loadBuiltinAssets()
    ├─ 从 data/profiles/generated/index.ts 动态导入
    ├─ 注册 profile-2020 等预置资产
    └─ 写入 AssetRegistry
    ↓
Library 页面
    ├─ 从 AssetService.getAllProfiles() 获取
    └─ 展示所有可用资产（BUILTIN + CUSTOM）
    ↓
Designer 页面进入
    ├─ 通过 useCoreServices() 访问 AssetService
    ├─ 确保使用最新的资产数据
    └─ 创建对象时验证资产存在性
```

**关键节点**：

1. **AssetService 是资产管理的唯一核心** - 所有资产查询、注册、删除均通过此服务
2. **Library 是管理入口** - UI 层面的资产管理页面，调用 AssetService API
3. **Designer 从 AssetService 查询** - 不直接注册资产，确保数据来源一致
4. **CoreServiceProvider 只负责初始化** - 不直接注册具体资产

### 10.3 资产中心化架构

```
┌─────────────────────────────────────────────────┐
│           AssetService (核心逻辑)               │
│  - 资产注册/删除/查询                           │
│  - 预置资产加载 (loadBuiltinAssets)            │
│  - 用户资产导入 (importCustomAsset)            │
└────────────────┬───────────────────────────────┘
                 │ 数据存储
                 ↓
┌─────────────────────────────────────────────────┐
│         AssetRegistry (数据存储)                │
│  - builtinAssets: Map<id, Asset>               │
│  - customAssets: Map<id, Asset>                │
└────────────────┬───────────────────────────────┘
                 │ UI展示 & 查询
        ┌────────┴──────────┐
        ↓                   ↓
┌──────────────┐   ┌──────────────┐
│ Library 页面  │   │ Designer 页面 │
│ (管理界面)   │   │ (使用界面)    │
│ - 展示资产   │   │ - 查询资产    │
│ - 删除资产   │   │ - 创建对象    │
│ - 上传资产   │   │ - 检测缺失    │
└──────────────┘   └──────────────┘
```

### 10.4 资产删除流程

```typescript
// Library 页面调用
const handleDeleteAsset = async (assetId: string) => {
  const asset = assetService.getAsset(assetId);

  // 检查权限
  if (asset.source === AssetSource.BUILTIN) {
    showError('预置资产不能删除');
    return;
  }

  // 检查引用（未来功能）
  // const references = objectManager.getObjectsByAssetId(assetId);
  // if (references.length > 0) {
  //   showWarning(`该资产被 ${references.length} 个对象使用，删除后这些对象将被锁定`);
  //   if (!await confirm('确认删除？')) return;
  // }

  // 执行删除
  assetService.deleteAsset(assetId);

  // 触发事件（未来功能）
  // eventBus.emit('asset:deleted', { assetId });
};
```

### 10.5 资产引用完整性（未来功能）

当项目中的 `SceneObject` 引用的 `Asset` 被删除后：

#### 锁定对象机制

```typescript
interface SceneObject {
  id: string;
  assetId: string;
  isLocked?: boolean; // 资产不存在时为 true
  // ...
}

// Designer 页面进入时检测
const validateAssetReferences = () => {
  const objects = objectManager.getAllObjects();
  const missingAssets = objects.filter(
    obj => !assetService.getAsset(obj.assetId)
  );

  // 标记锁定状态
  missingAssets.forEach(obj => {
    objectManager.updateObject(obj.id, { isLocked: true });
  });

  if (missingAssets.length > 0) {
    console.warn(
      `检测到 ${missingAssets.length} 个对象引用的资产已删除，已标记为锁定状态`
    );
  }
};
```

#### 锁定对象限制

- ✅ 可以删除（移出场景）
- ✅ 可以重新关联新资产
- ❌ 不能修改参数（长度、规格等）
- ❌ 不能移动/旋转/缩放

#### 资产重新关联

```typescript
// 用户选择锁定对象，打开重新关联面板
const handleReassociateAsset = async (objectId: string, newAssetId: string) => {
  const object = objectManager.getObject(objectId);
  const newAsset = assetService.getAsset(newAssetId);

  // 验证兼容性（类型匹配）
  if (object.type !== newAsset.type) {
    showError('资产类型不匹配');
    return;
  }

  // 重新生成模型
  const newVisual = modelFactory.createVisual(newAsset, object.userParams);
  const newCompute = modelFactory.createCompute(newAsset, object.userParams);

  // 更新对象
  objectManager.updateObject(objectId, {
    assetId: newAssetId,
    visual: newVisual,
    compute: newCompute,
    isLocked: false, // 解除锁定
  });

  console.log(`对象 ${objectId} 已重新关联到资产 ${newAssetId}`);
};
```

### 10.6 实现要点

1. **AssetService 是唯一核心**
   - 所有资产操作必须通过 AssetService
   - CoreServiceProvider 不直接注册具体资产
   - ObjectManager 不直接操作 AssetRegistry

2. **Library 为管理中心**
   - 提供资产浏览、删除、上传 UI
   - 调用 AssetService API 完成操作
   - 展示资产使用情况（未来功能）

3. **Designer 保证数据一致性**
   - 页面加载时验证资产引用
   - 检测缺失资产并标记锁定
   - 提供资产重新关联功能（未来）

4. **事件驱动同步**
   - `asset:deleted` 事件通知所有监听者
   - Designer 页面响应事件标记锁定对象
   - Library 页面响应事件刷新列表

**详细设计文档**：[资产引用完整性设计](./AssetReferenceIntegrity.md)
