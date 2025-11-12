import * as THREE from 'three';
import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * 射线检测结果
 */
export interface HitResult {
  /** 交点世界坐标 */
  point: THREE.Vector3;
  /** 命中的物体（如果有） */
  object?: THREE.Object3D;
  /** 命中点的法线 */
  normal?: THREE.Vector3;
  /** 距离相机的距离 */
  distance: number;
  /** 是否命中地面（虚拟地面） */
  isGround: boolean;
}

/**
 * 射线检测服务
 * 
 * 职责：
 * - 将屏幕指针坐标转换为三维交点
 * - 优先返回场景物体的交点，否则返回与地面/放置平面的交点
 * - 封装 THREE.Raycaster，支持对象过滤和层管理
 */
export class RaycasterService {
  private raycaster: THREE.Raycaster;
  private renderer: IRenderer;
  private groundPlane: THREE.Plane;
  
  /** 忽略的对象列表 */
  private ignoredObjects: Set<THREE.Object3D> = new Set();

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    
    // 创建虚拟地面平面 (Y=0, 法线向上)
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  /**
   * 获取射线检测结果
   * @param ndc 归一化设备坐标 (-1 到 +1)
   * @returns 检测结果，如果没有命中任何物体则返回 null
   */
  getHit(ndc: THREE.Vector2): HitResult | null {
    const camera = this.renderer.getNativeCamera() as THREE.Camera;
    const scene = this.renderer.getNativeScene() as THREE.Scene;

    // 设置射线
    this.raycaster.setFromCamera(ndc, camera);

    // 1. 首先检测场景中的物体
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    
    // 过滤掉忽略的对象和辅助对象
    const validIntersects = intersects.filter(intersect => {
      // 跳过忽略列表中的对象
      if (this.ignoredObjects.has(intersect.object)) {
        return false;
      }
      
      // 跳过辅助对象（GridHelper, AxesHelper等）
      if (
        intersect.object instanceof THREE.GridHelper ||
        intersect.object instanceof THREE.AxesHelper ||
        intersect.object instanceof THREE.Line
      ) {
        return false;
      }
      
      return true;
    });

    // 如果命中了场景物体
    if (validIntersects.length > 0) {
      const firstHit = validIntersects[0];
      return {
        point: firstHit.point.clone(),
        object: firstHit.object,
        normal: firstHit.face?.normal.clone(),
        distance: firstHit.distance,
        isGround: false,
      };
    }

    // 2. 如果没有命中物体，检测与地面的交点
    const groundHit = new THREE.Vector3();
    const hitGround = this.raycaster.ray.intersectPlane(
      this.groundPlane,
      groundHit
    );

    if (hitGround) {
      return {
        point: groundHit,
        normal: new THREE.Vector3(0, 1, 0), // 地面法线向上
        distance: groundHit.distanceTo(camera.position),
        isGround: true,
      };
    }

    // 3. 都没命中
    return null;
  }

  /**
   * 设置地面平面
   * @param normal 平面法线
   * @param distance 平面到原点的距离
   */
  setGroundPlane(normal: THREE.Vector3, distance: number): void {
    this.groundPlane.set(normal, distance);
  }

  /**
   * 设置可交互层
   * @param layer 层索引（0-31）
   */
  setInteractiveLayer(layer: number): void {
    this.raycaster.layers.set(layer);
  }

  /**
   * 添加忽略的对象
   * @param object 要忽略的对象
   */
  addIgnoredObject(object: THREE.Object3D): void {
    this.ignoredObjects.add(object);
  }

  /**
   * 移除忽略的对象
   * @param object 要取消忽略的对象
   */
  removeIgnoredObject(object: THREE.Object3D): void {
    this.ignoredObjects.delete(object);
  }

  /**
   * 清空忽略列表
   */
  clearIgnoredObjects(): void {
    this.ignoredObjects.clear();
  }

  /**
   * 屏幕坐标转换为 NDC
   * @param screenX 屏幕 X 坐标
   * @param screenY 屏幕 Y 坐标
   * @param container 容器元素（用于获取尺寸）
   * @returns NDC 坐标
   */
  screenToNDC(
    screenX: number,
    screenY: number,
    container: HTMLElement
  ): THREE.Vector2 {
    const rect = container.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    this.ignoredObjects.clear();
  }
}

