# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-11-12

---

## P0 - 最高优先级（立即执行）

### 1. 检查 Context Provider 重构完成度

**状态**: ✅ 已完成检查（2025-11-12）

**描述**: 验证 Context Provider 重构是否彻底完成，确保内部状态使用 Props，业务状态通过 Context 传递。

**检查项**:
- [x] 检查所有 UI 组件是否正确使用 `useDesignerContext()` 访问服务
- [x] 检查是否还有 Props Drilling 现象（多层传递 props）
- [x] 验证 UI 状态是否使用 `usePersistentState()` 持久化
- [x] 验证业务状态是否通过 Context 传递
- [x] 如发现未完成的部分，继续重构

**检查结果**: ✅ **通过 - 重构已完整且正确实施**

#### 架构符合性验证

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Context Provider 实现 | ✅ | DesignerContext 正确提供 services |
| Hook 抽象 | ✅ | useDesignerContext, useDesignerObjects 正确实现 |
| Props Drilling | ✅ | 无 services 通过 Props 传递 |
| UI 状态持久化 | ✅ | usePersistentState 正确使用 |
| 业务状态管理 | ✅ | 通过 Context + Zustand |
| 组件纯度 | ✅ | 展示组件无直接 service 依赖 |

#### 代码质量亮点
1. **解耦良好**: ControlPanel 仅使用 event bus，无 Context 依赖
2. **Hook 封装**: useDesignerObjects 封装 Zustand store 访问
3. **Props 语义化**: 回调命名清晰（onSelectObject, onUpdateProperty）
4. **类型安全**: 所有 Props 接口定义完整

**相关文档**: `doc/DesignerArchitecture.md`

---

### 2. 检查并清理 Model → SceneObject 遗留代码

**状态**: ✅ 已完成检查（2025-11-12）

**描述**: 检查代码库中是否存在 Model 相关的遗留代码和 deprecated 标记。

**检查结果**:

#### ✅ 已完成迁移的部分
- ✅ **类型定义**: 无 `Model<TMetadata>` 类型引用
- ✅ **@deprecated 标记**: 所有 deprecated 文件已在任务 5 中删除
- ✅ **core/object/ 模块**: 完全使用 SceneObject，无 Model 残留

#### ⚠️ 发现的命名约定问题（非遗留代码）

以下使用了 "Model" 命名，但都是**新架构的组件**，不是旧 Model 的遗留代码：

1. **ModelFactory** (`src/core/object/ModelFactory.ts`)
   - 用途：SceneObject 实例化工厂（策略模式）
   - 状态：✅ 正常使用，功能正确
   - 建议：可考虑重命名为 `SceneObjectFactory`（非强制）

2. **ModelCreationService** (`src/features/designer/services/ModelCreationService.ts`)
   - 用途：业务层创建服务
   - 状态：✅ 正常使用，功能正确
   - 建议：可考虑重命名为 `ObjectCreationService`（非强制）

3. **ModelEditorService** (`src/features/designer/services/ModelEditorService.ts`)
   - 用途：业务层编辑服务
   - 状态：✅ 正常使用，功能正确
   - 建议：可考虑重命名为 `ObjectEditorService`（非强制）

4. **命令事件命名** (`src/core/services/eventBus.ts`)
   - `command:model:delete`, `command:model:update` 等
   - 状态：✅ 正常使用，功能正确
   - 建议：可考虑重命名为 `command:object:*`（非强制）

5. **VisualModel 和 ComputeModel** (`src/core/object/types/scene-object.ts`)
   - 用途：SceneObject 的双模型系统类型
   - 状态：✅ 正常使用，符合设计
   - 建议：无需修改（"Model" 在这里是 "模型" 的通用含义）

#### 📝 文档状态
- `doc/Model-vs-SceneObject-Analysis.md`: 保留作为架构演进历史文档
- `doc/ArchitecturePrompt.md`: 已正确描述 SceneObject 架构

#### 🎯 结论
- **无遗留代码需要清理**
- 所有使用 "Model" 命名的组件都是新架构的一部分
- 命名约定可以在后续优化（P3 优先级），但不影响功能

**后续建议**（可选，P3 优先级）:
- [ ] 考虑统一命名约定：ModelFactory → SceneObjectFactory
- [ ] 考虑统一命名约定：ModelCreationService → ObjectCreationService
- [ ] 考虑统一命名约定：ModelEditorService → ObjectEditorService
- [ ] 考虑统一命名约定：command:model:* → command:object:*

**相关文档**: `doc/Model-vs-SceneObject-Analysis.md`

---

## P1 - 高优先级（本周完成）

### 3. 整理和归档项目文档

**状态**: ✅ 已完成（2025-11-12）

**完成内容**:
- ✅ 创建 `doc/Architecture.md` 统一架构文档
- ✅ 创建 `doc/api/` 目录，移动 CommandReference.md
- ✅ 更新 `doc/DevelopLog.md`，归档历史重构记录
- ✅ 删除临时文档（Checkpoint, QuickStart）
- ✅ 删除已同步到 GitHub 的项目管理文档
- ✅ 删除已归档的 Summary 文档

---

### 4. 移除废弃的 ContextMenu 相关代码

**状态**: ✅ 已完成（2025-11-12）

**描述**: 彻底移除旧的 ContextMenu 实现，统一使用 Popover 组件。

**完成内容**:
- ✅ 删除 `src/components/menu/ContextMenuContainer.tsx`
- ✅ 删除 `src/components/menu/ContextMenu.tsx`
- ✅ 删除整个 `src/components/menu/` 目录
- ✅ 清理 `DesignerPageUI.tsx` 中被注释的 ContextMenuContainer 代码
- ✅ 验证无其他引用

**验证结果**:
- `src/components/menu/` 目录已完全删除
- `DesignerPageUI.tsx` 中的注释代码已清理
- 仅保留 features/ 中的 `ContextMenuState` 类型定义（用于 InteractionState）
- Popover 组件示例文档中的 contextMenu 引用保留（仅为示例说明）

**相关组件**:
- `src/components/Popover/` - 新的通用组件
- `src/features/designer/ui/` - 业务层上下文菜单实现（待实现）

---

### 5. 清理 deprecated 文件（Model 遗留代码）

**状态**: ✅ 已完成（2025-11-12）

**描述**: 删除已标记为 deprecated 的文件，这些文件包含旧的 Model 相关实现。

**完成内容**:
- ✅ 删除 `src/core/object/ModelOperations.deprecated.ts`
- ✅ 删除 `src/core/object/ModelRepository.deprecated.ts`
- ✅ 删除 `src/core/object/ConstraintManager.deprecated.ts`
- ✅ 验证这些文件没有被任何地方引用
- ✅ 检查 `src/core/object/index.ts` 导出列表（无需修改）

**验证结果**: 
- 文件已成功删除
- `src/core/object/` 目录保持清洁，仅包含：
  - `ModelFactory.ts`, `ObjectManager.ts`, `SceneIO.ts`
  - `entities/`, `strategies/`, `types/` 子目录
- 无任何引用残留

---

### 6. 修复架构违规：components/ 依赖 stores/

**状态**: ✅ 已完成（2025-11-12）

**描述**: `components/` 目录中的通用组件不应依赖 `stores/` 中的业务状态。

**问题文件**:
- `src/components/drawer/Drawer.tsx` - 依赖 `@/stores/drawerStore`
- `src/components/AppBar/AppBar.tsx` - 依赖 `@/stores/drawerStore`

**执行方案**: ✅ **方案 A（移动到 layouts/）**
- 这些组件包含业务逻辑（drawer 状态管理），不是纯 UI 组件
- 移动到 `layouts/` 更符合架构分层
- `drawerStore` 保留在 stores/ 作为全局布局状态

**执行内容**:
- [x] 将 `Drawer.tsx` 移动到 `src/layouts/Drawer.tsx`
- [x] 将 `AppBar.tsx` 移动到 `src/layouts/AppBar.tsx`
- [x] 更新 `BaseLayout.tsx` 的导入路径
- [x] 删除空目录 `src/components/drawer/` 和 `src/components/AppBar/`
- [x] 验证构建成功

**验证结果**:
- ✅ 文件移动成功
- ✅ `src/layouts/` 现包含：AppBar.tsx, BaseLayout.tsx, Drawer.tsx
- ✅ `src/components/` 不再包含 AppBar/ 和 drawer/ 目录
- ✅ BaseLayout.tsx 导入路径已更新为相对路径
- ✅ 无引用错误（grep 搜索确认）
- ✅ 架构违规已解决

**架构改进**:
- `layouts/` 现在负责布局组件和布局状态管理
- `components/` 保持纯 UI 组件职责
- 符合三层架构原则

---

## P2 - 中优先级（本月完成）

### 7. 实施 PlacementService（交互式型材放置）

**状态**: ✅ 已完成（2025-11-13）

**前置条件**: 依赖 P0.1（Context Provider 完成验证）

**描述**: 实现交互式型材放置功能，用户可以从 Toolbar 点击型材后在 3D 场景中选择位置和方向。

**完成内容**:
- [x] 创建 `PlacementController` 类（命令驱动架构）
  - 状态管理（idle / placing）
  - 监听 eventBus 命令（不直接监听 DOM）
  - 发布状态事件供 UI 订阅
- [x] 实现 `RaycasterService` 
  - 基础交点计算（屏幕坐标 → NDC → 3D 点）
  - 虚拟地面放置
  - 新增 `getHitFromScreenCoords()` 接口（方案 C）
- [x] 实现 `PreviewService`
  - 半透明预览 Mesh
  - 实时位置更新
- [x] UI 层集成（3 个 hooks）
  - `usePlacementInput`: 监听 DOM，发送命令
  - `usePlacementState`: 订阅状态，提供响应式状态
  - `useCreationCommands`: 连接 Toolbar 和 PlacementController
- [x] UI 反馈
  - 光标样式切换（crosshair）
  - 键盘支持（ESC 取消）
- [ ] 智能吸附（P3 优先级，未实施）
  - 端点吸附
  - 边缘吸附
  - 网格吸附
- [ ] 屏幕提示文字（P3 优先级，未实施）

**架构决策**:
- 采用方案 C：UI 传递视口信息，Core 计算 NDC
- 使用事件总线实现双向通信（命令 + 状态事件）
- Core 层无 DOM 依赖，避免延迟初始化问题

**提交记录**:
- commit 79e16a9: PlacementController 重构为命令驱动
- commit 418edd5: UI 层集成和方案 C 实施

**相关文档**: 
- `doc/Architecture.md` - 事件驱动架构
- GitHub Issues - ProfileInteractiveCreation（已同步）

---

### 8. 制定测试计划

**描述**: 建立完整的测试体系，确保代码质量和功能正确性。

**任务**:
- [ ] 制定单元测试计划
  - 确定需要测试的核心模块（ObjectManager, AssetService, etc.）
  - 选择测试框架（Jest + React Testing Library）
  - 编写测试用例规范
- [ ] 制定集成测试计划
  - 测试模块间协作（Event Bus, Context Provider）
  - 测试数据流（命令 → 服务 → Store → UI）
- [ ] 制定 E2E 测试计划
  - 测试核心用户流程（创建型材、编辑属性、保存工程）
  - 选择 E2E 框架（Playwright / Cypress）
- [ ] 分配测试资源和时间

**交付物**:
- 测试计划文档
- 测试用例列表
- 测试覆盖率目标

---

## P3 - 低优先级（长期规划）

### 9. 建立持续集成机制

**描述**: 自动化构建、测试和部署流程。

**任务**:
- [ ] 配置 GitHub Actions
  - 自动运行单元测试
  - 自动运行 Lint 检查
  - 自动构建生产版本
- [ ] 配置测试覆盖率报告
- [ ] 配置自动部署（Preview 环境）
- [ ] 设置 PR 检查门禁

---

### 10. 建立文档与代码同步机制

**描述**: 确保文档内容与代码库保持同步。

**任务**:
- [ ] 建立文档审查流程
  - PR 中涉及架构变更时需更新文档
  - Code Review 包含文档审查
- [ ] 建立文档版本管理
  - 文档添加版本号和更新日期
  - 过期文档标记或归档
- [ ] 建立文档自动化检查
  - 检查文档中的代码示例是否有效
  - 检查文档链接是否失效

---

## 已完成事项

### ✅ 2025-11-13
- PlacementService 交互式型材放置功能（P2.7）

### ✅ 2025-11-12
- 文档整理与架构文档创建

### ✅ 2025-11-11
- Popover 组件重构

### ✅ 2025-11-08
- ObjectManager 模块化
- 事件驱动架构
- Asset 管理重构
- Toolbar 动态型材加载

### ✅ 2025-11-08（早期）
- 渲染器抽象层
- DesignerPage 重构
- 事件总线引入

### ✅ 2025-11-07
- 主题系统配置

### ✅ 2025-11-06
- 目录结构重构

---

## 参考文档

- [系统架构文档](./doc/Architecture.md)
- [开发日志](./doc/DevelopLog.md)
- [Asset 管理架构](./doc/AssetManagementArchitecture.md)
- [Designer 模块架构](./doc/DesignerArchitecture.md)
- [命令系统参考](./doc/api/CommandReference.md)

---

**维护说明**: 本文档应随项目进展定期更新，已完成的事项移至"已完成事项"部分，新增事项根据优先级添加。
