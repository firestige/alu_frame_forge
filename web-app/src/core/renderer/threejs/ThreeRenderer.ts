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
  ColorHex,
  OrbitControlsConfig,
  RaycastHit,
} from '../renderer-types';
import { SceneManager } from './SceneManager';
import { CameraController } from './CameraController';
import { RaycasterService } from './RaycasterService';
import { RendererCore } from './RendererCore';

/**
 * Three.js 渲染器实现
 */
export class ThreeRenderer implements IRenderer {
  private config: RendererConfig | null = null;
  private sceneManager: SceneManager;
  private cameraController: CameraController | null = null;
  private raycasterService: RaycasterService;
  private rendererCore: RendererCore;

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
      obj.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    if (transform.rotation) {
      obj.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        transform.rotation.order || 'XYZ'
      );
    }

    if (transform.scale) {
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
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 清理几何体
        if (child.geometry) {
          child.geometry.dispose();
        }

        // 清理材质
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
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

    obj.traverse((child) => {
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

    obj.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.userData.originalMaterial
      ) {
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

  // ==================== 射线检测 ====================

  raycastFromScreen(
    mousePosition: Vector2,
    filterFn?: (userData: Record<string, unknown>) => boolean
  ): RaycastHit[] {
    if (!this.cameraController) {
      return [];
    }

    const camera = this.cameraController.getCamera();
    const scene = this.sceneManager.getScene();

    return this.raycasterService.raycastFromScreen(
      mousePosition,
      camera,
      scene,
      filterFn
    );
  }

  // ==================== 渲染循环 ====================

  startRenderLoop(callback?: () => void): void {
    if (!this.cameraController) {
      throw new Error('Camera not initialized');
    }

    const scene = this.sceneManager.getScene();
    const camera = this.cameraController.getCamera();

    this.rendererCore.startRenderLoop(
      scene,
      camera,
      () => this.cameraController?.updateControls(),
      callback
    );
  }

  stopRenderLoop(): void {
    this.rendererCore.stopRenderLoop();
  }

  render(): void {
    if (!this.cameraController) return;

    const scene = this.sceneManager.getScene();
    const camera = this.cameraController.getCamera();
    this.rendererCore.render(scene, camera);
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
