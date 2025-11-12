# 开发日志

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
- 定义命令事件（command:*）和状态事件（state:*）
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
