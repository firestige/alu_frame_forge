# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-11-14

---

## P0 - 最高优先级（立即执行）

### 18. 应用级状态管理与自动保存重构 ⭐

**状态**: 🔄 进行中（2025-11-14）

**背景问题**：

- 路由切换（/designer ↔ /library）导致场景对象丢失
- ObjectManager 在组件级别创建，组件卸载时被销毁
- 无自动保存机制，浏览器刷新/关闭导致工作成果丢失

**架构问题根源**：

- Core 层服务（ObjectManager）在 Features 层（useBusinessServices Hook）创建
- 违反架构原则：Core 层应该在应用级别，不依赖 Features 层

**解决方案**：应用级状态管理 + 自动保存机制

#### 实施计划（分 5 步执行）

**步骤 1: 创建 CoreServiceProvider（应用级服务容器）**

- [ ] 创建 `src/core/CoreServiceProvider.tsx`
- [ ] 定义 `CoreServices` 接口（objectManager, assetService, eventBus）
- [ ] 实现 `CoreServiceProvider` 组件（使用 useRef 保证单例）
- [ ] 导出 `useCoreServices` Hook

**步骤 2: 创建 AutoSaveService（自动保存服务）**

- [ ] 创建 `src/core/services/AutoSaveService.ts`
- [ ] 实现变更监听（监听 ObjectManager 事件）
- [ ] 实现防抖保存逻辑（3秒延迟 + 30秒最小间隔）
- [ ] 实现三层保存：localStorage（同步）+ 云端（异步）+ 手动保存
- [ ] 实现保存状态管理（idle/pending/saving/saved/error）
- [ ] 导出事件接口（autosave:pending/saving/saved/error）

**步骤 3: 集成 CoreServiceProvider 到应用入口**

- [ ] 修改 `src/main.tsx`，用 CoreServiceProvider 包裹 RouterProvider
- [ ] 在 CoreServiceProvider 中初始化 AutoSaveService
- [ ] 测试应用启动，验证服务单例创建

**步骤 4: 重构 DesignerPage（从应用级获取服务）**

- [ ] 修改 `src/pages/DesignerPage.tsx`
- [ ] 使用 `useCoreServices()` 替代 `useBusinessServices()`
- [ ] 保留 Features 层服务的页面级创建（RenderSyncService, PlacementController）
- [ ] 修改项目加载逻辑，确保从 localStorage 恢复数据
- [ ] 删除 `src/features/designer/hooks/useBusinessServices.ts`（不再需要）

**步骤 5: 创建自动保存状态 UI 组件**

- [ ] 创建 `src/features/designer/ui/AutoSaveIndicator.tsx`
- [ ] 订阅 AutoSaveService 事件，显示保存状态
- [ ] 集成到 AppBar 右上角
- [ ] 添加"立即保存"按钮

#### 技术架构图

```
应用根节点 (main.tsx)
    ↓
CoreServiceProvider（应用级，单例）
    ├─ ObjectManager ✅ 路由切换时保留
    ├─ AssetService ✅ 路由切换时保留
    ├─ AutoSaveService ✅ 监听变更，自动保存
    └─ eventBus ✅ 全局事件总线
    ↓
RouterProvider
    ├─ /designer → DesignerPage
    │   ↓
    │   DesignerProvider（页面级）
    │   ├─ ModelCreationService ⚡ 页面挂载时创建
    │   ├─ ModelEditorService ⚡ 页面挂载时创建
    │   ├─ PlacementController ⚡ renderer 就绪后创建
    │   └─ RenderSyncService ⚡ renderer 就绪后创建
    │
    └─ /library → LibraryPage
        └─ 库相关服务
```

#### 数据持久化策略（三层）

1. **内存层**（应用级）：ObjectManager 在应用生命周期持久化
   - 解决路由切换数据丢失问题
2. **本地存储层**（localStorage）：自动保存（防抖 3秒）
   - 解决浏览器刷新/关闭数据丢失问题
   - 最小保存间隔 30秒（避免过于频繁）
3. **云端存储层**（可选）：异步非阻塞上传
   - 解决跨设备/协作问题
   - 保存失败不影响本地保存

#### 预期效果

✅ **路由切换**：场景数据保留在内存，即时恢复，无延迟  
✅ **浏览器刷新**：从 localStorage 加载最后保存的版本  
✅ **自动保存**：用户操作 3 秒后自动保存，状态实时显示  
✅ **架构合规**：Core 层在应用级别，符合分层架构原则

**相关文档**: `doc/Architecture.md`, `doc/ArchitecturePrompt.md`

---

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

| 检查项                | 状态 | 说明                                            |
| --------------------- | ---- | ----------------------------------------------- |
| Context Provider 实现 | ✅   | DesignerContext 正确提供 services               |
| Hook 抽象             | ✅   | useDesignerContext, useDesignerObjects 正确实现 |
| Props Drilling        | ✅   | 无 services 通过 Props 传递                     |
| UI 状态持久化         | ✅   | usePersistentState 正确使用                     |
| 业务状态管理          | ✅   | 通过 Context + Zustand                          |
| 组件纯度              | ✅   | 展示组件无直接 service 依赖                     |

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
- [ ] 考虑统一命名约定：command:model:_ → command:object:_

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

### 8. ModelFactory 策略实现（型材放置流程验证）

**状态**: ✅ 已完成（2025-11-14）

**前置条件**: 依赖 PlacementService 完成

**背景**: 测试型材放置时发现：

- ✅ 预览功能正常（半透明立方体跟随鼠标）
- ✅ 射线检测正常（工作平面交点计算正确）
- ❌ 点击确认后对象无法创建，控制台报错：
  ```
  No instance strategy found for asset type: profile
  ```

**根本原因**: ModelFactory 是空实现，未注册任何 InstanceStrategy

**解决方案**: Stub 策略（临时验证方案）

**实施内容**:

- [x] 创建 `StubProfileStrategy` (`src/core/object/strategies/StubProfileStrategy.ts`)
  - 实现 `InstanceStrategy` 接口
  - `createSceneObject()` 返回简单的 `THREE.BoxGeometry(1,1,1)` 立方体
  - 目的：验证完整的放置流程，不实现复杂的 SVG 挤压逻辑
  - Visual 模型：红色立方体网格
  - Compute 模型：空实现（`nodes: [], elements: [], machining: [], connections: []`）

- [x] 修改 `ObjectManager.ts`
  - 添加 `registerStubStrategies()` 私有方法
  - 在构造函数中调用，注册 `AssetType.PROFILE → StubProfileStrategy`
  - 添加控制台日志便于调试

- [x] 类型修正（迭代修复 TypeScript 错误）
  - `Euler` 需要 `order` 参数
  - `MaterialProperties` 需要 `name` 字段
  - `ComputeModel` 需要 `connections` 数组
  - `SceneObject` 需要 `assetSource` 和 `assetType` 字段

**验证结果**:

- ✅ 点击型材后出现预览立方体
- ✅ 鼠标移动时预览跟随（工作平面模式正常）
- ✅ 点击确认后立方体显示在场景中
- ✅ 左侧对象列表中出现新对象
- ✅ 控制台输出策略注册和对象创建日志

**里程碑**: 🎉 **首个物体成功放置到场景中**

**后续任务**（P2 优先级，见任务 11-15）:

- 实现真实的 `ProfileInstanceStrategy`（SVG 路径解析 + ExtrudeGeometry）
- 实现 `FastenerInstanceStrategy` 和 `ConnectorInstanceStrategy`
- 集成 three-bvh-csg 库处理布尔运算
- 实现加工操作（切割、钻孔、铣槽）

**相关文档**:

- `doc/Architecture.md` - 3.4.1 ModelFactory 详解
- `doc/DevelopLog.md` - 2025-11-14 工作记录

---

### 9. PlacementService 工作平面模式重构

**状态**: ✅ 已完成（2025-11-14）

**背景**: 测试型材放置功能时发现：

- 预览立方体随鼠标移动而视觉大小变化（透视效果）
- 左键点击无法放置物体（地面检测失败）

**根本原因**:

- 当前实现使用固定的"地面碰撞"模式（y=0 平面）
- 假设用户总是俯视场景，不适配侧视/仰视等角度
- 不符合专业 CAD 软件（Inventor、SolidWorks）的交互习惯

**解决方案**: 工作平面模式（Work Plane Mode）

- 工作平面垂直于相机视线，位于相机前方固定距离
- 物体沿屏幕平面移动，视觉大小基本保持一致
- 适配任意相机角度

**实施内容**:

- [x] 类型定义重构 (`renderer-types.ts`)
  - 新增 `WorkPlaneConfig` 接口（法线 + 平面点）
  - 将 `RaycastHit.isGroundPlane` 改为 `isWorkPlane`
  - 更新 `IRenderer` 接口方法签名

- [x] RaycasterService 重构
  - 将 `intersectGroundPlane()` 重命名为 `intersectWorkPlane()`
  - 支持任意平面定义（通过法线和共面点构造平面）
  - 使用 `THREE.Plane.setFromNormalAndCoplanarPoint()` 方法

- [x] ThreeRenderer 更新
  - 更新 `raycastFromNDC()` 和 `raycastFromScreen()` 方法
  - 优先返回工作平面结果（`[workPlaneHit, ...sceneHits]`）

- [x] PlacementService 核心重构
  - 添加 `workPlaneDistance = 10` 配置属性
  - 实现 `calculateWorkPlane()` 方法（计算相机前方垂直平面）
  - 在 `updatePointer()` 和 `confirmPlacement()` 中使用工作平面

**验证结果**:

- ✅ 预览网格在任意视角下保持稳定位置
- ✅ 可以在侧视/仰视角度下正常放置
- ✅ 符合专业 CAD 软件交互习惯

**相关文档**:

- `doc/DevelopLog.md` - 2025-11-14 工作平面模式重构详细说明
- `doc/Architecture.md` - 6.1.1 PlacementService 交互式放置

---

### 10. 制定测试计划

**状态**: ⏳ 待执行

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

### 11. 实现 ProfileInstanceStrategy（真实型材生成）

**状态**: ⏳ 待执行

**前置条件**: StubProfileStrategy 验证通过

**描述**: 实现真实的型材截面拉伸逻辑，替换当前的 Stub 策略。

**技术方案**:

- SVG Path 解析：将 `crossSection.path` 转换为 Three.js Shape
- 几何体生成：使用 `THREE.ExtrudeGeometry` 进行拉伸
- 参数化尺寸：从 `userParams.length` 读取拉伸长度

**核心实现**:

```typescript
class ProfileInstanceStrategy implements InstanceStrategy {
  createSceneObject(
    asset: ProfileAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    // 1. 解析 SVG Path
    const shape = this.parseSVGPath(asset.parameters.crossSection.path);

    // 2. 创建拉伸几何体
    const length =
      options.userParams?.length ?? asset.parameters.length.default;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });

    // 3. 创建材质和网格
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);

    // 4. 应用加工操作（如果有）
    if (options.machiningOps && options.machiningOps.length > 0) {
      this.applyMachiningOperations(mesh, options.machiningOps);
    }

    // 5. 返回 SceneObject
    return {
      /* ... */
    };
  }
}
```

**任务列表**:

- [ ] 实现 SVG Path 解析器（支持 M, L, C, Q, A 命令）
- [ ] 实现 ExtrudeGeometry 生成逻辑
- [ ] 实现加工操作应用（布尔运算）
- [ ] 集成 three-bvh-csg 库
- [ ] 注册到 ModelFactory（替换 StubProfileStrategy）
- [ ] 测试各种型材截面

**参考资料**:

- [Three.js ExtrudeGeometry 文档](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)
- [SVG Path 规范](https://www.w3.org/TR/SVG/paths.html)
- [three-bvh-csg GitHub](https://github.com/gkjohnson/three-bvh-csg)

---

### 12. 实现 FastenerInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现紧固件（螺栓、螺母）的参数化模型生成。

**技术方案**:

- 螺栓：圆柱体 + 六角头 + 螺纹（可选）
- 螺母：六角柱 + 内螺纹（可选）
- T型螺母：特殊形状的参数化生成

**任务列表**:

- [ ] 实现螺栓几何体生成
- [ ] 实现螺母几何体生成
- [ ] 实现 T 型螺母几何体生成
- [ ] 参数化控制（规格、长度等）
- [ ] 注册到 ModelFactory

---

### 13. 实现 ConnectorInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现连接件（角码、直角连接件等）的参数化模型生成。

**任务列表**:

- [ ] 定义连接件类型枚举
- [ ] 实现各种连接件几何体生成
- [ ] 参数化控制（尺寸、孔位等）
- [ ] 注册到 ModelFactory

---

### 14. GeometryFactory 重构

**状态**: ⏳ 待执行

**描述**: 重构 GeometryFactory 为实例方法，供策略使用。

**当前问题**:

- GeometryFactory 有静态方法
- 策略无法方便地使用其功能

**重构方案**:

- 将 GeometryFactory 改为实例类
- 策略通过构造函数注入 GeometryFactory
- 提供通用的几何体生成方法（圆柱、六角柱、布尔运算等）

---

### 15. 加工操作实现

**状态**: ⏳ 待执行

**描述**: 实现型材的加工操作（打孔、切角、攻丝、槽口）。

**技术方案**: 使用 three-bvh-csg 库进行 CSG 运算

**任务列表**:

- [ ] 集成 three-bvh-csg 库
- [ ] 实现打孔操作（减去圆柱体）
- [ ] 实现切角操作（修改顶点位置）
- [ ] 实现攻丝操作（添加螺纹几何）
- [ ] 实现槽口操作（减去矩形体）
- [ ] 在 ProfileInstanceStrategy 中应用

---

## P3 - 低优先级（长期规划）

### 16. 建立持续集成机制

**状态**: ⏳ 待执行

**描述**: 自动化构建、测试和部署流程。

**任务**:

- [ ] 配置 GitHub Actions
  - 自动运行单元测试
  - 自动运行 Lint 检查
  - 自动构建生产版本
- [ ] 配置测试覆盖率报告
  - 配置自动部署（Preview 环境）
- [ ] 设置 PR 检查门禁

---

### 17. 建立文档与代码同步机制

**状态**: ⏳ 待执行

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

### ✅ 2025-11-14

- PlacementService 工作平面模式重构
  - 从固定地面（y=0）改为相机相对工作平面
  - 支持任意视角下的物体放置
  - 符合专业 CAD 软件交互习惯
- ModelFactory Stub 策略实现
  - 创建 StubProfileStrategy（返回简单立方体）
  - ObjectManager 注册 Stub 策略
  - 验证完整的型材放置流程
- 🎉 **里程碑：首个物体成功放置到场景中**

### ✅ 2025-11-13

- PlacementController 架构重构（完全隔离 Three.js）
  - 扩展 IRenderer 接口添加射线检测和预览管理方法
  - 创建 PreviewManager 内部模块
  - 重构 RaycasterService 为内部实现
  - PlacementController 通过 IRenderer 抽象工作
  - 修复初始化循环问题（允许 placement 为 null）
- PlacementService 交互式型材放置功能

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
