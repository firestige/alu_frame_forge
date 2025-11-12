# Command Reference - 命令系统参考

## 概述

本文档列出了 Alu Frame Forge 设计器中所有可用的命令（Commands）及其使用方法。命令系统基于事件总线（Event Bus）实现，用于解耦 UI 层和业务逻辑层。

## 命令系统架构

```
UI Layer (Toolbar, Panels, etc.)
    ↓
sendCommand(commandName, payload)
    ↓
designerEventBus (mitt)
    ↓
onCommand(commandName, handler) ← Service Layer (DesignerPage, PlacementService, etc.)
    ↓
Business Logic Execution
```

## API 函数

### 发送命令

```typescript
import { sendCommand } from '@/core/services/eventBus';

sendCommand('command:create:profile:prepare', {
  assetId: 'profile-2020-std',
  mode: 'interactive',
});
```

### 监听命令

```typescript
import { onCommand, offCommand } from '@/core/services/eventBus';

// 注册监听器
const handler = data => {
  console.log('收到命令:', data);
};
onCommand('command:create:profile:prepare', handler);

// 清理监听器（在组件卸载时）
offCommand('command:create:profile:prepare', handler);
```

---

## 命令列表

### 1. 模型创建命令

#### 1.1 `command:create:cube`

**描述**：创建一个立方体（测试用）

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:create:cube', undefined);
```

**处理位置**: `DesignerPage.tsx` → `ObjectManager.createObject()`

---

#### 1.2 `command:create:box`

**描述**：创建一个盒子（测试用）

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:create:box', undefined);
```

---

#### 1.3 `command:create:aluminumProfile`

**描述**：创建铝型材（旧方式，硬编码参数）

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:create:aluminumProfile', undefined);
```

**⚠️ 已废弃**：建议使用 `command:create:profile:prepare` 替代

---

#### 1.4 ⭐ `command:create:profile:prepare`

**描述**：准备创建型材（交互式放置模式）

**Payload**:

```typescript
{
  assetId: string; // Asset ID (从 AssetService 获取)
  mode: 'interactive'; // 放置模式（当前仅支持 interactive）
}
```

**示例**：

```typescript
sendCommand('command:create:profile:prepare', {
  assetId: 'profile-2020-std',
  mode: 'interactive',
});
```

**处理位置**: `DesignerPage.tsx` → `handlePrepareProfile()`

**后续流程**（待实现）:

```
handlePrepareProfile
    ↓
PlacementService.startPlacement(assetId)
    ↓
用户交互选择位置
    ↓
PlacementService.confirmPlacement()
    ↓
ObjectManager.createObject(...)
    ↓
state:model:created 事件
```

---

#### 1.5 `command:create:panel`

**描述**：创建面板

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:create:panel', undefined);
```

---

#### 1.6 `command:create:connector`

**描述**：创建连接件

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:create:connector', undefined);
```

---

### 2. 相机控制命令

#### 2.1 `command:camera:reset`

**描述**：重置相机到初始位置

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:camera:reset', undefined);
```

---

#### 2.2 `command:camera:setPosition`

**描述**：设置相机位置

**Payload**:

```typescript
{
  x: number;
  y: number;
  z: number;
}
```

**示例**：

```typescript
sendCommand('command:camera:setPosition', { x: 100, y: 100, z: 100 });
```

---

#### 2.3 `command:camera:setView`

**描述**：设置相机位置和目标

**Payload**:

```typescript
{
  position: {
    x: number;
    y: number;
    z: number;
  }
  target: {
    x: number;
    y: number;
    z: number;
  }
}
```

**示例**：

```typescript
sendCommand('command:camera:setView', {
  position: { x: 100, y: 100, z: 100 },
  target: { x: 0, y: 0, z: 0 },
});
```

---

### 3. 模型编辑命令

#### 3.1 `command:model:delete`

**描述**：删除指定模型

**Payload**: `string` (modelId)

**示例**：

```typescript
sendCommand('command:model:delete', 'object-12345');
```

---

#### 3.2 `command:model:toggleVisibility`

**描述**：切换模型可见性

**Payload**: `string` (modelId)

**示例**：

```typescript
sendCommand('command:model:toggleVisibility', 'object-12345');
```

---

#### 3.3 `command:model:showProperties`

**描述**：显示模型属性面板

**Payload**: `string` (modelId)

**示例**：

```typescript
sendCommand('command:model:showProperties', 'object-12345');
```

---

#### 3.4 `command:model:edit`

**描述**：进入模型编辑模式

**Payload**: `string` (modelId)

**示例**：

```typescript
sendCommand('command:model:edit', 'object-12345');
```

---

#### 3.5 `command:model:update`

**描述**：更新模型属性

**Payload**:

```typescript
{
  id: string;
  updates: {
    transform?: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
    };
  };
}
```

**示例**：

```typescript
sendCommand('command:model:update', {
  id: 'object-12345',
  updates: {
    transform: {
      position: { x: 10, y: 0, z: 0 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    },
  },
});
```

---

### 4. 选择命令

#### 4.1 `command:selection:clear`

**描述**：清除当前选择

**Payload**: `void`

**示例**：

```typescript
sendCommand('command:selection:clear', undefined);
```

---

#### 4.2 `command:selection:set`

**描述**：选择指定模型

**Payload**: `string` (modelId)

**示例**：

```typescript
sendCommand('command:selection:set', 'object-12345');
```

---

## 状态事件

除了命令（Command），系统还会发布状态事件（State Events）供 UI 层监听：

### 1. 模型状态事件

#### `state:model:created`

**Payload**:

```typescript
{
  modelId: string;
  type: string;
}
```

**示例**：

```typescript
onState('state:model:created', data => {
  console.log(`模型已创建: ${data.modelId}, 类型: ${data.type}`);
});
```

---

#### `state:model:deleted`

**Payload**:

```typescript
{
  modelId: string;
}
```

---

#### `state:model:selected`

**Payload**:

```typescript
{
  modelId: string | null;
}
```

---

#### `state:model:updated`

**Payload**:

```typescript
{
  modelId: string;
}
```

---

### 2. 场景状态事件

#### `state:scene:loaded`

**Payload**: `void`

---

#### `state:scene:cleared`

**Payload**: `void`

---

### 3. 渲染器状态事件

#### `state:renderer:ready`

**Payload**: `void`

---

#### `state:renderer:error`

**Payload**: `Error`

---

### 4. UI 通知事件

#### `ui:selection:clear`

**描述**：业务层通知 UI 清除选择（如删除对象后）

**Payload**:

```typescript
{ deletedObjectId?: string; reason?: string }
```

**示例**：

```typescript
onState('ui:selection:clear', data => {
  console.log(`清除选择: ${data.reason}`);
  // 更新 UI 状态
});
```

---

## 完整使用示例

### 示例 1: Toolbar 按钮触发创建命令

```typescript
// src/features/designer/ui/DesignerToolbar.tsx

import { sendCommand } from '@/core/services/eventBus';

const handleCreateCube = () => {
  sendCommand('command:create:cube', undefined);
};

<button onClick={handleCreateCube}>创建立方体</button>
```

---

### 示例 2: 监听模型创建事件

```typescript
// src/pages/DesignerPage.tsx

import { onState, offState } from '@/core/services/eventBus';
import { useEffect } from 'react';

useEffect(() => {
  const handleModelCreated = data => {
    console.log('新模型已创建:', data.modelId);
    // 更新 UI 状态（如刷新模型列表）
  };

  onState('state:model:created', handleModelCreated);

  return () => {
    offState('state:model:created', handleModelCreated);
  };
}, []);
```

---

### 示例 3: 型材交互式创建完整流程

```typescript
// 1. 用户点击 Toolbar 型材
// ProfileDropdownPanel.tsx
const handleSelectProfile = (assetId: string) => {
  sendCommand('command:create:profile:prepare', {
    assetId: assetId,
    mode: 'interactive',
  });
};

// 2. DesignerPage 监听命令
// DesignerPage.tsx
const handlePrepareProfile = (data: {
  assetId: string;
  mode: 'interactive';
}) => {
  console.log('[DesignerPage] 准备创建型材:', data);
  // TODO: PlacementService.startPlacement(data.assetId);
};

onCommand('command:create:profile:prepare', handlePrepareProfile);

// 3. PlacementService 处理交互（待实现）
// PlacementService.ts
class PlacementService {
  startPlacement(assetId: string) {
    // 进入交互式放置模式
    // - 显示半透明预览
    // - 监听鼠标移动
    // - 等待用户点击确认
  }

  confirmPlacement() {
    // 用户确认位置后
    sendCommand('command:create:aluminumProfile', {
      assetId: this.currentAssetId,
      position: this.previewPosition,
      rotation: this.previewRotation,
    });
  }
}
```

---

## 注意事项

1. **类型安全**：所有命令和事件都有严格的 TypeScript 类型定义，请使用 `eventBus.ts` 中的类型
2. **清理监听器**：在 React 组件卸载时，务必调用 `offCommand` 或 `offState` 清理监听器，防止内存泄漏
3. **命令 vs 事件**：
   - 命令（Command）：UI 层发送给业务层，表示用户意图（如创建、删除）
   - 事件（Event）：业务层发布给 UI 层，表示状态变化（如已创建、已删除）
4. **异步处理**：命令处理可能是异步的，不要假设命令发送后立即完成

## 相关文档

- [ProfileInteractiveCreation.md](./ProfileInteractiveCreation.md) - 型材交互式创建设计
- [DesignerArchitecture.md](./DesignerArchitecture.md) - Designer 架构设计
- [AssetManagementArchitecture.md](./AssetManagementArchitecture.md) - 资产管理架构
