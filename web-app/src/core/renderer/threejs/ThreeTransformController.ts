import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type {
  ITransformController,
  IRenderer,
  TransformData,
} from '../renderer-types';

/**
 * Three.js 变换控制器实现
 *
 * 职责:
 * - 封装 Three.js TransformControls
 * - 管理 Gizmo 可见性和位置
 * - 通过 IRenderer 接口协调 OrbitControls
 * - 通过回调函数向上层报告状态（不直接使用 EventBus）
 */
export class ThreeTransformController implements ITransformController {
  private controls: TransformControls;
  private renderer: IRenderer;
  private scene: THREE.Scene;
  private currentObjectId: string | null = null;
  private currentMode: 'translate' | 'rotate' | 'scale' = 'translate';
  private currentSpace: 'local' | 'world' = 'local';
  private isDragging = false;

  // ==================== 回调函数（向上报告）====================
  public onDraggingChanged?: (dragging: boolean) => void;
  public onTransformCompleted?: (data: TransformData) => void;

  constructor(
    renderer: IRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.renderer = renderer;
    this.scene = scene;

    // 创建 TransformControls
    this.controls = new TransformControls(camera, domElement);
    this.controls.setMode(this.currentMode);
    this.controls.setSpace(this.currentSpace);

    // 🔥 使用 getHelper() 获取可视化对象（Three.js 0.181.0+ 的正确方式）
    const helper = this.controls.getHelper();
    this.scene.add(helper);

    console.log('[ThreeTransformController] TransformControls initialized');

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 拖拽状态变化
    this.controls.addEventListener('dragging-changed', this.handleDraggingChanged);

    // 对象变换中（实时更新）
    this.controls.addEventListener('change', this.handleObjectChange);

    // 对象变换完成
    this.controls.addEventListener('mouseUp', this.handleMouseUp);
  }

  /**
   * 处理拖拽状态变化
   */
  private handleDraggingChanged = (event: { value: unknown }): void => {
    const dragging = Boolean(event.value);
    this.isDragging = dragging;

    if (dragging) {
      // ✅ 通过 IRenderer 接口协调 OrbitControls（抽象层调用，符合分层原则）
      this.renderer.requestDisableOrbitControls('ThreeTransformController');
    } else {
      this.renderer.releaseDisableOrbitControls('ThreeTransformController');
    }

    // ✅ 通过回调向上层报告状态（不直接使用 EventBus）
    this.onDraggingChanged?.(dragging);
  };

  /**
   * 处理对象变换中（实时更新）
   */
  private handleObjectChange = (): void => {
    // 只在拖拽时处理，避免无限渲染循环
    if (!this.isDragging) return;

    const object = this.controls.object;
    if (!object || !this.currentObjectId) return;

    // 验证变换数据（防止 NaN/Infinity）
    if (!this.validateTransform(object)) {
      console.error(
        '[ThreeTransformController] Invalid transform detected, ignoring'
      );
      return;
    }

    // 可选：实时变换回调（用于属性面板实时更新）
    // 可以在接口中添加 onTransformChanging 回调
  };

  /**
   * 处理鼠标释放（变换完成）
   */
  private handleMouseUp = (): void => {
    const object = this.controls.object;
    if (!object || !this.currentObjectId) return;

    // 验证并通过回调报告变换完成
    if (this.validateTransform(object)) {
      // ✅ 通过回调向上层报告（不直接使用 EventBus）
      this.onTransformCompleted?.({
        objectId: this.currentObjectId,
        transform: {
          position: {
            x: object.position.x,
            y: object.position.y,
            z: object.position.z,
          },
          rotation: {
            x: object.rotation.x,
            y: object.rotation.y,
            z: object.rotation.z,
          },
          scale: {
            x: object.scale.x,
            y: object.scale.y,
            z: object.scale.z,
          },
        },
      });
    }
  };

  /**
   * 验证变换数据（防止 NaN/Infinity）
   */
  private validateTransform(object: THREE.Object3D): boolean {
    const { position, rotation, scale } = object;

    // 检查 position
    if (
      !isFinite(position.x) ||
      !isFinite(position.y) ||
      !isFinite(position.z) ||
      isNaN(position.x) ||
      isNaN(position.y) ||
      isNaN(position.z)
    ) {
      console.error('[ThreeTransformController] Invalid position:', position);
      return false;
    }

    // 检查 rotation
    if (
      !isFinite(rotation.x) ||
      !isFinite(rotation.y) ||
      !isFinite(rotation.z) ||
      isNaN(rotation.x) ||
      isNaN(rotation.y) ||
      isNaN(rotation.z)
    ) {
      console.error('[ThreeTransformController] Invalid rotation:', rotation);
      return false;
    }

    // 检查 scale
    if (
      !isFinite(scale.x) ||
      !isFinite(scale.y) ||
      !isFinite(scale.z) ||
      isNaN(scale.x) ||
      isNaN(scale.y) ||
      isNaN(scale.z)
    ) {
      console.error('[ThreeTransformController] Invalid scale:', scale);
      return false;
    }

    return true;
  }

  /**
   * 附着到对象
   */
  public attachToObject(objectId: string, nativeObject: unknown): void {
    console.log('[ThreeTransformController] attachToObject called:', objectId);

    // 转换为 Three.js Object3D
    const threeObject = nativeObject as THREE.Object3D;

    if (!threeObject || !threeObject.isObject3D) {
      console.error(
        '[ThreeTransformController] Invalid THREE.Object3D:',
        nativeObject
      );
      return;
    }

    console.log('[ThreeTransformController] Valid Object3D, attaching...');

    // 附着控制器
    this.controls.attach(threeObject);
    this.currentObjectId = objectId;

    // 在 attach 之后启用控制器（确保 Gizmo 可见）
    this.controls.enabled = true;

    console.log('[ThreeTransformController] Controls state after attach:', {
      enabled: this.controls.enabled,
      object: this.controls.object,
      mode: this.controls.mode,
    });

    // 手动同步 Gizmo 位置（虽然 TransformControls 会自动处理）
    this.syncGizmoPosition();

    console.log(`[ThreeTransformController] Attached to object: ${objectId}`);
  }

  /**
   * 分离当前对象
   */
  public detach(): void {
    if (!this.currentObjectId) return;

    const objectId = this.currentObjectId;

    // 分离控制器
    this.controls.detach();
    this.currentObjectId = null;

    // 禁用控制器，避免在选择模式下拦截鼠标事件
    this.controls.enabled = false;

    console.log(`[ThreeTransformController] Detached from object: ${objectId}`);
  }

  /**
   * 设置变换模式
   */
  public setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.currentMode = mode;
    this.controls.setMode(mode);

    console.log(`[ThreeTransformController] Mode changed to: ${mode}`);
  }

  /**
   * 获取当前模式
   */
  public getMode(): 'translate' | 'rotate' | 'scale' | null {
    return this.currentObjectId ? this.currentMode : null;
  }

  /**
   * 设置坐标空间
   */
  public setSpace(space: 'local' | 'world'): void {
    this.currentSpace = space;
    this.controls.setSpace(space);

    console.log(`[ThreeTransformController] Space changed to: ${space}`);
  }

  /**
   * 获取当前坐标空间
   */
  public getSpace(): 'local' | 'world' {
    return this.currentSpace;
  }

  /**
   * 获取当前附着的对象 ID
   */
  public getAttachedObjectId(): string | null {
    return this.currentObjectId;
  }

  /**
   * 启用/禁用控制器
   */
  public setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  /**
   * 更新控制器（需要在渲染循环中调用）
   */
  public update(): void {
    // TransformControls 在新版本中不需要手动 update
    // 保留此方法以符合接口要求
  }

  /**
   * 同步 Gizmo 位置
   *
   * 注：TransformControls 会自动跟随附着的对象，通常不需要手动同步
   */
  public syncGizmoPosition(): void {
    // TransformControls 会自动更新位置，此方法保留用于将来扩展
  }

  /**
   * 销毁控制器
   */
  public dispose(): void {
    // 移除事件监听
    this.controls.removeEventListener(
      'dragging-changed',
      this.handleDraggingChanged
    );
    this.controls.removeEventListener('change', this.handleObjectChange);
    this.controls.removeEventListener('mouseUp', this.handleMouseUp);

    // 分离对象
    this.detach();

    // 从场景移除 helper（不是 controls 本身）
    const helper = this.controls.getHelper();
    this.scene.remove(helper);

    // 释放资源
    this.controls.dispose();

    console.log('[ThreeTransformController] Disposed');
  }
}
