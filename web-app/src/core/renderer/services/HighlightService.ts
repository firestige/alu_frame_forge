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
        // TODO: 获取 scene 和 camera 的内部引用
        // 目前暂时通过 TODO 标记，后续需要扩展 ThreeRenderer API
        console.log(
          '[HighlightService] OutlineEffect initialization deferred (需要扩展 ThreeRenderer API)'
        );
        // const threeRenderer = this.renderer as ThreeRenderer;
        // this.outlineEffect = new OutlineEffect(renderer, scene, camera);
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
    if (this.outlineEffect) {
      this.outlineEffect.setObjectOutline(objectId, highlighted);
    } else {
      // 降级方案：使用 IRenderer 接口
      this.renderer.setObjectHighlight(objectId, highlighted);
    }
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
    if (this.outlineEffect) {
      this.outlineEffect.clearAllOutlines();
    } else {
      this.renderer.clearAllHighlights();
    }
  }

  /**
   * 销毁服务
   */
  dispose(): void {
    this.outlineEffect?.dispose();
    this.outlineEffect = null;
  }
}
