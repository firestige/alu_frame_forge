/**
 * HighlightService - 对象高亮服务
 *
 * 职责：
 * - 封装渲染器高亮 API
 * - 管理 OutlineEffect
 * - 提供统一的高亮接口给业务层
 */

import type { IRenderer } from '../renderer-types';
import { OutlineEffect } from '../threejs/OutlineEffect';
import { ThreeRenderer } from '../threejs/ThreeRenderer';

/**
 * HighlightService - 高亮服务
 */
export class HighlightService {
  private renderer: IRenderer;
  private outlineEffect: OutlineEffect | null = null;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
    this.initializeOutlineEffect();
  }

  /**
   * 初始化 OutlineEffect
   */
  private initializeOutlineEffect(): void {
    // 只有 ThreeRenderer 支持 OutlineEffect
    if (this.renderer instanceof ThreeRenderer) {
      try {
        const threeRenderer = this.renderer as ThreeRenderer;
        const scene = threeRenderer.getInternalScene();
        const camera = threeRenderer.getInternalCamera();
        const webglRenderer = threeRenderer.getInternalRenderer();

        if (!scene || !camera || !webglRenderer) {
          console.warn(
            '[HighlightService] Cannot initialize OutlineEffect: missing scene/camera/renderer'
          );
          return;
        }

        this.outlineEffect = new OutlineEffect(webglRenderer, scene, camera, {
          edgeStrength: 3.0,
          edgeGlow: 0.0,
          edgeThickness: 1.0,
          visibleEdgeColor: '#00ff00', // 绿色高亮
          hiddenEdgeColor: '#ff0000',
        });

        // 将 OutlineEffect 设置回 ThreeRenderer
        threeRenderer.setOutlineEffect(this.outlineEffect);

        console.log(
          '[HighlightService] ✅ OutlineEffect initialized successfully',
          {
            isInitialized: this.outlineEffect.isInitialized(),
            hasComposer: !!this.outlineEffect.getComposer(),
          }
        );
      } catch (error) {
        console.error(
          '[HighlightService] Failed to initialize OutlineEffect:',
          error
        );
      }
    }
  }

  /**
   * 设置对象高亮
   * @param objectId 对象 ID
   * @param highlighted 是否高亮
   */
  setHighlight(objectId: string, highlighted: boolean): void {
    // 统一使用 IRenderer 接口（ThreeRenderer 会使用 OutlineEffect）
    this.renderer.setObjectHighlight(objectId, highlighted);
  }

  /**
   * 批量设置高亮
   * @param objectIds 对象 ID 列表
   * @param highlighted 是否高亮
   */
  setHighlights(objectIds: string[], highlighted: boolean): void {
    objectIds.forEach(id => this.setHighlight(id, highlighted));
  }

  /**
   * 清除所有高亮
   */
  clearAll(): void {
    this.renderer.clearAllHighlights();
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    this.outlineEffect?.dispose();
    this.outlineEffect = null;
  }
}
