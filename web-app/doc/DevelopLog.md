# 开发日志

## 2025-11-8

### 架构重构：解耦 Three.js 与建立渲染器抽象层

#### 背景

原有的 DesignerPage 和相关 hooks 直接依赖 Three.js，导致：、

1. 业务逻辑与渲染实现紧密耦合
2. 难以测试和维护
3. 未来更换渲染引擎成本高

#### 重构目标

建立清晰的三层架构：

1. **UI 层** (`features/designer/ui`) - 纯展示组件
2. **事件总线层** (`core/services/eventBus`) - 解耦通信
3. **服务层** (`core/renderer`, `core/object`) - 渲染器抽象和实体管理

### 主要改动

#### 1. 拆分 DesignerPage（UI/Container 分离）

**修改文件**:

- `features/designer/ui/DesignerPageUI.tsx` (新建)
- `pages/DesignerPage.tsx` (重构)

**做了什么**:

- 将 DesignerPage 拆分为纯展示组件 (DesignerPageUI) 和容器组件 (DesignerPage)
- DesignerPageUI 通过 props 接收所有数据和回调，无业务逻辑
- DesignerPage 负责初始化服务、管理状态、处理业务逻辑

**为什么**:

- 遵循 Container/Presentational 模式
- 提高组件可测试性和可复用性
- 清晰分离关注点

#### 2. 创建渲染器抽象层

**新增文件**:

- `core/renderer/renderer-types.ts` - 定义 IRenderer 接口（15个核心方法）
- `core/renderer/threejs/SceneManager.ts` - 场景管理（背景、灯光、辅助器）
- `core/renderer/threejs/CameraController.ts` - 相机和 OrbitControls 管理
- `core/renderer/threejs/RaycasterService.ts` - 射线检测服务
- `core/renderer/threejs/RendererCore.ts` - WebGL 渲染器和渲染循环
- `core/renderer/threejs/ThreeRenderer.ts` - 主入口，组合所有模块

**做了什么**:

- 定义了渲染器无关的 IRenderer 接口，包含：
  - 生命周期管理（initialize, dispose, resize）
  - 场景管理（背景色、网格、坐标轴）
  - 相机控制（位置、朝向、重置）
  - 轨道控制器（启用/禁用）
  - 射线检测（从屏幕坐标）
  - 渲染循环（启动/停止/手动渲染）
  - 原生对象访问（getNativeScene/Camera）
- 按职责单一原则拆分 Three.js 实现为 5 个模块
- 通过工厂函数 `createThreeRenderer()` 创建实例

**为什么**:

- 解耦业务代码与 Three.js，未来可替换为其他渲染引擎
- 每个模块职责单一，易于测试和维护
- 接口最小化，只暴露当前需要的功能
- 通过 `getNativeScene()` 保留高级场景的灵活性

#### 3. 引入事件总线

**新增文件**:

- `core/services/eventBus.ts`

**做了什么**:

- 使用 `mitt` 创建事件总线
- 定义两类事件：
  - **命令事件** (`command:*`) - UI 发送操作命令
  - **状态事件** (`state:*`) - 服务发布状态变化
- 提供便捷 API：`sendCommand()`, `onCommand()`, `publishState()`, `onState()`

**为什么**:

- 解耦 UI 层与服务层的直接依赖
- 支持多个组件监听同一事件
- 便于日志记录、调试和扩展

#### 4. 重构 use3DViewer Hook

**修改文件**:

- `features/designer/hooks/use3DViewer.ts`

**做了什么**:

- 移除所有 Three.js 直接导入
- 使用 `createThreeRenderer()` 创建渲染器实例
- 通过 IRenderer 接口调用方法（setCameraPosition, enableGridHelper 等）
- 返回简化的 API：`resetCamera()` 和 `getRenderer()`

**为什么**:

- Hook 不再依赖具体渲染实现
- 代码量大幅减少（从 200+ 行到 80+ 行）
- 易于测试（可以 mock IRenderer）

#### 5. 更新配置以支持新架构

**修改文件**:

- `tsconfig.app.json`
- `pages/DesignerPage.tsx`

**做了什么**:

- 移除已弃用的 `baseUrl` 配置
- 更新 `paths` 使用相对路径（`"@/*": ["./src/*"]`）
- DesignerPage 通过 `getRenderer()` 获取渲染器实例
- 使用 `getNativeScene()` 和 `getNativeCamera()` 供现有 hooks 使用

**为什么**:

- 解决 TypeScript 7.0 弃用警告
- 在 `moduleResolution: "bundler"` 模式下，相对路径更明确
- Vite 的 `vite-tsconfig-paths` 插件已处理路径映射

### 架构示意图

```arch
┌─────────────────────────────────────────┐
│   UI Layer (DesignerPageUI)            │
│   - 纯展示组件                          │
│   - 通过 props 接收数据和回调            │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│   Container (DesignerPage)              │
│   - 初始化服务                          │
│   - 管理状态                            │
│   - 调用 use3DViewer                    │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│   Hook (use3DViewer)                    │
│   - 使用 createThreeRenderer()          │
│   - 通过 IRenderer 接口操作             │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│   Abstraction (IRenderer)               │
│   - 15 个核心方法接口                   │
│   - 渲染器无关定义                      │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│   Implementation (ThreeRenderer)        │
│   ├─ SceneManager (场景/灯光)           │
│   ├─ CameraController (相机/控制器)     │
│   ├─ RaycasterService (射线检测)        │
│   └─ RendererCore (渲染器/循环)         │
└─────────────────────────────────────────┘
```

### 后续工作

- [ ] 重构服务层监听事件总线
- [ ] 更新 ModelCreationService 发布状态事件
- [ ] 优化 ObjectManager 使用渲染器抽象
- [ ] 添加单元测试

### 收益

✅ **解耦性**: Three.js 完全封装在 `core/renderer/threejs/` 内
✅ **可测试性**: 可以 mock IRenderer 进行单元测试
✅ **可维护性**: 职责单一，每个模块独立清晰
✅ **可扩展性**: 未来可替换渲染引擎而不影响业务代码
✅ **类型安全**: 完整的 TypeScript 类型定义

## 2025-11-7

增加主题

### 主题配置说明

本项目使用 Tailwind CSS v4 进行样式管理，所有主题配置都在 `src/index.css` 的 `@theme` 块中定义。

#### 颜色调色板

##### 主色 (Primary)

用于主要操作、强调内容

- `bg-primary-500`, `text-primary-500`, `border-primary-500`
- 完整范围：50-950（共11个色阶）

##### 次要色 (Secondary)

用于次要内容、辅助信息

- `bg-secondary-500`, `text-secondary-500`

##### 语义色

- **成功 (Success)**: `bg-success-500` - 绿色系
- **警告 (Warning)**: `bg-warning-500` - 黄色系
- **错误 (Error)**: `bg-error-500` - 红色系
- **信息 (Info)**: `bg-info-500` - 蓝色系

#### 字号大小

```tsx
text-xs    // 12px
text-sm    // 14px
text-base  // 16px (默认)
text-lg    // 18px
text-xl    // 20px
text-2xl   // 24px
text-3xl   // 30px
text-4xl   // 36px
text-5xl   // 48px
```

#### Drawer 宽度

```tsx
w-[var(--width-drawer-sm)]  // 256px
w-[var(--width-drawer-md)]  // 320px
w-[var(--width-drawer-lg)]  // 384px
w-[var(--width-drawer-xl)]  // 448px
```

#### 其他常用尺寸

```tsx
// 组件高度/宽度
w-[var(--spacing-sidebar)]  // 侧边栏宽度: 64px
h-[var(--spacing-toolbar)]  // 工具栏高度: 56px
h-[var(--spacing-appbar)]   // 顶部栏高度: 64px
```

#### 圆角

```tsx
rounded-[var(--radius-sm)]   // 4px
rounded-[var(--radius-md)]   // 6px
rounded-[var(--radius-lg)]   // 8px
rounded-[var(--radius-xl)]   // 12px
rounded-[var(--radius-2xl)]  // 16px
rounded-full                 // 9999px
```

#### 阴影

```tsx
shadow-[var(--shadow-sm)]
shadow-[var(--shadow-md)]
shadow-[var(--shadow-lg)]
shadow-[var(--shadow-xl)]
shadow-[var(--shadow-2xl)]
```

#### 过渡时间

```tsx
duration-[var(--duration-fast)]    // 150ms
duration-[var(--duration-normal)]  // 300ms
duration-[var(--duration-slow)]    // 500ms
```

#### Z-index 层级

```tsx
z-[var(--z-dropdown)]        // 1000
z-[var(--z-sticky)]          // 1020
z-[var(--z-fixed)]           // 1030
z-[var(--z-modal-backdrop)]  // 1040
z-[var(--z-modal)]           // 1050
z-[var(--z-popover)]         // 1060
z-[var(--z-tooltip)]         // 1070
```

#### 使用示例

##### 在 JSX/TSX 中使用

```tsx
// 使用主题颜色
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  按钮
</button>

// 使用 Drawer 宽度
<div className="w-[var(--width-drawer-md)] h-full bg-white shadow-lg">
  侧边栏内容
</div>

// 使用字号
<h1 className="text-3xl font-bold text-primary-700">
  标题
</h1>

// 使用圆角和阴影
<div className="rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-4">
  卡片内容
</div>
```

##### 在组件中使用主题辅助函数

```tsx
import { theme } from '@/theme';

// 可以使用主题对象获取类名（如果需要动态生成）
const buttonClass = `bg-${theme.colors.primary[500]}`;
```

#### 自定义颜色

如需修改主题颜色，请编辑 `src/index.css` 中的 CSS 变量：

```css
@theme {
  --color-primary-500: #3b82f6; /* 修改主色 */
  --width-drawer-md: 24rem; /* 修改 Drawer 宽度 */
}
```

修改后会自动应用到所有使用该主题变量的组件。

## 2025-11-6

由于类 CAD 编辑器需要的功能模块远超我一开始的想象，不得不对原有的扁平目录结构进行重构，改为多层目录结构以便更好地组织代码。新的目录结构如下：

```tree
src/
  pages/
    `DesignerPage.tsx`
    `LibraryPage.tsx`
  features/
    designer/
      `index.ts`                 # feature 对外导出
      ui/
        `DesignerCanvas.tsx`
        `DesignerToolbar.tsx`
      hooks/
        `useDesignerState.ts`
      services/
        `designerService.ts`    # 基于 core 服务的高层逻辑
      models/
        `Profile.ts`
    library/
      `index.ts`
      ui/
        `LibraryPage.tsx`
        `LibraryToolbar.tsx`
      hooks/
        `useAssetsLibrary.ts`
      assets/
        `components/`           # 预览、列表、编辑 UI
      services/
        `libraryService.ts`
  core/
    renderer/
      `ThreeRenderer.ts`        # Three.js 渲染器适配器、场景/相机管理
      `renderer-types.ts`
    object/
      `ObjectManager.ts`        # 管理场景实体的增删改查
      entities/
        `Asset.ts`              # 实体类/轻量封装（非全局 .d.ts）
        `SceneObject.ts`
    services/
      `storage.ts`              # 本地/后端持久化抽象
      `eventBus.ts`
  domain/
    `Asset.ts`                  # 纯类型/接口导出（module .ts）
    `User.ts`
  components/
    `AppBar/`
      `AppBar.tsx`
      `AppBarLinks.tsx`
      `StatusButtons.tsx`
    `IconButton.tsx`
  hooks/
    `useFetch.ts`
    `useDebounce.ts`
  utils/
    `format.ts`
    `validators.ts`
  types/
    `index.ts`                  # 全局小范围类型汇总（尽量少用全局声明）
  assets/
    `models/`
    `textures/`
  tests/
    `core/`
    `features/`
  index.tsx
```

重构后的目录结构将不同功能模块划分到 `features` 目录下，每个功能模块内部再细分为 UI 组件、hooks、服务、模型等子目录，便于维护和扩展。核心渲染和对象管理逻辑则集中在 `core` 目录中，保持清晰的职责分离。
