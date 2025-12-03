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
  BoundingBox,
} from '../renderer-types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;
  private initialPosition: THREE.Vector3;
  private initialLookAt: THREE.Vector3;
  private animationFrameId: number | null = null;
  private scene: THREE.Scene | null = null; // 用于获取对象包围盒

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
   * 获取轨道控制器实例
   */
  getOrbitControls(): OrbitControls | null {
    return this.controls;
  }

  /**
   * 设置场景引用（用于获取对象包围盒）
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  // ==================== 平滑动画 ====================

  /**
   * 平滑动画到目标位置和观察点
   * @param targetPos 目标相机位置
   * @param targetLookAt 目标观察点
   * @param targetUp 目标上方向（可选，用于特殊视图如顶视图）
   * @param duration 动画时长（毫秒），0 表示瞬移
   */
  async animateToPosition(
    targetPos: Vector3,
    targetLookAt: Vector3,
    targetUp?: Vector3,
    duration = 600
  ): Promise<void> {
    // 如果duration为0，直接设置
    if (duration === 0) {
      this.camera.position.set(targetPos.x, targetPos.y, targetPos.z);

      if (targetUp) {
        this.camera.up.set(targetUp.x, targetUp.y, targetUp.z);
      } else {
        this.camera.up.set(0, 1, 0); // 重置为默认上方向
      }

      if (this.controls) {
        this.controls.target.set(
          targetLookAt.x,
          targetLookAt.y,
          targetLookAt.z
        );
        this.controls.update();
      } else {
        this.camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      }

      return Promise.resolve();
    }

    // 取消之前的动画
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    return new Promise(resolve => {
      const startPos = this.camera.position.clone();
      const startTarget = this.controls
        ? this.controls.target.clone()
        : new THREE.Vector3(0, 0, 0);
      const startUp = this.camera.up.clone();

      const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
      const endTarget = new THREE.Vector3(
        targetLookAt.x,
        targetLookAt.y,
        targetLookAt.z
      );
      const endUp = targetUp
        ? new THREE.Vector3(targetUp.x, targetUp.y, targetUp.z)
        : new THREE.Vector3(0, 1, 0);

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数
        const eased = this.easeInOutCubic(progress);

        // Lerp 相机位置
        this.camera.position.lerpVectors(startPos, endPos, eased);

        // Lerp 上方向
        this.camera.up.lerpVectors(startUp, endUp, eased);

        // Lerp 目标点
        if (this.controls) {
          this.controls.target.lerpVectors(startTarget, endTarget, eased);
          this.controls.update();
        } else {
          const currentTarget = new THREE.Vector3().lerpVectors(
            startTarget,
            endTarget,
            eased
          );
          this.camera.lookAt(currentTarget);
        }

        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.animationFrameId = null;
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * 缓动函数：立方缓入缓出
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ==================== 聚焦功能 ====================

  /**
   * 聚焦到包围盒
   * @param box 包围盒
   * @param paddingFactor 填充系数（相机距离的倍数）
   */
  async focusOnBoundingBox(
    box: BoundingBox,
    paddingFactor = 1.5
  ): Promise<void> {
    const threeBox = new THREE.Box3(
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    );

    const center = threeBox.getCenter(new THREE.Vector3());
    const size = threeBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // 计算相机距离
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (maxDim / 2 / Math.tan(fov / 2)) * paddingFactor;

    // 保持当前相机方向，只调整距离和目标
    const currentTarget = this.controls
      ? this.controls.target
      : new THREE.Vector3(0, 0, 0);
    const direction = this.camera.position
      .clone()
      .sub(currentTarget)
      .normalize();

    const targetPos = center.clone().add(direction.multiplyScalar(distance));

    return this.animateToPosition(
      { x: targetPos.x, y: targetPos.y, z: targetPos.z },
      { x: center.x, y: center.y, z: center.z },
      undefined,
      800
    );
  }

  /**
   * 获取对象包围盒
   * @param objectId 对象ID（存储在 userData.id 中）
   */
  getObjectBoundingBox(objectId: string): BoundingBox | null {
    if (!this.scene) {
      console.warn('Scene not set in CameraController');
      return null;
    }

    // 查找对象
    let foundObject: THREE.Object3D | null = null;
    this.scene.traverse(child => {
      if (child.userData?.id === objectId) {
        foundObject = child;
      }
    });

    if (!foundObject) {
      return null;
    }

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(foundObject);

    return {
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
    };
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.disableOrbitControls();
  }
}
