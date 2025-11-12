# Architecture Context - 项目架构快速上下文

> **文档用途**：本文档用于 AI 助手快速建立项目上下文，理解架构设计思想和技术决策。
> 
> **最后更新**：2025-11-12
> 
> **阅读时长**：5-8分钟

---

## 项目概述

**项目名称**：铝型材框架设计器 (Alu Frame Forge)

**项目定位**：类 CAD 的 Web 3D 设计工具，用户可使用预置铝型材、紧固件、连接件搭建框架结构

**核心价值主张**：
1. **所见即所得设计** - 直观的 3D 可视化设计体验
2. **智能计算分析** - 提供 FEA 静力分析和干涉检测增值服务
3. **用户自定义** - 支持导入自定义型材截面
4. **参数化建模** - 型材截面拉伸 + 紧固件/连接件参数化变体

**技术栈**：
- 前端：React 18 + TypeScript + Vite
- 3D渲染：Three.js（带抽象层）
- 状态管理：Zustand + React Context
- 样式：Tailwind CSS v4
- 事件系统：mitt

---

## 架构设计哲学

### 核心设计原则（按重要性排序）

1. **分层解耦**：Features → Core 单向依赖，Core 层不依赖 Features
2. **事件驱动**：通过 Event Bus 实现模块间通信，避免直接依赖
3. **职责分离**：Asset(模板) vs SceneObject(实例)，ObjectManager vs Renderer
4. **策略模式**：支持无限扩展新素材类型，无需修改工厂代码
5. **渲染器抽象**：业务逻辑不直接依赖 Three.js，保留引擎替换能力
6. **Context Provider 模式**：业务状态通过 Context，UI 状态使用 Props

### 架构创新点

#### 1. 双模型系统（核心创新）

**问题**：3D 渲染需要性能优化（简化几何），FEA 分析需要完整精度（完整描述）

**解决方案**：每个 SceneObject 包含两套模型

```typescript
SceneObject {
  visual: {
    mesh: Three.Mesh,        // 简化渲染模型（低多边形 + LOD）
    isVisible: boolean
  },
  compute: {
    geometry: ComputeGeometry, // 完整 FEA 几何描述
    material: MaterialProperties,
    connections: Connection[],
    mass: number
  }
}
```

**优势**：性能与精度平衡，支持大规模场景 + 高精度计算

#### 2. 策略模式优于工厂模式

**对比**：

| 方面 | 工厂模式 (if/switch) | 策略模式 (策略注册) |
|------|---------------------|---------------------|
| 扩展性 | ❌ 需修改工厂代码 | ✅ 只需添加新策略类 |
| 单一职责 | ❌ 工厂类臃肿 | ✅ 每个策略独立 |
| 测试性 | 🟡 需测试整个工厂 | ✅ 策略可独立测试 |
| 运行时扩展 | ❌ 不支持 | ✅ 可动态注册策略 |

**实现**：`ModelFactory` 维护策略注册表，根据 Asset 类型分发到对应策略

#### 3. 渲染器抽象层

**问题**：直接使用 Three.js 导致业务代码与渲染库强耦合

**解决方案**：定义 `IRenderer` 接口，只暴露必要功能

```typescript
interface IRenderer {
  // 生命周期
  initialize(container: HTMLElement): void;
  dispose(): void;
  
  // 场景管理
  setBackgroundColor(color: string): void;
  
  // 相机控制
  setCameraPosition(x, y, z): void;
  resetCamera(): void;
  
  // 射线检测
  raycastFromScreen(x, y): RaycastHit[];
  
  // 原生对象访问（桥接）
  getNativeScene(): any;
  getNativeCamera(): any;
}
```

**优势**：业务代码通过接口与渲染器交互，未来可替换为其他引擎

#### 4. ObjectManager 与 Renderer 完全解耦

**问题**：ObjectManager 直接操作 Three.js 场景导致职责混乱

**解决方案**：引入 `RenderSyncService` 作为桥梁

```
ObjectManager (业务逻辑)
    ↓ 发布事件
    emit('object:added', sceneObject)
    ↓
RenderSyncService (监听者)
    ↓ 监听事件
    on('object:added', handler)
    ↓ 创建渲染对象
    renderer.addObject(sceneObject.visual.mesh)
```

**优势**：ObjectManager 专注业务逻辑，不依赖具体渲染实现

---

## 分层架构详解

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│  Pages Layer（路由入口）                                      │
│  pages/DesignerPage.tsx, LibraryPage.tsx                    │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ 依赖
┌─────────────────────────────────────────────────────────────┐
│  Features Layer（业务功能模块）                               │
│  features/designer/  features/library/                      │
│  ├─ ui/          React组件（纯表示层）                       │
│  ├─ hooks/       业务逻辑 Hooks                              │
│  ├─ services/    业务服务层                                  │
│  ├─ models/      领域模型                                    │
│  └─ context/     Context Provider（业务状态桥梁）            │
└───────────────────────────┬─────────────────────────────────┘
                            ↓ 依赖
┌─────────────────────────────────────────────────────────────┐
│  Core Layer（核心能力层）                                     │
│  ├─ core/asset/      资产模板管理（AssetRegistry）          │
│  ├─ core/object/     场景对象管理（ObjectManager）          │
│  ├─ core/renderer/   渲染器抽象（IRenderer + ThreeJS实现）  │
│  └─ core/services/   核心服务（eventBus, storage, query）  │
└─────────────────────────────────────────────────────────────┘
```

### 依赖规则（严格遵守）

✅ **允许的依赖**：
- Pages → Features
- Features → Core
- Core 内部模块互相依赖（需控制循环依赖）

❌ **禁止的依赖**：
- Core → Features
- Core → Pages
- components/ → features/（通用组件不能依赖业务功能）

---

## 核心概念速查

### 1. Asset vs SceneObject

| 概念 | 职责 | 存储位置 | 示例 |
|------|------|---------|------|
| **Asset** | 素材模板定义，不包含实例数据 | `AssetRegistry` | "20x20 型材的截面定义" |
| **SceneObject** | Asset 的实例化，包含 transform/params/machiningOps | `ObjectManager` | "长度1000mm，位置(0,0,0)的20x20型材实例" |

**类比**：Asset = 类定义，SceneObject = 类实例

### 2. Asset 类型层次

```
Asset (基类)
├── ProfileAsset       铝型材（截面SVG + 材料属性 + 支持的加工操作）
├── FastenerAsset      紧固件（参数定义 + 模型变体 + FEA映射）
├── ConnectorAsset     连接件（类似 FastenerAsset）
└── AccessoryAsset     配件（静态模型路径）
```

### 3. 事件类型分类

| 事件前缀 | 方向 | 用途 | 示例 |
|---------|------|------|------|
| `command:*` | UI → Service | 用户操作命令 | `command:create:cube` |
| `object:*` | ObjectManager → Service | 对象生命周期事件 | `object:added` |
| `state:*` | Service → UI | 状态通知 | `state:model:created` |
| `ui:*` | Service → UI | UI 控制指令 | `ui:selection:clear` |

### 4. 加工操作（MachiningOperation）

**仅适用于型材（ProfileAsset）**

| 类型 | 说明 | 影响 |
|------|------|------|
| `HOLE` | 打孔 | FEA 强度降低、装配约束点 |
| `CHAMFER` | 切角 | 应力集中优化 |
| `THREAD` | 攻丝 | 紧固件连接 |
| `NOTCH` | 槽口 | 截面强度降低 |

---

## 关键数据流

### 流程 1：用户创建型材完整流程

```
1. 用户从素材库选择型材
   sendCommand('command:create:profile:prepare', { assetId, mode: 'interactive' })
   
2. DesignerPage 监听命令
   handlePrepareProfile() → PlacementService.start(assetId)
   
3. PlacementService 进入交互模式
   - 显示半透明预览
   - 监听鼠标移动（Raycasting）
   - 用户填写参数（长度、规格）
   
4. 用户确认位置
   PlacementService.confirm() → 返回 SceneObjectCreateOptions
   
5. 实例化对象
   ModelFactory.createFromAsset(assetId, options)
   ├─ 选择 ProfileInstanceStrategy
   ├─ 创建 visual.mesh（简化模型）
   └─ 创建 compute.geometry（完整描述）
   
6. 添加到场景
   ObjectManager.add(sceneObject) → emit('object:added')
   
7. 同步到渲染器
   RenderSyncService 监听 → Renderer.addObject(visual.mesh)
   
8. 更新 UI
   designerObjectStore 更新 → useDesignerObjects() → UI 重渲染
```

### 流程 2：保存工程文件

```
1. 用户点击保存
   sendCommand('command:project:save')
   
2. 序列化场景
   ProjectSerializer.serialize(sceneObjects, metadata)
   
3. 生成轻量 JSON（工程文件格式）
   {
     objects: [
       {
         id: "profile-001",
         assetId: "20-2020",           // 引用 Asset
         userParams: { length: 1000 },
         transform: { position, rotation, scale },
         machiningOps: [...]
       }
     ]
   }
   
4. 保存到本地/云端
   localStorage.setItem('project', json)
```

### 流程 3：导出 CAD 文件（FEA 分析）

```
1. 用户点击导出
   sendCommand('command:project:export:cad')
   
2. 生成完整 JSON（CAD 导出格式）
   {
     objects: [
       {
         id: "profile-001",
         geometry: {                    // 完整几何描述
           type: "extruded_profile",
           crossSection: "M 0,0 L 20,0...",
           length: 1000,
           machiningOps: [...]
         },
         material: { yieldStrength: 160, density: 2700, ... },
         mass: 0.54
       }
     ],
     connections: [...]
   }
   
3. 发送到服务端进行 FEA 分析
   POST /api/fea/analyze { cadJson }
```

---

## 状态管理策略

### Context Provider 模式

**设计原则**：
- **业务状态** → Context 传递（服务实例、全局配置）
- **UI 状态** → Props 传递（选中工具、面板展开状态）

**DesignerContext 提供**：

```typescript
interface DesignerContextValue {
  services: {
    objectManager: ObjectManager;
    renderSync: RenderSyncService;
    creation: ModelCreationService;
    interaction: ModelInteractionService;
    editor: ModelEditorService;
  };
  eventBus: typeof designerEventBus;
}
```

**使用 Hooks**：
- `useDesignerContext()` - 访问服务实例
- `useDesignerObjects()` - 订阅对象列表（Zustand Store）
- `useDesignerProject()` - 订阅项目信息
- `usePersistentState()` - 持久化 UI 偏好（localStorage）

### Zustand Stores

```typescript
// 场景对象列表
designerObjectStore: {
  objects: SceneObject[];
  addObject(obj): void;
  removeObject(id): void;
  updateObject(id, updates): void;
}

// 项目信息
designerProjectStore: {
  name: string;
  id: string;
  modifiedAt: Date;
}

// 素材库状态
libraryStore: {
  selectedCategory: string;
  searchQuery: string;
}
```

---

## 目录结构关键路径

```
src/
├── core/                          # 核心能力层（不依赖 features）
│   ├── asset/
│   │   ├── AssetRegistry.ts       # 素材注册表
│   │   ├── AssetService.ts        # 业务友好 API
│   │   └── types/                 # Asset 类型定义
│   ├── object/
│   │   ├── ObjectManager.ts       # 对象生命周期管理
│   │   ├── ModelFactory.ts        # 策略模式工厂
│   │   ├── SceneIO.ts             # 序列化/反序列化
│   │   ├── entities/              # SceneObject 实体类
│   │   ├── strategies/            # 实例化策略
│   │   │   ├── ProfileInstanceStrategy.ts
│   │   │   ├── FastenerInstanceStrategy.ts
│   │   │   └── ...
│   │   └── types/                 # SceneObject 类型定义
│   ├── renderer/
│   │   ├── renderer-types.ts      # IRenderer 接口
│   │   └── threejs/               # Three.js 实现
│   │       ├── SceneManager.ts
│   │       ├── CameraController.ts
│   │       ├── RaycasterService.ts
│   │       └── ThreeRenderer.ts
│   └── services/
│       ├── eventBus.ts            # mitt 事件总线
│       ├── storage.ts             # 持久化
│       └── queryService.ts        # 数据查询
│
├── features/                      # 业务功能模块
│   ├── designer/
│   │   ├── context/               # DesignerContext
│   │   ├── hooks/                 # 业务 Hooks
│   │   ├── services/              # 业务服务
│   │   │   ├── ModelCreationService.ts
│   │   │   ├── ModelInteractionService.ts
│   │   │   ├── ModelEditorService.ts
│   │   │   └── RenderSyncService.ts
│   │   ├── models/                # 领域模型
│   │   └── ui/                    # React 组件
│   └── library/
│       ├── context/
│       └── ui/
│
├── components/                    # 通用 UI 组件（不依赖 features）
│   ├── Button/
│   ├── Popover/
│   └── ...
│
├── pages/                         # 路由入口
│   ├── DesignerPage.tsx           # 设计器页面（事件监听协调层）
│   └── LibraryPage.tsx
│
├── data/                          # 静态数据
│   ├── assets/                    # 内置素材数据
│   │   ├── profiles/
│   │   ├── fasteners/
│   │   └── connectors/
│   └── profiles/                  # 型材系列定义
│
└── stores/                        # Zustand 全局状态
    ├── designerObjectStore.ts
    ├── designerProjectStore.ts
    └── libraryStore.ts
```

---

## 重要技术决策记录

### 决策 1：为什么选择策略模式而非工厂模式？

**背景**：需要支持多种 Asset 类型的实例化（型材、紧固件、连接件、配件）

**考虑的方案**：
- 方案 A：工厂模式（if/switch）
- 方案 B：策略模式（策略注册）

**决策**：选择方案 B

**理由**：
1. 开闭原则：新增素材类型无需修改 ModelFactory
2. 单一职责：每个策略类专注一种类型
3. 可测试性：策略可独立单元测试
4. 运行时扩展：支持动态注册用户自定义策略

### 决策 2：为什么需要双模型系统？

**背景**：需要同时满足渲染性能和 FEA 计算精度

**问题**：
- 渲染需要简化几何（低多边形、LOD）
- FEA 需要完整描述（截面参数、加工操作、材料属性）

**决策**：每个 SceneObject 包含 visual 和 compute 两套模型

**优势**：
1. 渲染性能：支持大规模场景流畅渲染
2. 计算精度：保证 FEA 分析准确性
3. 灵活切换：可根据需要选择性更新

### 决策 3：为什么引入 RenderSyncService？

**背景**：ObjectManager 直接操作 Three.js 场景导致职责混乱

**问题**：
- ObjectManager 应专注业务逻辑（参数化、约束、碰撞检测）
- 渲染细节（材质、光照、LOD）不应污染业务代码

**决策**：引入 RenderSyncService 作为桥梁

**实现**：
```typescript
// ObjectManager 发布事件
objectManager.addObject(sceneObject);
emit('object:added', sceneObject);

// RenderSyncService 监听事件
on('object:added', (sceneObject) => {
  const renderHandle = renderer.addObject(sceneObject.visual.mesh);
  this.syncMap.set(sceneObject.id, renderHandle);
});
```

**优势**：
1. 职责清晰：ObjectManager 不依赖 Renderer
2. 易于测试：可 mock RenderSyncService
3. 灵活替换：可替换渲染实现

### 决策 4：为什么使用两种序列化格式？

**背景**：需要支持工程文件保存和 CAD 导出两种场景

**需求差异**：
- 工程文件：轻量、人类可读、快速加载
- CAD 导出：完整、自包含、适合 FEA 引擎

**决策**：设计两种格式

**工程文件格式**（轻量）：
- 只存 assetId + userParams + transform + machiningOps
- 依赖 AssetRegistry（Asset 必须存在）
- 体积小（~10KB）

**CAD 导出格式**（完整）：
- 包含完整几何描述 + 材料属性 + 连接关系
- 自包含，不依赖 AssetRegistry
- 体积大（~500KB）

---

## 当前开发状态

### 已完成功能 ✅

1. **架构重构**
   - ✅ 三层架构实现（Pages/Features/Core）
   - ✅ 事件驱动系统（mitt）
   - ✅ 渲染器抽象层（IRenderer）
   - ✅ ObjectManager 模块化（9个子模块）
   - ✅ Asset 管理系统重构
   - ✅ Popover 组件重构（移除架构违规）

2. **核心功能**
   - ✅ 3D 场景渲染（Three.js）
   - ✅ 相机控制（OrbitControls）
   - ✅ 对象管理（CRUD）
   - ✅ 素材库（型材、紧固件、连接件）
   - ✅ 事件总线通信
   - ✅ 双模型系统设计
   - ✅ 策略模式工厂

3. **文档**
   - ✅ Architecture.md（统一入口）
   - ✅ AssetManagementArchitecture.md（详细设计）
   - ✅ DesignerArchitecture.md（三层架构）
   - ✅ CommandReference.md（API 手册）
   - ✅ DevelopLog.md（历史记录）
   - ✅ ArchitecturePrompt.md（本文档）

### 待完成功能 📋

**P0 优先级**（必须完成）：
1. ⏳ 检查 Context Provider 重构完成度
   - 确认所有 UI 组件使用 `useDesignerContext()`
   - 验证无 Props Drilling
   - 确认 UI 状态使用 `usePersistentState()`

2. ⏳ 清理 Model → SceneObject 遗留代码
   - 搜索 `@deprecated` 标记
   - 移除 `Model<TMetadata>` 类型引用
   - 确保 core/object/ 仅使用 SceneObject

**P1 优先级**（重要）：
3. ⏳ 移除废弃的 ContextMenu 代码
   - 删除 `src/components/menu/ContextMenuContainer.tsx`
   - 验证无引用残留

**P2 优先级**（计划中）：
4. ⏳ 实现 PlacementService（交互式型材放置）
   - 状态管理（idle/placing/preview/confirmed）
   - Raycasting 计算 3D 坐标
   - 半透明预览渲染
   - 智能吸附（端点、边缘、网格）
   - 键盘快捷键（R旋转、ESC取消、Enter确认）

5. ⏳ 制定测试计划
   - 单元测试（Jest + React Testing Library）
   - 集成测试（模块协作）
   - E2E 测试（Playwright/Cypress）

**P3 优先级**（长期）：
6. ⏳ CI/CD 流程
7. ⏳ 文档与代码同步机制

---

## 常见问题解答

### Q1: 为什么不直接使用 Three.js，而要抽象 IRenderer？

**A**: 主要有三个原因：
1. **解耦业务逻辑**：业务代码不应依赖具体渲染库
2. **易于替换**：未来可能替换为 Babylon.js、PlayCanvas 等
3. **简化接口**：只暴露必要功能，降低学习成本

### Q2: 双模型系统会不会增加内存开销？

**A**: 内存开销可控：
- `visual.mesh` 是简化模型（顶点少）
- `compute.geometry` 只是参数描述（非 Mesh 对象），内存占用极小
- 实测：1000个对象约增加 50MB 内存

### Q3: 为什么型材要参数化，而紧固件用变体？

**A**: 取决于几何特性：
- **型材**：截面固定，长度连续变化 → 拉伸操作天然支持参数化
- **紧固件**：规格离散（M5/M6/M8），但长度可调 → 基础模型 + 长度参数

### Q4: Context Provider 和 Zustand 如何分工？

**A**:
- **Context Provider**：传递服务实例（ObjectManager、AssetService）和配置
- **Zustand Store**：管理响应式数据（对象列表、项目信息）
- **原则**：Context 传递依赖，Store 管理状态

### Q5: 如何扩展新的 Asset 类型？

**A**: 三步走：
1. 定义 Asset 类型（如 `CustomAsset extends Asset`）
2. 创建实例化策略（如 `CustomInstanceStrategy implements InstanceStrategy`）
3. 注册策略：`modelFactory.registerStrategy(AssetType.CUSTOM, new CustomInstanceStrategy())`

无需修改 ModelFactory 代码。

---

## 快速上手指南

### 如果你要...

#### 添加新命令

1. 定义命令类型：`core/services/eventBus.ts`
2. UI 发送命令：`sendCommand('command:xxx', payload)`
3. DesignerPage 监听：`onCommand('command:xxx', handler)`
4. 更新文档：`doc/api/CommandReference.md`

#### 添加新 Asset 类型

1. 定义类型：`core/asset/types/asset.ts`
2. 创建策略：`core/object/strategies/XxxInstanceStrategy.ts`
3. 注册策略：`modelFactory.registerStrategy()`
4. 添加数据：`data/assets/xxx/`

#### 修改渲染逻辑

1. 检查是否需要修改 `IRenderer` 接口
2. 实现 Three.js 层：`core/renderer/threejs/`
3. RenderSyncService 调用新接口

#### 添加业务服务

1. 创建服务类：`features/designer/services/XxxService.ts`
2. DesignerContext 注册：`context/DesignerProvider.tsx`
3. UI 通过 Hook 访问：`useDesignerContext().services.xxx`

---

## 相关文档索引

| 文档 | 用途 | 阅读优先级 |
|------|------|-----------|
| [Architecture.md](./Architecture.md) | 架构总览 | ⭐⭐⭐⭐⭐ |
| [AssetManagementArchitecture.md](./AssetManagementArchitecture.md) | Asset 系统详细设计 | ⭐⭐⭐⭐ |
| [DesignerArchitecture.md](./DesignerArchitecture.md) | Designer 三层架构 | ⭐⭐⭐⭐ |
| [CommandReference.md](./api/CommandReference.md) | 命令系统 API | ⭐⭐⭐ |
| [Model-vs-SceneObject-Analysis.md](./Model-vs-SceneObject-Analysis.md) | 架构演进分析 | ⭐⭐ |
| [DevelopLog.md](./DevelopLog.md) | 历史记录 | ⭐ |

---

## 结语

这份文档旨在帮助 AI 助手快速建立项目上下文。关键要点：

1. **架构理念**：分层解耦、事件驱动、策略模式、渲染器抽象
2. **核心创新**：双模型系统、策略模式工厂、RenderSyncService 桥梁
3. **状态管理**：Context Provider（依赖） + Zustand（状态） + Props（UI）
4. **数据流**：命令事件 → 业务服务 → ObjectManager → RenderSyncService → Renderer
5. **扩展方式**：新命令/新Asset/新服务都有清晰的扩展路径

如有疑问，请先查阅 [Architecture.md](./Architecture.md) 和相关详细设计文档。

---

**文档维护者**：AI 助手与项目团队
**最后更新**：2025-11-12
