/**
 * CameraController - Three.js 相机控制器
 * 负责相机的创建、位置控制、轨道控制等
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  Vector3,
  CameraConfig,
  OrbitControlsConfig,
} from '../renderer-types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;
  private initialPosition: THREE.Vector3;
  private initialLookAt: THREE.Vector3;

  constructor(container: HTMLElement, config?: CameraConfig) {
    // 创建透视相机
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(
      config?.fov || 75,
      aspect,
      config?.near || 0.1,
      config?.far || 1000
    );

    // 设置初始位置
    const pos = config?.position || { x: 5, y: 5, z: 5 };
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.initialPosition = this.camera.position.clone();

    // 设置初始观察目标
    const lookAt = config?.lookAt || { x: 0, y: 0, z: 0 };
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    this.initialLookAt = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
  }

  /**
   * 获取相机实例
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 设置相机位置
   */
  setPosition(position: Vector3): void {
    this.camera.position.set(position.x, position.y, position.z);
  }

  /**
   * 设置相机观察目标
   */
  setLookAt(target: Vector3): void {
    this.camera.lookAt(target.x, target.y, target.z);
  }

  /**
   * 重置相机到初始位置
   */
  reset(): void {
    this.camera.position.copy(this.initialPosition);
    this.camera.lookAt(this.initialLookAt);
    if (this.controls) {
      this.controls.target.copy(this.initialLookAt);
      this.controls.update();
    }
  }

  /**
   * 更新相机宽高比
   */
  updateAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 启用轨道控制器
   */
  enableOrbitControls(
    renderer: THREE.WebGLRenderer,
    config?: OrbitControlsConfig
  ): void {
    if (this.controls) {
      this.controls.dispose();
    }

    this.controls = new OrbitControls(this.camera, renderer.domElement);

    // 应用配置
    if (config) {
      if (config.enableDamping !== undefined) {
        this.controls.enableDamping = config.enableDamping;
      }
      if (config.dampingFactor !== undefined) {
        this.controls.dampingFactor = config.dampingFactor;
      }
      if (config.enableZoom !== undefined) {
        this.controls.enableZoom = config.enableZoom;
      }
      if (config.enableRotate !== undefined) {
        this.controls.enableRotate = config.enableRotate;
      }
      if (config.enablePan !== undefined) {
        this.controls.enablePan = config.enablePan;
      }
      if (config.minDistance !== undefined) {
        this.controls.minDistance = config.minDistance;
      }
      if (config.maxDistance !== undefined) {
        this.controls.maxDistance = config.maxDistance;
      }
    }
  }

  /**
   * 禁用轨道控制器
   */
  disableOrbitControls(): void {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }

  /**
   * 更新轨道控制器
   */
  updateControls(): void {
    if (this.controls) {
      this.controls.update();
    }
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.disableOrbitControls();
  }
}
