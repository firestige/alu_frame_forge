/**
 * TransformService - 变换服务（业务层）
 *
 * 职责：
 * - 封装 ITransformController，提供业务级接口
 * - 使用 RenderSyncService 获取原生渲染对象
 * - 监听 TransformCommandHandler 发来的命令
 * - 设置 ITransformController 的回调，发布状态事件到 eventBus
 */

import type { IRenderer } from '@/core/renderer';
import type { RenderSyncService } from './RenderSyncService';
import { publishState } from '@/core/services/eventBus';

export class TransformService {
  private renderer: IRenderer;
  private renderSync: RenderSyncService;

  constructor(renderer: IRenderer, renderSync: RenderSyncService) {
    this.renderer = renderer;
    this.renderSync = renderSync;

    // ✅ 设置回调函数，接收 Implementation 层的事件报告
    this.setupControllerCallbacks();
  }

  /**
   * 设置 TransformController 的回调函数
   * 这里是架构的关键：Implementation 层通过回调向上报告，Feature 层发布 EventBus 事件
   */
  private setupControllerCallbacks(): void {
    const controller = this.renderer.getTransformController();

    // 拖拽状态变化
    controller.onDraggingChanged = (dragging: boolean) => {
      publishState('state:transform:draggingChanged', { dragging });
    };

    // 变换完成
    controller.onTransformCompleted = data => {
      publishState('state:transform:completed', data);
    };
  }

  /**
   * 附着变换控制器到对象
   */
  public attachToObject(objectId: string): void {
    console.log('[TransformService] attachToObject called for:', objectId);

    // 从 RenderSyncService 获取原生对象
    const nativeObject = this.renderSync.getRenderObject(objectId);

    console.log('[TransformService] nativeObject:', nativeObject);

    if (!nativeObject) {
      console.error(`[TransformService] Object not found: ${objectId}`);
      return;
    }

    // 附着控制器
    const controller = this.renderer.getTransformController();
    console.log('[TransformService] controller:', controller);
    controller.attachToObject(objectId, nativeObject);
  }

  /**
   * 分离变换控制器
   */
  public detach(): void {
    const controller = this.renderer.getTransformController();
    controller.detach();
  }

  /**
   * 设置变换模式
   */
  public setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    const controller = this.renderer.getTransformController();
    controller.setMode(mode);
  }

  /**
   * 获取当前模式
   */
  public getMode(): 'translate' | 'rotate' | 'scale' | null {
    const controller = this.renderer.getTransformController();
    return controller.getMode();
  }

  /**
   * 设置坐标空间
   */
  public setSpace(space: 'local' | 'world'): void {
    const controller = this.renderer.getTransformController();
    controller.setSpace(space);
  }

  /**
   * 获取当前坐标空间
   */
  public getSpace(): 'local' | 'world' {
    const controller = this.renderer.getTransformController();
    return controller.getSpace();
  }

  /**
   * 获取当前附着的对象 ID
   */
  public getAttachedObjectId(): string | null {
    const controller = this.renderer.getTransformController();
    return controller.getAttachedObjectId();
  }

  /**
   * 销毁服务
   */
  public dispose(): void {
    // 注：不调用 controller.dispose()，由 Renderer 统一管理
    this.detach();
  }
}
