# UI/UX 设计系统

**最后更新**: 2025-11-21

本文档详细说明铝型材框架设计器的 UI/UX 设计系统，包括主题系统、动画设计、组件库和响应式布局。

---

## 1. 技术栈

### 1.1 核心库

- **React 19** - UI 框架
- **Tailwind CSS 4.0** - 原子化 CSS 框架
- **Framer Motion** - 动画库
- **Headless UI** - 无样式 UI 组件基础

### 1.2 设计原则

1. **原子化设计** - 使用 Tailwind 原子类构建 UI
2. **主题一致性** - 基于 CSS 变量的统一主题系统
3. **流畅动画** - Framer Motion 提供自然的交互反馈
4. **响应式优先** - Mobile-first 设计理念
5. **无障碍访问** - 遵循 WCAG 2.1 标准

---

## 2. 主题系统

### 2.1 设计目标

- **统一视觉语言** - 所有组件使用相同的颜色、间距、阴影规范
- **易于定制** - 基于 CSS 变量，支持动态主题切换
- **类型安全** - TypeScript 类型推导，防止拼写错误

### 2.2 颜色体系

#### 语义化颜色

```typescript
// src/theme/index.ts
export const theme = {
  colors: {
    primary: {
      // 主色调 - 品牌色
      50: 'primary-50',
      100: 'primary-100',
      // ... 900, 950
    },
    secondary: {
      // 辅助色 - 界面灰度
      50: 'secondary-50',
      // ...
    },
    success: {
      /* 成功状态 */
    },
    warning: {
      /* 警告状态 */
    },
    error: {
      /* 错误状态 */
    },
    info: {
      /* 信息提示 */
    },
  },
};
```

#### CSS 变量定义

```css
/* src/index.css */
:root {
  /* Primary - 品牌蓝色 */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;

  /* Secondary - 中性灰 */
  --color-secondary-50: #f9fafb;
  --color-secondary-500: #6b7280;
  --color-secondary-900: #111827;

  /* 语义色 */
  --color-success-500: #10b981;
  --color-warning-500: #f59e0b;
  --color-error-500: #ef4444;
}
```

#### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          500: 'var(--color-primary-500)',
          // ...
        },
      },
    },
  },
};
```

### 2.3 设计 Tokens

#### 间距系统

```typescript
// theme.spacing
spacing: {
  appbar: 'var(--spacing-appbar)',      // 64px - AppBar 高度
  footer: 'var(--spacing-footer)',      // 48px - Footer 高度
  drawerSm: 'var(--width-drawer-sm)',   // 256px - 侧边栏宽度
}
```

#### 阴影系统

```typescript
// theme.shadow
shadow: {
  sm: 'shadow-[var(--shadow-sm)]',
  md: 'shadow-[var(--shadow-md)]',
  lg: 'shadow-[var(--shadow-lg)]',
  xl: 'shadow-[var(--shadow-xl)]',
  '2xl': 'shadow-[var(--shadow-2xl)]',
}
```

#### 动画时长

```typescript
// theme.duration
duration: {
  fast: 'duration-[var(--duration-fast)]',      // 150ms - 微交互
  normal: 'duration-[var(--duration-normal)]',  // 300ms - 默认动画
  slow: 'duration-[var(--duration-slow)]',      // 500ms - 复杂动画
}
```

#### z-index 层级

```typescript
// theme.zIndex
zIndex: {
  dropdown: 'z-[var(--z-dropdown)]',          // 1000
  sticky: 'z-[var(--z-sticky)]',              // 1020
  fixed: 'z-[var(--z-fixed)]',                // 1030
  modalBackdrop: 'z-[var(--z-modal-backdrop)]', // 1040
  modal: 'z-[var(--z-modal)]',                // 1050
  popover: 'z-[var(--z-popover)]',            // 1060
  tooltip: 'z-[var(--z-tooltip)]',            // 1070
}
```

---

## 3. Framer Motion 动画设计

### 3.1 设计原则

1. **自然流畅** - 使用 Spring 动画，模拟物理运动
2. **微交互反馈** - Hover/Tap 状态提供即时反馈
3. **进出场动画** - AnimatePresence 处理组件挂载/卸载
4. **性能优先** - 使用 transform/opacity 属性，避免 layout 重排

### 3.2 Drawer 侧边栏动画

```tsx
// src/layouts/Drawer.tsx
<motion.div
  initial={false}
  animate={{
    width: isOpen ? 'var(--width-drawer-sm)' : 0,
    opacity: isOpen ? 1 : 0,
  }}
  transition={{
    type: 'spring',
    stiffness: 300, // 弹簧刚度
    damping: 30, // 阻尼系数
    mass: 0.8, // 质量
  }}
  className="drawer bg-secondary-50 shadow-lg"
>
  {/* 内容 */}
</motion.div>
```

**参数说明**：

- `stiffness: 300` - 较高的刚度，动画快速响应
- `damping: 30` - 适中的阻尼，避免过度振荡
- `mass: 0.8` - 较轻的质量，快速启动

### 3.3 背景遮罩动画

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 z-20 md:hidden"
      onClick={close}
    />
  )}
</AnimatePresence>
```

**设计要点**：

- `AnimatePresence` - 管理组件退出动画
- `md:hidden` - 仅在移动端显示遮罩
- `duration: 0.2` - 快速淡入淡出（200ms）

### 3.4 列表项微交互

```tsx
<motion.li
  whileHover={{ scale: 1.02, x: 4 }} // 悬停时放大 2%，右移 4px
  whileTap={{ scale: 0.98 }} // 点击时缩小 2%
>
  <a href="/designer">设计器</a>
</motion.li>
```

**交互反馈**：

- **Hover** - 轻微放大 + 右移，提示可点击
- **Tap** - 轻微缩小，模拟按下效果

---

## 4. 组件库

### 4.1 Popover 组件

#### 设计目标

- **灵活定位** - 支持多种 anchor 定位策略
- **防溢出** - 自动调整位置，避免超出视口
- **键盘交互** - ESC 关闭，Tab 焦点管理
- **无障碍** - ARIA 属性支持

#### API 设计

```tsx
// src/components/Popover/Popover.tsx
interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;

  // 定位方式 1：相对于 DOM 元素
  anchorEl?: HTMLElement | null;
  anchorOrigin?: OriginConfig; // 锚点原点
  transformOrigin?: OriginConfig; // 弹窗原点

  // 定位方式 2：绝对位置
  position?: { x: number; y: number };

  // 偏移和防溢出
  offset?: OffsetConfig;
  preventOverflow?: boolean;

  // 交互
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;

  // 样式
  className?: string;
}
```

#### 使用示例

```tsx
// 相对定位
<Popover
  open={open}
  onClose={handleClose}
  anchorEl={buttonRef.current}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  offset={{ x: 0, y: 8 }}
>
  <div>弹窗内容</div>
</Popover>
```

#### PopoverMenu 预设

```tsx
// src/components/Popover/PopoverMenu.tsx
export const PopoverMenu: React.FC<PopoverProps> = props => {
  const menuClassName = `bg-white rounded-lg shadow-lg border border-gray-200 ${props.className}`;

  return (
    <Popover {...props} className={menuClassName}>
      {props.children}
    </Popover>
  );
};
```

### 4.2 Button 组件族

#### BaseButton - 基础按钮

```tsx
// src/components/Button/BaseButton.tsx
interface BaseButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

#### IconButton - 图标按钮

```tsx
// src/components/Button/IconButton.tsx
interface IconButtonProps {
  icon: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary';
  onClick?: () => void;
  'aria-label': string; // 必需，无障碍支持
}
```

#### ButtonGroup - 按钮组

```tsx
// src/components/Button/ButtonGroup.tsx
<ButtonGroup>
  <BaseButton>选项 1</BaseButton>
  <BaseButton>选项 2</BaseButton>
  <BaseButton>选项 3</BaseButton>
</ButtonGroup>
```

### 4.3 Divider 组件

```tsx
// src/components/Divider/Divider.tsx
<Divider variant="fullWidth" />  // 全宽分隔线
<Divider variant="inset" />      // 内嵌分隔线

// src/components/Divider/VerticalDivider.tsx
<VerticalDivider />  // 垂直分隔线（Toolbar 中使用）
```

---

## 5. 响应式布局

### 5.1 断点系统

```javascript
// tailwind.config.js
screens: {
  'sm': '640px',   // 手机横屏
  'md': '768px',   // 平板
  'lg': '1024px',  // 桌面
  'xl': '1280px',  // 大桌面
  '2xl': '1536px', // 超大桌面
}
```

### 5.2 移动端优化

#### Drawer 侧边栏

```tsx
{
  /* 背景遮罩 - 仅移动端显示 */
}
<motion.div className="fixed inset-0 bg-black/50 z-20 md:hidden" />;

{
  /* 关闭按钮 - 仅移动端显示 */
}
<button className="p-1 hover:bg-secondary-200 rounded-md md:hidden">
  <CloseIcon />
</button>;
```

#### 响应式栅格

```tsx
{
  /* 素材卡片 - 响应式列数 */
}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
  {assets.map(asset => (
    <GalleryCard key={asset.id} {...asset} />
  ))}
</div>;
```

---

## 6. 布局系统

### 6.1 BaseLayout - 全局布局

```tsx
// src/layouts/BaseLayout.tsx
<div className="flex flex-col h-screen overflow-hidden">
  {/* 固定顶部 AppBar */}
  <div className="fixed top-0 left-0 right-0 z-50">
    <AppBar />
  </div>

  {/* 主内容区域 - 占据 AppBar 和 Footer 之间空间 */}
  <main className="flex-1 overflow-y-auto bg-secondary-50 mt-[var(--spacing-appbar)] mb-[var(--spacing-footer)]">
    <Outlet /> {/* React Router 出口 */}
  </main>

  {/* 固定底部 Footer */}
  <div className="fixed bottom-0 left-0 right-0 z-50">
    <Footer />
  </div>
</div>
```

### 6.2 AppBar - 顶部导航栏

```tsx
// src/layouts/AppBar.tsx
<div className="app-bar bg-gray-800 text-white p-4 flex items-center gap-4">
  {/* 左侧：菜单按钮 + Logo + 导航 */}
  <button onClick={toggleDrawer}>
    <MenuIcon />
  </button>
  <h1>My Application</h1>
  <nav className="flex items-center gap-6">
    <Link to="/designer">设计器</Link>
    <Link to="/library">型材库</Link>
  </nav>

  {/* 右侧：状态 + 工具按钮 */}
  <div className="flex items-center gap-4 ml-auto">
    {isActive('/designer') && <AutoSaveIndicator />}
    <IconButton icon={<NotificationIcon />} />
    <IconButton icon={<SettingsIcon />} />
    <IconButton icon={<ProfileIcon />} />
  </div>
</div>
```

### 6.3 Drawer - 侧边栏

```tsx
// src/layouts/Drawer.tsx
<Drawer>
  <nav>
    <ul>
      <li>
        <Link to="/">首页</Link>
      </li>
      <li>
        <Link to="/designer">设计器</Link>
      </li>
      <li>
        <Link to="/library">素材库</Link>
      </li>
      <li>
        <Link to="/settings">设置</Link>
      </li>
    </ul>
  </nav>
</Drawer>
```

---

## 7. 自定义 Hooks

### 7.1 usePersistentState

**设计目标**：自动同步 React state 到 localStorage

```typescript
// src/features/designer/hooks/usePersistentState.ts
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 初始化：从 localStorage 读取
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // 包装 setState：同时更新 state 和 localStorage
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        const nextValue =
          typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Failed to save to localStorage (${key}):`, error);
        }

        return nextValue;
      });
    },
    [key]
  );

  return [state, setPersistentState];
}
```

**使用示例**：

```tsx
// 持久化工具选择状态
const [selectedTool, setSelectedTool] = usePersistentState<ToolType>(
  'designer.selectedTool',
  'select'
);

// 持久化侧边栏折叠状态
const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState(
  'designer.sidebarCollapsed',
  false
);
```

---

## 8. 无障碍设计

### 8.1 ARIA 属性

```tsx
{
  /* 按钮 ARIA */
}
<button
  onClick={toggleDrawer}
  aria-label="Toggle drawer"
  aria-expanded={isOpen}
>
  <MenuIcon />
</button>;

{
  /* 图标按钮必须有 aria-label */
}
<IconButton
  icon={<SettingsIcon />}
  aria-label="Settings"
  onClick={handleSettings}
/>;
```

### 8.2 键盘导航

```tsx
// Popover ESC 关闭
useEffect(() => {
  if (!open || !closeOnEscape) return;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [open, closeOnEscape, onClose]);
```

### 8.3 焦点管理

```tsx
// 点击外部关闭
useEffect(() => {
  if (!open || !closeOnClickOutside) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [open, closeOnClickOutside, onClose]);
```

---

## 9. 性能优化

### 9.1 动画性能

**使用 transform/opacity**：

```tsx
// ✅ 好 - 使用 transform，不触发 layout
<motion.div
  animate={{ x: isOpen ? 0 : -256, opacity: isOpen ? 1 : 0 }}
/>

// ❌ 差 - 使用 left/right，触发 layout 重排
<motion.div
  animate={{ left: isOpen ? 0 : -256 }}
/>
```

**硬件加速**：

```css
.drawer {
  transform: translateX(0);
  will-change: transform, opacity;
}
```

### 9.2 条件渲染

```tsx
{/* 避免渲染隐藏组件 */}
{visible && <ExpensiveComponent />}

{/* AutoSaveIndicator 仅在需要时渲染 */}
{!visible && return null;}
```

---

## 10. 设计规范总结

### 10.1 颜色使用

- **Primary** - 品牌色，用于主要操作按钮
- **Secondary** - 灰度色，用于界面背景和文本
- **Success/Warning/Error** - 语义色，用于状态反馈

### 10.2 间距规范

- **内边距**：`p-2` (8px), `p-3` (12px), `p-4` (16px)
- **外边距**：`gap-2` (8px), `gap-4` (16px), `gap-6` (24px)
- **圆角**：`rounded-md` (6px), `rounded-lg` (8px)

### 10.3 阴影层级

- **卡片**：`shadow-md`
- **弹窗**：`shadow-lg`
- **Drawer**：`shadow-xl`

### 10.4 动画时长

- **微交互**：150ms (`duration-fast`)
- **默认动画**：300ms (`duration-normal`)
- **复杂动画**：500ms (`duration-slow`)

---

**相关文档**：

- [核心架构设计](./CoreArchitecture.md) - 分层架构、事件驱动
- [状态管理策略](./StateManagement.md) - Context Provider、Zustand
- [组件开发指南](../api/ComponentReference.md) - 组件 API 参考（待创建）
