# 铝型材框架设计器 - 架构设计文档

**文档版本**: 2.0（模块化版本）  
**最后更新**: 2025-11-21  
**维护者**: AI Copilot  
**文档状态**: Active

本文档是"铝型材框架设计器"（Aluminum Frame Designer）的架构总览，介绍项目的设计理念、技术栈、核心模块和文档导航。

---

## 0. 文档结构说明

本项目采用 **"总章+分册"** 的文档组织形式：

- **Architecture.md**（本文档）- 项目总览、设计理念、技术栈和模块索引
- **design/** 目录 - 各子系统的详细设计文档

### 设计文档索引

| 文档                                                | 描述           | 主要内容                                                      |
| --------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| [CoreArchitecture.md](./design/CoreArchitecture.md) | 核心架构设计   | 分层架构、CoreServiceProvider、事件驱动、策略模式、双模型系统 |
| [UIDesign.md](./design/UIDesign.md)                 | UI/UX 设计系统 | 主题系统、Framer Motion、组件库、响应式布局、无障碍设计       |
| [StateManagement.md](./design/StateManagement.md)   | 状态管理策略   | Context Provider、Zustand、usePersistentState、同步策略       |
| [StorageSystem.md](./design/StorageSystem.md)       | 存储与持久化   | AutoSaveService、三层持久化、SceneIO、queryService            |
| [RenderingSystem.md](./design/RenderingSystem.md)   | 渲染系统设计   | 渲染器抽象、Three.js 实现、RenderSyncService                  |

### 快速导航

- **了解项目整体设计？** → 阅读本文档（Architecture.md）
- **实现核心业务逻辑？** → 阅读 [CoreArchitecture.md](./design/CoreArchitecture.md)
- **开发 UI 组件？** → 阅读 [UIDesign.md](./design/UIDesign.md)
- **处理状态管理？** → 阅读 [StateManagement.md](./design/StateManagement.md)
- **实现数据持久化？** → 阅读 [StorageSystem.md](./design/StorageSystem.md)
- **集成渲染器？** → 阅读 [RenderingSystem.md](./design/RenderingSystem.md)

---

## 1. 项目概览

### 1.1 项目简介

**铝型材框架设计器**（Aluminum Frame Designer）是一款基于 Web 的 3D CAD 工具，专注于铝型材框架结构的快速设计、组装和工程导出。

**核心价值**：

- ✨ **所见即所得** - 实时 3D 渲染，直观的交互体验
- 🚀 **快速建模** - 从素材库拖拽组装，无需从零建模
- 📐 **参数化设计** - 智能参数系统，支持实时调整
- 💾 **自动保存** - 多层持久化，防止数据丢失
- 🎨 **现代 UI** - Tailwind CSS 4.0 + Framer Motion 动画

**目标用户**：

- 工业设计师
- 机械工程师
- DIY 爱好者
- 教育培训机构

---

## 2. 技术栈

### 2.1 前端核心

| 技术             | 版本    | 用途     |
| ---------------- | ------- | -------- |
| **React**        | 19.x    | UI 框架  |
| **TypeScript**   | 5.7.x   | 类型安全 |
| **Vite**         | 6.x     | 构建工具 |
| **Tailwind CSS** | 4.0.x   | 样式系统 |
| **Three.js**     | 0.171.x | 3D 渲染  |

### 2.2 状态管理

| 技术            | 用途                                      |
| --------------- | ----------------------------------------- |
| **Context API** | 核心服务共享（CoreServiceProvider）       |
| **Zustand**     | 特性状态管理（drawer、library、designer） |
| **mitt**        | 事件总线（跨组件通信）                    |

### 2.3 UI 组件库

| 技术              | 用途                          |
| ----------------- | ----------------------------- |
| **Framer Motion** | 动画系统                      |
| **Headless UI**   | 无障碍组件（Popover、Dialog） |
| **Lucide React**  | 图标库                        |

### 2.4 测试工具

| 技术                      | 用途     |
| ------------------------- | -------- |
| **Vitest**                | 单元测试 |
| **Playwright**            | E2E 测试 |
| **React Testing Library** | 组件测试 |

### 2.5 开发工具

| 技术         | 用途                 |
| ------------ | -------------------- |
| **ESLint**   | 代码检查             |
| **Prettier** | 代码格式化（配置中） |
| **cSpell**   | 拼写检查             |

---

## 3. 核心设计理念

### 3.1 分层架构

```
┌─────────────────────────────────────────────┐
│  App Layer（应用层）                        │
│  - main.tsx, App.tsx, routes                │
└─────────────────────────────────────────────┘
              ↓ 依赖
┌─────────────────────────────────────────────┐
│  Pages Layer（页面层）                      │
│  - DesignerPage, LibraryPage                │
└─────────────────────────────────────────────┘
              ↓ 依赖
┌─────────────────────────────────────────────┐
│  Features Layer（特性层）                   │
│  - designer/, library/                      │
└─────────────────────────────────────────────┘
              ↓ 依赖
┌─────────────────────────────────────────────┐
│  Core Layer（核心层）                       │
│  - asset/, object/, renderer/, services/    │
└─────────────────────────────────────────────┘
```

**依赖规则**：

- 上层可以依赖下层，下层不可依赖上层
- 同层模块避免循环依赖
- Core Layer 是纯业务逻辑，不依赖 React

### 3.2 事件驱动

**设计目标**：解耦模块间通信

```typescript
// ObjectManager 发出事件
objectManager.emit('object:added', sceneObject);

// AutoSaveService 监听事件
objectManager.on('object:added', this.scheduleSave);

// RenderSyncService 监听事件
objectManager.on('object:added', this.onObjectAdded);
```

**核心事件总线**：

- `designerEventBus` - 全局事件通信
- `ObjectManager` - 对象管理事件
- `AssetService` - 素材加载事件

### 3.3 策略模式

**设计目标**：支持多种 Asset 类型的不同实例化逻辑

```typescript
// 策略接口
interface AssetInstanceStrategy {
  create(asset: Asset): SceneObject;
}

// 具体策略
class ProfileInstanceStrategy implements AssetInstanceStrategy { ... }
class FastenerInstanceStrategy implements AssetInstanceStrategy { ... }
class ConnectorInstanceStrategy implements AssetInstanceStrategy { ... }

// 工厂选择策略
class ModelFactory {
  createFromAsset(asset: Asset): SceneObject {
    const strategy = this.getStrategy(asset.type);
    return strategy.create(asset);
  }
}
```

### 3.4 渲染器抽象

**设计目标**：业务逻辑不依赖具体渲染库

```typescript
// 抽象接口
interface IRenderer {
  createMesh(geometry, material): IMesh;
  addToScene(mesh): void;
  // ...
}

// 具体实现
class ThreeRenderer implements IRenderer { ... }
class BabylonRenderer implements IRenderer { ... }  // 未来扩展

// 业务代码只依赖接口
function createObject(renderer: IRenderer) {
  const mesh = renderer.createMesh(...);
  renderer.addToScene(mesh);
}
```

### 3.5 双模型系统

**设计理念**：Asset 是"类"，SceneObject 是"实例"

```
Asset（模板）          SceneObject（实例）
  ├─ 素材 ID              ├─ 对象 ID
  ├─ 素材类型             ├─ 引用素材 ID
  ├─ 参数定义             ├─ 用户参数值
  ├─ 计算逻辑             ├─ 变换（位置、旋转、缩放）
  └─ 几何数据             ├─ 加工操作
                         └─ 渲染数据（mesh）
```

**优势**：

- Asset 可复用，减少内存占用
- SceneObject 轻量，序列化体积小
- 支持 Asset 热更新（所有实例自动更新）

---

## 4. 核心模块

### 4.1 CoreServiceProvider

**职责**：应用级服务容器，管理全局共享的核心服务

**提供的服务**：

- `assetService` - 素材管理
- `objectManager` - 场景对象管理
- `renderer` - 渲染器
- `renderSyncService` - 渲染同步
- `autoSaveService` - 自动保存

**生命周期**：

- 在 App.tsx 中初始化
- 跨路由保持（设计器 ↔ 素材库切换时不销毁）
- 只在应用退出时销毁

**详细设计** → [CoreArchitecture.md](./design/CoreArchitecture.md)

### 4.2 Asset 管理系统

**职责**：

- 管理素材库（型材、紧固件、连接件）
- 素材注册、查询、分类
- 参数定义和验证

**核心组件**：

- `AssetRegistry` - 素材注册表（内存数据库）
- `AssetService` - 素材服务（查询、过滤）
- `Asset` 类型 - `ProfileAsset`, `FastenerAsset`, `ConnectorAsset`

**详细设计** → [CoreArchitecture.md](./design/CoreArchitecture.md)

### 4.3 Object 管理系统

**职责**：

- 管理场景中的所有对象（SceneObject）
- 对象的增删改查
- 对象变换（移动、旋转、缩放）
- 场景序列化/反序列化

**核心组件**：

- `ObjectManager` - 对象管理器
- `ModelFactory` - 对象工厂（Asset → SceneObject）
- `SceneIO` - 场景导入/导出

**详细设计** → [CoreArchitecture.md](./design/CoreArchitecture.md)

### 4.4 渲染系统

**职责**：

- 提供渲染器抽象接口（IRenderer）
- 实现 Three.js 渲染器
- 同步 SceneObject → IMesh

**核心组件**：

- `IRenderer` - 渲染器接口
- `ThreeRenderer` - Three.js 实现
- `RenderSyncService` - 同步服务

**详细设计** → [RenderingSystem.md](./design/RenderingSystem.md)

### 4.5 存储系统

**职责**：

- 三层持久化（内存 → localStorage → 云端）
- 自动保存（防抖 + 最小间隔）
- 项目加载/保存

**核心组件**：

- `AutoSaveService` - 自动保存服务
- `SceneIO` - 场景序列化
- `queryService` - 项目查询

**详细设计** → [StorageSystem.md](./design/StorageSystem.md)

### 4.6 UI 系统

**职责**：

- 提供统一的设计语言
- 响应式布局
- 动画和交互

**核心技术**：

- Tailwind CSS 4.0 - 样式系统
- Framer Motion - 动画库
- Headless UI - 无障碍组件

**详细设计** → [UIDesign.md](./design/UIDesign.md)

### 4.7 状态管理

**职责**：

- 管理应用状态
- 持久化状态（usePersistentState）
- 状态同步

**核心技术**：

- Context API - 核心服务共享
- Zustand - 特性状态管理
- mitt - 事件总线

**详细设计** → [StateManagement.md](./design/StateManagement.md)

---

## 5. 系统工作流程

### 5.1 应用启动流程

```
1. main.tsx 渲染 <App />
   ↓
2. App.tsx 初始化 CoreServiceProvider
   ├─ 创建 AssetService（加载素材库）
   ├─ 创建 ObjectManager
   ├─ 创建 ThreeRenderer
   ├─ 创建 RenderSyncService（同步 Object → Mesh）
   └─ 创建 AutoSaveService（监听变更，自动保存）
   ↓
3. 路由到 DesignerPage 或 LibraryPage
   ↓
4. DesignerPage 加载项目数据
   ├─ 从 URL 或 localStorage 获取 projectId
   ├─ 调用 queryService.loadProject()
   └─ 调用 objectManager.importScene()
   ↓
5. RenderSyncService 自动创建 Mesh 并渲染
```

### 5.2 对象添加流程

```
用户从素材库拖拽一个型材到设计器
   ↓
1. LibraryPage 发出 'asset:selected' 事件
   ↓
2. DesignerPage 监听事件，调用 objectManager.addObject()
   ├─ ModelFactory 根据 Asset 创建 SceneObject
   ├─ ObjectManager 添加到内存
   └─ ObjectManager.emit('object:added')
   ↓
3. RenderSyncService 监听 'object:added'
   ├─ 创建 Mesh（renderer.createMesh()）
   ├─ 添加到场景（renderer.addToScene()）
   └─ 保存映射（meshMap.set(obj.id, mesh)）
   ↓
4. AutoSaveService 监听 'object:added'
   ├─ 调度保存（scheduleSave）
   ├─ 等待 3 秒防抖
   └─ 保存到 localStorage
```

### 5.3 对象变换流程

```
用户拖动对象改变位置
   ↓
1. DesignerPage 调用 objectManager.updateObject(id, { transform })
   ↓
2. ObjectManager 更新内存数据
   ↓
3. ObjectManager.emit('object:updated', sceneObject)
   ↓
4. RenderSyncService 监听 'object:updated'
   ├─ 获取对应 Mesh（meshMap.get(obj.id)）
   ├─ 更新位置（renderer.updatePosition()）
   ├─ 更新旋转（renderer.updateRotation()）
   └─ 更新缩放（renderer.updateScale()）
   ↓
5. AutoSaveService 监听 'object:updated'
   └─ 调度保存（防抖 3 秒）
```

---

## 6. 数据流

### 6.1 Asset → SceneObject → IMesh

```
AssetRegistry（素材库）
   ↓ getAsset()
Asset（模板）
   ↓ ModelFactory.createFromAsset()
SceneObject（实例）
   ↓ RenderSyncService.createMeshForObject()
IMesh（渲染对象）
   ↓ ThreeRenderer.addToScene()
Three.Scene（3D 场景）
```

### 6.2 用户操作 → 数据持久化

```
用户操作（添加、删除、修改对象）
   ↓
ObjectManager 变更内存数据
   ↓ emit('object:xxx')
AutoSaveService 监听事件
   ↓ 防抖 3 秒 + 最小间隔 30 秒
SceneIO 导出场景数据
   ↓
localStorage 保存
   ↓ （如果启用云端保存）
网络保存（非阻塞）
```

---

## 7. 测试策略

### 7.1 单元测试

- **工具**: Vitest 4.0.9
- **覆盖率目标**: 75%
- **测试范围**: Core Layer、Utils、Hooks

**示例**：

```bash
npm run test                    # 运行所有测试
npm run test:coverage          # 生成覆盖率报告
npm run test -- BaseButton     # 测试特定文件
```

### 7.2 E2E 测试

- **工具**: Playwright
- **测试范围**: 关键用户流程

**示例**：

```bash
npm run test:e2e               # 运行 E2E 测试
npm run test:e2e:ui            # 打开 Playwright UI
```

---

## 8. 项目规范

### 8.1 代码规范

- ✅ **TypeScript 严格模式** - `tsconfig.json` 启用 `strict: true`
- ✅ **ESLint 检查** - `eslint.config.js` 配置规则
- ✅ **拼写检查** - `cspell.json` 配置词典

### 8.2 Git 工作流

- **功能开发**: `feature/{feature-name}`
- **Bug 修复**: `fix/{bug-name}`
- **文档更新**: `docs/{doc-name}`

**脚本**：

```bash
./scripts/new-feature.sh {feature-name}   # 创建新分支
./scripts/finish-feature.sh               # 完成开发，推送 PR
./scripts/list-prs.sh                     # 列出所有 PR
./scripts/merge-pr.sh {pr-number}         # 合并 PR
```

### 8.3 文档规范

- **元信息** - 所有文档需包含"最后更新"日期
- **内部链接** - 使用相对路径链接其他文档
- **代码示例** - 提供完整可运行的示例

---

## 9. 未来扩展

### 9.1 计划中的功能

- [ ] **多人协作** - WebSocket 实时同步
- [ ] **工程导出** - BOM 表、切割清单、装配图
- [ ] **参数化约束** - 智能尺寸约束系统
- [ ] **材质库** - 真实材质渲染
- [ ] **插件系统** - 支持第三方扩展

### 9.2 技术演进

- [ ] **渲染器切换** - 支持 WebGPU
- [ ] **状态机** - XState 管理复杂交互
- [ ] **微前端** - 模块化部署
- [ ] **PWA** - 离线支持

---

## 10. 附录

### 10.1 相关文档

- [ArchitecturePrompt.md](./ArchitecturePrompt.md) - 快速上下文文档（AI Copilot 入口）
- [TestPlan.md](./TestPlan.md) - 测试计划
- [WorkflowGuidelines.md](./WorkflowGuidelines.md) - 开发工作流指南
- [DevelopLog.md](./DevelopLog.md) - 开发日志

### 10.2 设计文档（design/ 目录）

- [CoreArchitecture.md](./design/CoreArchitecture.md) - 核心架构设计
- [UIDesign.md](./design/UIDesign.md) - UI/UX 设计系统
- [StateManagement.md](./design/StateManagement.md) - 状态管理策略
- [StorageSystem.md](./design/StorageSystem.md) - 存储与持久化
- [RenderingSystem.md](./design/RenderingSystem.md) - 渲染系统设计

### 10.3 API 文档

- [CommandReference.md](./api/CommandReference.md) - 命令参考

### 10.4 存档文档

- [\_archive/Architecture-full-v1.md](./_archive/Architecture-full-v1.md) - 原始完整架构文档
- [\_archive/Architecture-v1.0-original.md](./_archive/Architecture-v1.0-original.md) - 原始版本备份

---

**文档维护**：

- 本文档应保持简洁，详细设计请参考 design/ 目录中的各子文档
- 新增重要设计决策时，更新本文档并创建对应的设计子文档
- 所有文档应包含"最后更新"日期和版本号
