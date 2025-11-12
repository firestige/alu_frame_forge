# 铝型材框架设计器 - 系统架构

## 文档信息

- **版本**: 1.0.0
- **创建日期**: 2025-11-12
- **最后更新**: 2025-11-12
- **状态**: 当前版本

## 1. 项目概览

### 1.1 项目背景

本项目是一个类 CAD 的铝型材框架设计器，用户可以使用预置的铝型材、紧固件、连接件等素材搭建各种框架结构。

### 1.2 核心价值

1. **所见即所得设计**：直观的 3D 可视化设计体验
2. **智能计算分析**：提供计算机辅助静力分析和干涉检测增值服务
3. **用户自定义**：支持用户导入自己的型材截面
4. **参数化建模**：铝型材通过截面拉伸，紧固件/连接件支持参数化变体

### 1.3 核心功能

- 3D 场景渲染和交互
- 素材库管理（铝型材、紧固件、连接件）
- 参数化对象创建和编辑
- 加工操作（打孔、切角、攻丝等）
- 工程文件保存和加载
- CAD 格式导出（用于 FEA 分析）

---

## 2. 架构概览

### 2.1 整体分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Pages Layer (路由入口)                     │
│                 pages/DesignerPage.tsx                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│           Features Layer (业务功能模块)                       │
│                                                              │
│  features/designer/                                          │
│  ├─ ui/ (UI 组件)                                            │
│  ├─ hooks/ (业务逻辑 Hooks)                                  │
│  ├─ services/ (业务服务层)                                   │
│  ├─ models/ (领域模型)                                       │
│  └─ context/ (Context Provider)                             │
│                                                              │
│  features/library/                                           │
│  ├─ ui/                                                      │
│  └─ context/                                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│              Core Layer (核心能力层)                          │
│                                                              │
│  core/asset/           - 资产模板管理                        │
│  │ ├─ AssetRegistry   - 资产注册表                          │
│  │ └─ AssetService    - 资产业务服务                        │
│                                                              │
│  core/object/          - 场景对象管理                        │
│  │ ├─ ObjectManager   - 对象生命周期管理                    │
│  │ ├─ ModelFactory    - 对象实例化（策略模式）              │
│  │ └─ SceneIO         - 场景序列化                          │
│                                                              │
│  core/renderer/        - 渲染器抽象                          │
│  │ ├─ IRenderer       - 渲染器接口                          │
│  │ └─ threejs/        - Three.js 实现                       │
│                                                              │
│  core/services/        - 核心服务                            │
│  │ ├─ eventBus        - 事件总线（mitt）                    │
│  │ ├─ storage         - 持久化                              │
│  │ └─ queryService    - 数据查询                            │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 核心设计原则

1. **分层解耦**：Features → Core，单向依赖
2. **事件驱动**：通过 Event Bus 实现模块间通信
3. **策略模式**：支持多种资产类型的灵活扩展
4. **Context Provider**：业务状态通过 Context 传递，UI 状态使用 Props
5. **双模型系统**：Visual（渲染）+ Compute（FEA 计算）分离

### 2.3 技术栈

- **前端框架**: React 18 + TypeScript
- **3D 渲染**: Three.js
- **状态管理**: Zustand + React Context
- **样式**: Tailwind CSS v4
- **构建工具**: Vite
- **事件系统**: mitt

---

## 3. 核心模块

### 3.1 Asset 管理模块

**职责**：管理素材模板（铝型材、紧固件、连接件等）的定义和注册。

**详细设计**：参见 [AssetManagementArchitecture.md](./AssetManagementArchitecture.md)

**关键组件**：
- `AssetRegistry`: 素材注册表，支持内置/自定义素材分类
- `AssetService`: 业务友好的 API（如 `getProfilesBySeries()`）
- Asset 类型：`ProfileAsset`, `FastenerAsset`, `ConnectorAsset`, `AccessoryAsset`

**核心概念**：
- Asset 是模板，不包含实例数据
- 支持参数化定义
- 分为内置素材和用户自定义素材

### 3.2 Designer 模块

**职责**：提供 3D 设计器的核心功能，包括场景渲染、对象管理、交互操作。

**详细设计**：参见 [DesignerArchitecture.md](./DesignerArchitecture.md)

**关键组件**：
- `ObjectManager`: 场景对象生命周期管理
- `RenderSyncService`: ObjectManager ↔ Renderer 的桥梁
- `ModelCreationService`: 模型创建服务
- `ModelInteractionService`: 交互服务（选择、高亮、上下文菜单）
- `ModelEditorService`: 编辑服务（属性修改、变换）

**架构特点**：
- ObjectManager 不直接依赖 Renderer
- 通过事件总线发布变更
- RenderSyncService 监听事件并同步到渲染器

### 3.3 Renderer 抽象层

**职责**：提供与渲染库无关的渲染能力抽象。

**核心接口** (`IRenderer`):
- 生命周期：`initialize()`, `dispose()`, `resize()`
- 场景管理：`setBackgroundColor()`, `enableGridHelper()`, `enableAxisHelper()`
- 相机控制：`setCameraPosition()`, `setCameraTarget()`, `resetCamera()`
- 渲染循环：`startRenderLoop()`, `stopRenderLoop()`, `render()`
- 射线检测：`raycastFromScreen()`
- 原生对象访问：`getNativeScene()`, `getNativeCamera()`

**Three.js 实现**：
- `SceneManager`: 场景/灯光/辅助器管理
- `CameraController`: 相机和 OrbitControls
- `RaycasterService`: 射线检测
- `RendererCore`: WebGL 渲染器和渲染循环

**优势**：
- 解耦业务代码与 Three.js
- 未来可替换为其他渲染引擎
- 接口最小化，只暴露必要功能

### 3.4 Object 管理模块

**职责**：管理场景中的对象实例（SceneObject）。

**核心概念**：
- **SceneObject**: 场景实例，包含 transform、userParams、visual、compute、machiningOps
- **双模型系统**:
  - `visual`: 简化的渲染模型（性能优化）
  - `compute`: 完整的几何描述（FEA 分析）

**关键组件**：
- `ObjectManager`: 对象 CRUD、事件发布
- `ModelFactory`: 使用策略模式实例化对象
- `ModelRepository`: 对象存储和查询
- `ModelOperations`: 参数化操作（拉伸、缩放等）
- `SceneIO`: 场景序列化和反序列化

**Model vs SceneObject**：
- 项目已从 Model 迁移到 SceneObject
- SceneObject 支持双模型、加工操作、Asset 关联
- 详见 [Model-vs-SceneObject-Analysis.md](./Model-vs-SceneObject-Analysis.md)

---

## 4. 数据流和状态管理

### 4.1 Context Provider 模式

**设计原则**：
- **UI 状态**：使用 Props 在组件内部管理（如选中工具、面板展开状态）
- **业务状态**：通过 Context 传递（如 ObjectManager、AssetService 实例）

**Context 提供内容**：
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
- `useDesignerContext()`: 访问服务实例
- `useDesignerObjects()`: 订阅对象列表（通过 Zustand Store）
- `useDesignerProject()`: 订阅项目信息
- `usePersistentState()`: 持久化 UI 偏好（localStorage）

### 4.2 Event Bus 通信

**事件类型**：
- **命令事件** (`command:*`): UI → Service（用户操作）
- **对象事件** (`object:*`): ObjectManager → Service（对象变更）
- **状态事件** (`state:*`): Service → UI（状态通知）

**事件流示例**：
```
用户点击创建按钮
    ↓
sendCommand('command:create:cube')
    ↓
DesignerPage 监听 → ModelCreationService.createCube()
    ↓
ObjectManager.addObject() → emit('object:added')
    ↓
RenderSyncService 监听 → 创建 renderObject → Renderer.addObject()
    ↓
Store 更新 → useDesignerObjects() → UI 重渲染
```

### 4.3 Store 管理

**Zustand Stores**：
- `designerObjectStore`: 场景对象列表
- `designerProjectStore`: 项目信息（名称、ID、修改时间）
- `libraryStore`: 素材库状态

**更新机制**：
- ObjectManager 通过事件发布变更
- DesignerPage 监听事件并更新 Store
- UI 组件通过 Hook 订阅 Store

---

## 5. 命令系统

命令系统是事件驱动架构的核心，实现 UI 层与业务层的解耦。

**完整 API 文档**：参见 [doc/api/CommandReference.md](./api/CommandReference.md)

### 5.1 命令分类

| 分类 | 命令前缀 | 示例 |
|------|---------|------|
| 模型创建 | `command:create:` | `command:create:cube` |
| 相机控制 | `command:camera:` | `command:camera:reset` |
| 模型编辑 | `command:model:` | `command:model:delete` |
| 选择操作 | `command:selection:` | `command:selection:clear` |

### 5.2 命令流程

```
┌─────────────┐
│  UI Layer   │ sendCommand('command:create:cube')
└──────┬──────┘
       │
┌──────▼──────┐
│  EventBus   │ mitt.emit('command:create:cube')
└──────┬──────┘
       │
┌──────▼──────┐
│DesignerPage │ onCommand('command:create:cube', handler)
└──────┬──────┘
       │
┌──────▼──────┐
│  Service    │ ModelCreationService.createCube()
└──────┬──────┘
       │
┌──────▼──────┐
│ObjectManager│ addObject() → emit('object:added')
└─────────────┘
```

---

## 6. 扩展和规划

### 6.1 PlacementService（规划中）

**目标**：实现交互式型材放置功能

**核心功能**：
- Raycasting 计算鼠标位置对应的 3D 坐标
- 显示半透明预览
- 智能吸附（端点、边缘、网格）
- 支持键盘快捷键（旋转、取消、确认）

**状态**：设计已完成，待 Context Provider 重构完成后实施

### 6.2 未来功能

- **装配约束系统**：自动求解装配关系
- **碰撞检测**：实时干涉检测
- **材料库扩展**：支持更多材料类型
- **BOM 生成**：自动生成材料清单和成本估算
- **协作功能**：多人实时编辑
- **AI 辅助设计**：根据需求生成初步设计

---

## 7. 开发指南

### 7.1 如何添加新功能

1. **定义命令类型**（`core/services/eventBus.ts`）
2. **创建服务**（`features/designer/services/`）
3. **在 DesignerPage 监听命令**
4. **UI 组件发送命令**（`sendCommand()`）
5. **更新文档**（`doc/api/CommandReference.md`）

### 7.2 如何添加新 Asset 类型

1. **定义 Asset 类型**（`core/asset/types/asset.ts`）
2. **创建实例化策略**（`core/object/strategies/`）
3. **注册策略到 ModelFactory**
4. **添加数据文件**（`data/assets/`）
5. **AssetService 自动加载**

### 7.3 测试策略

**当前状态**：测试计划待制定

**计划包含**：
- 单元测试（Jest + React Testing Library）
- 集成测试（各模块协作）
- E2E 测试（Playwright）
- 持续集成（GitHub Actions）

---

## 8. 相关文档

### 核心架构文档
- [Asset 管理架构](./AssetManagementArchitecture.md)
- [Designer 模块架构](./DesignerArchitecture.md)
- [Model vs SceneObject 分析](./Model-vs-SceneObject-Analysis.md)

### API 文档
- [命令系统参考](./api/CommandReference.md)

### 历史记录
- [开发日志](./DevelopLog.md)

---

**文档维护**: 本文档应随架构演进持续更新，确保与代码库保持同步。
