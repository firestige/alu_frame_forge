/**
 * ThreeRenderer - Three.js 渲染器主入口
 * 组合所有子模块，实现 IRenderer 接口
 */

import * as THREE from 'three';
import type {
  IRenderer,
  RendererConfig,
  SceneHandle,
  CameraHandle,
  Vector3,
  Vector2,
  Euler,
  Quaternion,
  ColorHex,
  OrbitControlsConfig,
  RaycastHit,
  WorkPlaneConfig,
  ExtrusionParams,
  MeshHandle,
} from '../renderer-types';
import { SceneManager } from './SceneManager';
import { CameraController } from './CameraController';
import { RaycasterService } from './RaycasterService';
import { PreviewManager } from './PreviewManager';
import { RendererCore } from './RendererCore';
import type { OutlineEffect } from './OutlineEffect';
import { ThreeTransformController } from './ThreeTransformController';
import type { ITransformController } from '../renderer-types';
import type { IShape } from '@/core/geometry/types';
import type { MaterialProperties } from '@/core/geometry/types';
import { ThreeGeometryAdapter } from './adapters/ThreeGeometryAdapter';
import { ThreeMaterialFactory } from './adapters/ThreeMaterialFactory';
import {
  AnchorGizmo,
  AlignmentGuides,
  ConstraintVisualizer,
  DimensionLabel,
} from '../gizmos';

/**
 * Three.js 渲染器实现
 */
export class ThreeRenderer implements IRenderer {
  private config: RendererConfig | null = null;
  private sceneManager: SceneManager;
  private cameraController: CameraController | null = null;
  private raycasterService: RaycasterService;
  private previewManager: PreviewManager | null = null;
  private rendererCore: RendererCore;
  private outlineEffect: OutlineEffect | null = null;
  private transformController: ThreeTransformController | null = null;

  // Gizmo 组件
  private anchorGizmo: AnchorGizmo | null = null;
  private alignmentGuides: AlignmentGuides | null = null;
  private constraintVisualizer: ConstraintVisualizer | null = null;
  private dimensionLabel: DimensionLabel | null = null;

  private initialized = false;

  constructor(config?: RendererConfig) {
    this.sceneManager = new SceneManager();
    this.raycasterService = new RaycasterService();
    this.rendererCore = new RendererCore();

    if (config) {
      this.initialize(config);
    }
  }

  // ==================== 生命周期 ====================

  initialize(config: RendererConfig): void {
    if (this.initialized) {
      console.warn('Renderer already initialized');
      return;
    }

    this.config = config;

    // 初始化相机控制器
    this.cameraController = new CameraController(config.container);

    // 设置场景引用（用于获取对象包围盒）
    this.cameraController.setScene(this.sceneManager.getScene());

    // 初始化预览管理器
    this.previewManager = new PreviewManager(this.sceneManager.getScene());

    // 设置相机位置
    if (config.camera?.position) {
      this.cameraController.setPosition(config.camera.position);
    }
    if (config.camera?.lookAt) {
      this.cameraController.setLookAt(config.camera.lookAt);
    }

    // 初始化渲染器核心
    this.rendererCore.initialize(config);

    // 设置背景色
    if (config.backgroundColor !== undefined) {
      this.sceneManager.setBackgroundColor(config.backgroundColor);
    }

    // 如果启用轨道控制器
    if (config.orbitControls?.enabled !== false) {
      this.enableOrbitControls(config.orbitControls);
    }

    // 初始化 TransformController
    // ✅ 使用 renderer.domElement（canvas），而不是 container（div）
    const rendererDomElement = this.rendererCore.getRenderer().domElement;
    this.transformController = new ThreeTransformController(
      this,
      this.sceneManager.getScene(),
      this.cameraController.getCamera(),
      rendererDomElement
    );

    // 初始化 Gizmo 组件
    this.anchorGizmo = new AnchorGizmo(
      this.sceneManager.getScene(),
      this.cameraController.getCamera()
    );
    this.alignmentGuides = new AlignmentGuides(this.sceneManager.getScene());
    this.constraintVisualizer = new ConstraintVisualizer(
      this.sceneManager.getScene()
    );
    this.dimensionLabel = new DimensionLabel(this.sceneManager.getScene());

    this.initialized = true;
  }

  dispose(): void {
    // 销毁 Gizmo 组件
    this.anchorGizmo?.dispose();
    this.alignmentGuides?.dispose();
    this.constraintVisualizer?.dispose();
    this.dimensionLabel?.dispose();

    this.transformController?.dispose();
    this.rendererCore.dispose();
    this.cameraController?.dispose();
    this.sceneManager.dispose();
    this.raycasterService.dispose();
    this.previewManager?.dispose();
    this.initialized = false;
    this.config = null;
  }

  resize(width: number, height: number): void {
    this.rendererCore.resize(width, height);
    this.cameraController?.updateAspect(width, height);
  }

  // ==================== 场景管理 ====================

  getScene(): SceneHandle {
    return 'main-scene' as SceneHandle;
  }

  setBackgroundColor(color: ColorHex): void {
    this.sceneManager.setBackgroundColor(
      `#${color.toString(16).padStart(6, '0')}`
    );
  }

  addGridHelper(size?: number, divisions?: number): void {
    this.sceneManager.addGridHelper(size, divisions);
  }

  addAxesHelper(size?: number): void {
    this.sceneManager.addAxesHelper(size);
  }

  enableGridHelper(size?: number, divisions?: number): void {
    this.sceneManager.addGridHelper(size, divisions);
  }

  enableAxesHelper(size?: number): void {
    this.sceneManager.addAxesHelper(size);
  }

  // ==================== 辅助几何绘制 ====================

  private helperObjects = new Map<string, THREE.Object3D>();

  createHelperCircle(
    id: string,
    position: Vector3,
    radius: number,
    color: ColorHex,
    options?: {
      normal?: Vector3;
      opacity?: number;
      animated?: boolean;
    }
  ): unknown {
    // 移除旧的辅助对象
    this.removeHelper(id);

    const geometry = new THREE.RingGeometry(
      radius * 0.8,
      radius,
      32
    );
    const material = new THREE.MeshBasicMaterial({
      color: color,
      opacity: options?.opacity ?? 0.8,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(position.x, position.y, position.z);

    // 根据法向量旋转圆环
    if (options?.normal) {
      const normal = new THREE.Vector3(
        options.normal.x,
        options.normal.y,
        options.normal.z
      );
      const up = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, normal.normalize());
      circle.quaternion.copy(quaternion);
    }

    // 脉冲动画
    if (options?.animated) {
      const originalScale = 1;
      const animate = () => {
        if (!this.helperObjects.has(id)) return;
        const time = Date.now() * 0.002;
        const scale = originalScale + Math.sin(time) * 0.1;
        circle.scale.set(scale, scale, 1);
        requestAnimationFrame(animate);
      };
      animate();
    }

    this.helperObjects.set(id, circle);
    this.sceneManager.getScene().add(circle);
    return circle;
  }

  createHelperLine(
    id: string,
    start: Vector3,
    end: Vector3,
    color: ColorHex,
    options?: {
      dashed?: boolean;
      opacity?: number;
      lineWidth?: number;
    }
  ): unknown {
    // 移除旧的辅助对象
    this.removeHelper(id);

    const points = [
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(end.x, end.y, end.z),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = options?.dashed
      ? new THREE.LineDashedMaterial({
          color: color,
          opacity: options?.opacity ?? 0.6,
          transparent: true,
          dashSize: 10,
          gapSize: 5,
          linewidth: options?.lineWidth ?? 1,
          depthTest: false,
        })
      : new THREE.LineBasicMaterial({
          color: color,
          opacity: options?.opacity ?? 0.6,
          transparent: true,
          linewidth: options?.lineWidth ?? 1,
          depthTest: false,
        });

    const line = options?.dashed
      ? new THREE.Line(geometry, material)
      : new THREE.Line(geometry, material);

    if (options?.dashed) {
      line.computeLineDistances();
    }

    this.helperObjects.set(id, line);
    this.sceneManager.getScene().add(line);
    return line;
  }

  removeHelper(id: string): void {
    const helper = this.helperObjects.get(id);
    if (helper) {
      this.sceneManager.getScene().remove(helper);
      if (helper instanceof THREE.Mesh || helper instanceof THREE.Line) {
        helper.geometry.dispose();
        if (helper.material instanceof THREE.Material) {
          helper.material.dispose();
        }
      }
      this.helperObjects.delete(id);
    }
  }

  clearHelpers(): void {
    this.helperObjects.forEach((_, id) => this.removeHelper(id));
    this.helperObjects.clear();
  }

  // ==================== 场景对象管理 ====================

  /**
   * 创建拉伸网格
   */
  createExtrudedMesh(params: ExtrusionParams): MeshHandle {
    console.log('[ThreeRenderer] 🎯 开始创建拉伸网格:', {
      length: params.length,
      shape: params.shape,
      userData: params.userData,
    });

    // 1. 转换抽象形状到 Three.js Shape
    const shape = params.shape as IShape;
    const threeShape = ThreeGeometryAdapter.shapeToThreeShape(
      shape,
      params.targetSize
    );
    console.log(
      '[ThreeRenderer] ✅ Shape转换完成, curves数量:',
      shape.curves?.length
    );

    // 2. 创建拉伸几何体
    const geometry = ThreeGeometryAdapter.createSimplifiedExtrudeGeometry(
      threeShape,
      params.length
    );
    console.log('[ThreeRenderer] ✅ ExtrudeGeometry创建完成');

    // 3. 创建材质
    const materialProps = params.material as MaterialProperties;
    const material = ThreeMaterialFactory.create(materialProps);

    // 4. 创建网格
    const mesh = new THREE.Mesh(geometry, material);

    // 5. 应用变换
    if (params.transform) {
      if (params.transform.position) {
        mesh.position.set(
          params.transform.position.x,
          params.transform.position.y,
          params.transform.position.z
        );
      }
      if (params.transform.rotation) {
        mesh.rotation.set(
          params.transform.rotation.x,
          params.transform.rotation.y,
          params.transform.rotation.z,
          params.transform.rotation.order
        );
      }
      if (params.transform.scale) {
        mesh.scale.set(
          params.transform.scale.x,
          params.transform.scale.y,
          params.transform.scale.z
        );
      }
    }

    // 6. 设置用户数据
    if (params.userData) {
      mesh.userData = { ...mesh.userData, ...params.userData };
    }

    // 7. 返回网格句柄
    return {
      nativeObject: mesh,
      geometryHandle: geometry,
      materialHandle: material,
    };
  }

  addObject(object: unknown, userData?: Record<string, unknown>): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to addObject');
      return;
    }

    const obj = object as THREE.Object3D;

    // 设置 userData
    if (userData) {
      obj.userData = { ...obj.userData, ...userData };
    }

    // 添加到场景
    this.sceneManager.getScene().add(obj);

    console.log('[ThreeRenderer] Object added to scene:', {
      type: obj.type,
      uuid: obj.uuid,
      modelId: obj.userData?.modelId,
      parent: obj.parent?.type,
      inScene: this.sceneManager.getScene().children.includes(obj),
    });
  }

  removeObject(object: unknown): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to removeObject');
      return;
    }

    const obj = object as THREE.Object3D;
    this.sceneManager.getScene().remove(obj);
  }

  updateObjectTransform(
    object: unknown,
    transform: {
      position?: Vector3;
      rotation?: Euler;
      scale?: Vector3;
    }
  ): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to updateObjectTransform');
      return;
    }

    const obj = object as THREE.Object3D;

    if (transform.position) {
      // 验证数据有效性（null、undefined、NaN 都会导致问题）
      if (
        transform.position.x == null ||
        transform.position.y == null ||
        transform.position.z == null ||
        isNaN(transform.position.x) ||
        isNaN(transform.position.y) ||
        isNaN(transform.position.z)
      ) {
        console.error('[ThreeRenderer] Invalid position:', transform.position);
        return;
      }

      obj.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    if (transform.rotation) {
      // 验证数据有效性
      if (
        transform.rotation.x == null ||
        transform.rotation.y == null ||
        transform.rotation.z == null ||
        isNaN(transform.rotation.x) ||
        isNaN(transform.rotation.y) ||
        isNaN(transform.rotation.z)
      ) {
        console.error('[ThreeRenderer] Invalid rotation:', transform.rotation);
        return;
      }

      obj.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.order || 'XYZ'
      );
    }

    if (transform.scale) {
      // 验证数据有效性
      if (
        transform.scale.x == null ||
        transform.scale.y == null ||
        transform.scale.z == null ||
        isNaN(transform.scale.x) ||
        isNaN(transform.scale.y) ||
        isNaN(transform.scale.z)
      ) {
        console.error('[ThreeRenderer] Invalid scale:', transform.scale);
        return;
      }

      obj.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }
  }

  setObjectVisibility(object: unknown, visible: boolean): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to setObjectVisibility');
      return;
    }

    const obj = object as THREE.Object3D;
    obj.visible = visible;
  }

  disposeObject(object: unknown): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to disposeObject');
      return;
    }

    const obj = object as THREE.Object3D;

    // 遍历并清理资源
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // 清理几何体
        if (child.geometry) {
          child.geometry.dispose();
        }

        // 清理材质
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  highlightObject(
    object: unknown,
    color: number = 0x00ff00,
    intensity: number = 0.5
  ): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to highlightObject');
      return;
    }

    const obj = object as THREE.Object3D;

    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // 保存原始材质
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;

          // 创建高亮材质
          const material = child.material as THREE.MeshStandardMaterial;
          const highlightMaterial = material.clone();
          highlightMaterial.emissive = new THREE.Color(color);
          highlightMaterial.emissiveIntensity = intensity;
          child.material = highlightMaterial;
        }
      }
    });
  }

  unhighlightObject(object: unknown): void {
    if (!object || typeof object !== 'object') {
      console.warn('Invalid object provided to unhighlightObject');
      return;
    }

    const obj = object as THREE.Object3D;

    obj.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData.originalMaterial) {
        // 清理高亮材质
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }

        // 恢复原始材质
        child.material = child.userData.originalMaterial;
        delete child.userData.originalMaterial;
      }
    });
  }

  // ==================== 相机管理 ====================

  getCamera(): CameraHandle {
    return 'main-camera' as CameraHandle;
  }

  /**
   * 获取内部 Three.js Camera 实例（用于高级功能）
   * @internal 仅供内部高级功能使用
   */
  getInternalCamera(): THREE.Camera | null {
    return this.cameraController?.getCamera() ?? null;
  }

  /**
   * 获取内部 Three.js Scene 实例（用于高级功能）
   * @internal 仅供内部高级功能使用
   */
  getInternalScene(): THREE.Scene {
    return this.sceneManager.getScene();
  }

  /**
   * 获取内部 Three.js WebGLRenderer 实例（用于高级功能）
   * @internal 仅供内部高级功能使用
   */
  getInternalRenderer(): THREE.WebGLRenderer {
    return this.rendererCore.getRenderer();
  }

  /**
   * 设置 OutlineEffect（由 HighlightService 调用）
   * @internal
   */
  setOutlineEffect(effect: OutlineEffect): void {
    this.outlineEffect = effect;
  }

  setCameraPosition(position: Vector3): void {
    this.cameraController?.setPosition(position);
  }

  setCameraLookAt(target: Vector3): void {
    this.cameraController?.setLookAt(target);
  }

  resetCamera(): void {
    if (this.config?.camera?.position) {
      this.setCameraPosition(this.config.camera.position);
    }
    if (this.config?.camera?.lookAt) {
      this.setCameraLookAt(this.config.camera.lookAt);
    }
  }

  // ==================== 轨道控制器 ====================

  enableOrbitControls(config?: OrbitControlsConfig): void {
    const renderer = this.rendererCore.getRenderer();
    this.cameraController?.enableOrbitControls(renderer, config);
  }

  disableOrbitControls(): void {
    this.cameraController?.disableOrbitControls();
  }

  requestDisableOrbitControls(reason: string): void {
    this.cameraController?.requestDisableOrbitControls(reason);
  }

  releaseDisableOrbitControls(reason: string): void {
    this.cameraController?.releaseDisableOrbitControls(reason);
  }

  // ==================== 对象高亮 ====================

  setObjectHighlight(objectId: string, highlighted: boolean): void {
    if (!this.outlineEffect) {
      console.warn(
        '[ThreeRenderer] OutlineEffect not set, cannot highlight object'
      );
      return;
    }

    const scene = this.sceneManager.getScene();

    // 🔧 使用 traverse 递归查找对象（getObjectByProperty 不递归）
    let object: THREE.Object3D | null = null;
    scene.traverse(obj => {
      if (obj.userData.modelId === objectId) {
        object = obj;
      }
    });

    if (!object) {
      console.warn(`[ThreeRenderer] Object ${objectId} not found in scene`);
      console.warn(
        'Available modelIds:',
        (() => {
          const ids: string[] = [];
          scene.traverse(obj => {
            if (obj.userData.modelId) ids.push(obj.userData.modelId);
          });
          return ids;
        })()
      );
      return;
    }

    this.outlineEffect.setObjectOutline(object, highlighted);
  }

  clearAllHighlights(): void {
    if (!this.outlineEffect) {
      console.warn(
        '[ThreeRenderer] OutlineEffect not set, cannot clear highlights'
      );
      return;
    }

    this.outlineEffect.clearAllOutlines();
  }

  // ==================== 射线检测 ====================

  raycastFromNDC(
    ndc: Vector2,
    options?: {
      ignoreHandles?: string[];
      includeHelpers?: boolean;
      includeWorkPlane?: boolean;
      workPlane?: WorkPlaneConfig;
    }
  ): RaycastHit[] {
    if (!this.cameraController) {
      return [];
    }

    const camera = this.cameraController.getCamera();
    const scene = this.sceneManager.getScene();

    // 获取场景对象的射线检测结果
    const sceneHits = this.raycasterService.raycast(ndc, camera, scene, {
      ignoreObjects: options?.ignoreHandles
        ?.map(handle => {
          // 从场景中查找具有该句柄的对象
          let foundObject: THREE.Object3D | undefined;
          scene.traverse(obj => {
            if (obj.userData.modelId === handle || obj.uuid === handle) {
              foundObject = obj;
            }
          });
          return foundObject;
        })
        .filter((obj): obj is THREE.Object3D => obj !== undefined),
      includeHelpers: options?.includeHelpers,
    });

    // 如果需要检测工作平面
    if (options?.includeWorkPlane && options.workPlane) {
      const workPlaneHit = this.raycasterService.intersectWorkPlane(
        ndc,
        camera,
        options.workPlane
      );

      if (workPlaneHit) {
        // 优先返回工作平面结果（CAD 软件常见行为）
        return [workPlaneHit, ...sceneHits];
      }
    }

    return sceneHits;
  }

  raycastFromScreen(
    screenX: number,
    screenY: number,
    viewport: { left: number; top: number; width: number; height: number },
    options?: {
      ignoreHandles?: string[];
      includeHelpers?: boolean;
      includeWorkPlane?: boolean;
      workPlane?: WorkPlaneConfig;
    }
  ): RaycastHit[] {
    // 计算 NDC 坐标
    const ndc: Vector2 = {
      x: ((screenX - viewport.left) / viewport.width) * 2 - 1,
      y: -((screenY - viewport.top) / viewport.height) * 2 + 1,
    };

    return this.raycastFromNDC(ndc, options);
  }

  // ==================== 预览对象管理 ====================

  addPreviewObject(
    handle: string,
    object: unknown,
    options?: { color?: number; opacity?: number }
  ): void {
    if (!this.previewManager) {
      console.warn('[ThreeRenderer] PreviewManager not initialized');
      return;
    }

    if (!object || typeof object !== 'object') {
      console.warn(
        '[ThreeRenderer] Invalid object provided to addPreviewObject'
      );
      return;
    }

    const mesh = object as THREE.Mesh;
    this.previewManager.add(handle, mesh, options);
  }

  updatePreviewTransform(
    handle: string,
    transform: {
      position?: Vector3;
      rotation?: Euler | Quaternion;
      scale?: Vector3;
    }
  ): void {
    if (!this.previewManager) {
      console.warn('[ThreeRenderer] PreviewManager not initialized');
      return;
    }

    this.previewManager.updateTransform(handle, transform);
  }

  removePreviewObject(handle: string): void {
    if (!this.previewManager) {
      console.warn('[ThreeRenderer] PreviewManager not initialized');
      return;
    }

    this.previewManager.remove(handle);
  }

  setPreviewStyle(
    handle: string,
    style: { color?: number; opacity?: number }
  ): void {
    if (!this.previewManager) {
      console.warn('[ThreeRenderer] PreviewManager not initialized');
      return;
    }

    this.previewManager.setStyle(handle, style);
  }

  // ==================== 渲染循环 ====================

  startRenderLoop(callback?: () => void): void {
    if (!this.cameraController) {
      throw new Error('Camera not initialized');
    }

    const scene = this.sceneManager.getScene();
    const camera = this.cameraController.getCamera();

    // 不再使用 RendererCore 的渲染循环，因为它会直接渲染而不走 ThreeRenderer.render()
    // 改为自己管理动画循环
    let animationFrameId: number;

    const animate = (): void => {
      animationFrameId = requestAnimationFrame(animate);

      // 更新相机控制器
      this.cameraController?.updateControls();

      // ✅ 更新 TransformControls（重要！）
      if (this.transformController) {
        (this.transformController as any).update?.();
      }

      // 调用外部回调
      if (callback) {
        callback();
      }

      // 使用 ThreeRenderer.render()（会自动选择 OutlineEffect 或普通渲染）
      this.render();
    };

    animate();

    // 保存 animationFrameId 用于停止
    (this as any)._animationFrameId = animationFrameId;
  }

  stopRenderLoop(): void {
    const animationFrameId = (this as any)._animationFrameId;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      (this as any)._animationFrameId = null;
    }
  }

  render(): void {
    if (!this.cameraController) return;

    const scene = this.sceneManager.getScene();
    const camera = this.cameraController.getCamera();

    // 如果有 OutlineEffect 并且已初始化，使用 EffectComposer 渲染
    if (this.outlineEffect && this.outlineEffect.isInitialized()) {
      // 只在有高亮对象时打印（避免刷屏）
      if (this.outlineEffect.hasHighlightedObjects()) {
        console.log('[ThreeRenderer] Rendering with OutlineEffect');
      }
      this.outlineEffect.render();
    } else {
      // 否则使用普通渲染
      this.rendererCore.render(scene, camera);
    }
  }

  // ==================== 原生对象访问 ====================

  getNativeScene(): unknown {
    return this.sceneManager.getScene();
  }

  getNativeCamera(): unknown {
    return this.cameraController?.getCamera();
  }

  getTransformController(): ITransformController {
    if (!this.transformController) {
      throw new Error('TransformController not initialized');
    }
    return this.transformController;
  }

  // ==================== 调试接口 ====================

  getDebugInfo() {
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
      orbitControls: controls
        ? {
            enabled: controls.enabled,
            minDistance: controls.minDistance,
            maxDistance: controls.maxDistance,
            enableDamping: controls.enableDamping,
          }
        : undefined,
    };
  }

  // ==================== Gizmo 组件访问 ====================

  /**
   * 获取锚点可视化组件
   */
  getAnchorGizmo(): AnchorGizmo | null {
    return this.anchorGizmo;
  }

  /**
   * 获取对齐辅助线组件
   */
  getAlignmentGuides(): AlignmentGuides | null {
    return this.alignmentGuides;
  }

  /**
   * 获取约束可视化组件
   */
  getConstraintVisualizer(): ConstraintVisualizer | null {
    return this.constraintVisualizer;
  }

  /**
   * 获取尺寸标注组件
   */
  getDimensionLabel(): DimensionLabel | null {
    return this.dimensionLabel;
  }
}

/**
 * 创建 Three.js 渲染器实例
 */
export function createThreeRenderer(config?: RendererConfig): IRenderer {
  return new ThreeRenderer(config);
}
