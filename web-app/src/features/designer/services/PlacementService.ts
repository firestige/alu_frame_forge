import * as THREE from 'three';
import type {
  IRenderer,
  WorkPlaneConfig,
} from '@/core/renderer/renderer-types';
import type { ObjectManager } from '@/core/object/ObjectManager';
import type { AnyAsset } from '@/core/asset/types/asset';
import type { SceneObjectCreateOptions } from '@/core/object/types/scene-object';
import { onCommand, offCommand, publishState } from '@/core/services/eventBus';

/**
 * 指针更新命令数据
 */
export interface PointerUpdateData {
  screen: { x: number; y: number };
  viewport: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

/**
 * 放置控制器（重构后 - 完全隔离 Three.js）
 *
 * 职责：
 * - 管理放置会话的生命周期
 * - 通过 IRenderer 抽象接口进行射线检测和预览管理
 * - 不依赖 Three.js，完全通过抽象层工作
 *
 * 命令接口：
 * - command:placement:start - 开始放置会话
 * - command:placement:updatePointer - 更新指针位置（由UI层发送）
 * - command:placement:confirm - 确认放置
 * - command:placement:cancel - 取消放置
 */
export class PlacementController {
  private renderer: IRenderer;
  private objectManager: ObjectManager;

  // 会话状态
  private isActive = false;
  private currentAsset: AnyAsset | null = null;
  private previewHandle: string | null = null;
  private currentPosition: { x: number; y: number; z: number } | null = null;

  /** 工作平面距离相机的距离（米） */
  private workPlaneDistance = 10;

  constructor(renderer: IRenderer, objectManager: ObjectManager) {
    this.renderer = renderer;
    this.objectManager = objectManager;

    // 注册命令监听
    this.setupCommandListeners();
  }

  /**
   * 注册命令监听器
   */
  private setupCommandListeners(): void {
    onCommand('command:placement:start', this.handleStartCommand);
    onCommand('command:placement:updatePointer', this.handlePointerUpdate);
    onCommand('command:placement:confirm', this.handleConfirmCommand);
    onCommand('command:placement:cancel', this.handleCancelCommand);
  }

  /**
   * 处理开始命令
   */
  private handleStartCommand = (data: { asset: AnyAsset }): void => {
    this.start(data.asset);
  };

  /**
   * 处理指针更新命令
   */
  private handlePointerUpdate = (data: PointerUpdateData): void => {
    if (!this.isActive || !this.previewHandle) {
      return;
    }

    // 动态计算工作平面
    const workPlane = this.calculateWorkPlane();

    // 执行射线检测
    const hits = this.renderer.raycastFromScreen(
      data.screen.x,
      data.screen.y,
      data.viewport,
      {
        ignoreHandles: [this.previewHandle],
        includeHelpers: false,
        includeWorkPlane: true,
        workPlane: workPlane,
      }
    );

    console.log('[PlacementController] Raycast hits:', hits.length, hits);

    if (hits.length > 0) {
      const hit = hits[0];
      this.currentPosition = hit.point;

      console.log(
        '[PlacementController] Updated position:',
        this.currentPosition
      );

      // 更新预览位置
      this.renderer.updatePreviewTransform(this.previewHandle, {
        position: hit.point,
      });
    } else {
      // 如果没有命中，保持上一个有效位置
      console.warn(
        '[PlacementController] No raycast hit, keeping last position. Current position:',
        this.currentPosition
      );
    }
  };

  /**
   * 处理确认命令
   */
  private handleConfirmCommand = (): void => {
    this.confirmPlacement();
  };

  /**
   * 处理取消命令
   */
  private handleCancelCommand = (): void => {
    this.cancel();
  };

  /**
   * 计算当前工作平面
   * 工作平面垂直于相机视线，位于相机前方固定距离
   */
  private calculateWorkPlane(): WorkPlaneConfig {
    const camera = this.renderer.getNativeCamera() as THREE.Camera;
    const cameraPos = camera.position;

    // 获取相机朝向（前方向量）
    const cameraForward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.quaternion)
      .normalize();

    // 计算工作平面位置（相机前方 workPlaneDistance 米）
    const planePoint = cameraPos
      .clone()
      .add(cameraForward.multiplyScalar(this.workPlaneDistance));

    // 工作平面法线指向相机（与相机朝向相反）
    const planeNormal = cameraForward.clone().negate();

    return {
      normal: {
        x: planeNormal.x,
        y: planeNormal.y,
        z: planeNormal.z,
      },
      point: {
        x: planePoint.x,
        y: planePoint.y,
        z: planePoint.z,
      },
    };
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

    // 生成预览句柄
    this.previewHandle = `preview_${Date.now()}`;

    // ✅ 通过 ObjectManager 创建预览 Mesh（这是正确的依赖）
    // TODO: 需要 ObjectManager 提供 createPreviewMesh 方法
    // 暂时创建简单立方体（这部分后续需要通过 GeometryFactory）
    const previewMesh = this.createTemporaryPreviewMesh();

    // ✅ 通过 IRenderer 抽象接口添加预览对象
    this.renderer.addPreviewObject(this.previewHandle, previewMesh, {
      color: 0x00ff00,
      opacity: 0.5,
    });

    // 发布状态变更事件
    publishState('state:placement:started', { asset });

    console.log(
      '[PlacementController] Placement started, waiting for pointer updates via commands'
    );

    // TODO: 添加光标样式切换
    // TODO: 添加屏幕提示文字
  }

  /**
   * 确认放置
   */
  confirmPlacement(): void {
    console.log('[PlacementController] confirmPlacement called', {
      isActive: this.isActive,
      hasAsset: !!this.currentAsset,
      hasPosition: !!this.currentPosition,
      position: this.currentPosition,
    });

    if (!this.isActive || !this.currentAsset || !this.currentPosition) {
      console.warn(
        '[PlacementController] Cannot confirm: no active placement',
        {
          isActive: this.isActive,
          hasAsset: !!this.currentAsset,
          hasPosition: !!this.currentPosition,
        }
      );
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
      const sceneObject = this.objectManager.createObjectFromAsset(
        this.currentAsset.id,
        options
      );
      console.log('[PlacementController] Object created successfully');

      // 发布状态变更事件
      publishState('state:placement:completed', { modelId: sceneObject.id });
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

    // 发布状态变更事件
    publishState('state:placement:cancelled', undefined);

    this.endSession();
  };

  /**
   * 结束会话
   */
  private endSession(): void {
    // ✅ 通过 IRenderer 抽象接口移除预览对象
    if (this.previewHandle) {
      this.renderer.removePreviewObject(this.previewHandle);
      this.previewHandle = null;
    }

    // 重置状态
    this.isActive = false;
    this.currentAsset = null;
    this.currentPosition = null;

    // TODO: 恢复光标样式
  }

  /**
   * 获取是否处于激活状态
   */
  isPlacementActive(): boolean {
    return this.isActive;
  }

  /**
   * 临时方法：创建预览 Mesh
   * TODO: 应该通过 GeometryFactory 或 ObjectManager 创建
   */
  private createTemporaryPreviewMesh(): unknown {
    // 这里返回的是 Three.js 对象，但 PlacementController 不知道具体类型
    // 它只是传递给 IRenderer
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    return new THREE.Mesh(geometry, material);
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.cancel();

    // 移除命令监听
    offCommand('command:placement:start', this.handleStartCommand);
    offCommand('command:placement:updatePointer', this.handlePointerUpdate);
    offCommand('command:placement:confirm', this.handleConfirmCommand);
    offCommand('command:placement:cancel', this.handleCancelCommand);
  }
}
