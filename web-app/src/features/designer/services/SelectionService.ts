import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * SelectionService - UI 选择状态管理服务
 *
 * 职责：
 * - 管理当前选中的对象 ID（UI 状态，不保存到文件）
 * - 管理选中对象的视觉反馈（高亮、outline）
 * - 提供选择相关的查询方法
 *
 * 不涉及：
 * ❌ 不修改业务数据（ObjectManager）
 * ❌ 不保存选中状态到文件
 *
 * 特点：
 * - 纯 UI 层服务，与业务层解耦
 * - 选中是渲染层概念，不是业务概念
 */
export class SelectionService {
  // 保留 renderer 引用，后续实现视觉反馈时使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private renderer: IRenderer;
  private selectedObjectId: string | null = null;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  /**
   * 选择对象（纯 UI 操作）
   *
   * @param objectId 要选择的对象 ID，null 表示取消选择
   */
  selectObject(objectId: string | null): void {
    // 清除旧的高亮
    this.clearHighlight();

    if (objectId) {
      // 更新选中状态（UI 状态）
      this.selectedObjectId = objectId;
      console.log('[SelectionService] 选中对象:', objectId);

      // TODO: 添加视觉反馈（高亮、outline 等）
      // 需要实现 renderer 的高亮API后再完善
    } else {
      this.selectedObjectId = null;
      console.log('[SelectionService] 取消选择');
    }
  }

  /**
   * 获取当前选中的对象 ID
   */
  getSelectedObjectId(): string | null {
    return this.selectedObjectId;
  }

  /**
   * 清除高亮效果
   */
  private clearHighlight(): void {
    if (this.selectedObjectId) {
      console.log('[SelectionService] 清除高亮:', this.selectedObjectId);

      // TODO: 移除视觉反馈
      // 需要实现 renderer 的高亮API后再完善
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clearHighlight();
    this.selectedObjectId = null;
  }
}
