# 开发日志

## 2025-11-15

### Bug修复：RenderSyncService初始化同步 + 自动保存优化

**提交记录**：
- `423289f` - fix: RenderSyncService初始化时同步已存在对象到渲染场景
- `f81d999` - fix: 优化自动保存体验

**问题1：路由切换后3D实体消失**

**现象**：
- 切换路由后，`ObjectManager` 中的对象数据保留
- 但 Three.js 场景中的 3D 实体全部消失

**根本原因**：
- `DesignerPage` 卸载时，Three.js 的 `Scene` 对象被销毁
- 重新进入时创建新的 `ThreeRenderer` 和新的 `Scene`
- `RenderSyncService` 只监听**未来事件**，未同步**已存在对象**

**解决方案**：
- 在 `RenderSyncService` 构造函数中添加 `syncExistingObjects()` 方法
- 遍历 `ObjectManager.getAllObjects()`，将所有对象的 `visual.mesh` 添加到新场景
- 恢复每个对象的变换（position/rotation/scale）和可见性

**代码变更**（`src/features/designer/services/RenderSyncService.ts`）：
```typescript
constructor(objectManager: ObjectManager, renderer: IRenderer) {
  this.objectManager = objectManager;
  this.renderer = renderer;
  this.setupEventListeners();
  this.syncExistingObjects(); // 🆕 初始化同步
}

private syncExistingObjects(): void {
  const allObjects = this.objectManager.getAllObjects();
  allObjects.forEach((object) => {
    if (!object.visual?.mesh) return;
    // 添加到渲染器、恢复变换、恢复可见性、记录映射
  });
}
```

**问题2：路由切换可能丢失未保存数据**

**现象**：
- 用户修改后立即切换路由（3秒debounce期间）
- 未保存的更改丢失

**解决方案**：
- 在 `DesignerPage` 的 `useEffect` 清理函数中调用 `forceSave()`
- 确保页面卸载前强制保存

**代码变更**（`src/pages/DesignerPage.tsx`）：
```typescript
React.useEffect(() => {
  // ... 初始化服务
  return () => {
    console.log('[DesignerPage] 清理 Features 层服务');
    coreServices.autoSave.forceSave(); // 🆕 路由切换前保存
  };
}, [coreServices.objectManager, coreServices.autoSave]);
```

**问题3：AutoSaveIndicator常驻显示占用空间**

**现象**：
- Indicator 在 AppBar 常驻显示，即使没有保存活动
- 占用UI空间，用户体验不佳

**解决方案**：
- 改为仅在有活动时显示，类似Toast通知
- `pending/saving/error` 状态：持续显示
- `saved` 状态：显示2秒后自动隐藏
- 状态切换时清理定时器，防止内存泄漏

**代码变更**（`src/features/designer/ui/AutoSaveIndicator.tsx`）：
```typescript
const [visible, setVisible] = useState(false);
const hideTimerRef = useRef<number | null>(null);

const handleSaved = () => {
  setStatus('saved');
  setVisible(true);
  if (hideTimerRef.current !== null) {
    clearTimeout(hideTimerRef.current);
  }
  hideTimerRef.current = setTimeout(() => {
    setVisible(false);
  }, 2000) as unknown as number;
};

// 组件清理时清除定时器
return () => {
  if (hideTimerRef.current !== null) {
    clearTimeout(hideTimerRef.current);
  }
  // ... 取消事件订阅
};

// 渲染时检查
if (!visible) return null;
```

**影响范围**：
- ✅ 路由切换保留3D场景
- ✅ 路由切换前自动保存
- ✅ AutoSaveIndicator按需显示

---

## 2025-11-15

### 架构重构：CoreServiceProvider + AutoSaveService

**里程碑**：✅ **路由切换数据保持 + 自动保存功能实现**

**问题发现**：

- 用户反馈：从设计器切换到型材库再返回时，所有场景对象消失
- 根本原因：`ObjectManager` 在 `useBusinessServices` Hook 中创建（Features 层）
- 架构违反：Core 层服务不应在 Features 层创建，随组件卸载而销毁
- 后果：路由切换 → 组件卸载 → ObjectManager 销毁 → 场景数据丢失

**解决方案**：应用级服务容器 + 自动保存

**阶段一：CoreServiceProvider 实现**

1. **创建 `src/core/CoreServiceProvider.tsx`**（130 行）
   - 定义 `CoreServices` 接口：`objectManager`, `assetService`, `eventBus`, `autoSave`
   - 使用 `useRef` 实现单例模式，确保应用生命周期内只创建一次
   - 提供 `useCoreServices()` Hook 供 Pages/Features 层访问
   - 错误处理：Context 外使用抛出友好错误信息

2. **集成到 `src/main.tsx`**
   - 用 `<CoreServiceProvider>` 包裹 `<RouterProvider>`
   - 确保核心服务在路由层之上初始化

**阶段二：AutoSaveService 实现**

1. **创建 `src/core/services/AutoSaveService.ts`**（360 行）
   - **监听机制**：订阅 ObjectManager 的 4 个事件
     - `object:added`, `object:removed`, `object:updated`, `object:transform-changed`
   - **防抖策略**：
     - 变化触发 → 标记脏数据 → 3 秒后保存
     - 最小保存间隔 30 秒（避免频繁写入）
     - 重复变化会重置 3 秒倒计时
   - **三层持久化**：
     - 内存：ObjectManager（应用生命周期）
     - localStorage：`saveProjectToLocalStorage()`（浏览器刷新后恢复）
     - 云端：`saveProjectToNetwork()`（异步，不阻塞）
   - **状态事件**：`autosave:pending/saving/saved/error`
   - **手动保存**：`forceSave()` 方法，绕过防抖和最小间隔

2. **循环依赖解决**
   - 问题：CoreServiceProvider 需要 `designerProjectStore` 获取 projectId
   - 方案：动态 import + 闭包缓存

   ```typescript
   useEffect(() => {
     let cachedGetProjectId: (() => string | null) | null = null;

     import('@/features/designer/stores/designerProjectStore').then(module => {
       cachedGetProjectId = () =>
         module.designerProjectStore.getState().projectId;
       // 初始化 AutoSaveService
     });
   }, []);
   ```

3. **类型修正**
   - `setTimeout` 返回 `number` 而非 `NodeJS.Timeout`（跨平台兼容）
   - `exportScene()` 需要 `metadata` 参数

**阶段三：DesignerPage 重构**

1. **服务拆分**
   - **Core 服务（应用级）**：从 `useCoreServices()` 获取
     - `objectManager`, `assetService`, `autoSave` - 路由切换时保持
   - **Features 服务（页面级）**：在 DesignerPage 中创建
     - `creation`, `editor`, `placement`, `renderSync` - 路由切换时销毁重建

2. **关键修改**
   - 移除 `useBusinessServices` 依赖
   - 更新项目加载：`coreServices.objectManager.importScene()`
   - 更新事件监听器：区分 `coreServices` 和 `featureServices`
   - 更新渲染逻辑：改用 `featureServices.creation` 判断就绪状态
   - 删除 `src/features/designer/hooks/useBusinessServices.ts` 文件

**阶段四：AutoSaveIndicator UI**

1. **创建 `src/features/designer/ui/AutoSaveIndicator.tsx`**（150 行）
   - 订阅 AutoSaveService 的状态事件
   - 显示保存状态：
     - 💾 未保存（灰色）
     - ⏳ 待保存/保存中（黄色/蓝色）
     - ✓ 已保存（绿色）
     - ✗ 保存失败（红色）
   - 显示最后保存时间："2秒前"、"5分钟前"
   - 提供"立即保存"按钮，调用 `autoSave.forceSave()`

2. **集成到 `src/layouts/AppBar.tsx`**
   - 仅在设计器页面（`/designer`）显示
   - 放置在右侧状态栏区域

**技术细节**：

- 使用 emoji 图标（💾⏳✓✗）避免引入 MUI icons 依赖
- 原生 `<button>` 替代 `IconButton` 组件
- Tailwind CSS 实现深色主题样式

**测试验证**：

- ✅ 路由切换（`/designer` ↔ `/library`）后场景对象保持
- ✅ 添加/删除对象后 3 秒自动保存
- ✅ 浏览器刷新后从 localStorage 恢复场景
- ✅ AutoSaveIndicator 正确显示保存状态
- ✅ 手动保存按钮立即触发保存

**架构优势**：

- ✅ 符合分层架构原则：Core 服务在 App 层初始化
- ✅ 数据持久化：内存 → localStorage → 云端（三层保护）
- ✅ 用户体验：自动保存，无需手动操作
- ✅ 可扩展：事件驱动，UI 与业务逻辑解耦

**文档更新**：

- ✅ `TODO.md` - 记录 Task #18（5 步实施计划）
- ✅ `doc/Architecture.md` - 添加 CoreServiceProvider 和 AutoSaveService 章节
- ⏳ `doc/ArchitecturePrompt.md` - 待更新

---

## 2025-11-14

### Stub 策略实现与放置功能验证（下午）

**里程碑**：✅ **首个物体成功放置到场景中**

**问题定位**：
通过 debug 日志发现，点击放置时 `confirmPlacement()` 成功调用，但 `createObjectFromAsset()` 抛出错误：

```
No instance strategy found for asset type: profile
```

**根本原因**：
`ModelFactory` 是空实现，`strategyMap` 为空，无法根据资产类型创建 `SceneObject`。

**解决方案**：Stub 策略（临时验证方案）

- 创建 `StubProfileStrategy` 实现 `InstanceStrategy` 接口
- 返回简单的 `THREE.BoxGeometry(1,1,1)` 立方体网格
- 目的：验证完整的放置流程，不实现复杂的 SVG 挤压逻辑

**实现细节**：

1. **文件创建**：`src/core/object/strategies/StubProfileStrategy.ts`
   - `createSceneObject()` 返回符合 `SceneObject` 接口的完整对象
   - 视觉模型：红色立方体网格
   - 计算模型：空实现（`nodes: [], elements: [], machining: [], connections: []`）
2. **策略注册**：修改 `ObjectManager.ts`
   - 添加 `registerStubStrategies()` 私有方法
   - 在构造函数中调用，注册 `AssetType.PROFILE → StubProfileStrategy`
   - 添加控制台日志便于调试

3. **类型修正**：迭代修复 TypeScript 错误
   - `Euler` 需要 `order` 参数
   - `MaterialProperties` 需要 `name` 字段
   - `ComputeModel` 需要 `connections` 数组
   - `SceneObject` 需要 `assetSource` 和 `assetType` 字段

**验证结果**：

- ✅ 点击型材后出现预览立方体
- ✅ 鼠标移动时预览跟随（工作平面模式正常）
- ✅ 点击确认后立方体显示在场景中
- ✅ 左侧对象列表中出现新对象
- ✅ 控制台输出策略注册和对象创建日志

**后续任务**（已记录到 `TODO.md`）：

- 实现真实的 `ProfileInstanceStrategy`（SVG 路径解析 + ExtrudeGeometry）
- 实现 `FastenerInstanceStrategy` 和 `ConnectorInstanceStrategy`
- 集成 three-bvh-csg 库处理布尔运算
- 实现加工操作（切割、钻孔、铣槽）

---

### PlacementService 工作平面模式重构（上午）

**背景**：在测试型材放置功能时发现两个问题：

1. 预览立方体随鼠标移动而视觉大小变化（透视效果）
2. 左键点击无法放置物体（地面检测失败）

**根本原因分析**：

- 当前实现使用固定的"地面碰撞"模式（y=0 平面）
- 假设用户总是俯视场景，不适配侧视/仰视等角度
- 不符合专业 CAD 软件（Inventor、SolidWorks）的交互习惯

**专业 CAD 软件的实际做法**：

- 使用"工作平面"（Work Plane）而非地面
- 工作平面垂直于相机视线，位于相机前方固定距离
- 物体沿屏幕平面移动，视觉大小基本保持一致
- 适配任意相机角度

**重构方案（工作平面模式）**：

**1. 类型定义重构** (`renderer-types.ts`)

- 新增 `WorkPlaneConfig` 接口（法线 + 平面点）
- 将 `RaycastHit.isGroundPlane` 改为 `isWorkPlane`
- 更新 `IRenderer` 接口方法签名：
  - `includeGroundPlane` → `includeWorkPlane`
  - `groundPlane?: { normal, distance }` → `workPlane?: WorkPlaneConfig`

**2. RaycasterService 重构**

- 将 `intersectGroundPlane()` 重命名为 `intersectWorkPlane()`
- 支持任意平面定义（通过法线和共面点构造平面）
- 使用 `THREE.Plane.setFromNormalAndCoplanarPoint()` 方法

**3. ThreeRenderer 更新**

- 更新 `raycastFromNDC()` 和 `raycastFromScreen()` 方法
- **关键改进**：优先返回工作平面结果（`[workPlaneHit, ...sceneHits]`）
- 删除"仅在场景对象为空时检测地面"的旧逻辑

**4. PlacementController 核心重构**

- 添加 `workPlaneDistance = 10` 配置属性（相机前方 10 米）
- 实现 `calculateWorkPlane()` 方法：
  ```typescript
  1. 获取相机位置和朝向（quaternion）
  2. 计算前方向量：(0,0,-1).applyQuaternion(camera.quaternion)
  3. 计算平面点：cameraPos + forward * workPlaneDistance
  4. 平面法线：-forward（指向相机）
  ```
- 重构 `handlePointerUpdate()` 方法：
  - 每次鼠标移动时动态调用 `calculateWorkPlane()`
  - 使用 `includeWorkPlane` 和 `workPlane` 参数
  - 添加容错处理（无命中时保持上次位置）

**架构改进对比**：

改进前：

```
固定地面 (y=0)
  ↓
只适配俯视视角
  ↓
侧视/仰视无法放置
```

改进后：

```
动态工作平面（相机前方10米）
  ↓
垂直于相机视线
  ↓
适配任意视角
```

**预期效果**：

- ✅ 物体沿屏幕平面移动（符合 2D → 3D 映射直觉）
- ✅ 视觉大小基本保持一致
- ✅ 从任意角度都能正常放置
- ✅ 符合专业 CAD 软件交互习惯

**影响范围**：

- `src/core/renderer/renderer-types.ts` - 类型定义
- `src/core/renderer/threejs/RaycasterService.ts` - 射线检测逻辑
- `src/core/renderer/threejs/ThreeRenderer.ts` - 渲染器实现
- `src/features/designer/services/PlacementService.ts` - 放置控制器

**相关 Commits**：

- feat: 重构 PlacementService 为工作平面模式

---

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
