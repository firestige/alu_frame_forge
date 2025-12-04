import type { IRenderer } from '@/core/renderer/renderer-types';
import { HighlightService } from '@/core/renderer/services/HighlightService';
import {
  designerEventBus,
  onCommand,
  offCommand,
  publishState,
} from '@/core/services/eventBus';

/**
 * SelectionService - UI 选择状态管理服务（重构版 v2.0）
 *
 * 职责：
 * - 监听选中命令（command:selection:*）- 事件驱动
 * - 管理选中对象集合（单选/多选）
 * - 调用 HighlightService 更新视觉反馈
 * - 发布状态变化事件（state:selection:changed）
 * - 自动清除已删除对象的选中状态
 *
 * 架构：
 * - UI 层通过事件总线发送命令
 * - SelectionService 监听命令并处理
 * - 状态变化通过事件通知 UI 层
 */
export class SelectionService {
  private highlightService: HighlightService;
  private selectedObjects = new Set<string>(); // 选中对象 ID 集合

  constructor(renderer: IRenderer) {
    this.highlightService = new HighlightService(renderer);
    this.setupCommandListeners();
    this.setupStateListeners();
  }

  /**
   * 设置命令监听器
   */
  private setupCommandListeners(): void {
    onCommand('command:selection:set', this.handleSet);
    onCommand('command:selection:clear', this.handleClear);
    onCommand('command:selection:toggle', this.handleToggle);
    onCommand('command:selection:add', this.handleAdd);
    onCommand('command:selection:remove', this.handleRemove);
    onCommand('command:selection:selectAll', this.handleSelectAll);
  }

  /**
   * 设置状态监听器（监听业务层事件）
   */
  private setupStateListeners(): void {
    // 监听删除事件：当对象被删除时，自动清除选中状态
    designerEventBus.on('ui:selection:clear', payload => {
      if (payload?.deletedObjectId) {
        // 只有当删除的对象是当前选中对象时才清除
        if (this.selectedObjects.has(payload.deletedObjectId)) {
          this.removeFromSelection(payload.deletedObjectId);
        }
      } else {
        // 没有指定对象ID，直接清除选中（批量删除场景）
        this.clearSelection();
      }
    });
  }

  // ==================== 命令处理器 ====================

  /**
   * 处理设置选中命令（单选）
   */
  private handleSet = (objectId: string): void => {
    const previous = Array.from(this.selectedObjects);

    // 清空旧选中
    this.selectedObjects.clear();

    // 添加新选中
    if (objectId) {
      this.selectedObjects.add(objectId);
    }

    // 更新视觉反馈
    this.updateHighlight();

    // 发布状态变化
    this.emitChanged(previous);
  };

  /**
   * 处理清空选中命令
   */
  private handleClear = (): void => {
    if (this.selectedObjects.size === 0) {
      return; // 已经是空的，不需要处理
    }

    const previous = Array.from(this.selectedObjects);
    this.selectedObjects.clear();

    // 清除视觉反馈
    this.highlightService.clearAll();

    // 发布状态变化
    this.emitChanged(previous);
    publishState('state:selection:cleared', undefined);
  };

  /**
   * 处理切换选中命令（Ctrl+点击）
   */
  private handleToggle = (objectId: string): void => {
    const previous = Array.from(this.selectedObjects);

    if (this.selectedObjects.has(objectId)) {
      // 已选中 → 移除
      this.selectedObjects.delete(objectId);
    } else {
      // 未选中 → 添加
      this.selectedObjects.add(objectId);
    }

    // 更新视觉反馈
    this.updateHighlight();

    // 发布状态变化
    this.emitChanged(previous);
  };

  /**
   * 处理添加到选中命令
   */
  private handleAdd = (objectId: string): void => {
    if (this.selectedObjects.has(objectId)) {
      return; // 已经选中，不需要处理
    }

    const previous = Array.from(this.selectedObjects);
    this.selectedObjects.add(objectId);

    // 更新视觉反馈
    this.highlightService.setHighlight(objectId, true);

    // 发布状态变化
    this.emitChanged(previous);
  };

  /**
   * 处理从选中移除命令
   */
  private handleRemove = (objectId: string): void => {
    if (!this.selectedObjects.has(objectId)) {
      return; // 未选中，不需要处理
    }

    const previous = Array.from(this.selectedObjects);
    this.selectedObjects.delete(objectId);

    // 更新视觉反馈
    this.highlightService.setHighlight(objectId, false);

    // 发布状态变化
    this.emitChanged(previous);
  };

  /**
   * 处理全选命令
   */
  private handleSelectAll = (): void => {
    // TODO: 需要从 ObjectManager 获取所有对象 ID
    console.log('[SelectionService] Select all - not implemented yet');
  };

  // ==================== 内部方法 ====================

  /**
   * 移除选中对象（内部使用，不发送命令）
   */
  private removeFromSelection(objectId: string): void {
    if (!this.selectedObjects.has(objectId)) {
      return;
    }

    const previous = Array.from(this.selectedObjects);
    this.selectedObjects.delete(objectId);

    // 更新视觉反馈
    this.highlightService.setHighlight(objectId, false);

    // 发布状态变化
    this.emitChanged(previous);
  }

  /**
   * 清空选中（内部使用，不发送命令）
   */
  private clearSelection(): void {
    if (this.selectedObjects.size === 0) {
      return;
    }

    const previous = Array.from(this.selectedObjects);
    this.selectedObjects.clear();

    // 清除视觉反馈
    this.highlightService.clearAll();

    // 发布状态变化
    this.emitChanged(previous);
    publishState('state:selection:cleared', undefined);
  }

  /**
   * 更新高亮效果
   */
  private updateHighlight(): void {
    // 清除所有高亮
    this.highlightService.clearAll();

    // 添加新高亮
    this.selectedObjects.forEach(id => {
      this.highlightService.setHighlight(id, true);
    });
  }

  /**
   * 发布选中状态变化事件
   */
  private emitChanged(previousIds: string[]): void {
    const currentIds = Array.from(this.selectedObjects);

    const addedIds = currentIds.filter(id => !previousIds.includes(id));
    const removedIds = previousIds.filter(id => !currentIds.includes(id));

    publishState('state:selection:changed', {
      selectedIds: currentIds,
      addedIds,
      removedIds,
    });
  }

  // ==================== 公共查询 API ====================

  /**
   * 获取当前选中的对象 ID 列表
   */
  getSelection(): string[] {
    return Array.from(this.selectedObjects);
  }

  /**
   * 判断对象是否选中
   */
  isSelected(objectId: string): boolean {
    return this.selectedObjects.has(objectId);
  }

  /**
   * 是否有选中对象
   */
  hasSelection(): boolean {
    return this.selectedObjects.size > 0;
  }

  /**
   * 获取选中对象数量
   */
  getSelectionCount(): number {
    return this.selectedObjects.size;
  }

  // ==================== 生命周期 ====================

  /**
   * 清理资源
   */
  dispose(): void {
    // 移除命令监听
    offCommand('command:selection:set', this.handleSet);
    offCommand('command:selection:clear', this.handleClear);
    offCommand('command:selection:toggle', this.handleToggle);
    offCommand('command:selection:add', this.handleAdd);
    offCommand('command:selection:remove', this.handleRemove);
    offCommand('command:selection:selectAll', this.handleSelectAll);

    // 移除状态监听
    designerEventBus.off('ui:selection:clear');

    // 清理高亮服务
    this.highlightService.dispose();

    // 清空选中状态
    this.selectedObjects.clear();
  }
}
