# Popover 组件使用指南

## 概述

Popover 是一个通用的弹出组件，支持坐标定位和元素引用定位两种模式。适用于右键菜单、下拉菜单、工具提示等场景。

## 组件列表

### 1. Popover - 核心定位组件

提供定位计算、Portal 渲染、边界检测、事件处理等核心功能。

**导入**：
```typescript
import { Popover } from '@/components/Popover';
```

**特性**：
- ✅ 坐标定位（用于右键菜单）
- ✅ 元素引用定位（用于下拉菜单）
- ✅ 边界检测（防止溢出屏幕）
- ✅ ESC 键关闭
- ✅ 点击外部关闭
- ✅ Portal 渲染（避免 z-index 问题）

### 2. PopoverMenu - 菜单包装组件

在 Popover 基础上预设菜单样式，简化菜单场景使用。

**导入**：
```typescript
import { PopoverMenu } from '@/components/Popover';
```

**特性**：
- ✅ 继承 Popover 所有功能
- ✅ 预设菜单样式（背景、圆角、阴影、边框）
- ✅ 专为菜单场景优化

## 使用场景

### 场景 1: 右键上下文菜单（坐标定位）

```typescript
import { PopoverMenu } from '@/components/Popover';

const MyContextMenu: React.FC = () => {
  const [contextMenu, setContextMenu] = React.useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClose = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        右键点击此区域
      </div>

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
    </>
  );
};
```

### 场景 2: 下拉菜单（元素引用定位）

```typescript
import { PopoverMenu } from '@/components/Popover';

const MyDropdown: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={buttonRef} onClick={() => setOpen(!open)}>
        打开菜单 ▼
      </button>

      <PopoverMenu
        open={open}
        anchorEl={buttonRef.current}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClose={() => setOpen(false)}
      >
        <div className="py-1">
          <button className="menu-item">选项 1</button>
          <button className="menu-item">选项 2</button>
          <button className="menu-item">选项 3</button>
        </div>
      </PopoverMenu>
    </>
  );
};
```

### 场景 3: 自定义样式（使用 Popover）

```typescript
import { Popover } from '@/components/Popover';

const MyCustomPopover: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  return (
    <Popover
      open={open}
      position={position}
      onClose={() => setOpen(false)}
      className="bg-blue-500 text-white p-4 rounded-xl shadow-2xl"
    >
      <div>自定义样式内容</div>
    </Popover>
  );
};
```

## API 参考

### Popover Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `open` | `boolean` | - | **必填**，是否显示 Popover |
| `children` | `React.ReactNode` | - | **必填**，Popover 内容 |
| `onClose` | `() => void` | - | **必填**，关闭回调 |
| `position` | `{ x: number; y: number }` | - | 坐标定位（与 `anchorEl` 二选一） |
| `anchorEl` | `HTMLElement \| null` | - | 元素引用定位（与 `position` 二选一） |
| `anchorOrigin` | `OriginConfig` | `{ vertical: 'top', horizontal: 'left' }` | anchorEl 模式下的锚点位置 |
| `transformOrigin` | `OriginConfig` | `{ vertical: 'top', horizontal: 'left' }` | Popover 自身的对齐点 |
| `offset` | `{ x?: number; y?: number }` | `{ x: 0, y: 0 }` | 位置偏移（像素） |
| `className` | `string` | `''` | 自定义样式类 |
| `closeOnEscape` | `boolean` | `true` | 是否按 ESC 键关闭 |
| `closeOnClickOutside` | `boolean` | `true` | 是否点击外部关闭 |
| `preventOverflow` | `boolean` | `true` | 是否防止溢出屏幕 |

### OriginConfig

```typescript
interface OriginConfig {
  vertical: 'top' | 'center' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}
```

### PopoverMenu Props

继承 `Popover` 的所有 props，预设菜单样式。

## 架构说明

### 依赖关系

```
features/designer/ui/ModelContextMenu.tsx    (业务逻辑层)
    └─ imports from ─> components/Popover    (通用组件层)
                           └─ imports from ─> react, react-dom (基础库)
```

**架构原则**：
- ✅ `features/` 可以导入 `components/`
- ✅ `components/` 不能导入 `features/`
- ✅ Popover 组件不包含任何业务逻辑
- ✅ 业务逻辑应在 `features/` 中实现

### 最佳实践

#### ✅ 推荐：在 features/ 中创建业务组件

```typescript
// features/designer/ui/ModelContextMenu.tsx
import { PopoverMenu } from '@/components/Popover';
import { ObjectManager } from '@/core/object/ObjectManager';

interface ModelContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  modelId: string | null;
  objectManager: ObjectManager | null;
  onClose: () => void;
}

export const ModelContextMenu: React.FC<ModelContextMenuProps> = ({
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
    // 业务逻辑：进入编辑模式
    onClose();
  };

  const handleDelete = () => {
    // 业务逻辑：删除模型
    if (modelId && objectManager) {
      objectManager.removeObject(modelId);
    }
    onClose();
  };

  if (!selectedObject) return null;

  return (
    <PopoverMenu open={open} position={position} onClose={onClose}>
      <div className="py-1 min-w-40">
        <button onClick={handleEdit} className="menu-item">
          ✏️ 编辑 {selectedObject.name}
        </button>
        <button onClick={handleDelete} className="menu-item text-red-600">
          🗑️ 删除
        </button>
      </div>
    </PopoverMenu>
  );
};
```

#### ❌ 不推荐：在 components/ 中耦合业务逻辑

```typescript
// ❌ components/menu/ContextMenuContainer.tsx (已废弃)
import { ObjectManager } from '@/core/object/ObjectManager';
import type { ContextMenuState } from '@/features/designer/...'; // 架构违规！

// 不要在 components/ 中导入 features/ 的类型或服务
```

## 常见问题

### Q: 如何让菜单在按钮下方居中对齐？

```typescript
<PopoverMenu
  open={open}
  anchorEl={buttonRef.current}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  transformOrigin={{ vertical: 'top', horizontal: 'center' }}
  onClose={handleClose}
>
  {children}
</PopoverMenu>
```

### Q: 如何禁用边界检测？

```typescript
<Popover
  open={open}
  position={position}
  preventOverflow={false}  // 禁用边界检测
  onClose={handleClose}
>
  {children}
</Popover>
```

### Q: 如何添加位置偏移？

```typescript
<Popover
  open={open}
  anchorEl={buttonRef.current}
  offset={{ x: 10, y: 5 }}  // 向右 10px，向下 5px
  onClose={handleClose}
>
  {children}
</Popover>
```

### Q: 如何自定义关闭行为？

```typescript
<Popover
  open={open}
  position={position}
  closeOnEscape={false}        // 禁用 ESC 关闭
  closeOnClickOutside={false}  // 禁用点击外部关闭
  onClose={handleClose}
>
  {children}
</Popover>
```

## 已知 Issue 和计划

### 当前实施范围（本 PR）
- ✅ 创建 Popover 和 PopoverMenu 组件
- ✅ 重构 ContextMenu 使用 Popover
- ✅ 标记 ContextMenuContainer 为废弃
- ✅ 消除架构违规

### 未来计划（后续 PR）
- ⏳ 迁移 AppBar Profile 下拉菜单
- ⏳ 实现 Library 材料上下文菜单
- ⏳ 实现 Designer 场景上下文菜单
- ⏳ 添加动画效果（Framer Motion）
- ⏳ 支持更多定位策略（flip, auto-placement）

## 相关文档

- [Issue: Popover 重构](../Issue-PopoverRefactoring.md)
- [实施方案](../ImplementationPlan-PopoverRefactoring.md)
- [设计器架构文档](../DesignerArchitecture.md)

---

**最后更新**: 2025-11-11  
**组件版本**: 1.0.0  
**维护者**: Development Team
