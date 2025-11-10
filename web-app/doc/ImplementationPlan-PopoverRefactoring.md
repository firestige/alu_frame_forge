# Implementation Plan: Popover Component Refactoring

## 📋 总览 (Overview)

本文档详细描述 Popover 组件重构的实施方案，包括 API 设计、文件结构、迁移步骤和测试策略。

**目标**: 创建通用的 Popover 组件，解除 ContextMenu 与 features/designer 的耦合，建立架构合规的组件体系。

## 🏗️ 组件设计 (Component Design)

### 1. Popover 核心组件 (Core Component)

**文件**: `src/components/Popover/Popover.tsx`

#### Props API

```typescript
interface PopoverPosition {
  x: number;
  y: number;
}

interface PopoverProps {
  // 基础属性
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;

  // 定位模式 (二选一)
  position?: PopoverPosition; // 坐标定位
  anchorEl?: HTMLElement | null; // 元素引用定位

  // 定位配置
  anchorOrigin?: {
    // anchorEl 模式下的锚点位置
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  transformOrigin?: {
    // Popover 自身的对齐点
    vertical: 'top' | 'center' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };

  // 可选配置
  offset?: { x?: number; y?: number }; // 位置偏移
  className?: string; // 自定义样式类
  closeOnEscape?: boolean; // ESC 键关闭 (默认 true)
  closeOnClickOutside?: boolean; // 点击外部关闭 (默认 true)
  preventOverflow?: boolean; // 防止溢出屏幕 (默认 true)
}
```

#### 使用示例

```typescript
// 坐标定位 (用于右键菜单)
<Popover
  open={contextMenu.visible}
  position={{ x: contextMenu.x, y: contextMenu.y }}
  onClose={handleClose}
>
  <div>菜单内容</div>
</Popover>

// 元素引用定位 (用于下拉菜单)
<Popover
  open={dropdownOpen}
  anchorEl={buttonRef.current}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
  onClose={handleClose}
>
  <div>下拉内容</div>
</Popover>
```

#### 核心功能

1. **定位计算**:
   - 坐标模式: 直接使用 `position.x/y`
   - 引用模式: 基于 `anchorEl.getBoundingClientRect()` 计算
   - 应用 `offset` 偏移量

2. **边界检测**:
   - 检测 Popover 是否溢出视口
   - 自动调整位置防止溢出
   - 优先保持用户指定的对齐方式

3. **Portal 渲染**:
   - 使用 `ReactDOM.createPortal` 渲染到 `document.body`
   - 避免 z-index 和 overflow 问题

4. **事件处理**:
   - ESC 键监听 (`keydown`)
   - 外部点击监听 (`mousedown`)
   - 组件卸载时清理事件监听器

---

### 2. PopoverMenu 包装组件 (Menu Wrapper)

**文件**: `src/components/Popover/PopoverMenu.tsx`

#### Props API

```typescript
interface PopoverMenuProps extends PopoverProps {
  // 继承 Popover 所有 props
  // 预设 menu 样式
}
```

#### 功能特性

- 预设菜单样式（背景色、圆角、阴影、边框）
- 使用 Tailwind 类: `bg-white rounded-lg shadow-lg border border-gray-200`
- 简化 menu 场景的使用

#### 使用示例

```typescript
<PopoverMenu
  open={contextMenu.visible}
  position={{ x: contextMenu.x, y: contextMenu.y }}
  onClose={handleClose}
>
  <div className="py-1">
    <button className="menu-item">编辑</button>
    <button className="menu-item">删除</button>
  </div>
</PopoverMenu>
```

---

### 3. ModelContextMenu 业务组件 (Business Component)

**文件**: `src/features/designer/ui/ModelContextMenu.tsx`

#### 职责

- 定义模型操作菜单项（编辑、显示/隐藏、属性、删除）
- 处理业务逻辑（调用 ObjectManager）
- 管理菜单状态

#### Props API

```typescript
interface ModelContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  modelId: string | null;
  objectManager: ObjectManager | null;
  onClose: () => void;
}
```

#### 实现示例

```typescript
const ModelContextMenu: React.FC<ModelContextMenuProps> = ({
  open,
  position,
  modelId,
  objectManager,
  onClose,
}) => {
  const selectedObject = React.useMemo(() => {
    if (!modelId || !objectManager) return null;
    return objectManager.getObject(modelId);
  }, [modelId, objectManager]);

  const handleEdit = () => {
    if (modelId) {
      // 业务逻辑: 进入编辑模式
      onClose();
    }
  };

  // ... 其他业务处理函数

  if (!selectedObject) return null;

  return (
    <PopoverMenu open={open} position={position} onClose={onClose}>
      <div className="py-1 min-w-[160px]">
        <button onClick={handleEdit} className="menu-item">
          ✏️ 编辑 {selectedObject.name}
        </button>
        <button onClick={handleToggleVisibility} className="menu-item">
          {selectedObject.visual?.isVisible ? '👁️ 隐藏' : '👁️‍🗨️ 显示'}
        </button>
        <button onClick={handleShowProperties} className="menu-item">
          📋 属性
        </button>
        <div className="border-t border-gray-200 my-1" />
        <button onClick={handleDelete} className="menu-item text-red-600">
          🗑️ 删除
        </button>
      </div>
    </PopoverMenu>
  );
};
```

---

## 📁 文件结构 (File Structure)

### 新增文件

```
src/
  components/
    Popover/
      Popover.tsx          # 核心定位组件
      PopoverMenu.tsx      # 菜单包装组件
      index.ts             # 导出文件
  features/
    designer/
      ui/
        ModelContextMenu.tsx  # 模型上下文菜单业务组件
```

### 修改文件

```
src/
  components/
    menu/
      ContextMenu.tsx         # 重构: 使用 Popover
      ContextMenuContainer.tsx # DEPRECATED: 标记为废弃
  features/
    designer/
      ui/
        DesignerPageUI.tsx    # 更新: 使用 ModelContextMenu
```

### 类型定义

```typescript
// src/components/Popover/index.ts
export { Popover } from './Popover';
export { PopoverMenu } from './PopoverMenu';
export type { PopoverProps, PopoverPosition } from './Popover';
export type { PopoverMenuProps } from './PopoverMenu';

// src/features/designer/models/InteractionState.ts
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  modelId: string | null;
}
```

---

## 🔄 迁移步骤 (Migration Steps)

### Phase 1: 创建基础组件 (Create Foundation)

**任务**:

1. 创建 `Popover.tsx` 核心组件
   - 实现坐标定位
   - 实现元素引用定位
   - 实现边界检测
   - 实现事件处理（ESC、点击外部）

2. 创建 `PopoverMenu.tsx` 包装组件
   - 继承 Popover props
   - 添加预设菜单样式

3. 创建 `index.ts` 导出文件
   - 导出组件和类型

**验证**:

- [ ] TypeScript 编译通过
- [ ] 组件可正常导入

---

### Phase 2: 迁移 ContextMenu (Migrate ContextMenu)

**任务**:

1. 重构 `ContextMenu.tsx`
   - 移除定位逻辑
   - 移除 Portal 逻辑
   - 改用 PopoverMenu 包装内容
   - 保持菜单项渲染逻辑

**修改前**:

```typescript
// ContextMenu.tsx (当前)
const ContextMenu: React.FC<ContextMenuProps> = ({ visible, x, y, onClose, ... }) => {
  // 复杂的定位和 Portal 逻辑
  return ReactDOM.createPortal(
    <div style={{ left: x, top: y }}>
      {/* 菜单内容 */}
    </div>,
    document.body
  );
};
```

**修改后**:

```typescript
// ContextMenu.tsx (重构后)
const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  onClose,
  ...menuProps
}) => {
  return (
    <PopoverMenu
      open={visible}
      position={{ x, y }}
      onClose={onClose}
    >
      {/* 菜单内容 - 保持不变 */}
    </PopoverMenu>
  );
};
```

**验证**:

- [ ] 右键菜单功能正常
- [ ] 定位准确
- [ ] 关闭行为正常

---

### Phase 3: 创建业务组件 (Create Business Component)

**任务**:

1. 创建 `features/designer/ui/ModelContextMenu.tsx`
   - 从 ContextMenuContainer 迁移业务逻辑
   - 使用 PopoverMenu 组件
   - 处理模型相关操作

2. 更新 `DesignerPageUI.tsx`
   - 移除 ContextMenuContainer 引用
   - 使用新的 ModelContextMenu

**修改**:

```typescript
// DesignerPageUI.tsx
import { ModelContextMenu } from '../ui/ModelContextMenu';

// 替换原来的 ContextMenuContainer
<ModelContextMenu
  open={contextMenu.visible}
  position={{ x: contextMenu.x, y: contextMenu.y }}
  modelId={contextMenu.modelId}
  objectManager={objectManager}
  onClose={handleCloseContextMenu}
/>
```

**验证**:

- [ ] 模型右键菜单功能完整
- [ ] 编辑、删除等操作正常
- [ ] 无架构违规（验证导入路径）

---

### Phase 4: 清理和文档 (Cleanup and Documentation)

**任务**:

1. 标记 `ContextMenuContainer.tsx` 为 DEPRECATED
   - 添加注释说明已废弃
   - 引导使用新组件

2. 更新类型导入
   - 确保 ContextMenuState 仅在 features/designer 内部使用
   - Popover 组件使用自己的类型定义

3. 代码审查检查项
   - [ ] 无 `components/` 导入 `features/` 代码
   - [ ] 所有业务逻辑在 `features/` 中
   - [ ] TypeScript 类型安全
   - [ ] ESLint 检查通过

4. 文档更新
   - 更新 DesignerArchitecture.md
   - 记录 Popover 组件使用指南

**验证**:

- [ ] 运行项目无错误
- [ ] 架构依赖关系正确
- [ ] 文档完整

---

## 🧪 测试策略 (Testing Strategy)

### 手动测试清单 (Manual Testing Checklist)

#### Popover 基础功能

- [ ] 坐标定位: 右键点击，菜单在鼠标位置出现
- [ ] ESC 关闭: 按 ESC 键，菜单关闭
- [ ] 外部点击关闭: 点击菜单外部区域，菜单关闭
- [ ] 边界检测: 在屏幕边缘右键，菜单不溢出视口
- [ ] 多次打开: 快速右键多次，无闪烁或重叠

#### 模型上下文菜单

- [ ] 编辑操作: 点击"编辑"，进入编辑模式
- [ ] 显示/隐藏: 点击切换，模型可见性改变，图标更新
- [ ] 属性面板: 点击"属性"，打开属性面板
- [ ] 删除操作: 点击"删除"，模型被移除
- [ ] 对象名称: 菜单显示正确的对象名称
- [ ] 空对象: 右键空白处，不显示菜单

#### 性能测试

- [ ] 快速开关: 快速打开关闭菜单 10 次，无卡顿
- [ ] 大型场景: 100+ 对象场景中，右键响应时间 < 100ms
- [ ] 内存泄漏: 打开关闭菜单 100 次，内存无明显增长

---

## 🎯 API 设计原则 (API Design Principles)

### 1. 关注点分离 (Separation of Concerns)

- **Popover**: 仅关注定位和渲染位置
- **PopoverMenu**: 仅关注菜单样式
- **ModelContextMenu**: 仅关注业务逻辑

### 2. 组合优于继承 (Composition over Inheritance)

- PopoverMenu 使用 Popover，而非继承
- 业务组件组合 PopoverMenu，保持灵活性

### 3. 默认值友好 (Sensible Defaults)

```typescript
// 默认行为对 90% 场景适用
<Popover open={open} position={pos} onClose={close}>
  {children}
</Popover>

// 高级场景可定制
<Popover
  open={open}
  position={pos}
  onClose={close}
  closeOnEscape={false}        // 禁用 ESC 关闭
  preventOverflow={false}       // 禁用边界检测
  offset={{ x: 10, y: -5 }}    // 自定义偏移
>
  {children}
</Popover>
```

### 4. 类型安全 (Type Safety)

- 使用 TypeScript 严格模式
- Props 必须有明确的类型定义
- 使用 `Pick` 和 `Omit` 复用类型

---

## 📊 影响分析 (Impact Analysis)

### 修改文件统计

| 类型 | 数量 | 文件                                                         |
| ---- | ---- | ------------------------------------------------------------ |
| 新增 | 4    | Popover.tsx, PopoverMenu.tsx, index.ts, ModelContextMenu.tsx |
| 修改 | 2    | ContextMenu.tsx, DesignerPageUI.tsx                          |
| 废弃 | 1    | ContextMenuContainer.tsx                                     |

### 代码行数变化 (估算)

| 组件                     | 当前行数 | 重构后行数 | 变化        |
| ------------------------ | -------- | ---------- | ----------- |
| Popover.tsx              | 0        | ~150       | +150 (新增) |
| PopoverMenu.tsx          | 0        | ~40        | +40 (新增)  |
| ModelContextMenu.tsx     | 0        | ~100       | +100 (新增) |
| ContextMenu.tsx          | 111      | ~60        | -51 (简化)  |
| ContextMenuContainer.tsx | 70       | 0          | -70 (移除)  |
| **总计**                 | 181      | 350        | +169        |

**说明**: 虽然代码总量增加，但：

- 架构更清晰（+200 价值）
- 复用性提升（未来 4+ 场景复用，减少 ~500 行重复代码）
- 维护成本降低（定位逻辑集中管理）

---

## ⚠️ 风险和缓解 (Risks and Mitigation)

### 风险 1: 定位计算错误

**描述**: 边界检测算法可能在某些场景下计算不准确  
**概率**: 中  
**影响**: 高（菜单溢出屏幕或位置错误）  
**缓解**:

- 在多种屏幕尺寸下测试（1920x1080, 1366x768, 2560x1440）
- 测试边缘情况（屏幕边角、多显示器）
- 提供 `preventOverflow={false}` 禁用选项作为后备

### 风险 2: 现有功能回归

**描述**: 重构可能破坏现有的上下文菜单功能  
**概率**: 低  
**影响**: 高（用户无法操作模型）  
**缓解**:

- 分阶段迁移，每步验证功能
- 保留 ContextMenuContainer 作为临时后备
- 完整的手动测试清单

### 风险 3: 性能下降

**描述**: Portal 渲染和事件监听可能影响性能  
**概率**: 低  
**影响**: 中（菜单响应慢）  
**缓解**:

- 使用 React.memo 优化渲染
- 事件监听器仅在 open=true 时添加
- useCallback 缓存事件处理函数

---

## 🚀 后续计划 (Future Work)

### 短期 (本 PR 后)

- [ ] 添加 Popover 单元测试
- [ ] 性能优化（如需要）
- [ ] 文档完善（使用示例、最佳实践）

### 中期 (未来 PR)

- [ ] 迁移 AppBar Profile 下拉菜单到 Popover
- [ ] 实现 Library 材料上下文菜单
- [ ] 实现 Designer 场景上下文菜单
- [ ] 统一所有弹出式 UI 的交互逻辑

### 长期 (架构演进)

- [ ] 考虑引入动画库（Framer Motion）
- [ ] 支持更多定位策略（flip, auto-placement）
- [ ] 创建 Popover Storybook 文档
- [ ] 性能监控和优化

---

## 📚 参考资料 (References)

### 类似组件实现

- [Material-UI Popover](https://mui.com/material-ui/react-popover/)
- [Radix UI Popover](https://www.radix-ui.com/primitives/docs/components/popover)
- [Headless UI Menu](https://headlessui.com/react/menu)

### 定位算法

- [Floating UI (formerly Popper.js)](https://floating-ui.com/)
- [CSS Position Absolute vs Portal](https://blog.logrocket.com/React-portals-guide/)

### 架构模式

- [Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
- [Component Composition Patterns](https://kentcdodds.com/blog/compound-components-with-react-hooks)

---

**文档版本**: 1.0  
**创建日期**: 2025-11-11  
**最后更新**: 2025-11-11  
**作者**: AI Assistant  
**审核状态**: Pending Review
