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

**相关文档**：

- [核心架构设计](./CoreArchitecture.md) - ObjectManager、事件驱动
- [存储与持久化系统](./StorageSystem.md) - SceneIO、序列化
- [UI 设计系统](./UIDesign.md) - DesignerPage 布局
