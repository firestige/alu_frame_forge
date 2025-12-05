# UI-Command 绑定系统设计

**创建日期**: 2025-12-05  
**版本**: v1.0  
**相关任务**: Task #4

本文档详细说明 UI 组件与 EventBus 命令系统的统一绑定机制，提供数据驱动的组件架构，简化 UI 组件的命令发送和状态订阅。

---

## 1. 系统概述

### 1.1 设计目标

**核心目标**：建立 UI 层与业务层之间的统一通信桥梁，让所有 UI 组件（Toolbar、ContextMenu、Sidebar 等）都通过 EventBus 发送命令，实现：

1. **统一命令入口** - 所有 UI 组件使用相同的方式发送命令
2. **数据驱动 UI** - 通过配置数据驱动组件渲染和行为
3. **简化组件开发** - 提供简单的 Hook，屏蔽 EventBus 细节
4. **高可扩展性** - 添加新功能只需修改配置，无需修改组件代码

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
│  (Toolbar, ContextMenu, Button, Sidebar, etc.)          │
└────────────────────┬────────────────────────────────────┘
                     │ 使用
                     ↓
┌─────────────────────────────────────────────────────────┐
│              UI-Command 绑定层（本文档）                 │
├─────────────────────────────────────────────────────────┤
│  • useCommand()        - 发送命令                        │
│  • useCommandState()   - 订阅状态                        │
│  • CommandToolbar      - 数据驱动的工具栏                │
│  • CommandContextMenu  - 数据驱动的右键菜单              │
└────────────────────┬────────────────────────────────────┘
                     │ 调用
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    EventBus                              │
│  (sendCommand, onState, offState)                        │
└────────────────────┬────────────────────────────────────┘
                     │ 传递
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Features/Core Services                      │
│  (TransformService, SelectionService, ObjectManager)     │
└─────────────────────────────────────────────────────────┘
```

**设计原则**：
- UI 组件**不直接导入** `sendCommand`，统一通过 `useCommand()` Hook
- UI 组件**不直接监听** EventBus，统一通过 `useCommandState()` Hook
- 通用组件（Toolbar、ContextMenu）基于配置数据驱动，与具体业务解耦

---

## 2. 核心 Hook 设计

### 2.1 useCommand - 命令发送 Hook

**目的**：提供统一的命令发送接口，屏蔽 EventBus 细节。

**文件位置**：`src/features/designer/hooks/useCommand.ts`

**接口设计**：

```typescript
import { sendCommand } from '@/core/services/eventBus';
import type { DesignerCommandMap } from '@/core/services/eventBus';

/**
 * useCommand - UI 组件发送命令的统一接口
 * 
 * 使所有 UI 组件通过相同的方式发送命令，无需直接导入 sendCommand
 * 
 * @example
 * const { send } = useCommand();
 * send('command:model:delete', objectId);
 */
export const useCommand = () => {
  const send = React.useCallback(
    <K extends keyof DesignerCommandMap>(
      command: K,
      payload?: DesignerCommandMap[K]
    ) => {
      sendCommand(command, payload);
    },
    []
  );

  return { send };
};
```

**使用示例**：

```tsx
// 在任何组件中使用
const MyComponent = () => {
  const { send } = useCommand();
  
  const handleDelete = (id: string) => {
    send('command:model:delete', id);
  };
  
  return <button onClick={() => handleDelete('obj-1')}>删除</button>;
};
```

**优势**：
- ✅ 类型安全（TypeScript 自动提示命令和参数）
- ✅ 统一入口（所有组件使用相同方式）
- ✅ 易于测试（可以 mock `useCommand`）
- ✅ 易于迁移（未来更换通信机制时只需修改 Hook 实现）

### 2.2 useCommandState - 状态订阅 Hook

**目的**：提供统一的状态订阅接口，自动处理订阅/取消订阅生命周期。

**文件位置**：`src/features/designer/hooks/useCommandState.ts`

**接口设计**：

```typescript
import { onState, offState } from '@/core/services/eventBus';
import type { DesignerStateMap } from '@/core/services/eventBus';

/**
 * useCommandState - 订阅后端状态变化
 * 
 * 自动处理订阅和取消订阅，组件卸载时自动清理
 * 
 * @param stateKey - 状态事件名
 * @param callback - 状态变化时的回调函数
 * 
 * @example
 * useCommandState('state:object:list', (data) => {
 *   setObjects(data.objects);
 * });
 */
export const useCommandState = <K extends keyof DesignerStateMap>(
  stateKey: K,
  callback: (data: DesignerStateMap[K]) => void
) => {
  React.useEffect(() => {
    const handler = (data: DesignerStateMap[K]) => callback(data);
    onState(stateKey, handler);

    return () => {
      offState(stateKey, handler);
    };
  }, [stateKey, callback]);
};
```

**使用示例**：

```tsx
const MyComponent = () => {
  const [objects, setObjects] = React.useState<SceneObject[]>([]);
  
  useCommandState('state:object:list', (data) => {
    setObjects(data.objects);
  });
  
  return <div>{objects.length} 个对象</div>;
};
```

**优势**：
- ✅ 自动生命周期管理（避免内存泄漏）
- ✅ 类型安全（自动推导状态数据类型）
- ✅ 简化代码（无需手动 `useEffect`）

---

## 3. 数据驱动组件设计

### 3.1 设计理念

**核心思想**：将组件的**结构**（UI）与**数据**（行为）分离。

- **组件本身**：通用的、可复用的、与业务无关
- **配置数据**：特定的、可扩展的、与业务相关

**收益**：
1. 添加新功能只需修改配置文件
2. 组件可在不同场景复用
3. 易于测试（配置数据可以独立测试）
4. 易于维护（修改行为不需要改组件代码）

### 3.2 CommandToolbar - 数据驱动的工具栏

#### 类型定义

**文件位置**：`src/features/designer/types/toolbar.ts`

```typescript
/**
 * 工具栏操作项配置
 */
export interface ToolbarAction {
  /** 唯一标识符 */
  id: string;
  
  /** 显示文本（可选） */
  label?: string;
  
  /** 图标组件 */
  icon: React.ReactNode;
  
  /** 提示文本 */
  tooltip?: string;
  
  /** 要发送的命令 */
  command: string;
  
  /** 命令参数 */
  payload?: any;
  
  /** 是否为激活状态 */
  active?: boolean;
  
  /** 是否禁用 */
  disabled?: boolean;
  
  /** 分组标识（用于按钮分组） */
  group?: string;
}
```

#### 组件实现

**文件位置**：`src/components/Toolbar/CommandToolbar.tsx`

```tsx
import * as React from 'react';
import { useCommand } from '@/features/designer/hooks/useCommand';
import { IconButton } from '@/components/Button';
import type { ToolbarAction } from '@/features/designer/types/toolbar';

export interface CommandToolbarProps {
  /** 工具栏操作项列表（配置数据） */
  actions: ToolbarAction[];
  
  /** 当前激活的操作 ID */
  activeId?: string;
  
  /** 自定义类名 */
  className?: string;
}

/**
 * CommandToolbar - 数据驱动的通用工具栏组件
 * 
 * 通过配置数据渲染工具栏，点击按钮时发送对应命令
 * 
 * @example
 * <CommandToolbar 
 *   actions={TRANSFORM_TOOLBAR_CONFIG}
 *   activeId="translate"
 * />
 */
export const CommandToolbar: React.FC<CommandToolbarProps> = ({
  actions,
  activeId,
  className = '',
}) => {
  const { send } = useCommand();

  const handleActionClick = (action: ToolbarAction) => {
    if (action.disabled) return;
    send(action.command as any, action.payload);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {actions.map((action) => (
        <IconButton
          key={action.id}
          icon={action.icon}
          active={action.id === activeId}
          disabled={action.disabled}
          onClick={() => handleActionClick(action)}
          tooltip={action.tooltip}
          aria-label={action.label || action.tooltip}
        />
      ))}
    </div>
  );
};
```

#### 配置示例

**文件位置**：`src/features/designer/config/toolbarConfig.ts`

```typescript
import { MoveIcon, RotateIcon, ScaleIcon, CursorIcon } from '@/components/icons';
import type { ToolbarAction } from '../types/toolbar';

/**
 * 变换工具栏配置
 */
export const TRANSFORM_TOOLBAR_CONFIG: ToolbarAction[] = [
  {
    id: 'select',
    icon: <CursorIcon />,
    tooltip: '选择 (Esc)',
    command: 'command:transform:detach',
  },
  {
    id: 'translate',
    icon: <MoveIcon />,
    tooltip: '移动 (W)',
    command: 'command:transform:setMode',
    payload: { mode: 'translate' },
  },
  {
    id: 'rotate',
    icon: <RotateIcon />,
    tooltip: '旋转 (E)',
    command: 'command:transform:setMode',
    payload: { mode: 'rotate' },
  },
  {
    id: 'scale',
    icon: <ScaleIcon />,
    tooltip: '缩放 (R)',
    command: 'command:transform:setMode',
    payload: { mode: 'scale' },
  },
];

/**
 * 创建工具栏配置
 */
export const CREATE_TOOLBAR_CONFIG: ToolbarAction[] = [
  {
    id: 'create-profile',
    icon: '🔩',
    tooltip: '创建铝型材',
    command: 'command:create:aluminumProfile',
  },
  {
    id: 'create-cube',
    icon: '📦',
    tooltip: '创建立方体',
    command: 'command:create:cube',
  },
  // ... 更多创建选项
];
```

#### 使用示例

```tsx
import { CommandToolbar } from '@/components/Toolbar/CommandToolbar';
import { TRANSFORM_TOOLBAR_CONFIG } from '@/features/designer/config/toolbarConfig';

const DesignerToolbar = () => {
  const [selectedTool, setSelectedTool] = React.useState('select');
  
  return (
    <CommandToolbar
      actions={TRANSFORM_TOOLBAR_CONFIG}
      activeId={selectedTool}
    />
  );
};
```

### 3.3 CommandContextMenu - 数据驱动的右键菜单

#### 类型定义

**文件位置**：`src/features/designer/types/contextMenu.ts`

```typescript
/**
 * 右键菜单上下文信息
 */
export interface MenuContext {
  /** 对象 ID（对象菜单） */
  objectId?: string;
  
  /** 选中的对象列表 */
  selectedObjects?: string[];
  
  /** 对象是否可见 */
  isVisible?: boolean;
  
  /** 其他上下文信息 */
  [key: string]: any;
}

/**
 * 右键菜单操作项配置
 */
export interface MenuAction {
  /** 唯一标识符 */
  id: string;
  
  /** 显示文本 */
  label: string;
  
  /** 图标（emoji 或组件） */
  icon?: string;
  
  /** 要发送的命令 */
  command: string;
  
  /** 
   * 命令参数
   * - 静态值：直接传递
   * - 函数：根据上下文动态生成
   */
  payload?: any | ((context: MenuContext) => any);
  
  /** 快捷键提示 */
  shortcut?: string;
  
  /** 是否为危险操作（如删除） */
  danger?: boolean;
  
  /** 是否为分隔符 */
  separator?: boolean;
  
  /** 
   * 是否禁用
   * - 布尔值：静态禁用
   * - 函数：根据上下文动态判断
   */
  disabled?: boolean | ((context: MenuContext) => boolean);
}
```

#### 组件实现

**文件位置**：`src/components/ContextMenu/CommandContextMenu.tsx`

```tsx
import * as React from 'react';
import { useCommand } from '@/features/designer/hooks/useCommand';
import { PopoverMenu } from '@/components/Popover';
import type { MenuAction, MenuContext } from '@/features/designer/types/contextMenu';

export interface CommandContextMenuProps {
  /** 菜单操作项列表（配置数据） */
  actions: MenuAction[];
  
  /** 上下文信息（用于动态 payload 和 disabled） */
  context: MenuContext;
  
  /** 菜单位置 */
  position: { x: number; y: number };
  
  /** 是否显示 */
  open: boolean;
  
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * CommandContextMenu - 数据驱动的右键菜单组件
 * 
 * 通过配置数据渲染右键菜单，点击菜单项时发送对应命令
 * 
 * @example
 * <CommandContextMenu
 *   actions={OBJECT_CONTEXT_MENU}
 *   context={{ objectId: 'obj-1' }}
 *   position={{ x: 100, y: 200 }}
 *   open={true}
 *   onClose={handleClose}
 * />
 */
export const CommandContextMenu: React.FC<CommandContextMenuProps> = ({
  actions,
  context,
  position,
  open,
  onClose,
}) => {
  const { send } = useCommand();

  const handleActionClick = (action: MenuAction) => {
    // 检查是否禁用
    const disabled = typeof action.disabled === 'function'
      ? action.disabled(context)
      : action.disabled;
    
    if (disabled) return;

    // 计算 payload
    const payload = typeof action.payload === 'function'
      ? action.payload(context)
      : action.payload;

    // 发送命令
    send(action.command as any, payload);

    // 关闭菜单
    onClose();
  };

  return (
    <PopoverMenu open={open} position={position} onClose={onClose}>
      <div className="py-1 min-w-[180px]">
        {actions.map((action, index) =>
          action.separator ? (
            <div key={`separator-${index}`} className="h-px bg-gray-200 my-1" />
          ) : (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={
                typeof action.disabled === 'function'
                  ? action.disabled(context)
                  : action.disabled
              }
              className={`
                w-full px-3 py-2 text-sm text-left flex items-center gap-2
                transition-colors
                ${
                  (typeof action.disabled === 'function'
                    ? action.disabled(context)
                    : action.disabled)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100 cursor-pointer'
                }
                ${action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {action.icon && <span>{action.icon}</span>}
              <span className="flex-1">{action.label}</span>
              {action.shortcut && (
                <span className="text-xs text-gray-400">{action.shortcut}</span>
              )}
            </button>
          )
        )}
      </div>
    </PopoverMenu>
  );
};
```

#### 配置示例

**文件位置**：`src/features/designer/config/contextMenuConfig.ts`

```typescript
import type { MenuAction } from '../types/contextMenu';

/**
 * 对象右键菜单配置
 */
export const OBJECT_CONTEXT_MENU: MenuAction[] = [
  {
    id: 'properties',
    label: '属性',
    icon: '✏️',
    command: 'command:model:showProperties',
    payload: (ctx) => ctx.objectId,
  },
  {
    id: 'translate',
    label: '移动',
    icon: '↔️',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'translate' }),
    shortcut: 'W',
  },
  {
    id: 'rotate',
    label: '旋转',
    icon: '🔄',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'rotate' }),
    shortcut: 'E',
  },
  {
    id: 'scale',
    label: '缩放',
    icon: '📏',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'scale' }),
    shortcut: 'R',
  },
  { separator: true },
  {
    id: 'duplicate',
    label: '复制',
    icon: '📋',
    command: 'command:model:duplicate',
    payload: (ctx) => ctx.objectId,
    shortcut: 'Ctrl+D',
  },
  {
    id: 'visibility',
    label: '显示/隐藏',
    icon: '👁️',
    command: 'command:model:toggleVisibility',
    payload: (ctx) => ctx.objectId,
  },
  { separator: true },
  {
    id: 'delete',
    label: '删除',
    icon: '🗑️',
    command: 'command:model:delete',
    payload: (ctx) => ctx.objectId,
    shortcut: 'Delete',
    danger: true,
  },
];

/**
 * 场景空白处右键菜单配置
 */
export const SCENE_CONTEXT_MENU: MenuAction[] = [
  {
    id: 'create-profile',
    label: '创建铝型材',
    icon: '🔩',
    command: 'command:create:aluminumProfile',
  },
  {
    id: 'create-cube',
    label: '创建立方体',
    icon: '📦',
    command: 'command:create:cube',
  },
  {
    id: 'create-panel',
    label: '创建面板',
    icon: '🔲',
    command: 'command:create:panel',
  },
  { separator: true },
  {
    id: 'view-reset',
    label: '重置视角',
    icon: '🏠',
    command: 'command:camera:reset',
    payload: { animated: true },
    shortcut: 'H',
  },
  {
    id: 'view-iso',
    label: '等轴测视图',
    icon: '📐',
    command: 'command:camera:setPreset',
    payload: { preset: 'isometric' },
    shortcut: '7',
  },
  { separator: true },
  {
    id: 'paste',
    label: '粘贴',
    icon: '📋',
    command: 'command:model:paste',
    shortcut: 'Ctrl+V',
    disabled: (ctx) => !ctx.hasClipboard, // 动态禁用
  },
];
```

#### 使用示例

```tsx
import { CommandContextMenu } from '@/components/ContextMenu/CommandContextMenu';
import { OBJECT_CONTEXT_MENU } from '@/features/designer/config/contextMenuConfig';
import { useContextMenu } from '@/features/designer/hooks/useContextMenu';

const ObjectTree = () => {
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();
  
  const handleObjectContextMenu = (e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    openContextMenu(e, 'object', objectId);
  };
  
  return (
    <>
      <div onContextMenu={(e) => handleObjectContextMenu(e, 'obj-1')}>
        右键点击我
      </div>
      
      {contextMenu.open && contextMenu.type === 'object' && (
        <CommandContextMenu
          actions={OBJECT_CONTEXT_MENU}
          context={{ objectId: contextMenu.targetId }}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          open={contextMenu.open}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
};
```

---

## 4. 辅助 Hook 设计

### 4.1 useContextMenu - 右键菜单状态管理

**目的**：统一管理右键菜单的显示状态和位置。

**文件位置**：`src/features/designer/hooks/useContextMenu.ts`

```typescript
import * as React from 'react';

export type ContextMenuType = 'scene' | 'object' | 'objectList';

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  type: ContextMenuType | null;
  targetId?: string; // 对象 ID（如果是对象菜单）
}

/**
 * useContextMenu - 右键菜单状态管理 Hook
 * 
 * 统一管理右键菜单的显示、位置和上下文信息
 * 
 * @example
 * const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();
 * 
 * <div onContextMenu={(e) => openContextMenu(e, 'object', 'obj-1')}>
 *   右键点击
 * </div>
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    type: null,
  });

  const openContextMenu = React.useCallback(
    (
      event: React.MouseEvent,
      type: ContextMenuType,
      targetId?: string
    ) => {
      event.preventDefault();
      event.stopPropagation();
      
      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        type,
        targetId,
      });
    },
    []
  );

  const closeContextMenu = React.useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  return { contextMenu, openContextMenu, closeContextMenu };
};
```

---

## 5. 文件组织结构

```
src/
  features/designer/
    hooks/
      useCommand.ts              # 核心 Hook：发送命令
      useCommandState.ts         # 核心 Hook：订阅状态
      useContextMenu.ts          # 辅助 Hook：右键菜单状态管理
    types/
      toolbar.ts                 # Toolbar 配置类型定义
      contextMenu.ts             # ContextMenu 配置类型定义
    config/
      toolbarConfig.ts           # Toolbar 配置数据
      contextMenuConfig.ts       # ContextMenu 配置数据
  components/
    Toolbar/
      CommandToolbar.tsx         # 通用工具栏组件
      CommandToolbar.test.tsx    # 单元测试
      index.ts
    ContextMenu/
      CommandContextMenu.tsx     # 通用右键菜单组件
      CommandContextMenu.test.tsx # 单元测试
      index.ts
```

---

## 6. 实施步骤

### Phase 1: 核心绑定层

**目标**：实现基础的 Hook，建立 UI-EventBus 桥梁

1. **创建类型定义**
   - [ ] `src/features/designer/types/toolbar.ts`
   - [ ] `src/features/designer/types/contextMenu.ts`

2. **实现核心 Hook**
   - [ ] `useCommand` - 命令发送
   - [ ] `useCommandState` - 状态订阅
   - [ ] `useContextMenu` - 右键菜单状态管理

3. **验证**
   - [ ] 在简单组件中测试 `useCommand` 发送命令
   - [ ] 测试 `useCommandState` 订阅状态更新

### Phase 2: 通用组件

**目标**：实现数据驱动的通用组件

1. **CommandToolbar**
   - [ ] 实现组件逻辑
   - [ ] 添加样式和交互
   - [ ] 编写示例配置
   - [ ] 单元测试

2. **CommandContextMenu**
   - [ ] 实现组件逻辑
   - [ ] 添加样式和交互
   - [ ] 编写示例配置
   - [ ] 单元测试

### Phase 3: 配置数据

**目标**：创建实际使用的配置文件

1. **Toolbar 配置**
   - [ ] `TRANSFORM_TOOLBAR_CONFIG` - 变换工具
   - [ ] `CREATE_TOOLBAR_CONFIG` - 创建工具

2. **ContextMenu 配置**
   - [ ] `OBJECT_CONTEXT_MENU` - 对象右键菜单
   - [ ] `SCENE_CONTEXT_MENU` - 场景右键菜单

### Phase 4: 集成到现有 UI

**目标**：重构现有组件，使用新的绑定系统

1. **重构 DesignerToolbar**
   - [ ] 使用 `CommandToolbar` 替换现有实现
   - [ ] 迁移配置数据

2. **集成 ContextMenu**
   - [ ] 在 `ObjectTree` 中添加右键菜单
   - [ ] 在 3D 场景中添加右键菜单（区分空白/对象）

3. **测试**
   - [ ] E2E 测试：右键菜单功能
   - [ ] E2E 测试：工具栏功能

### Phase 5: 补充缺失命令

**目标**：实现菜单中需要的但尚未实现的命令

1. **复制命令**
   - [ ] 添加 `command:model:duplicate` 到 EventBus
   - [ ] 在 `ModelEditorService` 实现复制逻辑

2. **粘贴命令**（可选）
   - [ ] 添加 `command:model:paste`
   - [ ] 实现剪贴板管理

---

## 7. 扩展指南

### 7.1 添加新的工具栏按钮

**步骤**：

1. 在 `toolbarConfig.ts` 中添加配置：

```typescript
export const MY_TOOLBAR_CONFIG: ToolbarAction[] = [
  // ... 现有配置
  {
    id: 'new-feature',
    icon: <NewIcon />,
    tooltip: '新功能',
    command: 'command:new:feature',
    payload: { option: 'value' },
  },
];
```

2. 如果需要新命令，在 EventBus 中添加类型定义：

```typescript
// src/core/services/eventBus.ts
export interface DesignerCommandMap {
  // ... 现有命令
  'command:new:feature': { option: string };
}
```

3. 在相应的 Service 中实现命令处理。

### 7.2 添加新的右键菜单项

**步骤**：

1. 在 `contextMenuConfig.ts` 中添加配置：

```typescript
export const OBJECT_CONTEXT_MENU: MenuAction[] = [
  // ... 现有配置
  {
    id: 'new-action',
    label: '新操作',
    icon: '🆕',
    command: 'command:object:newAction',
    payload: (ctx) => ctx.objectId,
    disabled: (ctx) => !ctx.canDoAction, // 动态禁用
  },
];
```

2. 同样在 EventBus 中添加命令类型定义。

3. 实现命令处理逻辑。

### 7.3 创建自定义配置驱动组件

**原则**：参考 `CommandToolbar` 和 `CommandContextMenu` 的设计模式。

1. 定义配置接口（`types/` 目录）
2. 实现通用组件（接收配置数据）
3. 在组件内使用 `useCommand` 发送命令
4. 创建配置文件（`config/` 目录）

---

## 8. 最佳实践

### 8.1 组件开发规范

1. **UI 组件不直接导入 `sendCommand`**
   - ✅ 使用 `useCommand()` Hook
   - ❌ 避免 `import { sendCommand } from '@/core/services/eventBus'`

2. **UI 组件不直接监听 EventBus**
   - ✅ 使用 `useCommandState()` Hook
   - ❌ 避免直接 `onState()` / `offState()`

3. **通用组件基于配置数据驱动**
   - ✅ 接收配置数据作为 props
   - ✅ 使用 TypeScript 定义配置接口
   - ❌ 避免硬编码业务逻辑

4. **配置数据与组件分离**
   - ✅ 配置放在 `config/` 目录
   - ✅ 组件放在 `components/` 目录
   - ✅ 类型定义放在 `types/` 目录

### 8.2 命名规范

- **Hook**：`use` + 功能描述（如 `useCommand`、`useContextMenu`）
- **配置常量**：全大写 + 下划线（如 `OBJECT_CONTEXT_MENU`）
- **配置类型**：描述 + `Action` 或 `Config`（如 `ToolbarAction`、`MenuAction`）
- **通用组件**：`Command` + 组件名（如 `CommandToolbar`、`CommandContextMenu`）

### 8.3 类型安全

1. **命令类型推导**：
   ```typescript
   // ✅ 类型安全：TypeScript 自动提示命令和参数
   send('command:model:delete', objectId);
   
   // ❌ 类型错误：参数不匹配
   send('command:model:delete', { wrong: 'param' });
   ```

2. **配置数据类型检查**：
   ```typescript
   // ✅ 配置符合类型定义
   const config: ToolbarAction[] = [...];
   
   // ❌ 编译错误：缺少必需字段
   const config: ToolbarAction[] = [{ id: 'test' }]; // 缺少 command
   ```

---

## 9. 测试策略

### 9.1 Hook 单元测试

```typescript
// useCommand.test.ts
import { renderHook } from '@testing-library/react';
import { useCommand } from './useCommand';
import * as eventBus from '@/core/services/eventBus';

jest.mock('@/core/services/eventBus');

describe('useCommand', () => {
  it('应该发送命令', () => {
    const { result } = renderHook(() => useCommand());
    
    result.current.send('command:model:delete', 'obj-1');
    
    expect(eventBus.sendCommand).toHaveBeenCalledWith(
      'command:model:delete',
      'obj-1'
    );
  });
});
```

### 9.2 组件单元测试

```typescript
// CommandToolbar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandToolbar } from './CommandToolbar';

const mockActions: ToolbarAction[] = [
  {
    id: 'test',
    icon: <span>Icon</span>,
    command: 'command:test',
  },
];

describe('CommandToolbar', () => {
  it('应该渲染按钮', () => {
    render(<CommandToolbar actions={mockActions} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('点击按钮应该发送命令', () => {
    const { result } = renderHook(() => useCommand());
    render(<CommandToolbar actions={mockActions} />);
    
    fireEvent.click(screen.getByRole('button'));
    // 验证命令发送
  });
});
```

### 9.3 E2E 测试

```typescript
// context-menu.spec.ts
import { test, expect } from '@playwright/test';

test('对象右键菜单', async ({ page }) => {
  await page.goto('/designer');
  
  // 右键点击对象
  await page.locator('[data-testid="scene-object"]').click({ button: 'right' });
  
  // 验证菜单显示
  await expect(page.locator('[role="menu"]')).toBeVisible();
  
  // 点击删除
  await page.locator('text=删除').click();
  
  // 验证对象被删除
  await expect(page.locator('[data-testid="scene-object"]')).not.toBeVisible();
});
```

---

## 10. 迁移指南

### 10.1 从旧代码迁移到新系统

**旧代码**（直接使用 EventBus）：

```tsx
import { sendCommand } from '@/core/services/eventBus';

const MyButton = () => {
  const handleClick = () => {
    sendCommand('command:model:delete', objectId);
  };
  
  return <button onClick={handleClick}>删除</button>;
};
```

**新代码**（使用 Hook）：

```tsx
import { useCommand } from '@/features/designer/hooks/useCommand';

const MyButton = () => {
  const { send } = useCommand();
  
  const handleClick = () => {
    send('command:model:delete', objectId);
  };
  
  return <button onClick={handleClick}>删除</button>;
};
```

### 10.2 重构现有工具栏

**步骤**：

1. 提取配置数据到 `config/toolbarConfig.ts`
2. 替换组件实现为 `CommandToolbar`
3. 删除旧代码

---

## 11. 相关文档

- [核心架构设计](./CoreArchitecture.md) - EventBus 事件系统
- [状态管理策略](./StateManagement.md) - 状态订阅模式
- [UI 设计系统](./UIDesign.md) - 组件库和设计规范
- [开发日志](../DevelopLog.md) - 实施记录

---

**文档状态**: ✅ 已完成  
**下一步**: 按照实施步骤执行代码开发
