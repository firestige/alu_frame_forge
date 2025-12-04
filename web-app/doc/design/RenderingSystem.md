# 渲染系统设计

**最后更新**: 2025-11-21

本文档详细说明铝型材框架设计器的渲染系统架构，包括渲染器抽象层、Three.js 实现和 RenderSyncService。

---

## 1. 渲染器抽象层

### 1.1 设计目标

**为什么需要抽象层？**

1. **解耦业务逻辑** - SceneObject 不依赖具体的 Three.js 实现
2. **支持多种渲染器** - 未来可切换到 Babylon.js、WebGPU 等
3. **简化测试** - 可使用 Mock Renderer 进行单元测试
4. **统一接口** - 不同渲染器提供相同的 API

### 1.2 IRenderer 接口

```typescript
// src/core/renderer/renderer-types.ts
export interface IRenderer {
  /**
   * 创建 Mesh（几何体 + 材质）
   */
  createMesh(geometry: GeometryData, material: MaterialOptions): IMesh;

  /**
   * 添加 Mesh 到场景
   */
  addToScene(mesh: IMesh): void;

  /**
   * 从场景移除 Mesh
   */
  removeFromScene(mesh: IMesh): void;

  /**
   * 更新 Mesh 位置
   */
  updatePosition(mesh: IMesh, position: Vector3): void;

  /**
   * 更新 Mesh 旋转
   */
  updateRotation(mesh: IMesh, rotation: Euler): void;

  /**
   * 更新 Mesh 缩放
   */
  updateScale(mesh: IMesh, scale: Vector3): void;

  /**
   * 设置 Mesh 可见性
   */
  setVisibility(mesh: IMesh, visible: boolean): void;

  /**
   * 销毁 Mesh（释放资源）
   */
  disposeMesh(mesh: IMesh): void;

  /**
   * 获取相机控制器（可选）
   */
  getCameraController?(): ICameraController;

  /**
   * 渲染一帧
   */
  render(): void;

  /**
   * 调整渲染器大小
   */
  resize(width: number, height: number): void;

  /**
   * 销毁渲染器
   */
  dispose(): void;
}
```

### 1.3 通用数据结构

```typescript
/**
 * 几何体数据（抽象表示）
 */
export interface GeometryData {
  type: 'box' | 'cylinder' | 'extrude' | 'buffer';

  // Box 参数
  width?: number;
  height?: number;
  depth?: number;

  // Cylinder 参数
  radiusTop?: number;
  radiusBottom?: number;
  cylinderHeight?: number;
  radialSegments?: number;

  // Extrude 参数
  shape?: Array<{ x: number; y: number }>;
  extrudeDepth?: number;

  // BufferGeometry 参数
  positions?: Float32Array;
  normals?: Float32Array;
  indices?: Uint16Array | Uint32Array;
}

/**
 * 材质选项（抽象表示）
 */
export interface MaterialOptions {
  type?: 'standard' | 'basic' | 'physical';
  color?: string | number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  side?: 'front' | 'back' | 'double';
}

/**
 * Mesh 包装器（抽象表示）
 */
export interface IMesh {
  id: string;
  visible: boolean;

  // 保留原始渲染器对象的引用（类型擦除）
  _internalMesh: unknown;
}
```

---

## 2. Three.js 实现

### 2.1 ThreeRenderer 类

```typescript
// src/core/renderer/threejs/ThreeRenderer.ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type {
  IRenderer,
  IMesh,
  GeometryData,
  MaterialOptions,
  Vector3,
  Euler,
} from '../renderer-types';

export class ThreeRenderer implements IRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);

    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // 添加控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 添加光源
    this.setupLights();

    // 启动渲染循环
    this.startRenderLoop();
  }

  /**
   * 设置光源
   */
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    // 辅助光（从下方）
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, -5, -5);
    this.scene.add(fillLight);
  }

  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /**
   * 创建 Mesh
   */
  public createMesh(geometry: GeometryData, material: MaterialOptions): IMesh {
    const threeGeometry = this.createThreeGeometry(geometry);
    const threeMaterial = this.createThreeMaterial(material);
    const threeMesh = new THREE.Mesh(threeGeometry, threeMaterial);

    return {
      id: threeMesh.uuid,
      visible: true,
      _internalMesh: threeMesh,
    };
  }

  /**
   * 创建 Three.js 几何体
   */
  private createThreeGeometry(data: GeometryData): THREE.BufferGeometry {
    switch (data.type) {
      case 'box':
        return new THREE.BoxGeometry(
          data.width ?? 1,
          data.height ?? 1,
          data.depth ?? 1
        );

      case 'cylinder':
        return new THREE.CylinderGeometry(
          data.radiusTop ?? 1,
          data.radiusBottom ?? 1,
          data.cylinderHeight ?? 1,
          data.radialSegments ?? 32
        );

      case 'extrude':
        if (!data.shape || !data.extrudeDepth) {
          throw new Error('Extrude geometry requires shape and extrudeDepth');
        }
        const shape = new THREE.Shape();
        shape.moveTo(data.shape[0].x, data.shape[0].y);
        for (let i = 1; i < data.shape.length; i++) {
          shape.lineTo(data.shape[i].x, data.shape[i].y);
        }
        shape.closePath();

        return new THREE.ExtrudeGeometry(shape, {
          depth: data.extrudeDepth,
          bevelEnabled: false,
        });

      case 'buffer':
        const geometry = new THREE.BufferGeometry();
        if (data.positions) {
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(data.positions, 3)
          );
        }
        if (data.normals) {
          geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(data.normals, 3)
          );
        }
        if (data.indices) {
          geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
        }
        return geometry;

      default:
        throw new Error(`Unknown geometry type: ${data.type}`);
    }
  }

  /**
   * 创建 Three.js 材质
   */
  private createThreeMaterial(options: MaterialOptions): THREE.Material {
    const type = options.type ?? 'standard';

    switch (type) {
      case 'standard':
        return new THREE.MeshStandardMaterial({
          color: options.color ?? 0xcccccc,
          metalness: options.metalness ?? 0.5,
          roughness: options.roughness ?? 0.5,
          opacity: options.opacity ?? 1,
          transparent: options.transparent ?? false,
          side: this.parseSide(options.side),
        });

      case 'basic':
        return new THREE.MeshBasicMaterial({
          color: options.color ?? 0xcccccc,
          opacity: options.opacity ?? 1,
          transparent: options.transparent ?? false,
          side: this.parseSide(options.side),
        });

      case 'physical':
        return new THREE.MeshPhysicalMaterial({
          color: options.color ?? 0xcccccc,
          metalness: options.metalness ?? 0.5,
          roughness: options.roughness ?? 0.5,
          opacity: options.opacity ?? 1,
          transparent: options.transparent ?? false,
          side: this.parseSide(options.side),
        });

      default:
        throw new Error(`Unknown material type: ${type}`);
    }
  }

  /**
   * 解析 side 参数
   */
  private parseSide(side?: 'front' | 'back' | 'double'): THREE.Side {
    switch (side) {
      case 'front':
        return THREE.FrontSide;
      case 'back':
        return THREE.BackSide;
      case 'double':
        return THREE.DoubleSide;
      default:
        return THREE.FrontSide;
    }
  }

  /**
   * 添加 Mesh 到场景
   */
  public addToScene(mesh: IMesh): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    this.scene.add(threeMesh);
  }

  /**
   * 从场景移除 Mesh
   */
  public removeFromScene(mesh: IMesh): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    this.scene.remove(threeMesh);
  }

  /**
   * 更新 Mesh 位置
   */
  public updatePosition(mesh: IMesh, position: Vector3): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    threeMesh.position.set(position.x, position.y, position.z);
  }

  /**
   * 更新 Mesh 旋转
   */
  public updateRotation(mesh: IMesh, rotation: Euler): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    threeMesh.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  /**
   * 更新 Mesh 缩放
   */
  public updateScale(mesh: IMesh, scale: Vector3): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    threeMesh.scale.set(scale.x, scale.y, scale.z);
  }

  /**
   * 设置 Mesh 可见性
   */
  public setVisibility(mesh: IMesh, visible: boolean): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;
    threeMesh.visible = visible;
    mesh.visible = visible;
  }

  /**
   * 销毁 Mesh
   */
  public disposeMesh(mesh: IMesh): void {
    const threeMesh = mesh._internalMesh as THREE.Mesh;

    // 释放几何体
    if (threeMesh.geometry) {
      threeMesh.geometry.dispose();
    }

    // 释放材质
    if (threeMesh.material) {
      if (Array.isArray(threeMesh.material)) {
        threeMesh.material.forEach(m => m.dispose());
      } else {
        threeMesh.material.dispose();
      }
    }

    // 从场景移除
    this.removeFromScene(mesh);
  }

  /**
   * 渲染一帧
   */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 调整渲染器大小
   */
  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 销毁渲染器
   */
  public dispose(): void {
    // 停止渲染循环
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    // 释放控制器
    this.controls.dispose();

    // 释放渲染器
    this.renderer.dispose();

    // 清空场景
    this.scene.clear();
  }
}
```

---

## 3. RenderSyncService - 渲染同步服务

### 3.1 职责

**设计目标**：

- 监听 ObjectManager 事件，自动同步到渲染器
- 管理 SceneObject → IMesh 的映射关系
- 批量更新优化

### 3.2 实现代码

```typescript
// src/core/renderer/RenderSyncService.ts
export class RenderSyncService {
  private renderer: IRenderer;
  private objectManager: ObjectManager;
  private meshMap: Map<string, IMesh> = new Map();

  constructor(renderer: IRenderer, objectManager: ObjectManager) {
    this.renderer = renderer;
    this.objectManager = objectManager;

    this.setupListeners();
  }

  /**
   * 设置监听器
   */
  private setupListeners(): void {
    this.objectManager.on('object:added', this.onObjectAdded);
    this.objectManager.on('object:removed', this.onObjectRemoved);
    this.objectManager.on('object:updated', this.onObjectUpdated);
    this.objectManager.on(
      'object:visibility:changed',
      this.onVisibilityChanged
    );
  }

  /**
   * 对象添加事件
   */
  private onObjectAdded = (obj: SceneObject): void => {
    // 1. 创建 Mesh
    const mesh = this.createMeshForObject(obj);

    // 2. 添加到场景
    this.renderer.addToScene(mesh);

    // 3. 保存映射
    this.meshMap.set(obj.id, mesh);

    // 4. 设置初始变换
    this.syncTransform(obj, mesh);
  };

  /**
   * 对象移除事件
   */
  private onObjectRemoved = (obj: SceneObject): void => {
    const mesh = this.meshMap.get(obj.id);
    if (!mesh) return;

    // 1. 从场景移除
    this.renderer.removeFromScene(mesh);

    // 2. 释放资源
    this.renderer.disposeMesh(mesh);

    // 3. 删除映射
    this.meshMap.delete(obj.id);
  };

  /**
   * 对象更新事件
   */
  private onObjectUpdated = (obj: SceneObject): void => {
    const mesh = this.meshMap.get(obj.id);
    if (!mesh) return;

    // 同步变换
    this.syncTransform(obj, mesh);
  };

  /**
   * 可见性变更事件
   */
  private onVisibilityChanged = (obj: SceneObject): void => {
    const mesh = this.meshMap.get(obj.id);
    if (!mesh) return;

    this.renderer.setVisibility(mesh, obj.visual?.isVisible ?? true);
  };

  /**
   * 创建 Mesh（根据 Asset 类型）
   */
  private createMeshForObject(obj: SceneObject): IMesh {
    const asset = obj.asset;

    // 根据 Asset 类型创建几何体
    let geometry: GeometryData;

    switch (asset.type) {
      case AssetType.Profile:
        geometry = this.createProfileGeometry(asset as ProfileAsset);
        break;

      case AssetType.Fastener:
        geometry = this.createFastenerGeometry(asset as FastenerAsset);
        break;

      case AssetType.Connector:
        geometry = this.createConnectorGeometry(asset as ConnectorAsset);
        break;

      default:
        throw new Error(`Unsupported asset type: ${asset.type}`);
    }

    // 创建材质
    const material: MaterialOptions = {
      type: 'standard',
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.2,
    };

    return this.renderer.createMesh(geometry, material);
  }

  /**
   * 创建型材几何体（示例）
   */
  private createProfileGeometry(asset: ProfileAsset): GeometryData {
    // 获取型材长度
    const length = asset.parameters.length?.defaultValue ?? 1000;

    // 获取截面形状
    const shape = asset.profileData.crossSection;

    return {
      type: 'extrude',
      shape: shape.map(p => ({ x: p.x, y: p.y })),
      extrudeDepth: length,
    };
  }

  /**
   * 同步变换
   */
  private syncTransform(obj: SceneObject, mesh: IMesh): void {
    const transform = obj.transform;

    this.renderer.updatePosition(mesh, transform.position);
    this.renderer.updateRotation(mesh, transform.rotation);
    this.renderer.updateScale(mesh, transform.scale);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 移除所有 Mesh
    this.meshMap.forEach(mesh => {
      this.renderer.disposeMesh(mesh);
    });
    this.meshMap.clear();

    // 移除监听器
    this.objectManager.off('object:added', this.onObjectAdded);
    this.objectManager.off('object:removed', this.onObjectRemoved);
    this.objectManager.off('object:updated', this.onObjectUpdated);
    this.objectManager.off(
      'object:visibility:changed',
      this.onVisibilityChanged
    );
  }
}
```

---

## 4. 渲染器集成

### 4.1 CoreServiceProvider 集成

```typescript
// src/core/CoreServiceProvider.tsx
export const CoreServiceProvider: React.FC<Props> = ({ children }) => {
  const servicesRef = useRef<CoreServices | null>(null);

  useEffect(() => {
    // 1. 获取渲染容器
    const container = document.getElementById('renderer-container');
    if (!container) {
      console.error('Renderer container not found');
      return;
    }

    // 2. 创建渲染器
    const renderer = new ThreeRenderer(container);

    // 3. 创建服务
    const assetService = new AssetService(assetRegistry);
    const modelFactory = new ModelFactory(assetService);
    const objectManager = new ObjectManager(modelFactory);

    // 4. 创建渲染同步服务
    const renderSyncService = new RenderSyncService(renderer, objectManager);

    // 5. 保存引用
    servicesRef.current = {
      renderer,
      assetService,
      objectManager,
      renderSyncService,
    };

    return () => {
      // 清理资源
      renderSyncService.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <CoreServicesContext.Provider value={servicesRef.current}>
      {children}
    </CoreServicesContext.Provider>
  );
};
```

### 4.2 DesignerPage 布局

```tsx
// src/pages/DesignerPage.tsx
export const DesignerPage: React.FC = () => {
  return (
    <div className="flex h-screen">
      {/* 左侧工具栏 */}
      <ToolPanel />

      {/* 中间渲染区域 */}
      <div id="renderer-container" className="flex-1" />

      {/* 右侧属性面板 */}
      <PropertiesPanel />
    </div>
  );
};
```

---

## 5. 相机控制

### 5.1 ICameraController 接口

```typescript
// src/core/renderer/renderer-types.ts
export interface ICameraController {
  /**
   * 聚焦到对象
   */
  focusOn(target: Vector3, distance?: number): void;

  /**
   * 重置相机
   */
  reset(): void;

  /**
   * 启用/禁用控制器
   */
  setEnabled(enabled: boolean): void;

  /**
   * 设置相机位置
   */
  setPosition(position: Vector3): void;

  /**
   * 设置相机目标
   */
  setTarget(target: Vector3): void;
}
```

### 5.2 Three.js 实现

```typescript
// src/core/renderer/threejs/ThreeCameraController.ts
export class ThreeCameraController implements ICameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  public focusOn(target: Vector3, distance: number = 10): void {
    // 计算相机位置
    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    const newPosition = new THREE.Vector3(target.x, target.y, target.z).add(
      direction.multiplyScalar(distance)
    );

    // 平滑过渡
    this.animateCamera(newPosition, target);
  }

  private animateCamera(newPosition: Vector3, newTarget: Vector3): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    const duration = 500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用 easeInOutCubic 缓动函数
      const t =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // 插值位置
      this.camera.position.lerpVectors(
        startPosition,
        new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z),
        t
      );
      this.controls.target.lerpVectors(
        startTarget,
        new THREE.Vector3(newTarget.x, newTarget.y, newTarget.z),
        t
      );

      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  public reset(): void {
    this.camera.position.set(5, 5, 5);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  public setPosition(position: Vector3): void {
    this.camera.position.set(position.x, position.y, position.z);
  }

  public setTarget(target: Vector3): void {
    this.controls.target.set(target.x, target.y, target.z);
    this.controls.update();
  }
}
```

---

## 6. 性能优化

### 6.1 批量更新

```typescript
// 避免频繁更新渲染器
export class RenderSyncService {
  private updateQueue: Set<string> = new Set();
  private updateTimer: NodeJS.Timeout | null = null;

  private onObjectUpdated = (obj: SceneObject): void => {
    // 加入更新队列
    this.updateQueue.add(obj.id);

    // 延迟批量更新
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.flushUpdates();
    }, 16); // 60fps
  };

  private flushUpdates(): void {
    this.updateQueue.forEach(objId => {
      const obj = this.objectManager.getObject(objId);
      if (obj) {
        const mesh = this.meshMap.get(objId);
        if (mesh) {
          this.syncTransform(obj, mesh);
        }
      }
    });

    this.updateQueue.clear();
  }
}
```

### 6.2 几何体复用

```typescript
// 对于相同的 Asset，复用几何体
export class RenderSyncService {
  private geometryCache: Map<string, GeometryData> = new Map();

  private createMeshForObject(obj: SceneObject): IMesh {
    const asset = obj.asset;
    const cacheKey = `${asset.id}_${JSON.stringify(obj.userParams)}`;

    // 检查缓存
    let geometry = this.geometryCache.get(cacheKey);
    if (!geometry) {
      geometry = this.createGeometryForAsset(asset, obj.userParams);
      this.geometryCache.set(cacheKey, geometry);
    }

    return this.renderer.createMesh(geometry, this.getMaterialForAsset(asset));
  }
}
```

---

## 7. 未来扩展

### 7.1 多渲染器支持

```typescript
// 工厂模式创建渲染器
export function createRenderer(
  type: 'threejs' | 'babylonjs' | 'webgpu',
  container: HTMLElement
): IRenderer {
  switch (type) {
    case 'threejs':
      return new ThreeRenderer(container);
    case 'babylonjs':
      return new BabylonRenderer(container);
    case 'webgpu':
      return new WebGPURenderer(container);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}
```

### 7.2 渲染器插件系统

```typescript
export interface IRendererPlugin {
  name: string;
  init(renderer: IRenderer): void;
  dispose(): void;
}

// 示例：网格辅助线插件
export class GridHelperPlugin implements IRendererPlugin {
  name = 'grid-helper';

  init(renderer: IRenderer): void {
    // 添加网格
  }

  dispose(): void {
    // 清理网格
  }
}
```

---

## 6. 相机控制系统

### 6.1 CameraService

**职责**：

- 管理 26 个标准视角预设（6 面 + 12 棱 + 8 角 + 等轴测）
- 视角切换动画（manual lerp + easeInOutCubic）
- 状态持久化到 localStorage
- 通过 eventBus 发布状态变更

**预设视角**：

```typescript
export enum CameraPreset {
  // 6 个面视图
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',

  // 等轴测（默认视角）
  ISOMETRIC = 'isometric',

  // 12 个棱视图（预留，未在 MVP UI 中暴露）
  FRONT_TOP = 'front-top',
  FRONT_BOTTOM = 'front-bottom',
  FRONT_LEFT = 'front-left',
  FRONT_RIGHT = 'front-right',
  BACK_TOP = 'back-top',
  BACK_BOTTOM = 'back-bottom',
  BACK_LEFT = 'back-left',
  BACK_RIGHT = 'back-right',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',

  // 8 个角视图（预留）
  FRONT_TOP_LEFT = 'front-top-left',
  FRONT_TOP_RIGHT = 'front-top-right',
  FRONT_BOTTOM_LEFT = 'front-bottom-left',
  FRONT_BOTTOM_RIGHT = 'front-bottom-right',
  BACK_TOP_LEFT = 'back-top-left',
  BACK_TOP_RIGHT = 'back-top-right',
  BACK_BOTTOM_LEFT = 'back-bottom-left',
  BACK_BOTTOM_RIGHT = 'back-bottom-right',
}
```

**API**：

```typescript
class CameraService {
  // 设置预设视角
  async setViewPreset(preset: CameraPreset, animated?: boolean): Promise<void>;

  // 通过方向向量设置视角
  async setViewByDirection(
    direction: Vector3,
    up?: Vector3,
    animated?: boolean
  ): Promise<void>;

  // 聚焦到对象
  async focusOnObject(objectId: string, padding?: number): Promise<void>;

  // 重置到等轴测
  async reset(animated?: boolean): Promise<void>;

  // 获取当前视角
  getCurrentView(): ViewDescriptor;

  // 判断当前是否为某预设
  isPresetActive(preset: CameraPreset): boolean;
}
```

**事件流**：

```
ControlPanel (UI)
  → command:camera:setPreset (EventBus)
    → CameraCommandHandler
      → CameraService.setViewPreset()
        → CameraController.animateToPosition()
          → camera:viewChanged (EventBus)
            → ControlPanel 更新激活状态
```

**快捷键**：

- `1-7`: 切换面视图和等轴测
- `H`: 重置到等轴测（Home）

### 6.2 TransformControls 系统

**职责**：

- 交互式对象变换（移动/旋转/缩放）
- 自动处理与 OrbitControls 的冲突
- 变换完成后同步到 ObjectManager

**架构**：

```
TransformToolbar (UI)
  → command:transform:setMode (EventBus)
    → TransformCommandHandler
      → TransformService.setMode()
        → TransformController (Three.js TransformControls)
          → state:transform:completed (EventBus)
            → ObjectManager.updateTransform()
```

**API**：

```typescript
class TransformService {
  // 附加到对象
  attachToObject(objectId: string): void;

  // 分离当前对象
  detach(): void;

  // 设置模式
  setMode(mode: 'translate' | 'rotate' | 'scale'): void;

  // 设置空间（local/world）
  setSpace(space: 'local' | 'world'): void;

  // 启用/禁用
  setEnabled(enabled: boolean): void;
}
```

**快捷键**：

- `W`: 切换到移动模式
- `E`: 切换到旋转模式
- `R`: 切换到缩放模式
- `Q` / `Esc`: 取消选择（分离）

**实现细节**：

1. **Gizmo 位置同步**：TransformControls 的 `_gizmo` 需要在 `attach()` 后手动同步到对象的世界坐标，并在每帧渲染时更新，否则 gizmo 会停留在原点 `(0,0,0)`。

2. **可见性配置**：
   - `_gizmo.visible = true` - 强制 gizmo 可见
   - `material.depthTest = false` - 禁用深度测试，防止被对象遮挡
   - `renderOrder = 999` - 确保 gizmo 在最上层渲染
   - `size = 3` - 增大尺寸（3倍），让箭头从对象中心伸出来

3. **渲染循环更新**：

   ```typescript
   // 在 ThreeRenderer.startRenderLoop() 的每帧回调中
   if (controls.object && controls._gizmo) {
     const worldPosition = new THREE.Vector3();
     controls.object.getWorldPosition(worldPosition);
     controls._gizmo.position.copy(worldPosition);
     controls._gizmo.updateMatrixWorld(true);
   }
   ```

4. **数据验证**：TransformService 在同步变换数据到 ObjectManager 前，会验证 position/rotation/scale 是否包含 `NaN` / `Infinity` / `null` / `undefined`，防止无效数据导致对象消失。

**自动 Attach**：

当用户通过 UI 选中对象时，自动触发 `command:selection:set` 命令，DesignerPage 监听该命令并调用 `TransformService.attachToObject()`。

**冲突处理**：

拖拽 TransformControls 时自动禁用 OrbitControls，释放鼠标后恢复。

---

**相关文档**：

- [核心架构设计](./CoreArchitecture.md) - ObjectManager、事件驱动
- [存储与持久化系统](./StorageSystem.md) - SceneIO、序列化
- [UI 设计系统](./UIDesign.md) - DesignerPage 布局

---

## 11. 选择与高亮系统

**实现日期**: 2025-12-04

### 11.1 系统概述

选择与高亮系统为用户提供交互式对象选择功能，包括单击选中、多选、框选，以及视觉高亮反馈。

**核心功能**：

- **单击选中**：点击 3D 对象进行选中
- **多选模式**：Ctrl/Cmd + 点击切换选中状态
- **框选功能**：Shift + 拖拽矩形框选多个对象
- **视觉高亮**：选中对象显示绿色轮廓边框
- **相机协调**：框选时自动禁用相机控制

### 11.2 技术架构

#### 选择检测

**单击选中 (useSceneClick)**

```typescript
// src/features/designer/hooks/useSceneClick.ts
export function useSceneClick(
  containerRef: React.RefObject<HTMLDivElement>,
  renderer: IRenderer | null
): void {
  const handleClick = (event: MouseEvent) => {
    // 1. 计算 NDC 坐标
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 2. 射线检测
    const hits = renderer.raycastFromNDC({ x, y }, options);

    // 3. 发送选择命令
    if (hits && hits.length > 0) {
      const objectId = hits[0].handle;
      if (event.ctrlKey || event.metaKey) {
        sendCommand('command:selection:toggle', objectId);
      } else {
        sendCommand('command:selection:set', objectId);
      }
    } else {
      sendCommand('command:selection:clear', undefined);
    }
  };
}
```

**框选 (useBoxSelect + BoxSelectController)**

```typescript
// 框选手势检测
export function useBoxSelect(
  containerRef: React.RefObject<HTMLDivElement>,
  renderer: IRenderer | null,
  enabled: boolean
): void {
  const handleMouseDown = (event: MouseEvent) => {
    // 只在按住 Shift 时启动框选
    if (!event.shiftKey) return;

    isDraggingRef.current = true;
    startPointRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const distance = Math.sqrt(
      Math.pow(event.clientX - startPointRef.current.x, 2) +
        Math.pow(event.clientY - startPointRef.current.y, 2)
    );

    // 超过 5px 才启动框选
    if (distance >= MIN_DRAG_DISTANCE && !hasStartedBoxSelectRef.current) {
      sendCommand('command:boxselect:start', { x, y });
      renderer.requestDisableOrbitControls('box-selection');
    }
  };
}

// 框选对象检测
class BoxSelectController {
  private isObjectInBox(
    mesh: THREE.Object3D,
    region: BoxSelectRegion,
    canvasRect: DOMRect
  ): boolean {
    // 1. 获取对象世界坐标
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);

    // 2. 投影到屏幕坐标（NDC → Pixel）
    const screenPosition = worldPosition.clone().project(camera);
    const screenX =
      canvasRect.left + ((screenPosition.x + 1) / 2) * canvasRect.width;
    const screenY =
      canvasRect.top + ((-screenPosition.y + 1) / 2) * canvasRect.height;

    // 3. 检测是否在矩形内
    return (
      screenX >= region.startX &&
      screenX <= region.endX &&
      screenY >= region.startY &&
      screenY <= region.endY
    );
  }
}
```

#### 高亮渲染

**OutlineEffect (OutlinePass + OutputPass)**

```typescript
// src/core/renderer/threejs/effects/OutlineEffect.ts
export class OutlineEffect {
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private highlightedObjects = new Map<string, THREE.Object3D>();

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    // 1. 创建 EffectComposer
    this.composer = new EffectComposer(renderer);

    // 2. 渲染场景（基础 pass）
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 3. 轮廓高亮 pass
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      scene,
      camera
    );
    this.outlinePass.edgeStrength = 3.0;
    this.outlinePass.edgeGlow = 0.0;
    this.outlinePass.visibleEdgeColor.set('#00ff00'); // 绿色
    this.composer.addPass(this.outlinePass);

    // 4. FXAA 抗锯齿
    const fxaaPass = new ShaderPass(FXAAShader);
    this.composer.addPass(fxaaPass);

    // 5. 输出 pass（色调映射）
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setObjectOutline(objectId: string, enabled: boolean): void {
    if (enabled) {
      const obj = scene.getObjectByProperty('userData.modelId', objectId);
      if (obj) {
        this.highlightedObjects.set(objectId, obj);
      }
    } else {
      this.highlightedObjects.delete(objectId);
    }
    this.updateOutlinePass();
  }

  private updateOutlinePass(): void {
    this.outlinePass.selectedObjects = Array.from(
      this.highlightedObjects.values()
    );
  }

  render(): void {
    this.composer.render();
  }
}
```

#### 关键修复点

**1. 场景对象查找**

- **问题**：`scene.getObjectByProperty()` 只搜索直接子节点
- **解决**：使用 `scene.traverse()` 递归搜索整个场景树

**2. 渲染管线**

- **问题**：`startRenderLoop()` 直接调用 `RendererCore.render()`，绕过了 OutlineEffect
- **解决**：修改为调用 `ThreeRenderer.render()` 使用 EffectComposer 渲染

**3. 色调映射**

- **问题**：添加 EffectComposer 后场景变得非常暗
- **解决**：在后处理链末尾添加 `OutputPass` 处理色调映射和伽马校正

**4. 事件冲突**

- **问题**：框选完成后 `mouseup → click` 事件触发 `useSceneClick`，立即清除选中
- **解决**：`useSceneClick` 监听 `state:boxselect:completed`，100ms 内忽略 click 事件

### 11.3 组件协作

```
用户交互
    ↓
┌─────────────────┐
│  useSceneClick  │ (单击) → command:selection:set
│  useBoxSelect   │ (框选) → command:boxselect:start/update/end
└─────────────────┘
    ↓
┌─────────────────┐
│ SelectionService│ 管理选中状态
│BoxSelectCtrl    │ 框选对象检测
└─────────────────┘
    ↓
┌─────────────────┐
│ HighlightService│ 更新高亮显示
│ OutlineEffect   │ 后处理渲染
└─────────────────┘
    ↓
视觉反馈（绿色轮廓）
```

### 11.4 事件流

#### 单击选中流程

```
1. MouseDown → MouseUp → Click
2. useSceneClick.handleClick()
3. renderer.raycastFromNDC() → 射线检测
4. sendCommand('command:selection:set', objectId)
5. SelectionService 更新选中状态
6. HighlightService 监听状态变化
7. OutlineEffect.setObjectOutline() → 添加到高亮列表
8. ThreeRenderer.render() → 使用 EffectComposer 渲染
```

#### 框选流程

```
1. Shift + MouseDown → useBoxSelect 开始监听
2. MouseMove (distance > 5px) → command:boxselect:start
3. BoxSelectController 禁用 OrbitControls
4. BoxSelectionOverlay 显示蓝色矩形
5. MouseMove → command:boxselect:update → 更新矩形大小
6. MouseUp → command:boxselect:end
7. BoxSelectController.getObjectsInBox() → 投影检测
8. SelectionService 更新选中状态（ADD/TOGGLE 模式）
9. 发布 state:boxselect:completed
10. useSceneClick 设置标志位，100ms 内忽略 click
11. OrbitControls 恢复，蓝色矩形消失
```

### 11.5 配置参数

```typescript
// 高亮效果配置
const OUTLINE_CONFIG = {
  edgeStrength: 3.0, // 边缘强度
  edgeGlow: 0.0, // 边缘发光
  edgeThickness: 1.0, // 边缘厚度
  visibleEdgeColor: '#00ff00', // 可见边缘颜色（绿色）
  hiddenEdgeColor: '#190a05', // 隐藏边缘颜色
};

// 框选配置
const BOX_SELECT_CONFIG = {
  minDragDistance: 5, // 最小拖拽距离（px）
  clickIgnoreDelay: 100, // 框选后忽略点击的延迟（ms）
  boxColor: '#3b82f6', // 选框颜色（蓝色）
  boxOpacity: 0.2, // 选框不透明度
};
```

### 11.6 性能优化

1. **射线检测优化**
   - 使用 `raycaster.layers` 过滤辅助对象
   - 仅检测可见对象（`visible: true`）

2. **框选优化**
   - 投影算法使用对象中心点（简化版）
   - 未来可升级为边界框 8 个角点检测

3. **渲染优化**
   - OutlinePass 只在有选中对象时生效
   - 使用 EffectComposer 统一管理后处理

### 11.7 未来扩展

- [ ] **边界框高亮**：除轮廓外，显示 3D 包围盒辅助线
- [ ] **选择提示**：鼠标悬停时预览高亮（半透明）
- [ ] **框选优化**：使用边界框角点或 Frustum 检测提高准确率
- [ ] **自定义高亮颜色**：支持不同选择模式使用不同颜色
- [ ] **多对象轮廓融合**：多个对象选中时显示统一外轮廓

---

**相关实现文件**：

- `src/features/designer/hooks/useSceneClick.ts`
- `src/features/designer/hooks/useBoxSelect.ts`
- `src/features/designer/services/BoxSelectController.ts`
- `src/features/designer/ui/BoxSelectionOverlay.tsx`
- `src/core/renderer/threejs/effects/OutlineEffect.ts`
- `src/core/renderer/threejs/HighlightService.ts`
