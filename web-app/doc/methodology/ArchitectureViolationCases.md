---
title: 架构违规典型案例
created: 2025-12-14
category: methodology
tags: [architecture, anti-pattern, lessons-learned]
---

# 架构违规典型案例

本文档记录了开发过程中出现的典型架构违规案例，作为警示和学习材料。

## 案例 1: 破坏封装性以获取调试信息

### 违规时间

2025-12-14

### 问题描述

在为 `use3DViewer.ts` 添加调试日志时，需要获取摄像机的实际状态（位置、FOV、near/far 等）。发现 `IRenderer.getCamera()` 返回的是 `CameraHandle`（字符串句柄），无法直接访问内部属性。

### 错误做法 ❌

```typescript
// 直接修改日志代码，放弃使用 Handle
console.log('[use3DViewer] 📷 摄像机配置:', {
  '初始位置': cameraPosition,  // 只记录配置参数
  '距离原点(米)': ...,
  'FOV': 75,  // 硬编码常量
});
```

**问题**：

1. ❌ **放弃了架构原则** - Handle 模式是有意设计的封装机制
2. ❌ **记录了不准确的信息** - 配置参数可能与实际运行时状态不同
3. ❌ **草率决策** - 没有分析为什么使用 Handle 模式

### Handle 模式的设计意图

```typescript
// renderer-types.ts
export type SceneHandle = RenderHandle; // 场景句柄
export type CameraHandle = RenderHandle; // 摄像机句柄
export type MeshHandle = RenderHandle; // 网格句柄

// 为什么使用 Handle？
```

**设计目的**：

1. **封装性** - 避免将 Three.js 实现细节（`THREE.Camera` 等）暴露给 Features 层
2. **架构分层** - 保持依赖单向流动（`Features → Core`），Features 层不应依赖具体实现
3. **可替换性** - 将来可以替换为其他渲染引擎（Babylon.js、PlayCanvas 等）而无需修改 Features 层代码
4. **类型安全** - 通过句柄字符串标识对象，避免直接操作底层对象

### 正确做法 ✅

**方案：添加调试接口**

```typescript
// 1. 在 renderer-types.ts 中定义调试信息接口
export interface RendererDebugInfo {
  camera: {
    position: Vector3;
    target: Vector3;
    fov: number;
    near: number;
    far: number;
  };
  orbitControls?: {
    enabled: boolean;
    minDistance: number;
    maxDistance: number;
    enableDamping: boolean;
  };
}

// 2. 在 IRenderer 接口中添加方法
export interface IRenderer {
  // ... 现有方法 ...

  // ==================== 调试接口 ====================

  /**
   * 获取渲染器调试信息（仅用于调试和日志记录）
   * ⚠️ 注意：此接口不应在生产代码中用于业务逻辑
   */
  getDebugInfo(): RendererDebugInfo;
}

// 3. 在 ThreeRenderer 中实现
export class ThreeRenderer implements IRenderer {
  getDebugInfo(): RendererDebugInfo {
    const camera = this.cameraController?.getCamera();
    const controls = this.cameraController?.getOrbitControls();
    const position = camera ? camera.position : { x: 0, y: 0, z: 0 };
    const target = controls ? controls.target : { x: 0, y: 0, z: 0 };

    return {
      camera: {
        position: { x: position.x, y: position.y, z: position.z },
        target: { x: target.x, y: target.y, z: target.z },
        fov: camera?.fov || 0,
        near: camera?.near || 0,
        far: camera?.far || 0,
      },
      orbitControls: controls ? {
        enabled: controls.enabled,
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        enableDamping: controls.enableDamping,
      } : undefined,
    };
  }
}

// 4. 在 use3DViewer 中使用
const debugInfo = newRenderer.getDebugInfo();
console.log('[use3DViewer] 📷 摄像机实际状态:', {
  '位置': debugInfo.camera.position,
  '距离原点(米)': Math.sqrt(...).toFixed(2),
  'FOV(度)': debugInfo.camera.fov,
});
```

**优点**：

1. ✅ **保持封装性** - Features 层通过抽象接口获取信息
2. ✅ **不破坏架构** - 调试接口是 `IRenderer` 的一部分，符合分层原则
3. ✅ **可扩展性** - 其他渲染引擎实现也能提供调试信息
4. ✅ **明确用途** - 通过注释明确标注"仅用于调试"

### 核心教训

#### 1. 遇到架构障碍时，首先思考"为什么"

```
❌ 直接绕过架构限制
✅ 理解设计意图 → 在架构框架内解决问题
```

#### 2. Handle 模式不是障碍，是保护

```typescript
// 错误思维：Handle 阻碍了我访问对象属性
// 正确理解：Handle 保护了系统的封装性和可维护性
```

#### 3. 调试需求也要遵守架构原则

```typescript
// 调试代码不是"临时代码"，也需要良好设计
// 通过正式接口提供调试能力，而不是破坏封装
```

#### 4. 类型系统的警告是有意义的

```typescript
// 当 TypeScript 报错 "Cannot use 'in' operator to search for 'position' in string"
// 这不是类型系统的问题，而是设计在提醒你：你在破坏封装
```

### 延伸思考

**问：如果经常需要访问内部状态怎么办？**

**答**：重新审视接口设计：

- 是否缺少必要的抽象方法？
- 是否职责划分不合理？
- 是否需要添加更多的高层接口？

**不要**通过类型断言 `as any` 来绕过类型检查：

```typescript
// ❌ 永远不要这样做
const camera = (renderer as any).cameraController.getCamera();

// ✅ 通过正式接口
const debugInfo = renderer.getDebugInfo();
```

---

## 案例模板（供未来使用）

```markdown
## 案例 N: [简短描述]

### 违规时间

YYYY-MM-DD

### 问题描述

[详细说明背景和遇到的问题]

### 错误做法 ❌

[展示错误代码和问题所在]

### 正确做法 ✅

[展示正确的实现方式]

### 核心教训

[总结关键要点]

### 延伸思考

[提供更深层次的思考]
```
