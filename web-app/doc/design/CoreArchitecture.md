# 核心架构设计

**最后更新**: 2025-11-21

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
- [素材管理系统](./AssetSystem.md) - AssetRegistry、参数化定义
