# Task #3 对象变换系统 - 设计文档

## 一、系统概述

### 1.1 目标

实现基于 Three.js TransformControls 的交互式对象变换系统，支持移动（translate）、旋转（rotate）、缩放（scale）三种模式，通过拖拽 Gizmo 实时调整对象位置、方向和尺寸。

### 1.2 核心特性

- ✅ **模式切换**: 支持移动/旋转/缩放三种变换模式
- ✅ **UI 控制**: 顶部工具栏按钮切换 + 变换工具栏（选中时显示）
- ✅ **键盘快捷键**: W（移动）、E（旋转）、R（缩放）、Q/Esc（取消选择）
- ✅ **自动附着**: 选中对象时自动附着 TransformControls
- ✅ **冲突处理**: 拖拽时禁用 OrbitControls，释放后恢复
- ✅ **数据同步**: 变换完成后同步到 ObjectManager
- ✅ **数据验证**: 防止 NaN/Infinity 导致对象消失

---

## 二、架构设计

### 2.1 组件分层

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│  DesignerToolbar             TransformToolbar                │
│  - 选择/移动/旋转按钮         - 移动/旋转/缩放按钮            │
│  - 顶部固定工具栏            - 选中时浮动显示                │
│  - 全局工具状态              - 模式切换 + 快捷键提示         │
└────────────────────┬────────────────────────────────────────┘
                     │ sendCommand()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    EventBus (命令层)                         │
├─────────────────────────────────────────────────────────────┤
│  command:transform:setMode       { mode: 'translate' }       │
│  command:transform:attach        { objectId: string }        │
│  command:transform:detach        void                        │
│  command:transform:setSpace      { space: 'local'|'world' }  │
│  command:selection:set           objectId → 自动 attach       │
└────────────────────┬────────────────────────────────────────┘
                     │ onCommand()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Features Layer (业务逻辑)                       │
├─────────────────────────────────────────────────────────────┤
│  TransformCommandHandler (新)                               │
│  - 监听 command:transform:* 命令                            │
│  - 调用 TransformService API                                │
│  - 协调 SelectionService 状态                               │
└────────────────────┬────────────────────────────────────────┘
                     │ 调用服务
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  TransformService (新)                                       │
│  - attachToObject(objectId)                                 │
│  - detach()                                                  │
│  - setMode(mode)                                            │
│  - setSpace(space)                                          │
│  - getCurrentMode()                                         │
│  - getAttachedObjectId()                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ 委托底层控制器
                     ↓
┌─────────────────────────────────────────────────────────────┐
│             Renderer Layer (Three.js 封装)                   │
├─────────────────────────────────────────────────────────────┤
│  TransformController (新)                                    │
│  - 封装 Three.js TransformControls                           │
│  - 管理 Gizmo 生命周期                                       │
│  - 处理 OrbitControls 冲突                                   │
│  - 监听 dragging-changed / change / objectChange            │
│  - 触发 state:transform:* 事件                               │
│                                                              │
│  ThreeRenderer (扩展)                                        │
│  - 新增 getTransformController() 方法                        │
│  - 在 startRenderLoop() 中更新 Gizmo 位置                    │
└────────────────────┬────────────────────────────────────────┘
                     │ 状态事件
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   EventBus (状态层)                          │
├─────────────────────────────────────────────────────────────┤
│  state:transform:modeChanged     { mode, objectId }          │
│  state:transform:attached        { objectId }                │
│  state:transform:detached        void                        │
│  state:transform:draggingChanged { isDragging }              │
│  state:transform:completed       { objectId, transform }     │
└────────────────────┬────────────────────────────────────────┘
                     │ 监听状态
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                 ObjectManager (数据同步)                     │
│  - 监听 state:transform:completed                           │
│  - 调用 updateTransform() 持久化变换                        │
│  - 触发 object:updated 通知 UI                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 事件流设计

#### 场景 1: 用户点击工具栏按钮切换模式

```
[UI] TransformToolbar.onClick("移动")
  ↓ sendCommand('command:transform:setMode', { mode: 'translate' })
[Command] TransformCommandHandler.onSetMode()
  ↓ TransformService.setMode('translate')
[Renderer] TransformController._controls.setMode('translate')
  ↓ emit('state:transform:modeChanged', { mode: 'translate', objectId })
[UI] TransformToolbar.useEffect() → 更新按钮状态
```

#### 场景 2: 用户拖拽 Gizmo 变换对象

```
[Three.js] TransformControls 'change' 事件
  ↓ TransformController.onObjectChange()
  ↓ 验证变换数据 (检查 NaN/Infinity)
  ↓ emit('state:transform:dragging', { isDragging: true, objectId })
[Three.js] TransformControls 'mouseUp' 事件
  ↓ TransformController.onDraggingChanged()
  ↓ 提取 object.position/rotation/scale
  ↓ emit('state:transform:completed', { objectId, transform })
[Core] ObjectManager 监听 state:transform:completed
  ↓ updateTransform(objectId, transform)
  ↓ emit('object:updated', objectId)
[UI] 侧边栏/属性面板监听 object:updated → 刷新显示
```

#### 场景 3: 用户按快捷键切换模式

```
[UI] DesignerPageUI.useEffect() 监听 keydown
  ↓ 按 W 键 → sendCommand('command:transform:setMode', { mode: 'translate' })
  ↓ 按 E 键 → sendCommand('command:transform:setMode', { mode: 'rotate' })
  ↓ 按 R 键 → sendCommand('command:transform:setMode', { mode: 'scale' })
  ↓ 按 Q/Esc → sendCommand('command:transform:detach')
[后续流程同场景1]
```

---

## 三、核心组件详细设计

### 3.1 TransformController (Renderer Layer)

**文件路径**: `src/core/renderer/threejs/TransformController.ts`

**职责**:

- 封装 Three.js TransformControls
- 管理 Gizmo 可见性配置（size=3, depthTest=false, renderOrder=999）
- 处理 OrbitControls 冲突（通过 IRenderer 接口）
- 监听 Three.js 事件并转换为应用层事件

**关键 API**:

```typescript
export class TransformController {
  private controls: TransformControls;
  private renderer: IRenderer; // 用于 OrbitControls 冲突处理
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private currentObjectId: string | null = null;

  constructor(
    renderer: IRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement
  );

  /**
   * 附着到对象
   */
  attachToObject(objectId: string, object: THREE.Object3D): void;

  /**
   * 分离当前对象
   */
  detach(): void;

  /**
   * 设置模式
   */
  setMode(mode: 'translate' | 'rotate' | 'scale'): void;

  /**
   * 获取当前模式
   */
  getMode(): 'translate' | 'rotate' | 'scale';

  /**
   * 设置空间（local/world）
   */
  setSpace(space: 'local' | 'world'): void;

  /**
   * 更新 Gizmo 位置（在渲染循环中调用）
   */
  updateGizmoPosition(): void;

  /**
   * 销毁控制器
   */
  dispose(): void;
}
```

**关键实现细节**:

1. **Gizmo 配置**（参考 RenderingSystem.md 第 1117 行）:

   ```typescript
   // 在 attachToObject() 中设置
   this.controls._gizmo.visible = true;
   this.controls._gizmo.traverse(node => {
     if (node.isMesh) {
       node.material.depthTest = false;
       node.renderOrder = 999;
     }
   });
   this.controls.size = 3;
   ```

2. **OrbitControls 冲突处理**:

   ```typescript
   private onDraggingChanged = (event: { value: boolean }) => {
     if (event.value) {
       this.renderer.requestDisableOrbitControls('TransformControls');
     } else {
       this.renderer.releaseDisableOrbitControls('TransformControls');
     }
   };
   ```

3. **数据验证**（防止 NaN）:

   ```typescript
   private onObjectChange = () => {
     const obj = this.controls.object;
     if (!obj) return;

     // 检查 position
     if (isNaN(obj.position.x) || isNaN(obj.position.y) || isNaN(obj.position.z)) {
       console.error('[TransformController] Invalid position detected');
       return;
     }

     // 类似检查 rotation 和 scale
   };
   ```

---

### 3.2 TransformService (Features Layer)

**文件路径**: `src/features/designer/services/TransformService.ts`

**职责**:

- 业务层 API 封装
- 协调 TransformController 和 ObjectManager
- 管理当前附着的对象 ID

**关键 API**:

```typescript
export class TransformService {
  private transformController: TransformController;
  private objectManager: ObjectManager;
  private renderer: IRenderer; // 用于获取 Three.js Mesh

  constructor(
    transformController: TransformController,
    objectManager: ObjectManager,
    renderer: IRenderer
  );

  /**
   * 附着到对象
   */
  attachToObject(objectId: string): void;

  /**
   * 分离当前对象
   */
  detach(): void;

  /**
   * 设置模式
   */
  setMode(mode: 'translate' | 'rotate' | 'scale'): void;

  /**
   * 设置空间
   */
  setSpace(space: 'local' | 'world'): void;

  /**
   * 获取当前附着的对象 ID
   */
  getAttachedObjectId(): string | null;

  /**
   * 获取当前模式
   */
  getCurrentMode(): 'translate' | 'rotate' | 'scale';
}
```

**实现注意点**:

1. **获取 Three.js Mesh**:

   ```typescript
   attachToObject(objectId: string): void {
     const sceneObject = this.objectManager.getObject(objectId);
     if (!sceneObject) {
       console.error(`[TransformService] Object not found: ${objectId}`);
       return;
     }

     // 通过 RenderSyncService 的 meshMap 获取 Three.js Mesh
     // 需要在 RenderSyncService 中暴露 getMesh(objectId) 方法
     const mesh = this.renderer.getMeshByObjectId(objectId);
     if (!mesh) {
       console.error(`[TransformService] Mesh not found for: ${objectId}`);
       return;
     }

     this.transformController.attachToObject(objectId, mesh);
     emit('state:transform:attached', { objectId });
   }
   ```

2. **监听变换完成事件**:

   ```typescript
   constructor(...) {
     onState('state:transform:completed', this.onTransformCompleted);
   }

   private onTransformCompleted = (payload: { objectId: string, transform: Transform }) => {
     this.objectManager.updateTransform(payload.objectId, payload.transform);
   };
   ```

---

### 3.3 TransformCommandHandler (Features Layer)

**文件路径**: `src/features/designer/services/TransformCommandHandler.ts`

**职责**:

- 监听 `command:transform:*` 命令
- 调用 TransformService API

**关键实现**:

```typescript
export class TransformCommandHandler {
  private transformService: TransformService;

  constructor(transformService: TransformService) {
    this.transformService = transformService;
    this.registerCommands();
  }

  private registerCommands(): void {
    onCommand('command:transform:attach', this.handleAttach);
    onCommand('command:transform:detach', this.handleDetach);
    onCommand('command:transform:setMode', this.handleSetMode);
    onCommand('command:transform:setSpace', this.handleSetSpace);
  }

  private handleAttach = (payload: { objectId: string }) => {
    this.transformService.attachToObject(payload.objectId);
  };

  private handleDetach = () => {
    this.transformService.detach();
  };

  private handleSetMode = (payload: {
    mode: 'translate' | 'rotate' | 'scale';
  }) => {
    this.transformService.setMode(payload.mode);
  };

  private handleSetSpace = (payload: { space: 'local' | 'world' }) => {
    this.transformService.setSpace(payload.space);
  };

  dispose(): void {
    // 移除所有监听器
  }
}
```

---

### 3.4 TransformToolbar (UI Layer)

**文件路径**: `src/features/designer/ui/TransformToolbar.tsx`

**职责**:

- 显示移动/旋转/缩放按钮
- 仅在有对象被选中时显示（浮动工具栏）
- 显示当前模式的激活状态
- 显示快捷键提示

**UI 设计**:

```
┌─────────────────────────────────────────────────────────┐
│  [ 👆 选择 ]  [ ✋ 移动 W ]  [ 🔄 旋转 E ]  [ 📏 缩放 R ]  │
└─────────────────────────────────────────────────────────┘
       非激活        激活（蓝色底）     非激活        非激活

- 位置: 3D 视口上方居中（浮动）
- 动画: 淡入淡出
- 背景: bg-slate-800/95
- 高亮: ring-2 ring-blue-400 bg-blue-600
```

**关键实现**:

```typescript
interface TransformToolbarProps {
  visible: boolean; // 是否有选中的对象
  currentMode: 'translate' | 'rotate' | 'scale';
  onModeChange: (mode: 'translate' | 'rotate' | 'scale') => void;
  onDeselect: () => void;
}

const TransformToolbar: React.FC<TransformToolbarProps> = ({
  visible,
  currentMode,
  onModeChange,
  onDeselect,
}) => {
  if (!visible) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-fadeIn">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700 p-2 flex gap-2">
        <button
          onClick={onDeselect}
          className="px-3 py-2 rounded hover:bg-slate-700 transition-colors"
        >
          👆 选择
        </button>
        <button
          onClick={() => onModeChange('translate')}
          className={`px-3 py-2 rounded transition-colors ${
            currentMode === 'translate'
              ? 'bg-blue-600 ring-2 ring-blue-400'
              : 'hover:bg-slate-700'
          }`}
        >
          ✋ 移动 <span className="text-xs text-slate-400">W</span>
        </button>
        <button
          onClick={() => onModeChange('rotate')}
          className={`px-3 py-2 rounded transition-colors ${
            currentMode === 'rotate'
              ? 'bg-blue-600 ring-2 ring-blue-400'
              : 'hover:bg-slate-700'
          }`}
        >
          🔄 旋转 <span className="text-xs text-slate-400">E</span>
        </button>
        <button
          onClick={() => onModeChange('scale')}
          className={`px-3 py-2 rounded transition-colors ${
            currentMode === 'scale'
              ? 'bg-blue-600 ring-2 ring-blue-400'
              : 'hover:bg-slate-700'
          }`}
        >
          📏 缩放 <span className="text-xs text-slate-400">R</span>
        </button>
      </div>
    </div>
  );
};
```

---

### 3.5 DesignerToolbar 修改

**修改点**:

1. **移除 disabled 属性**:

   ```diff
   <ToolButton
     icon="✋"
     label="移动"
     active={selectedTool === 'move'}
     onClick={() => onToolChange('move')}
   -  disabled
   />
   ```

2. **onClick 逻辑**:
   - 点击"移动"/"旋转" → 发送 `command:transform:setMode`
   - 点击"选择" → 发送 `command:transform:detach`

---

### 3.6 DesignerPage 集成

**修改点**:

1. **创建 TransformService**:

   ```typescript
   const transformControllerRef = React.useRef<TransformController | null>(
     null
   );
   const transformServiceRef = React.useRef<TransformService | null>(null);

   React.useEffect(() => {
     if (!isRendererReady) return;

     const renderer = rendererRef.current;
     const transformController = renderer.getTransformController();
     transformControllerRef.current = transformController;

     const transformService = new TransformService(
       transformController,
       coreServices.objectManager,
       renderer
     );
     transformServiceRef.current = transformService;

     // 创建 TransformCommandHandler
     const commandHandler = new TransformCommandHandler(transformService);

     return () => {
       commandHandler.dispose();
       transformService.dispose();
     };
   }, [isRendererReady]);
   ```

2. **监听选中事件自动附着**:

   ```typescript
   React.useEffect(() => {
     const handleSelection = (objectId: string) => {
       sendCommand('command:transform:attach', { objectId });
     };

     onCommand('command:selection:set', handleSelection);
     return () => offCommand('command:selection:set', handleSelection);
   }, []);
   ```

3. **监听 Q 键取消选择**:

   ```typescript
   React.useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'q' || e.key === 'Escape') {
         sendCommand('command:transform:detach');
         sendCommand('command:selection:clear');
       }
     };

     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);
   ```

---

## 四、实现计划

### 阶段 1: 底层控制器（Renderer Layer）

**子任务**:

1. ✅ **创建 TransformController.ts**
   - 封装 Three.js TransformControls
   - 实现 attachToObject/detach/setMode/setSpace
   - 配置 Gizmo 可见性（size, depthTest, renderOrder）
   - 处理 OrbitControls 冲突

2. ✅ **扩展 ThreeRenderer**
   - 新增 `getTransformController()` 方法
   - 在 `startRenderLoop()` 中调用 `updateGizmoPosition()`

3. ✅ **测试 Gizmo 显示**
   - 验证 Gizmo 在对象中心显示
   - 验证拖拽时 OrbitControls 禁用

**文件变更**:

- 新建: `src/core/renderer/threejs/TransformController.ts`
- 修改: `src/core/renderer/threejs/ThreeRenderer.ts`
- 修改: `src/core/renderer/renderer-types.ts` (新增 IRenderer 方法)

---

### 阶段 2: 业务层服务（Features Layer）

**子任务**:

4. ✅ **创建 TransformService.ts**
   - 封装 TransformController
   - 协调 ObjectManager
   - 监听 state:transform:completed 事件

5. ✅ **创建 TransformCommandHandler.ts**
   - 监听 command:transform:\* 命令
   - 调用 TransformService API

6. ✅ **扩展 RenderSyncService**
   - 新增 `getMesh(objectId): THREE.Mesh` 方法

**文件变更**:

- 新建: `src/features/designer/services/TransformService.ts`
- 新建: `src/features/designer/services/TransformCommandHandler.ts`
- 修改: `src/features/designer/services/RenderSyncService.ts`

---

### 阶段 3: UI 层（UI Layer）

**子任务**:

7. ✅ **创建 TransformToolbar.tsx**
   - 浮动工具栏组件
   - 显示移动/旋转/缩放按钮
   - 快捷键提示

8. ✅ **修改 DesignerToolbar.tsx**
   - 移除"移动"/"旋转"按钮的 disabled 属性
   - 添加 onClick 逻辑

9. ✅ **集成到 DesignerPage**
   - 创建 TransformService 实例
   - 监听选中事件自动附着
   - 监听快捷键（W/E/R/Q/Esc）

**文件变更**:

- 新建: `src/features/designer/ui/TransformToolbar.tsx`
- 修改: `src/features/designer/ui/DesignerToolbar.tsx`
- 修改: `src/pages/DesignerPage.tsx`
- 修改: `src/features/designer/ui/DesignerPageUI.tsx`

---

### 阶段 4: 测试与文档

**子任务**:

10. ✅ **E2E 测试**
    - 验证侧边栏选中时 TransformToolbar 显示
    - 验证快捷键切换模式（W/E/R）
    - 验证 Q 键取消选择
    - 验证拖拽后数据同步到 ObjectManager

11. ✅ **单元测试**
    - TransformController 事件触发
    - TransformService 业务逻辑

12. ✅ **更新文档**
    - 更新 TODO.md 标记任务完成
    - 更新 DevelopLog.md 记录实现细节

**文件变更**:

- 修改: `e2e/camera-and-transform.spec.ts`
- 新建: `src/core/renderer/threejs/TransformController.test.ts`
- 修改: `TODO.md`
- 修改: `doc/DevelopLog.md`

---

## 五、技术难点与解决方案

### 5.1 Gizmo 位置同步问题

**问题**: Three.js TransformControls 的 `_gizmo` 在 `attach()` 后会停留在原点 (0,0,0)，不跟随对象移动。

**解决方案**（参考 RenderingSystem.md 第 1117-1127 行）:

1. 在 `attachToObject()` 后手动同步 Gizmo 位置:

   ```typescript
   attachToObject(objectId: string, object: THREE.Object3D): void {
     this.controls.attach(object);

     // 手动同步 Gizmo 位置
     const worldPosition = new THREE.Vector3();
     object.getWorldPosition(worldPosition);
     this.controls._gizmo.position.copy(worldPosition);
     this.controls._gizmo.updateMatrixWorld(true);
   }
   ```

2. 在渲染循环中每帧更新 Gizmo 位置:
   ```typescript
   // 在 ThreeRenderer.startRenderLoop() 中
   updateGizmoPosition(): void {
     if (this.controls.object && this.controls._gizmo) {
       const worldPosition = new THREE.Vector3();
       this.controls.object.getWorldPosition(worldPosition);
       this.controls._gizmo.position.copy(worldPosition);
       this.controls._gizmo.updateMatrixWorld(true);
     }
   }
   ```

---

### 5.2 数据验证防止对象消失

**问题**: 如果变换数据包含 NaN/Infinity，对象会消失。

**解决方案**（参考 RenderingSystem.md 第 1130 行）:

在 TransformController 的 `onObjectChange()` 中验证:

```typescript
private validateTransform(position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3): boolean {
  // 检查 position
  if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z) ||
      !isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
    console.error('[TransformController] Invalid position:', position);
    return false;
  }

  // 类似检查 rotation 和 scale
  return true;
}
```

---

### 5.3 OrbitControls 冲突处理

**问题**: 拖拽 Gizmo 时 OrbitControls 同时响应，导致相机移动。

**解决方案**:

利用 IRenderer 的引用计数禁用机制:

```typescript
private onDraggingChanged = (event: { value: boolean }) => {
  if (event.value) {
    // 开始拖拽 → 禁用 OrbitControls
    this.renderer.requestDisableOrbitControls('TransformControls');
    emit('state:transform:draggingChanged', { isDragging: true });
  } else {
    // 结束拖拽 → 恢复 OrbitControls
    this.renderer.releaseDisableOrbitControls('TransformControls');
    emit('state:transform:draggingChanged', { isDragging: false });

    // 提取变换数据并同步
    this.emitTransformCompleted();
  }
};
```

---

### 5.4 获取 Three.js Mesh 引用

**问题**: TransformService 需要获取 Three.js Mesh 对象才能附着 TransformControls。

**解决方案**:

扩展 RenderSyncService 暴露 Mesh 映射:

```typescript
// RenderSyncService.ts
export class RenderSyncService {
  private meshMap = new Map<string, IMesh>();

  /**
   * 根据对象 ID 获取 Mesh（新增方法）
   */
  public getMesh(objectId: string): IMesh | null {
    return this.meshMap.get(objectId) ?? null;
  }
}
```

然后在 TransformService 中使用:

```typescript
attachToObject(objectId: string): void {
  const mesh = this.renderSyncService.getMesh(objectId);
  if (!mesh) {
    console.error(`[TransformService] Mesh not found: ${objectId}`);
    return;
  }

  this.transformController.attachToObject(objectId, mesh.nativeObject);
}
```

---

## 六、开放问题

### Q1: TransformToolbar 应该浮动显示还是固定在顶部？

**选项 A**: 浮动在 3D 视口上方（当前设计）

- 优点: 不占用固定空间，仅在需要时显示
- 缺点: 可能遮挡视口内容

**选项 B**: 固定在 DesignerToolbar 中

- 优点: 位置固定，不遮挡视口
- 缺点: 始终占用空间

**建议**: 采用选项 A（浮动），与 E2E 测试期望一致。

---

### Q2: 是否需要 Local/World 空间切换？

**当前设计**: 默认 Local 空间，暂不提供 UI 切换按钮。

**理由**:

- TODO.md 未明确要求
- E2E 测试未覆盖
- 可以后续通过快捷键（如 X 键）添加

**建议**: 第一版不实现，留作后续扩展。

---

### Q3: 缩放模式是必需的吗？

**TODO.md 原文**: "实现缩放模式（scale，可选）"

**E2E 测试**: 包含缩放模式的快捷键测试（R 键）

**建议**: 第一版实现，因为成本低（只需多一个模式切换）。

---

## 七、验收标准

### 功能验收

- [ ] 点击侧边栏对象后，TransformToolbar 显示
- [ ] 点击"移动"按钮，显示移动 Gizmo（三个箭头）
- [ ] 点击"旋转"按钮，显示旋转 Gizmo（三个圆环）
- [ ] 点击"缩放"按钮，显示缩放 Gizmo（三个方块）
- [ ] 拖拽 Gizmo 可实时调整对象变换
- [ ] 拖拽时 OrbitControls 自动禁用
- [ ] 释放鼠标后 OrbitControls 恢复
- [ ] 变换完成后数据同步到 ObjectManager
- [ ] 侧边栏属性面板实时更新
- [ ] 按 W 键切换到移动模式
- [ ] 按 E 键切换到旋转模式
- [ ] 按 R 键切换到缩放模式
- [ ] 按 Q 或 Esc 键取消选择，Gizmo 消失

### 性能验收

- [ ] 拖拽 Gizmo 时渲染帧率 ≥ 30 FPS
- [ ] Gizmo 位置更新无明显延迟

### 代码质量

- [ ] 所有新文件通过 ESLint 检查
- [ ] 关键逻辑有单元测试覆盖
- [ ] E2E 测试全部通过

---

## 八、文件清单

### 新建文件

1. `src/core/renderer/threejs/TransformController.ts` (~300 行)
2. `src/features/designer/services/TransformService.ts` (~150 行)
3. `src/features/designer/services/TransformCommandHandler.ts` (~80 行)
4. `src/features/designer/ui/TransformToolbar.tsx` (~120 行)
5. `src/core/renderer/threejs/TransformController.test.ts` (~200 行)

### 修改文件

1. `src/core/renderer/threejs/ThreeRenderer.ts` (+50 行)
   - 新增 `getTransformController()` 方法
   - 在 `startRenderLoop()` 中调用 `updateGizmoPosition()`

2. `src/core/renderer/renderer-types.ts` (+20 行)
   - 新增 IRenderer 接口方法

3. `src/features/designer/services/RenderSyncService.ts` (+10 行)
   - 新增 `getMesh(objectId)` 方法

4. `src/features/designer/ui/DesignerToolbar.tsx` (+20 行)
   - 移除 disabled 属性
   - 添加 onClick 逻辑

5. `src/pages/DesignerPage.tsx` (+50 行)
   - 创建 TransformService 和 CommandHandler
   - 监听选中事件自动附着

6. `src/features/designer/ui/DesignerPageUI.tsx` (+30 行)
   - 集成 TransformToolbar
   - 监听快捷键

7. `src/core/services/eventBus.ts` (+10 行)
   - 新增 `state:transform:*` 事件类型

8. `e2e/camera-and-transform.spec.ts` (已存在，验证测试)

9. `TODO.md` (标记完成)

10. `doc/DevelopLog.md` (记录实现)

---

## 九、参考文档

- [RenderingSystem.md 第 6.2 节](RenderingSystem.md#62-transformcontrols-系统) - TransformControls 架构设计
- [TODO.md 第 3 项](../../TODO.md#3-实现对象移动和旋转) - 任务需求
- [E2E 测试](../../e2e/camera-and-transform.spec.ts) - 验收标准
- [Three.js TransformControls 文档](https://threejs.org/docs/#examples/en/controls/TransformControls)

---

## 十、下一步行动

**设计已完成，待授权后按阶段实施**:

- 阶段 1: 创建 TransformController（底层控制器）
- 阶段 2: 创建 TransformService（业务服务）
- 阶段 3: 创建 UI 组件并集成
- 阶段 4: 测试与文档

---

**文档版本**: v1.0  
**创建日期**: 2025-12-05  
**最后更新**: 2025-12-05  
**状态**: ✅ 设计完成，待授权实施
