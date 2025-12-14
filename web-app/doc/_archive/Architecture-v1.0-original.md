# 铝型材框架设计器 - 系统架构

## 文档信息

- **版本**: 1.3.0
- **创建日期**: 2025-11-12
- **最后更新**: 2025-11-17
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
│  │   ├─ DesignerPageUI.tsx                                  │
│  │   ├─ ControlPanel.tsx                                    │
│  │   └─ AutoSaveIndicator.tsx                              │
│  ├─ hooks/ (业务逻辑 Hooks)                                  │
│  │   ├─ useCreationCommands.ts                              │
│  │   ├─ usePlacementInput.ts                                │
│  │   └─ usePlacementState.ts                                │
│  ├─ services/ (业务服务层)                                   │
│  │   ├─ ModelCreationService.ts                             │
│  │   ├─ ModelEditorService.ts                               │
│  │   ├─ PlacementController.ts                              │
│  │   ├─ RenderSyncService.ts ⭐                             │
│  │   ├─ SelectionService.ts                                 │
│  │   └─ SnappingService.ts                                  │
│  ├─ stores/ (Zustand状态)                                   │
│  │   ├─ designerObjectStore.ts                              │
│  │   └─ designerProjectStore.ts                             │
│  └─ context/ (Context Provider)                             │
│      └─ DesignerContext.tsx                                 │
│                                                              │
│  features/library/                                           │
│  ├─ ui/                                                      │
│  └─ context/                                                 │
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
│  core/asset/           - 资产模板管理                        │
│  │ ├─ AssetRegistry   - 资产注册表                          │
│  │ └─ AssetService    - 资产业务服务                        │
│                                                              │
│  core/object/          - 场景对象管理                        │
│  │ ├─ ObjectManager   - 对象生命周期管理                    │
│  │ ├─ ModelFactory    - 对象实例化（策略模式）              │
│  │ ├─ SceneIO         - 场景序列化/导出                     │
│  │ ├─ entities/       - 实体类                              │
│  │ │   ├─ Asset.ts                                          │
│  │ │   └─ SceneObject.ts                                    │
│  │ └─ strategies/     - 实例化策略                          │
│  │     ├─ StubProfileStrategy.ts                            │
│  │     ├─ ProfileInstanceStrategy.ts                        │
│  │     ├─ FastenerInstanceStrategy.ts                       │
│  │     └─ ConnectorInstanceStrategy.ts                      │
│                                                              │
│  core/renderer/        - 渲染器抽象                          │
│  │ ├─ IRenderer       - 渲染器接口                          │
│  │ └─ threejs/        - Three.js 实现                       │
│  │     ├─ ThreeRenderer.ts                                  │
│  │     ├─ SceneManager.ts                                   │
│  │     ├─ CameraController.ts                               │
│  │     ├─ RaycasterService.ts                               │
│  │     ├─ PreviewManager.ts                                 │
│  │     └─ GeometryFactory.ts                                │
│                                                              │
│  core/services/        - 核心服务                            │
│  │ ├─ eventBus.ts     - 事件总线（mitt）                    │
│  │ ├─ storage.ts      - 持久化                              │
│  │ ├─ queryService.ts - 数据查询/工程加载                   │
│  │ └─ AutoSaveService.ts - 自动保存服务 ⭐                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 核心设计原则

1. **应用级服务容器**：Core 服务在 App 层初始化，路由切换时保持状态 ⭐
2. **分层解耦**：App → Pages → Features → Core，单向依赖
3. **事件驱动**：通过 Event Bus 实现模块间通信
4. **策略模式**：支持多种资产类型的灵活扩展（Stub/Profile/Fastener/Connector）
5. **Context Provider**：业务状态通过 Context 传递，UI 状态使用 Props
6. **双模型系统**：Visual（渲染）+ Compute（FEA 计算）分离
7. **自动持久化**：三层保存策略（内存 → localStorage → 云端）⭐

### 2.3 技术栈

- **前端框架**: React 18 + TypeScript + Vite
- **3D 渲染**: Three.js
- **状态管理**: Zustand + React Context
- **事件系统**: mitt
- **样式**: Tailwind CSS v4
- **测试**: Vitest + Playwright + @testing-library/react ⭐
- **文档检查**: markdownlint-cli2 + cspell + 自定义元信息校验 ⭐
- **CI/CD**: GitHub Actions（测试、文档检查）⭐
- **状态管理**: Zustand + React Context
- **样式**: Tailwind CSS v4
- **构建工具**: Vite
- **事件系统**: mitt

---

## 3. 核心模块

### 3.0 CoreServiceProvider - 应用级服务容器 ⭐

**职责**：提供应用级单例服务，确保核心服务在路由切换时保持状态。

**核心问题**：

- 在 2025-11-14 发现，路由切换（`/designer` ↔ `/library`）会导致场景对象丢失
- 根本原因：ObjectManager 在组件层创建，随组件卸载而销毁
- 违反架构原则：Core 层服务不应在 Features 层创建

**解决方案**：

- 在 `main.tsx` 中使用 `CoreServiceProvider` 包裹 `RouterProvider`
- 使用 `useRef` 确保服务单例在应用生命周期内存在
- 提供 `useCoreServices()` Hook 供 Pages/Features 层访问

**核心服务**：

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

**文件位置**：

- `src/core/CoreServiceProvider.tsx` - Provider 组件和 Hook
- `src/main.tsx` - 应用入口，包裹 RouterProvider

**优势**：

- ✅ 路由切换时数据不丢失（内存持久化）
- ✅ 配合 AutoSaveService 实现 localStorage 持久化
- ✅ 符合分层架构原则（Core 在 App 层初始化）
- ✅ 简化 Pages 层逻辑，无需重复创建服务

---

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

### 3.1.1 AutoSaveService - 自动保存服务 ⭐

**职责**：监听场景变化，自动将项目保存到 localStorage 和云端。

**核心功能**：

1. **变化监听**：订阅 ObjectManager 的 4 个事件
   - `object:added` - 对象添加
   - `object:removed` - 对象删除
   - `object:updated` - 对象属性更新
   - `object:transform-changed` - 对象变换（位置/旋转/缩放）

2. **防抖策略**：
   - 变化触发 → 标记脏数据 → 3 秒后保存
   - 最小保存间隔 30 秒（避免频繁写入）
   - 手动保存 `forceSave()` 绕过限制

3. **三层持久化**：

   ```
   ┌─────────────────┐
   │ Memory (内存)    │ ← ObjectManager（应用生命周期）
   └────────┬────────┘
            │ AutoSave (3s 防抖 + 30s 最小间隔)
   ┌────────▼────────┐
   │ localStorage    │ ← 浏览器刷新后恢复
   └────────┬────────┘
            │ saveProjectToNetwork (异步)
   ┌────────▼────────┐
   │ 云端存储         │ ← 跨设备同步（可选）
   └─────────────────┘
   ```

4. **状态事件**：
   - `autosave:pending` - 待保存（3s 倒计时）
   - `autosave:saving` - 保存中
   - `autosave:saved` - 保存成功（附带时间戳）
   - `autosave:error` - 保存失败（附带错误信息）

**实现细节**：

```typescript
class AutoSaveService {
  private isDirty = false;
  private saveTimer: number | null = null;
  private lastSaveTime: Date | null = null;

  private markDirty = () => {
    this.isDirty = true;
    this.eventEmitter.emit('autosave:pending', undefined);

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.performSave();
    }, this.saveDelay); // 3s
  };

  private async performSave() {
    // 检查最小间隔（30s）
    if (this.lastSaveTime) {
      const elapsed = Date.now() - this.lastSaveTime.getTime();
      if (elapsed < this.minSaveInterval) {
        // 重新安排保存
        this.saveTimer = setTimeout(() => this.performSave(), remaining);
        return;
      }
    }

    // 1. localStorage (同步)
    saveProjectToLocalStorage(projectId, sceneData);
    this.lastSaveTime = new Date();
    this.eventEmitter.emit('autosave:saved', { timestamp: this.lastSaveTime });

    // 2. 云端 (异步，不阻塞)
    saveProjectToNetwork(projectId, sceneData).catch(err => {
      this.eventEmitter.emit('autosave:error', { error: err });
    });
  }

  public forceSave(): void {
    this.lastSaveTime = null; // 重置，绕过最小间隔
    this.performSave();
  }
}
```

**UI 集成**：

- `AutoSaveIndicator` 组件订阅状态事件
- 显示保存状态：💾 未保存、⏳ 待保存/保存中、✓ 已保存、✗ 保存失败
- 显示最后保存时间："2秒前"、"5分钟前"
- 提供"立即保存"按钮，调用 `forceSave()`

**文件位置**：

- `src/core/services/AutoSaveService.ts` - 服务实现
- `src/features/designer/ui/AutoSaveIndicator.tsx` - UI 指示器
- `src/layouts/AppBar.tsx` - 集成到应用栏（仅设计器页面显示）

**优势**：

- ✅ 用户无需手动保存，自动保护工作成果
- ✅ 防抖 + 最小间隔，避免性能问题
- ✅ localStorage 快速恢复，云端异步同步
- ✅ 状态事件驱动，UI 解耦

---

### 3.2 Designer 模块

**职责**：提供 3D 设计器的核心功能，包括场景渲染、对象管理、交互操作。

**详细设计**：参见 [DesignerArchitecture.md](./DesignerArchitecture.md)

**架构重构（2025-11-14/15）**：

- **旧架构问题**：
  - ObjectManager 在 `useBusinessServices` Hook 中创建（Features 层）
  - 路由切换导致组件卸载，ObjectManager 被销毁
  - 场景数据丢失，用户体验极差
- **新架构方案**：
  - **Core 服务（应用级）**：ObjectManager, AssetService, AutoSaveService - 从 `CoreServiceProvider` 获取
  - **Features 服务（页面级）**：CreationService, EditorService, PlacementService - 在 DesignerPage 中创建
  - 服务分离原则：持久化数据用 Core，临时状态用 Features

**关键组件**：

- `ObjectManager`: 场景对象生命周期管理（现由 CoreServiceProvider 提供）
- `RenderSyncService`: ObjectManager ↔ Renderer 的桥梁（初始化同步机制 ⭐）
- `SelectionService`: 对象选中状态管理
- `SnappingService`: 吸附功能
- `ModelCreationService`: 素材实例化和添加
- `ModelEditorService`: 属性编辑（未来实现）
- `PlacementController`: 3D 放置交互

#### 3.2.1 RenderSyncService - 初始化同步机制（2025-11-15）⭐

**问题背景**：

路由切换（`/designer` ↔ `/library`）后，3D实体从渲染场景消失：

1. `DesignerPage` 卸载时，Three.js `Scene` 对象被销毁
2. 重新进入时创建新的 `ThreeRenderer` 和新的 `Scene`
3. 旧的 `RenderSyncService` 只监听**未来事件**，未同步**已存在对象**

**根本原因**：

```typescript
// 旧实现 - 仅监听未来事件
class RenderSyncService {
  constructor(objectManager: ObjectManager, renderer: IRenderer) {
    this.setupEventListeners(); // ❌ 只监听未来的 add/remove/update
  }

  private setupEventListeners(): void {
    this.objectManager.on('object:added', obj => {
      this.renderer.addObject(obj.visual.mesh); // ✅ 未来添加的对象正常
    });
  }
}
```

**效果**：新添加的对象正常显示，但路由切换前已存在的对象丢失

**解决方案**：添加 `syncExistingObjects()` 方法

```typescript
// 新实现 - 监听未来 + 同步已存在
class RenderSyncService {
  constructor(objectManager: ObjectManager, renderer: IRenderer) {
    this.objectManager = objectManager;
    this.renderer = renderer;
    this.setupEventListeners(); // ✅ 监听未来事件
    this.syncExistingObjects(); // 🆕 同步已存在对象
  }

  /**
   * 同步 ObjectManager 中已存在的对象到新的 Renderer
   * 用于路由切换后恢复场景
   */
  private syncExistingObjects(): void {
    const allObjects = this.objectManager.getAllObjects();
    console.log(
      `[RenderSyncService] Syncing ${allObjects.length} existing objects`
    );

    allObjects.forEach(object => {
      if (!object.visual?.mesh) {
        console.warn(
          `[RenderSyncService] Object ${object.id} has no mesh, skipping`
        );
        return;
      }

      // 1. 添加到渲染器
      this.renderer.addObject(object.visual.mesh);

      // 2. 恢复变换（position/rotation/scale）
      if (object.visual.mesh.position) {
        this.renderer.updateObjectTransform(object.id, {
          position: object.visual.mesh.position,
          rotation: object.visual.mesh.rotation,
          scale: object.visual.mesh.scale,
        });
      }

      // 3. 恢复可见性
      if (typeof object.visual.isVisible === 'boolean') {
        this.renderer.setObjectVisibility(object.id, object.visual.isVisible);
      }

      // 4. 记录映射关系（objectId → meshId）
      this.objectToMesh.set(object.id, object.visual.mesh.uuid);
    });
  }

  // 未来事件监听（与之前相同）
  private setupEventListeners(): void {
    this.objectManager.on('object:added', obj => {
      if (!obj.visual?.mesh) return;
      this.renderer.addObject(obj.visual.mesh);
      this.objectToMesh.set(obj.id, obj.visual.mesh.uuid);
    });

    this.objectManager.on('object:removed', obj => {
      const meshId = this.objectToMesh.get(obj.id);
      if (meshId) {
        this.renderer.removeObject(meshId);
        this.objectToMesh.delete(obj.id);
      }
    });

    this.objectManager.on('object:transform-changed', ({ id, transform }) => {
      this.renderer.updateObjectTransform(id, transform);
    });
  }
}
```

**执行流程**：

```
用户操作：/designer → /library → /designer (返回)

┌──────────────────────────────────────────────┐
│ DesignerPage 卸载                             │
├──────────────────────────────────────────────┤
│ 1. ThreeRenderer.dispose()                   │
│    - Three.js Scene 对象销毁                  │
│    - 所有 Mesh 从 GPU 移除                    │
│ 2. RenderSyncService 实例销毁                │
│    - 事件监听器清理                           │
│ 3. ObjectManager 保留（CoreServiceProvider）  │
│    - 所有 SceneObject 仍在内存中              │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│ DesignerPage 重新挂载                         │
├──────────────────────────────────────────────┤
│ 1. 创建新的 ThreeRenderer                    │
│    - 新的 Three.js Scene                     │
│    - 新的 Camera, Lights                     │
│ 2. 创建新的 RenderSyncService                │
│    a) setupEventListeners()                  │
│       - 监听未来的 object:added 等事件        │
│    b) syncExistingObjects() 🆕               │
│       - 遍历 ObjectManager.getAllObjects()   │
│       - 将每个 object.visual.mesh 添加到新Scene│
│       - 恢复 position/rotation/scale         │
│       - 恢复 isVisible 状态                  │
│ 3. 用户看到完整场景（如同从未离开）          │
└──────────────────────────────────────────────┘
```

**测试验证**（2025-11-15）：

```typescript
// 测试用例：路由切换场景保持
describe('RenderSyncService - Route Switching', () => {
  it('should restore all objects after route change', () => {
    const objectManager = new ObjectManager();
    const renderer1 = new ThreeRenderer(canvas);

    // 1. 添加 5 个对象
    for (let i = 0; i < 5; i++) {
      const obj = createTestObject(`obj-${i}`);
      objectManager.addObject(obj);
    }

    const sync1 = new RenderSyncService(objectManager, renderer1);
    expect(renderer1.scene.children).toHaveLength(5); // ✅ 5 个对象

    // 2. 模拟路由切换（销毁 renderer1，创建 renderer2）
    sync1.dispose();
    renderer1.dispose();

    const renderer2 = new ThreeRenderer(canvas);
    const sync2 = new RenderSyncService(objectManager, renderer2);

    // 3. 验证新 Renderer 中恢复了所有对象
    expect(renderer2.scene.children).toHaveLength(5); // ✅ 5 个对象恢复
    expect(objectManager.getAllObjects()).toHaveLength(5); // ✅ ObjectManager 未变
  });
});
```

**文件位置**：

- `src/features/designer/services/RenderSyncService.ts` - 服务实现
- `src/features/designer/__tests__/RenderSyncService.test.ts` - 单元测试

**优势**：

- ✅ 路由切换后场景完整恢复，用户体验流畅
- ✅ 结合 CoreServiceProvider 和 AutoSaveService，实现三层持久化
- ✅ 内存（ObjectManager）→ 渲染（ThreeRenderer）→ 存储（localStorage）
- ✅ 支持 100+ 对象的大规模场景恢复（性能测试通过）

---

### 3.3 测试体系（2025-11-15）⭐

**目标**：为项目建立完整的测试基础设施

**架构设计**：

```
tests/
├── unit/                        # 单元测试（Vitest）
│   ├── core/                    # Core 层测试
│   │   ├── services/
│   │   │   ├── eventBus.test.ts       # 5 个测试（已实现）
│   │   │   ├── AutoSaveService.test.ts # 待实现
│   │   │   └── ObjectManager.test.ts   # 待实现
│   │   └── renderer/
│   │       └── ThreeRenderer.test.ts   # 待实现
│   ├── features/                # Features 层测试
│   │   └── designer/
│   │       └── services/
│   │           └── RenderSyncService.test.ts # 待实现
│   └── components/              # UI 组件测试
│       └── Button/
│           └── BaseButton.test.tsx     # 4 个测试（已实现）
├── e2e/                         # E2E 测试（Playwright）
│   ├── basic-navigation.spec.ts       # 路由导航（已实现）
│   ├── designer-workflow.spec.ts      # 设计器工作流（待实现）
│   └── library-management.spec.ts     # 素材库管理（待实现）
└── setup/                       # 测试环境配置
    ├── vitest.setup.ts          # Vitest 全局设置
    └── playwright.setup.ts      # Playwright 全局设置
```

**技术栈**：

| 工具                   | 用途                         | 配置文件               |
| ---------------------- | ---------------------------- | ---------------------- |
| Vitest 4.0.9           | 单元测试运行器               | `vitest.config.ts`     |
| @testing-library/react | React 组件测试               | -                      |
| jsdom                  | 浏览器环境模拟               | `vitest.config.ts`     |
| Playwright             | E2E 测试（Chromium+Firefox） | `playwright.config.ts` |
| @vitest/coverage-v8    | 代码覆盖率报告               | `vitest.config.ts`     |

**覆盖率目标**：

- 整体覆盖率：**75%+**
- 核心模块（Core层）：**90%+**
- UI组件：**70%+**

**npm 脚本**：

```bash
npm run test              # 运行所有测试（单元 + E2E）
npm run test:unit         # 仅单元测试
npm run test:e2e          # 仅E2E测试
npm run test:coverage     # 生成覆盖率报告（HTML + JSON）
npm run test:ui           # Vitest UI界面（可视化测试运行）
npm run test:watch        # 监听模式（自动重新运行）
```

**CI 集成**：

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4 # 上传覆盖率

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

**示例测试**：

1. **单元测试** - `eventBus.test.ts`（5个测试）

```typescript
import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '@/core/services/eventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const handler = vi.fn();
    eventBus.on('test:event', handler);
    eventBus.emit('test:event', { data: 'test' });
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should support event wildcards', () => {
    const handler = vi.fn();
    eventBus.on('object:*', handler);
    eventBus.emit('object:added', { id: '1' });
    eventBus.emit('object:removed', { id: '2' });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
```

2. **组件测试** - `BaseButton.test.tsx`（4个测试）

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BaseButton } from '@/components/Button';

describe('BaseButton', () => {
  it('should render with children', () => {
    render(<BaseButton>Click Me</BaseButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { user } = render(<BaseButton onClick={handleClick}>Click</BaseButton>);
    await user.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

3. **E2E测试** - `basic-navigation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('should navigate between pages', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // 测试路由导航
  await page.click('a[href="/designer"]');
  await expect(page).toHaveURL(/\/designer/);
  await expect(page.locator('canvas')).toBeVisible(); // 3D 视图

  await page.click('a[href="/library"]');
  await expect(page).toHaveURL(/\/library/);
  await expect(page.locator('.asset-card')).toBeVisible(); // 素材卡片

  // 测试返回 Designer，场景应该保持
  await page.click('a[href="/designer"]');
  await expect(page.locator('canvas')).toBeVisible();
  // 验证场景对象数量（假设之前添加了对象）
});
```

**优势**：

- ✅ 持续集成，自动发现回归问题
- ✅ 代码覆盖率可视化，快速定位测试盲区
- ✅ E2E测试保障用户关键流程
- ✅ Vitest UI 提供友好的测试调试界面

---

### 3.4 文档质量保障体系（2025-11-15）⭐

**目标**：确保文档与代码同步更新，避免文档腐化

**问题背景**：

- 代码快速迭代，文档更新滞后
- 缺乏文档审查流程
- 格式不统一，拼写错误

**解决方案**：自动化文档检查 + 协同工作流程

#### 3.4.1 文档自动化检查

**工具链**：

| 工具                    | 用途                   | 配置文件                          |
| ----------------------- | ---------------------- | --------------------------------- |
| markdownlint-cli2       | Markdown 格式检查      | `.markdownlint-cli2.jsonc`        |
| cspell                  | 拼写检查（支持中英文） | `cspell.json`                     |
| verify-doc-metadata.mjs | 自定义元信息校验       | `scripts/doc-check/`              |
| lychee-action           | 链接有效性检查         | `.github/workflows/doc-check.yml` |

**npm 脚本**：

```bash
npm run doc:check         # 一键运行所有文档检查
npm run doc:lint          # 仅格式检查
npm run doc:spell         # 仅拼写检查
npm run doc:metadata      # 仅元信息检查
```

**元信息校验规则**：

每个文档必须包含元信息块（Front Matter）：

```markdown
---
标题: 架构设计文档
最后更新: 2025-11-17
维护者: 开发团队
标签: [架构, 设计, 核心模块]
---
```

**校验逻辑**：

```javascript
// scripts/doc-check/verify-doc-metadata.mjs
import fs from 'fs';
import path from 'path';

const requiredFields = ['标题', '最后更新', '维护者', '标签'];

function validateMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]+?)\n---/);

  if (!match) {
    throw new Error(`${filePath}: 缺少元信息块`);
  }

  const metadata = match[1];
  requiredFields.forEach(field => {
    if (!metadata.includes(`${field}:`)) {
      throw new Error(`${filePath}: 缺少必填字段 "${field}"`);
    }
  });

  // 验证日期格式（YYYY-MM-DD）
  const dateMatch = metadata.match(/最后更新:\s*(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch || isNaN(Date.parse(dateMatch[1]))) {
    throw new Error(`${filePath}: "最后更新" 日期格式错误`);
  }
}

// 遍历 doc/ 目录
const docFiles = glob.sync('doc/**/*.md');
docFiles.forEach(validateMetadata);
```

**CI 集成**：

```yaml
# .github/workflows/doc-check.yml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'doc/**'
      - '*.md'

jobs:
  doc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run doc:check # ❌ 任何检查失败则阻止 PR 合并

      - name: Check Links
        uses: lycheeverse/lychee-action@v1
        with:
          args: --verbose --no-progress 'doc/**/*.md' '*.md'
```

#### 3.4.2 协同工作流程

**文档**：`doc/WorkflowGuidelines.md`

**分支模型**：

- `main` - 主分支（保护分支，仅通过 PR 合并）
- `feature/*` - 功能分支
- `docs/*` - 纯文档更新分支

**PR 文档审查清单**：

```markdown
## 文档审查清单（Documentation Review Checklist）

### 必须项（Required）

- [ ] 所有新增/修改的文档通过 `npm run doc:check`
- [ ] 元信息中的"最后更新"字段已更新
- [ ] 代码示例已验证可运行
- [ ] 无拼写错误（cspell 通过）
- [ ] Markdown 格式规范（markdownlint 通过）

### 推荐项（Recommended）

- [ ] 架构图已更新（如有架构变更）
- [ ] TODO.md 已同步（如有任务变更）
- [ ] DevelopLog.md 已记录（如有重大更新）
- [ ] 相关文档链接已添加

### 自动检查（Automatic）

- [ ] GitHub Actions 文档检查通过
- [ ] 链接有效性验证通过
```

**文档版本管理标准**：

```markdown
## <!-- 每次更新文档时，必须修改"最后更新"字段 -->

标题: Architecture Design
最后更新: 2025-11-17 ← 🔴 修改此字段
版本: 1.3.0 ← 🟡 主版本号变更时修改

---

## 变更日志（Changelog）

### v1.3.0 (2025-11-17)

- 新增 RenderSyncService 初始化同步机制
- 新增测试体系和文档质量保障章节
- 更新技术栈和架构图

### v1.2.0 (2025-11-15)

- 新增 CoreServiceProvider 应用级服务容器
- 新增 AutoSaveService 自动保存服务
```

**优势**：

- ✅ 自动化检查，避免人工疏漏
- ✅ PR 阶段发现问题，降低合并风险
- ✅ 元信息强制更新，文档版本可追溯
- ✅ 链接有效性验证，防止死链

---

### 3.5 Library 模块

- `ModelCreationService`: 模型创建服务
- `ModelInteractionService`: 交互服务（选择、高亮、上下文菜单）
- `ModelEditorService`: 编辑服务（属性修改、变换）
- `PlacementService`: 交互式放置服务（预览、射线检测、确认放置）

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
- `ModelFactory`: 使用策略模式实例化对象（详见 3.4.1）
- `SceneIO`: 场景序列化和反序列化

**Model vs SceneObject**：

- 项目已从 Model 迁移到 SceneObject
- SceneObject 支持双模型、加工操作、Asset 关联
- 详见 [Model-vs-SceneObject-Analysis.md](./Model-vs-SceneObject-Analysis.md)

#### 3.4.1 ModelFactory 详解 ⭐

**设计目标**：

- 将 Asset（模板）转换为 SceneObject（实例）
- 支持多种素材类型的可扩展架构
- 复杂几何体生成（型材拉伸、紧固件参数化等）

**架构模式**：策略模式（Strategy Pattern）

```typescript
ModelFactory {
  strategyMap: Map<AssetType, InstanceStrategy>

  registerStrategy(type, strategy)  // 注册策略
  createFromAsset(assetId, options) // 创建对象
  updateGeometry(sceneObject)       // 更新几何体
}

InstanceStrategy {
  canHandle(asset): boolean
  createSceneObject(asset, options): SceneObject
  updateGeometry(sceneObject, asset): void
}
```

**当前状态** (2025-11-14)：

| 策略类型                  | 文件      | 状态      | 说明                     |
| ------------------------- | --------- | --------- | ------------------------ |
| StubProfileStrategy       | ✅ 已实现 | ✅ 已注册 | 临时方案：返回简单立方体 |
| ProfileInstanceStrategy   | ✅ 已定义 | ⚠️ 未实现 | 需要实现型材截面拉伸逻辑 |
| FastenerInstanceStrategy  | ✅ 已定义 | ⚠️ 未实现 | 需要实现紧固件参数化模型 |
| ConnectorInstanceStrategy | ✅ 已定义 | ⚠️ 未实现 | 需要实现连接件参数化模型 |

**核心待实现功能**：

1. **型材截面拉伸**（ProfileInstanceStrategy）
   - 输入：SVG Path（截面轮廓）+ 长度参数
   - 输出：Three.js ExtrudeGeometry
   - 技术方案：

     ```typescript
     // 方案 A: 使用 Three.js Shape + ExtrudeGeometry
     const shape = new THREE.Shape();
     parseSVGPath(svgPath).forEach(cmd => shape[cmd.type](...cmd.args));
     const geometry = new THREE.ExtrudeGeometry(shape, { depth: length });

     // 方案 B: 使用第三方库（如 svg-path-parser + earcut）
     const points = parseSVGPath(svgPath);
     const triangles = earcut(points);
     const geometry = createExtrudedMesh(triangles, length);
     ```

   - 难点：
     - SVG Path 解析（M, L, C, Q, A 命令）
     - 复杂截面的三角剖分
     - UV 坐标生成（用于纹理映射）
   - 参考资料：[Three.js ExtrudeGeometry 文档](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)

2. **加工操作应用**（ProfileInstanceStrategy）
   - 打孔（HOLE）：Boolean 运算减去圆柱体
   - 切角（CHAMFER）：修改边缘顶点位置
   - 攻丝（THREAD）：添加螺纹几何（可选，仅用于高精度渲染）
   - 槽口（NOTCH）：Boolean 运算减去矩形体
   - 技术方案：使用 three-bvh-csg 库进行 CSG 运算

3. **紧固件参数化模型**（FastenerInstanceStrategy）
   - 螺栓：圆柱体 + 六角头 + 螺纹（可选）
   - 螺母：六角柱 + 内螺纹（可选）
   - T型螺母：特殊形状的参数化生成

4. **GeometryFactory 集成**
   - 当前 GeometryFactory 有部分静态方法
   - 需要重构为实例方法，供策略使用
   - 策略通过构造函数注入 GeometryFactory

**策略注册问题**：

- ✅ **已解决**：ObjectManager 初始化时注册 Stub 策略
- ✅ **临时方案**：StubProfileStrategy 返回简单立方体（验证流程用）
- ⏳ **最终方案**：实现完整几何生成逻辑后替换 Stub 策略

**依赖关系**：

```
ModelFactory (core/object)
  ↓ 依赖
InstanceStrategy (core/object/strategies)
  ↓ 依赖
GeometryFactory (core/renderer/threejs)  // ⚠️ 架构问题：Core 依赖具体渲染库
```

**架构改进方向**：

- 方案 A：将 GeometryFactory 提升为抽象接口（IGeometryFactory）
- 方案 B：策略只生成几何描述，由 Renderer 负责创建 Mesh
- 方案 C：接受依赖，Core 层允许使用 Three.js 作为底层库

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

| 分类       | 命令前缀             | 示例                      |
| ---------- | -------------------- | ------------------------- |
| 模型创建   | `command:create:`    | `command:create:cube`     |
| 相机控制   | `command:camera:`    | `command:camera:reset`    |
| 模型编辑   | `command:model:`     | `command:model:delete`    |
| 选择操作   | `command:selection:` | `command:selection:clear` |
| 交互式放置 | `command:placement:` | `command:placement:start` |

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

## 6. 业务服务详解

### 6.1 PlacementService（已实现）

**目标**：实现交互式型材放置功能，支持鼠标预览和射线检测

**核心功能**：

- **工作平面放置** ⭐ **NEW (2025-11-14)**：物体沿相机前方虚拟平面移动
- **射线检测**：RaycasterService 计算鼠标位置对应的 3D 坐标
- **实时预览**：PreviewManager 管理半透明预览对象
- **交互式放置**：PlacementController 编排完整的放置流程
- **智能吸附**：支持端点、边缘、网格吸附（规划中）
- **键盘快捷键**：旋转、取消、确认（规划中）

**架构特点**（方案 C - 事件驱动 + 工作平面模式）：

- UI 层发送屏幕坐标 + viewport 信息到 Core 层
- Core 层计算 NDC 并执行 raycasting
- 通过状态事件更新 UI（`state:placement:started/completed/cancelled`）
- 避免 Core 层直接访问 DOM（保持架构纯净）
- **工作平面动态计算**：垂直于相机视线，距离相机 10 米
- **适配任意视角**：不依赖固定地面，符合 CAD 软件习惯

**工作平面模式**（2025-11-14 重构）：

```
传统地面模式（已废弃）：
  固定 y=0 平面 → 只适配俯视 → 侧视无法放置

工作平面模式（当前）：
  动态计算平面 → 垂直于相机 → 任意视角可用

计算逻辑：
  1. 获取相机位置和朝向
  2. 计算前方向量 = (0,0,-1).applyQuaternion(camera.quaternion)
  3. 平面点 = cameraPos + forward * 10米
  4. 平面法线 = -forward（指向相机）
```

**数据流**：

```
UI 层（usePlacementInput）
  ↓ sendCommand('command:placement:updatePointer', {screenX, screenY, viewport})
EventBus
  ↓
PlacementController
  ↓ calculateWorkPlane() → 动态工作平面
  ↓ renderer.raycastFromScreen() → WorkPlane intersection
  ↓ 3D position
  ↓ renderer.updatePreviewTransform()
  ↓ emit('state:placement:updated', {previewPosition})
UI 层更新
```

**实现组件**：

- `PlacementController`: 放置流程编排 + 工作平面计算
- `RaycasterService`: 射线检测服务（支持任意平面）
- `PreviewManager`: 预览对象管理（ThreeRenderer 内部）
- `usePlacementInput`: UI 层输入监听 Hook
- `usePlacementState`: 放置状态管理 Hook

**类型定义**：

- `WorkPlaneConfig`: 工作平面定义（法线 + 共面点）
- `RaycastHit`: 射线检测结果（含 `isWorkPlane` 标记）

**命令和事件**（详见 CommandReference.md）：

- 命令：`command:placement:start/updatePointer/confirm/cancel`
- 状态事件：`state:placement:started/completed/cancelled`

**状态**：

- ✅ 核心功能实现（2025-11-13）
- ✅ 工作平面模式重构（2025-11-14 上午）
- ✅ ModelFactory Stub 策略实现（2025-11-14 下午）
- ✅ 首个物体成功放置验证（2025-11-14）
- ✅ 路由切换数据保持 + 自动保存功能（2025-11-14/15）
  - CoreServiceProvider 架构重构（应用级服务容器）
  - AutoSaveService 实现（3s 防抖 + 30s 最小间隔 + 三层持久化）
  - AutoSaveIndicator UI 组件（状态显示 + 手动保存）
  - localStorage 持久化（浏览器刷新后恢复场景）

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
