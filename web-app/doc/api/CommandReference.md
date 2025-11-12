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

### 4. 交互式放置命令 (PlacementService) ⭐ **新增**

#### 4.1 `command:placement:start`

**描述**：开始交互式放置会话

**Payload**:

```typescript
{
  asset: AnyAsset; // 要放置的资产对象
}
```

**示例**:

```typescript
const asset = objectManager.getAsset('profile-2020-std');
sendCommand('command:placement:start', { asset });
```

**处理位置**: `PlacementController.handleStartCommand()`

**后续流程**:

```
PlacementController.start()
    ↓
创建预览 Mesh
    ↓
发布 state:placement:started 事件
    ↓
UI 层监听状态 → 启用 pointer 事件监听
```

---

#### 4.2 `command:placement:updatePointer`

**描述**：更新放置预览位置（由 UI 层发送）

**Payload**:

```typescript
{
  screen: {
    x: number; // 屏幕 X 坐标（clientX）
    y: number; // 屏幕 Y 坐标（clientY）
  };
  viewport: {
    left: number;   // 容器左边距
    top: number;    // 容器上边距
    width: number;  // 容器宽度
    height: number; // 容器高度
  };
}
```

**示例**:

```typescript
// 在 usePlacementInput hook 中
const handlePointerMove = (event: PointerEvent) => {
  const rect = container.getBoundingClientRect();
  
  sendCommand('command:placement:updatePointer', {
    screen: {
      x: event.clientX,
      y: event.clientY
    },
    viewport: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    }
  });
};
```

**处理位置**: `PlacementController.handlePointerUpdate()`

**内部流程**:

```
接收屏幕坐标 + 视口信息
    ↓
RaycasterService.getHitFromScreenCoords()
    ↓
计算 NDC 坐标
    ↓
执行射线检测
    ↓
PreviewService.updateTransform() 更新预览位置
```

---

#### 4.3 `command:placement:confirm`

**描述**：确认放置，创建实际对象

**Payload**: `void`

**示例**:

```typescript
// 用户点击鼠标左键时
sendCommand('command:placement:confirm', undefined);
```

**处理位置**: `PlacementController.handleConfirmCommand()`

**流程**:

```
获取当前预览位置
    ↓
ObjectManager.createObjectFromAsset()
    ↓
发布 state:placement:completed 事件
    ↓
清理预览 Mesh
    ↓
结束放置会话
```

---

#### 4.4 `command:placement:cancel`

**描述**：取消放置，退出放置模式

**Payload**: `void`

**示例**:

```typescript
// 用户按下 ESC 键时
sendCommand('command:placement:cancel', undefined);
```

**处理位置**: `PlacementController.handleCancelCommand()`

**流程**:

```
发布 state:placement:cancelled 事件
    ↓
清理预览 Mesh
    ↓
结束放置会话
```

---

### 5. 选择命令

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

### 5. 放置状态事件 (PlacementService) ⭐ **新增**

#### `state:placement:started`

**描述**：放置会话已开始

**Payload**:

```typescript
{
  asset: AnyAsset; // 正在放置的资产
}
```

**示例**：

```typescript
// 在 usePlacementState hook 中
onState('state:placement:started', data => {
  setIsPlacementActive(true);
  console.log('开始放置:', data.asset.name);
});
```

**用途**：
- UI 层监听此事件，启动 DOM 事件监听
- 显示十字光标
- 禁用其他操作

---

#### `state:placement:completed`

**描述**：放置已完成，对象已创建

**Payload**:

```typescript
{
  modelId: string; // 新创建的对象 ID
}
```

**示例**：

```typescript
onState('state:placement:completed', data => {
  setIsPlacementActive(false);
  console.log('放置完成，对象 ID:', data.modelId);
});
```

**用途**：
- UI 层退出放置模式
- 恢复正常光标
- 可选择新创建的对象

---

#### `state:placement:cancelled`

**描述**：放置已取消

**Payload**: `void`

**示例**：

```typescript
onState('state:placement:cancelled', () => {
  setIsPlacementActive(false);
  console.log('放置已取消');
});
```

**用途**：
- UI 层退出放置模式
- 恢复正常光标

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

### 示例 3: 型材交互式放置完整流程 ⭐ **已实现**

```typescript
// ============ 步骤 1: 用户点击 Toolbar 型材 ============
// ProfileDropdownPanel.tsx
const handleSelectProfile = (assetId: string) => {
  sendCommand('command:create:profile:prepare', {
    assetId: assetId,
    mode: 'interactive',
  });
};

// ============ 步骤 2: useCreationCommands 转换命令 ============
// useCreationCommands.ts
useEffect(() => {
  const handlePrepareProfile = (data: { assetId: string; mode: 'interactive' }) => {
    const asset = services.objectManager.getAsset(data.assetId);
    if (asset) {
      sendCommand('command:placement:start', { asset });
    }
  };

  designerEventBus.on('command:create:profile:prepare', handlePrepareProfile);
  
  return () => {
    designerEventBus.off('command:create:profile:prepare', handlePrepareProfile);
  };
}, [services]);

// ============ 步骤 3: PlacementController 开始放置 ============
// PlacementService.ts
class PlacementController {
  private handleStartCommand = (data: { asset: AnyAsset }): void => {
    this.start(data.asset);
  };

  async start(asset: AnyAsset) {
    this.isActive = true;
    this.currentAsset = asset;

    // 创建预览 Mesh
    const previewMesh = new THREE.Mesh(geometry, material);
    this.previewService.showPreview(previewMesh);

    // 发布状态事件
    publishState('state:placement:started', { asset });
  }
}

// ============ 步骤 4: UI 层监听状态，启动 DOM 监听 ============
// usePlacementState.ts
function usePlacementState() {
  const [isPlacementActive, setIsPlacementActive] = useState(false);

  useEffect(() => {
    const handleStarted = () => setIsPlacementActive(true);
    const handleCompleted = () => setIsPlacementActive(false);
    const handleCancelled = () => setIsPlacementActive(false);

    designerEventBus.on('state:placement:started', handleStarted);
    designerEventBus.on('state:placement:completed', handleCompleted);
    designerEventBus.on('state:placement:cancelled', handleCancelled);

    return () => {
      designerEventBus.off('state:placement:started', handleStarted);
      designerEventBus.off('state:placement:completed', handleCompleted);
      designerEventBus.off('state:placement:cancelled', handleCancelled);
    };
  }, []);

  return { isPlacementActive };
}

// ============ 步骤 5: usePlacementInput 监听 DOM 事件 ============
// usePlacementInput.ts
function usePlacementInput(containerRef, isPlacementActive) {
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isPlacementActive) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    sendCommand('command:placement:updatePointer', {
      screen: { x: event.clientX, y: event.clientY },
      viewport: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
  }, [isPlacementActive, containerRef]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!isPlacementActive) return;
    if (event.button !== 0) return; // 只处理左键

    event.preventDefault();
    event.stopPropagation();

    sendCommand('command:placement:confirm', undefined);
  }, [isPlacementActive]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isPlacementActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      sendCommand('command:placement:cancel', undefined);
    }
  }, [isPlacementActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isPlacementActive) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('keydown', handleKeyDown);
      container.style.cursor = 'crosshair';
    }

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      if (container) container.style.cursor = '';
    };
  }, [containerRef, isPlacementActive, handlePointerMove, handlePointerDown, handleKeyDown]);
}

// ============ 步骤 6: PlacementController 更新预览 ============
// PlacementService.ts
private handlePointerUpdate = (data: PointerUpdateData): void => {
  if (!this.isActive) return;

  // 使用 RaycasterService 计算 3D 位置
  const hit = this.raycasterService.getHitFromScreenCoords(
    data.screen.x,
    data.screen.y,
    data.viewport
  );

  if (hit) {
    this.currentPosition = hit.point;
    // 更新预览位置
    this.previewService.updateTransform(hit.point);
  }
};

// ============ 步骤 7: 用户确认放置 ============
private handleConfirmCommand = (): void => {
  if (!this.isActive || !this.currentAsset || !this.currentPosition) return;

  const options: SceneObjectCreateOptions = {
    name: `${this.currentAsset.name}_${Date.now()}`,
    userParams: {},
    machiningOps: [],
    transform: {
      position: {
        x: this.currentPosition.x,
        y: this.currentPosition.y,
        z: this.currentPosition.z,
      },
    },
  };

  // 创建实际对象
  const sceneObject = this.objectManager.createObjectFromAsset(
    this.currentAsset.id,
    options
  );

  // 发布完成事件
  publishState('state:placement:completed', { modelId: sceneObject.id });

  // 清理
  this.endSession();
};
```

**数据流总结**：

```
用户点击型材
  ↓
command:create:profile:prepare
  ↓
useCreationCommands 转换
  ↓
command:placement:start
  ↓
PlacementController.start()
  ↓
state:placement:started ━━━━━━━→ usePlacementState
  ↓                                ↓
预览 Mesh 显示              isPlacementActive = true
  ↓                                ↓
等待用户输入 ←━━━━━━━━━ usePlacementInput 启动 DOM 监听
  ↓
用户移动鼠标
  ↓
command:placement:updatePointer
  ↓
RaycasterService 计算 3D 位置
  ↓
PreviewService 更新位置
  ↓
用户点击确认
  ↓
command:placement:confirm
  ↓
ObjectManager 创建对象
  ↓
state:placement:completed ━━━→ usePlacementState
  ↓                              ↓
清理预览                  isPlacementActive = false
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
