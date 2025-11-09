import type { IRenderer } from '@/core/renderer/renderer-types';
import { designerEventBus } from '@/core/services/eventBus';

/**
 * SelectionService - UI 选择状态管理服务（重构后）
 *
 * 职责：
 * - 管理当前选中的对象 ID（UI 状态，不保存到文件）
 * - 管理选中对象的视觉反馈（高亮、outline）
 * - 监听业务层事件，自动清除已删除对象的选中状态
 * - 提供选择相关的查询方法
 *
 * 不涉及：
 * ❌ 不修改业务数据（ObjectManager）
 * ❌ 不保存选中状态到文件
 *
 * 特点：
 * - 纯 UI 层服务，与业务层解耦
 * - 选中是渲染层概念，不是业务概念
 * - 通过事件总线与业务层通信
 */
export class SelectionService {
  // 保留 renderer 引用，后续实现视觉反馈时使用
  // @ts-expect-error - renderer will be used for visual feedback in future implementation
  private renderer: IRenderer;
  private selectedObjectId: string | null = null;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;

    // 监听业务层的删除事件，自动清除选中状态
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听删除事件：当对象被删除时，自动清除选中状态
    designerEventBus.on('ui:selection:clear', payload => {
      if (payload?.deletedObjectId) {
        // 只有当删除的对象是当前选中对象时才清除
        if (this.selectedObjectId === payload.deletedObjectId) {
          console.log(
            '[SelectionService] 检测到已选中对象被删除，自动清除选中状态'
          );
          this.selectObject(null);
        }
      } else {
        // 没有指定对象ID，直接清除选中（批量删除场景）
        console.log('[SelectionService] 检测到批量删除，清除选中状态');
        this.selectObject(null);
      }
    });
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

    // 清理事件监听器
    designerEventBus.off('ui:selection:clear');
  }
}
