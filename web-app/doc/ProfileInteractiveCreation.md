# Profile Interactive Creation - 型材交互式创建设计

## 概述

本文档描述了型材交互式创建功能的设计方案，该功能允许用户从 Toolbar 点击型材后，进入交互式放置模式，在 3D 场景中选择位置和方向完成型材实例化。

## 架构组件

### 1. 命令流程

```
用户点击 Toolbar 型材
    ↓
ProfileDropdownPanel.onSelectProfile(assetId)
    ↓
sendCommand('command:create:profile:prepare', { assetId, mode: 'interactive' })
    ↓
DesignerPage.handlePrepareProfile(data)
    ↓
PlacementService.startPlacement(assetId) ⚠️ 待实现
    ↓
Raycasting + 预览渲染
    ↓
用户点击确认
    ↓
ObjectManager.createObject(...)
    ↓
完成实例化
```

### 2. 核心服务

#### PlacementService (待实现)

**职责**：

- 管理交互式放置状态（idle / placing / confirming）
- 协调 Raycasting 和预览渲染
- 监听鼠标/键盘事件
- 发送放置完成命令

**关键方法**：

```typescript
class PlacementService {
  // 开始放置流程
  startPlacement(assetId: string): void;

  // 取消放置
  cancelPlacement(): void;

  // 确认放置
  confirmPlacement(): void;

  // 更新预览位置（鼠标移动时）
  updatePreview(position: Vector3, rotation: Euler): void;

  // 获取当前状态
  getState(): 'idle' | 'placing' | 'confirming';
}
```

**状态机**：

```
idle ──[startPlacement]──> placing ──[click]──> confirming ──[confirm]──> idle
  ↑                            ↓                      ↓
  └─────────────[cancel]───────┴──────[cancel]────────┘
```

### 3. Raycasting 算法

#### 3.1 基础 Raycasting

**目的**：将鼠标 2D 坐标转换为 3D 场景中的位置

**实现**（Three.js）：

```typescript
import { Raycaster, Vector2, Vector3, Camera } from 'three';

class RaycastHelper {
  private raycaster = new Raycaster();

  // 将鼠标坐标转换为 NDC（归一化设备坐标）
  screenToNDC(
    mouseX: number,
    mouseY: number,
    canvas: HTMLCanvasElement
  ): Vector2 {
    const rect = canvas.getBoundingClientRect();
    return new Vector2(
      ((mouseX - rect.left) / rect.width) * 2 - 1,
      -((mouseY - rect.top) / rect.height) * 2 + 1
    );
  }

  // 执行 Raycasting
  raycast(
    ndc: Vector2,
    camera: Camera,
    objects: THREE.Object3D[]
  ): Vector3 | null {
    this.raycaster.setFromCamera(ndc, camera);
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      return intersects[0].point; // 第一个交点
    }
    return null;
  }
}
```

#### 3.2 智能吸附（Snap）

**优先级**：

1. **端点吸附**：型材端点、连接点
2. **边缘吸附**：型材边缘中点
3. **网格吸附**：虚拟网格点（10mm / 20mm 间距）
4. **表面吸附**：型材表面任意点

**实现策略**：

```typescript
interface SnapPoint {
  position: Vector3;
  type: 'endpoint' | 'edge' | 'grid' | 'surface';
  priority: number;
  normal?: Vector3; // 法向量（用于对齐）
}

class SnapHelper {
  // 查找最近吸附点
  findNearestSnapPoint(
    worldPos: Vector3,
    threshold: number = 20
  ): SnapPoint | null {
    const candidates: SnapPoint[] = [];

    // 1. 收集所有型材端点
    sceneObjects.forEach(obj => {
      candidates.push(...this.getEndpoints(obj));
    });

    // 2. 收集边缘中点
    candidates.push(...this.getEdgeMidpoints(sceneObjects));

    // 3. 计算网格点
    candidates.push(this.getNearestGridPoint(worldPos));

    // 4. 按优先级和距离排序
    candidates.sort((a, b) => {
      const distA = a.position.distanceTo(worldPos);
      const distB = b.position.distanceTo(worldPos);
      if (Math.abs(distA - distB) < 1) {
        return b.priority - a.priority; // 优先级高的优先
      }
      return distA - distB;
    });

    const nearest = candidates[0];
    if (nearest && nearest.position.distanceTo(worldPos) < threshold) {
      return nearest;
    }
    return null;
  }
}
```

### 4. UI 反馈设计

#### 4.1 鼠标光标

| 状态       | 光标样式               | 描述         |
| ---------- | ---------------------- | ------------ |
| Idle       | `default`              | 正常状态     |
| Placing    | `crosshair`            | 放置模式     |
| Snapping   | `crosshair + 蓝色圆点` | 吸附到捕捉点 |
| Confirming | `pointer`              | 等待确认     |

#### 4.2 预览渲染

**半透明预览**：

```typescript
// 创建预览 Mesh
const previewMesh = mesh.clone();
previewMesh.material = new THREE.MeshStandardMaterial({
  color: 0x4a90e2, // 蓝色
  transparent: true,
  opacity: 0.5,
  depthWrite: false, // 防止遮挡其他物体
});
scene.add(previewMesh);

// 鼠标移动时更新位置
onMouseMove(worldPos => {
  previewMesh.position.copy(worldPos);
});
```

**吸附点指示器**：

```typescript
// 在吸附点显示小球
const snapIndicator = new THREE.Mesh(
  new THREE.SphereGeometry(5),
  new THREE.MeshBasicMaterial({ color: 0x00ffff })
);
scene.add(snapIndicator);

// 更新位置
if (snapPoint) {
  snapIndicator.visible = true;
  snapIndicator.position.copy(snapPoint.position);
} else {
  snapIndicator.visible = false;
}
```

#### 4.3 辅助信息

**屏幕提示**：

```
- 放置模式：「移动鼠标选择位置 | ESC 取消」
- 吸附状态：「已吸附到端点 | 点击确认」
- 确认模式：「点击确认 | 右键取消」
```

### 5. 边缘情况处理

#### 5.1 无有效交点

**场景**：鼠标指向空白区域，无物体交点

**处理**：

- 在虚拟地面（Y=0 平面）上显示预览
- 预览透明度降低至 0.3（提示无法放置）
- 提示文字：「请指向有效表面」

#### 5.2 重叠检测

**场景**：新型材与现有型材重叠

**处理**：

- 预览颜色变为红色（0xff4444）
- 禁用确认按钮
- 提示文字：「位置重叠，请调整」

**实现**：

```typescript
// 检测碰撞
function checkCollision(
  previewBox: Box3,
  existingObjects: SceneObject[]
): boolean {
  for (const obj of existingObjects) {
    const objBox = new Box3().setFromObject(obj.mesh);
    if (previewBox.intersectsBox(objBox)) {
      return true; // 碰撞
    }
  }
  return false;
}
```

#### 5.3 键盘快捷键

| 按键           | 功能                       |
| -------------- | -------------------------- |
| `ESC`          | 取消放置，返回 idle        |
| `Enter`        | 确认放置（需要在有效位置） |
| `R`            | 旋转 90°                   |
| `Shift + 移动` | 禁用吸附                   |

#### 5.4 多次放置

**场景**：用户希望连续放置多个相同型材

**解决方案**：

- 放置完成后不退出 placing 模式
- 自动开始下一个预览
- 按 ESC 退出连续放置

**配置**：

```typescript
startPlacement(assetId: string, options?: {
  continuousMode?: boolean; // 默认 false
})
```

## 实现优先级

### P0（必须）

- [ ] PlacementService 基础实现
- [ ] Raycasting 基本交点计算
- [ ] 半透明预览渲染
- [ ] 鼠标点击确认放置
- [ ] ESC 取消功能

### P1（重要）

- [ ] 端点吸附
- [ ] 边缘吸附
- [ ] 网格吸附
- [ ] 吸附点指示器
- [ ] 屏幕提示文字

### P2（优化）

- [ ] 重叠检测
- [ ] 键盘快捷键（R 旋转）
- [ ] 连续放置模式
- [ ] 虚拟地面放置
- [ ] 无效位置红色预览

## 测试清单

- [ ] Toolbar 点击型材触发 placing 模式
- [ ] 鼠标移动时预览跟随
- [ ] 点击确认后型材正确创建
- [ ] ESC 取消后预览消失
- [ ] 吸附到现有型材端点
- [ ] 重叠时显示红色预览
- [ ] 键盘快捷键正常工作
- [ ] 连续放置模式正常

## 相关文档

- [CommandReference.md](./CommandReference.md) - 命令系统参考
- [AssetManagementArchitecture.md](./AssetManagementArchitecture.md) - 资产管理架构
- [DesignerArchitecture.md](./DesignerArchitecture.md) - Designer 架构设计
