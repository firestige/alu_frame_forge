import type { ObjectManager, Model } from '@/core/object';
import type { IRenderer } from '@/core/renderer/renderer-types';
import type { RenderSyncService } from './RenderSyncService';

/**
 * 模型交互服务
 * 负责模型的选中、高亮、射线检测等交互逻辑
 */
export class ModelInteractionService {
  private objectManager: ObjectManager;
  private renderer?: IRenderer;
  private renderSync?: RenderSyncService;
  private selectedModelId: string | null = null;

  constructor(
    objectManager: ObjectManager,
    renderer?: IRenderer,
    renderSync?: RenderSyncService
  ) {
    this.objectManager = objectManager;
    this.renderer = renderer;
    this.renderSync = renderSync;
  }

  /**
   * 设置渲染器（用于高亮功能）
   */
  public setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  /**
   * 设置渲染同步服务
   */
  public setRenderSync(renderSync: RenderSyncService): void {
    this.renderSync = renderSync;
  }

  /**
   * 获取当前选中的模型 ID
   */
  public getSelectedModelId(): string | null {
    return this.selectedModelId;
  }

  /**
   * 高亮指定模型
   */
  public highlightModel(modelId: string | null): void {
    const allModels = this.objectManager.getAllModels();

    // 移除所有高亮
    allModels.forEach(model => {
      this.removeHighlight(model);
    });

    // 添加新的高亮
    if (modelId) {
      const model = this.objectManager.getModel(modelId);
      if (model) {
        this.applyHighlight(model);
      }
    }

    this.selectedModelId = modelId;
  }

  /**
   * 移除模型高亮
   */
  private removeHighlight(model: Model): void {
    // 优先通过 RenderSync 获取 renderObject
    const renderObject =
      this.renderSync?.getRenderObject(model.id) || model.renderObject;

    if (renderObject && this.renderer) {
      this.renderer.unhighlightObject(renderObject);
    }
  }

  /**
   * 应用高亮效果
   */
  private applyHighlight(model: Model): void {
    // 优先通过 RenderSync 获取 renderObject
    const renderObject =
      this.renderSync?.getRenderObject(model.id) || model.renderObject;

    if (renderObject && this.renderer) {
      this.renderer.highlightObject(renderObject, 0x00ff00, 0.5);
    }
  }

  /**
   * 处理点击事件（选中模型）
   */
  public handleClick(event: MouseEvent, container: HTMLElement): string | null {
    if (!this.renderer) {
      console.warn('Renderer not set in ModelInteractionService');
      return null;
    }

    const mousePosition = this.getMousePosition(event, container);
    const hits = this.renderer.raycastFromScreen(
      mousePosition,
      userData => userData.interactive === true
    );

    if (hits.length > 0) {
      const modelId = hits[0].userData?.modelId;
      if (modelId && typeof modelId === 'string') {
        this.highlightModel(modelId);
        return modelId;
      }
    } else {
      this.highlightModel(null);
    }

    return null;
  }

  /**
   * 处理右键点击（上下文菜单）
   */
  public handleContextMenu(
    event: MouseEvent,
    container: HTMLElement
  ): { modelId: string | null; x: number; y: number } {
    if (!this.renderer) {
      console.warn('Renderer not set in ModelInteractionService');
      return {
        modelId: null,
        x: event.clientX,
        y: event.clientY,
      };
    }

    const mousePosition = this.getMousePosition(event, container);
    const hits = this.renderer.raycastFromScreen(
      mousePosition,
      userData => userData.interactive === true
    );

    if (hits.length > 0) {
      const modelId = hits[0].userData?.modelId;
      if (modelId && typeof modelId === 'string') {
        this.highlightModel(modelId);
        return {
          modelId,
          x: event.clientX,
          y: event.clientY,
        };
      }
    }

    return {
      modelId: null,
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * 获取归一化的鼠标位置
   */
  private getMousePosition(
    event: MouseEvent,
    container: HTMLElement
  ): { x: number; y: number } {
    const rect = container.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  /**
   * 清除选中状态
   */
  public clearSelection(): void {
    this.highlightModel(null);
  }

  /**
   * 获取鼠标下的模型
   */
  public getModelUnderMouse(
    event: MouseEvent,
    container: HTMLElement
  ): Model | null {
    if (!this.renderer) {
      console.warn('Renderer not set in ModelInteractionService');
      return null;
    }

    const mousePosition = this.getMousePosition(event, container);
    const hits = this.renderer.raycastFromScreen(
      mousePosition,
      userData => userData.interactive === true
    );

    if (hits.length > 0) {
      const modelId = hits[0].userData?.modelId;
      if (modelId && typeof modelId === 'string') {
        return this.objectManager.getModel(modelId) || null;
      }
    }

    return null;
  }
}
