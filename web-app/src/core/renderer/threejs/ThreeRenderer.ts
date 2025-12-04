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
} from '../renderer-types';
import { SceneManager } from './SceneManager';
import { CameraController } from './CameraController';
import { RaycasterService } from './RaycasterService';
import { PreviewManager } from './PreviewManager';
import { RendererCore } from './RendererCore';
import type { OutlineEffect } from './OutlineEffect';

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

    this.initialized = true;
  }

  dispose(): void {
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

  // ==================== 场景对象管理 ====================

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
}

/**
 * 创建 Three.js 渲染器实例
 */
export function createThreeRenderer(config?: RendererConfig): IRenderer {
  return new ThreeRenderer(config);
}
