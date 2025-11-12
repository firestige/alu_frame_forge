# 开发日志

## 2025-11-13

### PlacementController 架构重构 - 完全隔离 Three.js

**背景**：在实施 PlacementService 后发现初始化循环问题，深入分析后发现 PlacementController 依赖 IRenderer，而 RaycasterService 和 PreviewService 直接访问 Three.js 原生对象（getNativeCamera/Scene），违反了架构隔离原则。

**问题**：

1. PlacementController 通过 RaycasterService/PreviewService 间接依赖 Three.js
2. DesignerProvider 条件渲染导致卸载-重挂载循环
3. 违背"完全隔离 Three.js"的架构设计目标

**重构方案（方案 3）**：

1. **扩展 IRenderer 接口**
   - 新增 `raycastFromNDC()` 和 `raycastFromScreen()` 方法
   - 新增预览对象管理方法：`addPreviewObject()`, `updatePreviewTransform()`, `removePreviewObject()`, `setPreviewStyle()`
   - 更新 `RaycastHit` 类型定义

2. **创建内部实现模块**
   - `PreviewManager.ts`：预览对象管理器（Core层内部实现）
   - 重构 `RaycasterService.ts`：移除 IRenderer 依赖，接收 Camera 和 Scene 参数

3. **实现 ThreeRenderer 新方法**
   - 实现射线检测抽象方法
   - 实现预览对象管理方法
   - 内部使用 RaycasterService 和 PreviewManager

4. **重构 PlacementController**
   - 移除 RaycasterService 和 PreviewService 的直接依赖
   - 改用 `renderer.raycastFromScreen()` 进行射线检测
   - 改用 `renderer.addPreviewObject()` 等方法管理预览对象
   - 完全通过 IRenderer 抽象接口工作，不知道 Three.js 的存在

5. **修复初始化循环**
   - 移除 DesignerPage 中 `services.placement` 的条件检查
   - 修改 DesignerContext 类型允许 `placement: PlacementController | null`
   - Provider 稳定渲染，不因 placement 延迟初始化而卸载

**架构对比**：

重构前：

```
PlacementController (features/)
  ↓ 直接依赖
RaycasterService (features/)
  ↓ 访问
IRenderer.getNativeCamera/Scene()
  ↓ 暴露
THREE.Camera + THREE.Scene (违反隔离)
```

重构后：

```
PlacementController (features/)
  ↓ 依赖抽象
IRenderer.raycastFromScreen()
IRenderer.addPreviewObject()
  ↓ 实现
ThreeRenderer (core/renderer/threejs/)
  ↓ 内部使用
RaycasterService (core/renderer/threejs/)
PreviewManager (core/renderer/threejs/)
  ↓ 操作
THREE.js 对象（完全隔离在 Core 层）
```

**技术亮点**：

- 完全隔离 Three.js：PlacementController 不知道 Three.js 的存在
- 易于替换渲染器：只需实现 IRenderer 的新方法
- 职责清晰：射线检测和预览管理是渲染器的职责，不是业务层职责
- 解决初始化问题：Provider 稳定，允许 placement 延迟初始化

**相关 Commits**：

- 扩展 IRenderer 接口（raycast + preview methods）
- 创建 PreviewManager 内部模块
- 重构 RaycasterService 为内部实现
- 重构 PlacementController 移除 Three.js 依赖
- 修复 DesignerPage 初始化循环

---

### PlacementService 交互式型材放置功能实现

**背景**：实现用户从 Toolbar 点击型材后，在 3D 场景中交互式选择位置和方向的功能。这是完整设计器工作流的关键一环。

**架构目标**：

- Core 层不依赖 UI 层的 DOM 元素
- 使用事件总线实现双向通信（命令 + 状态事件）
- 职责清晰：UI 层处理 DOM，Core 层处理业务逻辑

**主要工作**：

1. **PlacementController 架构重构**（commit 79e16a9）
   - 从依赖 InputManager（违反架构）改为命令驱动
   - 移除 `container: HTMLElement` 参数依赖
   - 实现命令监听器：
     - `command:placement:start` - 开始放置会话
     - `command:placement:updatePointer` - 更新指针位置
     - `command:placement:confirm` - 确认放置
     - `command:placement:cancel` - 取消放置
   - 添加状态事件发布：
     - `state:placement:started`
     - `state:placement:completed`
     - `state:placement:cancelled`

2. **核心服务实现**
   - **RaycasterService**（170 行）
     - 屏幕坐标到 3D 世界坐标转换
     - 场景物体射线检测
     - 虚拟地面交点计算
     - 新增 `getHitFromScreenCoords()` 接口（方案 C）
   - **PreviewService**（155 行）
     - 半透明预览 Mesh 渲染
     - 实时位置/姿态更新
     - 预览显示/隐藏管理

3. **UI 层集成**（commit 418edd5）
   - **usePlacementInput** hook
     - 监听 DOM 事件（pointermove, pointerdown, keydown）
     - 获取视口信息并发送命令
     - 管理光标样式（crosshair）
   - **usePlacementState** hook
     - 订阅状态事件
     - 提供响应式的 `isPlacementActive` 状态
   - **useCreationCommands** hook
     - 连接 Toolbar 和 PlacementController
     - 监听 `command:create:profile:prepare`
     - 转换为 `command:placement:start`

4. **方案 C 设计决策**
   - **问题**：如何传递坐标信息而不让 Core 层依赖 DOM？
   - **方案**：UI 层传递视口信息（left, top, width, height），Core 层计算 NDC
   - **优势**：
     - ✅ Core 层完全独立于 DOM
     - ✅ 支持窗口大小动态变化
     - ✅ 易于测试（纯数据接口）
     - ✅ 无延迟初始化问题

**数据流**：

```
用户移动鼠标
  ↓
UI: 监听 DOM 事件 → 获取视口信息 → sendCommand
  ↓
Core: 接收命令 → 计算 NDC → 射线检测 → publishState
  ↓
UI: 订阅状态 → 更新 React 状态 → 重新渲染
```

**技术亮点**：

- 事件驱动架构：命令下发 + 状态订阅
- 职责分离：UI 获取数据，Core 执行计算
- 无副作用：Core 层纯业务逻辑，无 DOM 操作

**未实施功能**（标记为 P3）：

- 智能吸附（端点/边缘/网格）
- 屏幕提示文字

**相关 Commits**：

- `79e16a9` - PlacementController 重构为命令驱动
- `418edd5` - UI 层集成（方案 C）
- `55cf44d` - 更新 TODO.md
- `79e16a9` - 删除 InputManager

---

## 2025-11-12

### 文档整理与架构文档创建

**背景**：随着项目重构的推进，doc 目录累积了大量临时文档、检查点文档和重构总结。为了便于后续查阅和维护，需要进行系统化整理。

**主要工作**：

1. **创建统一架构文档** (`Architecture.md`)
   - 整合项目概览、架构设计、核心模块说明
   - 作为架构的总览文档，引用各子系统详细设计
   - 包含开发指南和相关文档索引

2. **整理 API 文档**
   - 创建 `doc/api/` 目录
   - 移动 `CommandReference.md` 至 API 文档目录

3. **归档历史重构记录** (本文档)
   - 采用时间线 + 简要摘要方式
   - 浓缩 Summary 和 Refactoring 文档内容

4. **清理临时文档**
   - 删除 Checkpoint 文档（AI 检查进度用）
   - 删除 QuickStart 文档（会话恢复用）
   - 删除已同步到 GitHub Issues 的项目管理文档

**文档结构**：

```
doc/
├── Architecture.md (新建 - 统一架构文档)
├── AssetManagementArchitecture.md (保留)
├── DesignerArchitecture.md (保留)
├── Model-vs-SceneObject-Analysis.md (保留)
├── DevelopLog.md (本文档 - 归档历史)
└── api/
    └── CommandReference.md (API 文档)
```

---

## 2025-11-11

### Popover 组件重构

**目标**：解决 `ContextMenuContainer` 的架构违规问题（components/ 依赖 features/），创建通用 Popover 组件。

**主要成果**：

1. **创建通用组件**
   - `Popover.tsx` (320 行)：支持坐标定位和元素引用定位，边界检测，ESC/点击外部关闭
   - `PopoverMenu.tsx` (40 行)：预设菜单样式的包装组件
   - 完整的 TypeScript 类型定义和 JSDoc 注释

2. **重构现有组件**
   - `ContextMenu.tsx`：从 111 行简化到 77 行（-30.6%），移除定位、Portal、事件监听逻辑
   - `DesignerToolbar.tsx` 的 `ToolButtonWithDropdown`：从 110 行简化到 70 行（-36.4%），移除 3 个 ref 管理和位置计算

3. **标记废弃**
   - `ContextMenuContainer.tsx`：添加 @deprecated 注释和迁移指南

**架构改进**：

- 消除架构违规：components/ 不再导入 features/
- 提升复用性：1 个 Popover 已在 2 个场景复用
- 降低复杂度：定位逻辑集中管理

**详细记录**：已归档到项目 Wiki（原文档：RefactoringSummary-PopoverComponent.md）

---

## 2025-11-08

### ObjectManager 模块化 + 事件驱动架构 + Asset 管理重构

#### 1. ObjectManager 模块化（Phase 1）

**目标**：将 896 行单体文件拆分为职责清晰的模块。

**成果**：

- 拆分为 9 个模块文件（types.ts, AssetRegistry.ts, ModelRepository.ts, ModelFactory.ts, ModelOperations.ts, ConstraintManager.ts, SceneIO.ts, ObjectManager.ts, index.ts）
- 每个模块 100-200 行，职责单一
- 使用组合模式重构 ObjectManager

#### 2. 事件驱动架构（Phase 2）

**目标**：通过事件总线解耦 ObjectManager 与 Renderer。

**核心改进**：

- 定义 `ObjectManagerEvents` 类型系统（model:added, model:updated, model:removed, models:cleared）
- ObjectManager 集成 mitt 事件总线，发布对象变更事件
- 创建 `RenderSyncService` 作为 ObjectManager ↔ Renderer 的桥梁
- 标记 renderer 参数为 @deprecated

**架构演进**：

```
之前：ObjectManager → 直接依赖 → IRenderer
现在：ObjectManager → 事件 → RenderSyncService → IRenderer
```

#### 3. Asset 管理重构

**目标**：将 Asset 模块提升到核心层，与 Object、Renderer 并列。

**主要工作**：

- 创建 `core/asset/` 模块（AssetRegistry, AssetService）
- AssetService 提供业务友好 API（getProfilesBySeries, getAvailableSeries）
- 重构 ObjectManager 使用 AssetService
- Designer 和 Library 各自独立的 AssetService 实例

#### 4. Toolbar 动态型材加载

**功能**：

- 创建 `ProfileDropdownPanel` 型材选择面板
- Tab 式系列切换（20/30/40 系列）
- 从 AssetService 动态加载型材数据
- 集成交互式创建命令（command:create:profile:prepare）

**详细记录**：已归档到项目 Wiki（原文档：RefactoringSummary.md, RefactoringSummary-AssetManagement.md, RefactoringProgress.md）

---

## 2025-11-08（早期）

### 渲染器抽象层 + DesignerPage 重构

**目标**：解耦 Three.js 与建立渲染器抽象层。

#### 1. 拆分 DesignerPage（UI/Container 分离）

- 创建 `DesignerPageUI.tsx` 纯展示组件
- `DesignerPage.tsx` 作为容器组件，负责初始化服务和状态管理
- 遵循 Container/Presentational 模式

#### 2. 创建渲染器抽象层

**核心组件**：

- `IRenderer` 接口：定义 15 个核心方法（生命周期、场景管理、相机控制、渲染循环、射线检测）
- Three.js 实现拆分为 5 个模块：SceneManager, CameraController, RaycasterService, RendererCore, ThreeRenderer

**优势**：

- 解耦业务代码与 Three.js
- 未来可替换渲染引擎
- 职责单一，易于测试

#### 3. 引入事件总线

- 使用 `mitt` 创建事件总线
- 定义命令事件（command:_）和状态事件（state:_）
- 提供便捷 API：sendCommand, onCommand, publishState, onState

#### 4. 重构 use3DViewer Hook

- 移除 Three.js 直接导入
- 使用 `createThreeRenderer()` 创建渲染器实例
- 通过 IRenderer 接口调用方法
- 代码量从 200+ 行减少到 80+ 行

**收益**：

- ✅ 解耦性、可测试性、可维护性、可扩展性、类型安全

---

## 2025-11-07

### 主题系统配置

**工作**：使用 Tailwind CSS v4 建立主题系统，所有配置在 `src/index.css` 的 `@theme` 块中定义。

**主要配置**：

- 颜色调色板（主色、次要色、语义色）
- 字号大小（xs 到 5xl）
- Drawer 宽度变量
- 圆角、阴影、过渡时间、Z-index 层级

**详细说明**：已归档（原记录保留完整）

---

## 2025-11-06

### 目录结构重构

**背景**：类 CAD 编辑器功能模块复杂，原有扁平结构不足以支撑。

**新结构**：

- 采用多层目录结构
- `features/` 目录：按功能模块划分（designer, library）
- `core/` 目录：核心能力层（renderer, object, services）
- 每个 feature 内部细分 ui, hooks, services, models

**详细结构**：已归档（原记录保留完整树状图）

---

## 历史记录归档说明

以下文档内容已浓缩归档到本日志：

- `RefactoringSummary.md`
- `RefactoringSummary-AssetManagement.md`
- `RefactoringSummary-PopoverComponent.md`
- `RefactoringProgress.md`
- `RefactoringToNewArchitecture.md`

完整技术细节请参考：

- [系统架构文档](./Architecture.md)
- [Asset 管理架构](./AssetManagementArchitecture.md)
- [Designer 模块架构](./DesignerArchitecture.md)
- [Model vs SceneObject 分析](./Model-vs-SceneObject-Analysis.md)
