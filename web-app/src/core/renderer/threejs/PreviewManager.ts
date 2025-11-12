/**
 * PreviewManager - 预览对象管理器（内部实现）
 *
 * 职责：
 * - 管理场景中的预览对象
 * - 应用半透明材质
 * - 更新预览对象的变换和样式
 * - ThreeRenderer 的内部实现细节
 */

import * as THREE from 'three';
import type { Vector3, Euler, Quaternion } from '../renderer-types';

/**
 * 预览条目
 */
interface PreviewEntry {
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
  previewMaterial: THREE.Material;
}

/**
 * PreviewManager - 预览对象管理器
 */
export class PreviewManager {
  private scene: THREE.Scene;
  private previews = new Map<string, PreviewEntry>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * 添加预览对象
   * @param handle 对象句柄
   * @param mesh 网格对象
   * @param options 预览选项
   */
  add(
    handle: string,
    mesh: THREE.Mesh,
    options?: { color?: number; opacity?: number }
  ): void {
    // 如果已存在，先移除
    if (this.previews.has(handle)) {
      this.remove(handle);
    }

    // 保存原始材质
    const originalMaterial = mesh.material;

    // 创建预览材质
    const previewMaterial = new THREE.MeshStandardMaterial({
      color: options?.color ?? 0x00ff00,
      transparent: true,
      opacity: options?.opacity ?? 0.5,
      depthTest: true,
      depthWrite: false,
    });

    // 应用预览材质
    mesh.material = previewMaterial;

    // 添加到场景
    this.scene.add(mesh);

    // 记录
    this.previews.set(handle, {
      mesh,
      originalMaterial,
      previewMaterial,
    });

    console.log(`[PreviewManager] Added preview: ${handle}`);
  }

  /**
   * 更新预览变换
   * @param handle 对象句柄
   * @param transform 变换数据
   */
  updateTransform(
    handle: string,
    transform: {
      position?: Vector3;
      rotation?: Euler | Quaternion;
      scale?: Vector3;
    }
  ): void {
    const entry = this.previews.get(handle);
    if (!entry) {
      console.warn(`[PreviewManager] Preview not found: ${handle}`);
      return;
    }

    const { mesh } = entry;

    if (transform.position) {
      mesh.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    if (transform.rotation) {
      if ('w' in transform.rotation) {
        // Quaternion
        const q = transform.rotation as Quaternion;
        mesh.quaternion.set(q.x, q.y, q.z, q.w);
      } else {
        // Euler
        const e = transform.rotation as Euler;
        mesh.rotation.set(e.x, e.y, e.z, e.order || 'XYZ');
      }
    }

    if (transform.scale) {
      mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }
  }

  /**
   * 设置预览样式
   * @param handle 对象句柄
   * @param style 样式选项
   */
  setStyle(handle: string, style: { color?: number; opacity?: number }): void {
    const entry = this.previews.get(handle);
    if (!entry) {
      console.warn(`[PreviewManager] Preview not found: ${handle}`);
      return;
    }

    const material = entry.previewMaterial as THREE.MeshStandardMaterial;

    if (style.color !== undefined) {
      material.color.setHex(style.color);
    }

    if (style.opacity !== undefined) {
      material.opacity = Math.max(0, Math.min(1, style.opacity));
    }
  }

  /**
   * 移除预览对象
   * @param handle 对象句柄
   */
  remove(handle: string): void {
    const entry = this.previews.get(handle);
    if (!entry) {
      return;
    }

    const { mesh, originalMaterial, previewMaterial } = entry;

    // 从场景移除
    this.scene.remove(mesh);

    // 恢复原始材质
    mesh.material = originalMaterial;

    // 释放预览材质
    previewMaterial.dispose();

    // 从记录中删除
    this.previews.delete(handle);

    console.log(`[PreviewManager] Removed preview: ${handle}`);
  }

  /**
   * 清除所有预览
   */
  clear(): void {
    const handles = Array.from(this.previews.keys());
    handles.forEach(handle => this.remove(handle));
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clear();
  }
}
