import type {
  ObjectManager,
  ModelEventPayload,
  ModelUpdateEventPayload,
  ModelDeleteEventPayload,
} from '@/core/object';
import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * 渲染同步服务
 * 负责监听 ObjectManager 事件并同步到渲染器
 * 实现 ObjectManager 与 Renderer 的解耦
 */
export class RenderSyncService<TMetadata = Record<string, unknown>> {
  private objectManager: ObjectManager<TMetadata>;
  private renderer: IRenderer;

  // 模型ID到渲染对象的映射
  private modelRenderMap: Map<string, unknown> = new Map();

  constructor(objectManager: ObjectManager<TMetadata>, renderer: IRenderer) {
    this.objectManager = objectManager;
    this.renderer = renderer;

    // 订阅 ObjectManager 事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.objectManager.on('model:added', this.handleModelAdded.bind(this));
    this.objectManager.on('model:updated', this.handleModelUpdated.bind(this));
    this.objectManager.on('model:removed', this.handleModelRemoved.bind(this));
    this.objectManager.on(
      'models:cleared',
      this.handleModelsCleared.bind(this)
    );
  }

  /**
   * 处理模型添加事件
   */
  private handleModelAdded(payload: ModelEventPayload<TMetadata>): void {
    const { model } = payload;

    if (!model.renderObject) {
      return;
    }

    // 添加到渲染器
    this.renderer.addObject(model.renderObject, {
      interactive: true,
      modelId: model.id,
      name: model.name,
    });

    // 设置变换
    this.renderer.updateObjectTransform(model.renderObject, {
      position: model.position,
      rotation: model.rotation,
      scale: model.scale,
    });

    // 设置可见性
    this.renderer.setObjectVisibility(model.renderObject, model.isVisible);

    // 记录映射
    this.modelRenderMap.set(model.id, model.renderObject);

    console.log(`[RenderSync] Model ${model.name} synced to renderer`);
  }

  /**
   * 处理模型更新事件
   */
  private handleModelUpdated(
    payload: ModelUpdateEventPayload<TMetadata>
  ): void {
    const { model, updates } = payload;

    const renderObject = this.modelRenderMap.get(model.id);
    if (!renderObject) {
      console.warn(`[RenderSync] Model ${model.id} not found in render map`);
      return;
    }

    // 更新变换
    if (updates.position || updates.rotation || updates.scale) {
      this.renderer.updateObjectTransform(renderObject, {
        position: updates.position,
        rotation: updates.rotation,
        scale: updates.scale,
      });
    }

    // 更新可见性
    if (updates.isVisible !== undefined) {
      this.renderer.setObjectVisibility(renderObject, updates.isVisible);
    }

    // 如果 renderObject 发生变化（参数化调整导致的重新生成）
    if (updates.renderObject && updates.renderObject !== renderObject) {
      // 移除旧对象
      this.renderer.removeObject(renderObject);
      this.renderer.disposeObject(renderObject);

      // 添加新对象
      this.renderer.addObject(updates.renderObject, {
        interactive: true,
        modelId: model.id,
        name: model.name,
      });

      // 恢复变换
      this.renderer.updateObjectTransform(updates.renderObject, {
        position: model.position,
        rotation: model.rotation,
        scale: model.scale,
      });

      this.renderer.setObjectVisibility(updates.renderObject, model.isVisible);

      // 更新映射
      this.modelRenderMap.set(model.id, updates.renderObject);
    }

    console.log(`[RenderSync] Model ${model.id} updated in renderer`);
  }

  /**
   * 处理模型删除事件
   */
  private handleModelRemoved(payload: ModelDeleteEventPayload): void {
    const { modelId } = payload;

    const renderObject = this.modelRenderMap.get(modelId);
    if (!renderObject) {
      return;
    }

    // 从渲染器移除
    this.renderer.removeObject(renderObject);
    this.renderer.disposeObject(renderObject);

    // 清除映射
    this.modelRenderMap.delete(modelId);

    console.log(`[RenderSync] Model ${modelId} removed from renderer`);
  }

  /**
   * 处理清空所有模型事件
   */
  private handleModelsCleared(): void {
    // 清理所有渲染对象
    for (const renderObject of this.modelRenderMap.values()) {
      this.renderer.removeObject(renderObject);
      this.renderer.disposeObject(renderObject);
    }

    // 清空映射
    this.modelRenderMap.clear();

    console.log('[RenderSync] All models cleared from renderer');
  }

  /**
   * 获取模型的渲染对象
   * @param modelId 模型ID
   * @returns 渲染对象，如果不存在则返回 undefined
   */
  public getRenderObject(modelId: string): unknown | undefined {
    return this.modelRenderMap.get(modelId);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 取消事件监听
    this.objectManager.off('model:added', this.handleModelAdded.bind(this));
    this.objectManager.off('model:updated', this.handleModelUpdated.bind(this));
    this.objectManager.off('model:removed', this.handleModelRemoved.bind(this));
    this.objectManager.off(
      'models:cleared',
      this.handleModelsCleared.bind(this)
    );

    // 清空映射
    this.modelRenderMap.clear();
  }
}
