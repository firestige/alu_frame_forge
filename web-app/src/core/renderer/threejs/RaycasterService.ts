/**
 * RaycasterService - Three.js 射线检测服务（内部实现）
 *
 * 职责：
 * - 提供射线检测功能
 * - 不再作为外部服务暴露，而是 ThreeRenderer 的内部实现细节
 * - 接收 Camera 和 Scene 参数，不依赖 IRenderer
 */

import * as THREE from 'three';
import type { Vector2, Vector3, RaycastHit } from '../renderer-types';

/**
 * 射线检测选项
 */
export interface RaycastOptions {
  /** 忽略的对象列表 */
  ignoreObjects?: THREE.Object3D[];
  /** 是否包含辅助对象（网格、坐标轴等） */
  includeHelpers?: boolean;
}

/**
 * RaycasterService - 内部射线检测服务
 */
export class RaycasterService {
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * 执行射线检测
   * @param ndc 归一化设备坐标
   * @param camera 相机
   * @param scene 场景
   * @param options 检测选项
   * @returns 射线检测结果数组，按距离排序
   */
  raycast(
    ndc: Vector2,
    camera: THREE.Camera,
    scene: THREE.Scene,
    options?: RaycastOptions
  ): RaycastHit[] {
    const mouse = new THREE.Vector2(ndc.x, ndc.y);
    this.raycaster.setFromCamera(mouse, camera);

    const objects = this.getInteractableObjects(
      scene,
      options?.ignoreObjects || [],
      options?.includeHelpers ?? false
    );

    const intersects = this.raycaster.intersectObjects(objects, true);

    return intersects.map(hit => ({
      handle: hit.object.userData.modelId || hit.object.uuid,
      point: {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
      },
      normal: hit.face
        ? {
            x: hit.face.normal.x,
            y: hit.face.normal.y,
            z: hit.face.normal.z,
          }
        : undefined,
      distance: hit.distance,
      isGroundPlane: false,
      userData: hit.object.userData,
    }));
  }

  /**
   * 与地面平面相交
   * @param ndc 归一化设备坐标
   * @param camera 相机
   * @param groundPlane 地面平面定义（法线 + 距离）
   * @returns 射线与地面的交点，如果没有交点则返回 null
   */
  intersectGroundPlane(
    ndc: Vector2,
    camera: THREE.Camera,
    groundPlane?: { normal: Vector3; distance: number }
  ): RaycastHit | null {
    const mouse = new THREE.Vector2(ndc.x, ndc.y);
    this.raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(
      new THREE.Vector3(
        groundPlane?.normal.x ?? 0,
        groundPlane?.normal.y ?? 1,
        groundPlane?.normal.z ?? 0
      ),
      groundPlane?.distance ?? 0
    );

    const intersectionPoint = new THREE.Vector3();
    const intersects = this.raycaster.ray.intersectPlane(
      plane,
      intersectionPoint
    );

    if (!intersects) {
      return null;
    }

    return {
      point: {
        x: intersectionPoint.x,
        y: intersectionPoint.y,
        z: intersectionPoint.z,
      },
      normal: {
        x: plane.normal.x,
        y: plane.normal.y,
        z: plane.normal.z,
      },
      distance: intersectionPoint.distanceTo(camera.position),
      isGroundPlane: true,
    };
  }

  /**
   * 获取场景中所有可交互的对象
   * @param scene 场景
   * @param ignoreList 忽略列表
   * @param includeHelpers 是否包含辅助对象
   * @returns 可交互对象数组
   */
  private getInteractableObjects(
    scene: THREE.Scene,
    ignoreList: THREE.Object3D[],
    includeHelpers: boolean
  ): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    const ignoreSet = new Set(ignoreList);

    scene.traverse(obj => {
      // 跳过忽略列表
      if (ignoreSet.has(obj)) {
        return;
      }

      // 跳过辅助对象（除非明确包含）
      if (!includeHelpers) {
        if (
          obj instanceof THREE.GridHelper ||
          obj instanceof THREE.AxesHelper ||
          obj instanceof THREE.Line
        ) {
          return;
        }
      }

      // 只添加标记为可交互的对象或具有 Mesh 的对象
      if (obj.userData.interactive || obj instanceof THREE.Mesh) {
        objects.push(obj);
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
