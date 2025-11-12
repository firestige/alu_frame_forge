import * as THREE from 'three';
import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * 预览服务
 *
 * 职责：
 * - 在场景中显示待放置模型的预览（位置、朝向、可见性）
 * - 创建/复用预览物体，更新 transform、样式（半透明/颜色）
 * - 管理资源释放
 */
export class PreviewService {
  private renderer: IRenderer;
  private previewMesh: THREE.Mesh | null = null;
  private originalMaterial: THREE.Material | THREE.Material[] | null = null;
  private previewMaterial: THREE.Material | null = null;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
    this.createPreviewMaterial();
  }

  /**
   * 创建半透明预览材质
   */
  private createPreviewMaterial(): void {
    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // 绿色
      transparent: true,
      opacity: 0.5,
      depthTest: true,
      depthWrite: false,
    });
  }

  /**
   * 显示预览
   * @param mesh 要预览的 Mesh（通常从 AssetFactory 获取）
   */
  showPreview(mesh: THREE.Mesh): void {
    // 如果已有预览，先隐藏
    if (this.previewMesh) {
      this.hide();
    }

    // 保存原始材质
    this.originalMaterial = mesh.material;

    // 应用预览材质
    if (this.previewMaterial) {
      mesh.material = this.previewMaterial;
    }

    // 添加到场景
    const scene = this.renderer.getNativeScene() as THREE.Scene;
    scene.add(mesh);

    this.previewMesh = mesh;
  }

  /**
   * 更新预览变换
   * @param position 位置
   * @param rotation 旋转（四元数或欧拉角）
   */
  updateTransform(
    position: THREE.Vector3,
    rotation?: THREE.Quaternion | THREE.Euler
  ): void {
    if (!this.previewMesh) {
      console.warn('[PreviewService] No preview mesh to update');
      return;
    }

    // 更新位置
    this.previewMesh.position.copy(position);

    // 更新旋转
    if (rotation) {
      if (rotation instanceof THREE.Quaternion) {
        this.previewMesh.quaternion.copy(rotation);
      } else {
        this.previewMesh.rotation.copy(rotation);
      }
    }
  }

  /**
   * 设置预览颜色
   * @param color 颜色（十六进制）
   */
  setColor(color: number): void {
    if (this.previewMaterial && 'color' in this.previewMaterial) {
      (this.previewMaterial as THREE.MeshStandardMaterial).color.setHex(color);
    }
  }

  /**
   * 设置预览透明度
   * @param opacity 透明度（0-1）
   */
  setOpacity(opacity: number): void {
    if (this.previewMaterial) {
      this.previewMaterial.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * 隐藏预览
   */
  hide(): void {
    if (!this.previewMesh) {
      return;
    }

    // 从场景移除
    const scene = this.renderer.getNativeScene() as THREE.Scene;
    scene.remove(this.previewMesh);

    // 恢复原始材质
    if (this.originalMaterial) {
      this.previewMesh.material = this.originalMaterial;
      this.originalMaterial = null;
    }

    this.previewMesh = null;
  }

  /**
   * 获取当前预览 Mesh
   */
  getPreviewMesh(): THREE.Mesh | null {
    return this.previewMesh;
  }

  /**
   * 是否正在显示预览
   */
  isShowing(): boolean {
    return this.previewMesh !== null;
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    this.hide();

    // 释放预览材质
    if (this.previewMaterial) {
      this.previewMaterial.dispose();
      this.previewMaterial = null;
    }
  }
}

