import * as THREE from 'three';
import type { IRenderer } from '@/core/renderer/renderer-types';
import type { ObjectManager } from '@/core/object/ObjectManager';
import type { AnyAsset } from '@/core/asset/types/asset';
import type { SceneObjectCreateOptions } from '@/core/object/types/scene-object';
import { RaycasterService } from './RaycasterService';
import { PreviewService } from './PreviewService';
import { InputManager, type PointerEventData } from './InputManager';

/**
 * 放置控制器
 *
 * 职责：
 * - 管理一次放置会话的生命周期（开始、预览更新、确认放置、取消）
 * - 协调 RaycasterService、PreviewService、InputManager
 * - 最终在确认时调用 ObjectManager.createObjectFromAsset
 */
export class PlacementController {
  private renderer: IRenderer;
  private objectManager: ObjectManager;

  // 子服务
  private raycasterService: RaycasterService;
  private previewService: PreviewService;
  private inputManager: InputManager;

  // 会话状态
  private isActive = false;
  private currentAsset: AnyAsset | null = null;
  private currentPreviewMesh: THREE.Mesh | null = null;
  private currentPosition: THREE.Vector3 | null = null;

  constructor(
    renderer: IRenderer,
    objectManager: ObjectManager,
    container: HTMLElement
  ) {
    this.renderer = renderer;
    this.objectManager = objectManager;

    // 初始化子服务
    this.raycasterService = new RaycasterService(renderer);
    this.previewService = new PreviewService(renderer);
    this.inputManager = new InputManager(container);

    // 注册输入事件
    this.inputManager.on('move', this.handlePointerMove);
    this.inputManager.on('down', this.handlePointerDown);
    this.inputManager.on('cancel', this.cancel);
  }

  /**
   * 开始放置会话
   * @param asset 要放置的素材
   */
  async start(asset: AnyAsset): Promise<void> {
    if (this.isActive) {
      console.warn(
        '[PlacementController] Already in placement mode, cancelling previous session'
      );
      this.cancel();
    }

    console.log(`[PlacementController] Starting placement for: ${asset.name}`);

    this.currentAsset = asset;
    this.isActive = true;

    // 创建预览 Mesh（从 ObjectManager 获取）
    // 注意：这里需要 ObjectManager 提供创建预览 Mesh 的方法
    // 暂时先创建一个简单的立方体作为预览
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.currentPreviewMesh = new THREE.Mesh(geometry, material);

    // 显示预览
    this.previewService.showPreview(this.currentPreviewMesh);

    // 启用输入监听
    this.inputManager.enable();

    // TODO: 添加光标样式切换
    // TODO: 添加屏幕提示文字
  }

  /**
   * 确认放置
   */
  confirmPlacement(): void {
    if (!this.isActive || !this.currentAsset || !this.currentPosition) {
      console.warn('[PlacementController] Cannot confirm: no active placement');
      return;
    }

    console.log('[PlacementController] Confirming placement');

    // 构建创建选项
    const options: SceneObjectCreateOptions = {
      name: `${this.currentAsset.name}_${Date.now()}`,
      userParams: {}, // TODO: 从 UI 获取用户参数
      machiningOps: [],
      transform: {
        position: {
          x: this.currentPosition.x,
          y: this.currentPosition.y,
          z: this.currentPosition.z,
        },
      },
    };

    // 创建对象
    try {
      this.objectManager.createObjectFromAsset(this.currentAsset.id, options);
      console.log('[PlacementController] Object created successfully');
    } catch (error) {
      console.error('[PlacementController] Failed to create object:', error);
    }

    // 结束会话
    this.endSession();
  }

  /**
   * 取消放置
   */
  cancel = (): void => {
    if (!this.isActive) {
      return;
    }

    console.log('[PlacementController] Cancelling placement');
    this.endSession();
  };

  /**
   * 结束会话
   */
  private endSession(): void {
    // 隐藏预览
    this.previewService.hide();

    // 禁用输入
    this.inputManager.disable();

    // 清理预览 Mesh
    if (this.currentPreviewMesh) {
      this.currentPreviewMesh.geometry.dispose();
      if (Array.isArray(this.currentPreviewMesh.material)) {
        this.currentPreviewMesh.material.forEach(m => m.dispose());
      } else {
        this.currentPreviewMesh.material.dispose();
      }
      this.currentPreviewMesh = null;
    }

    // 重置状态
    this.isActive = false;
    this.currentAsset = null;
    this.currentPosition = null;

    // TODO: 恢复光标样式
  }

  /**
   * 处理指针移动
   */
  private handlePointerMove = (data: PointerEventData): void => {
    if (!this.isActive) {
      return;
    }

    // 使用 Raycaster 获取 3D 位置
    const hit = this.raycasterService.getHit(data.ndc);

    if (hit) {
      this.currentPosition = hit.point;

      // 更新预览位置
      this.previewService.updateTransform(hit.point);

      // TODO: 应用吸附
      // TODO: 更新屏幕提示
    }
  };

  /**
   * 处理指针按下（确认放置）
   */
  private handlePointerDown = (_data: PointerEventData): void => {
    if (!this.isActive) {
      return;
    }

    this.confirmPlacement();
  };

  /**
   * 获取是否处于激活状态
   */
  isPlacementActive(): boolean {
    return this.isActive;
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.cancel();
    this.raycasterService.dispose();
    this.previewService.dispose();
    this.inputManager.dispose();
  }
}

