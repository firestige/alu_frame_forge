# 2025-11-7

增加主题

# 主题配置说明

本项目使用 Tailwind CSS v4 进行样式管理，所有主题配置都在 `src/index.css` 的 `@theme` 块中定义。

## 颜色调色板

### 主色 (Primary)

用于主要操作、强调内容

- `bg-primary-500`, `text-primary-500`, `border-primary-500`
- 完整范围：50-950（共11个色阶）

### 次要色 (Secondary)

用于次要内容、辅助信息

- `bg-secondary-500`, `text-secondary-500`

### 语义色

- **成功 (Success)**: `bg-success-500` - 绿色系
- **警告 (Warning)**: `bg-warning-500` - 黄色系
- **错误 (Error)**: `bg-error-500` - 红色系
- **信息 (Info)**: `bg-info-500` - 蓝色系

## 字号大小

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

## Drawer 宽度

```tsx
w-[var(--width-drawer-sm)]  // 256px
w-[var(--width-drawer-md)]  // 320px
w-[var(--width-drawer-lg)]  // 384px
w-[var(--width-drawer-xl)]  // 448px
```

## 其他常用尺寸

```tsx
// 组件高度/宽度
w-[var(--spacing-sidebar)]  // 侧边栏宽度: 64px
h-[var(--spacing-toolbar)]  // 工具栏高度: 56px
h-[var(--spacing-appbar)]   // 顶部栏高度: 64px
```

## 圆角

```tsx
rounded-[var(--radius-sm)]   // 4px
rounded-[var(--radius-md)]   // 6px
rounded-[var(--radius-lg)]   // 8px
rounded-[var(--radius-xl)]   // 12px
rounded-[var(--radius-2xl)]  // 16px
rounded-full                 // 9999px
```

## 阴影

```tsx
shadow-[var(--shadow-sm)]
shadow-[var(--shadow-md)]
shadow-[var(--shadow-lg)]
shadow-[var(--shadow-xl)]
shadow-[var(--shadow-2xl)]
```

## 过渡时间

```tsx
duration-[var(--duration-fast)]    // 150ms
duration-[var(--duration-normal)]  // 300ms
duration-[var(--duration-slow)]    // 500ms
```

## Z-index 层级

```tsx
z-[var(--z-dropdown)]        // 1000
z-[var(--z-sticky)]          // 1020
z-[var(--z-fixed)]           // 1030
z-[var(--z-modal-backdrop)]  // 1040
z-[var(--z-modal)]           // 1050
z-[var(--z-popover)]         // 1060
z-[var(--z-tooltip)]         // 1070
```

## 使用示例

### 在 JSX/TSX 中使用

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

### 在组件中使用主题辅助函数

```tsx
import { theme } from '@/theme';

// 可以使用主题对象获取类名（如果需要动态生成）
const buttonClass = `bg-${theme.colors.primary[500]}`;
```

## 自定义颜色

如需修改主题颜色，请编辑 `src/index.css` 中的 CSS 变量：

```css
@theme {
  --color-primary-500: #3b82f6; /* 修改主色 */
  --width-drawer-md: 24rem; /* 修改 Drawer 宽度 */
}
```

修改后会自动应用到所有使用该主题变量的组件。

# 2025-11-6

由于类 CAD 编辑器需要的功能模块远超我一开始的想象，不得不对原有的扁平目录结构进行重构，改为多层目录结构以便更好地组织代码。新的目录结构如下：

```
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
