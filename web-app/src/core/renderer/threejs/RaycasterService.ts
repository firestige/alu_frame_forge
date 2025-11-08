/**
 * RaycasterService - Three.js 射线检测服务
 * 负责从屏幕坐标进行射线检测，用于模型交互
 */

import * as THREE from 'three';
import type { Vector2, RaycastHit } from '../renderer-types';

export class RaycasterService {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * 从屏幕坐标进行射线检测
   * @param mousePosition 归一化的鼠标位置 (-1 到 1)
   * @param camera 相机
   * @param scene 场景
   * @param filterFn 可选的过滤函数
   */
  raycastFromScreen(
    mousePosition: Vector2,
    camera: THREE.Camera,
    scene: THREE.Scene,
    filterFn?: (userData: Record<string, unknown>) => boolean
  ): RaycastHit[] {
    // 更新射线
    this.mouse.set(mousePosition.x, mousePosition.y);
    this.raycaster.setFromCamera(this.mouse, camera);

    // 获取可交互对象
    const interactiveObjects = this.getInteractiveObjects(scene, filterFn);

    // 执行射线检测
    const intersects = this.raycaster.intersectObjects(
      interactiveObjects,
      true
    );

    // 转换为统一的结果格式
    return intersects.map(hit => ({
      handle: hit.object.userData.modelId || hit.object.uuid,
      point: {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
      },
      distance: hit.distance,
      userData: hit.object.userData,
    }));
  }

  /**
   * 从事件计算归一化的鼠标位置
   */
  getMousePosition(event: MouseEvent, container: HTMLElement): Vector2 {
    const rect = container.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  /**
   * 获取场景中所有可交互的对象
   */
  private getInteractiveObjects(
    scene: THREE.Scene,
    filterFn?: (userData: Record<string, unknown>) => boolean
  ): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];

    scene.traverse(object => {
      // 只检测标记为可交互的对象
      if (object.userData.interactive) {
        // 如果有过滤函数，应用过滤
        if (!filterFn || filterFn(object.userData)) {
          objects.push(object);
        }
      }
    });

    return objects;
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    // Raycaster 不需要特殊清理
  }
}
