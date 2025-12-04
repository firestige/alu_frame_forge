/**
 * useSelectionState - 订阅选中状态变化
 *
 * 职责：
 * - 监听 SelectionService 发布的状态变更事件
 * - 提供响应式的选中状态给 UI 层
 *
 * 架构：
 * - Service 层：SelectionService 通过 publishState 发布状态
 * - UI 层：通过此 hook 订阅状态变更
 */

import { useState, useEffect } from 'react';
import { onState, offState } from '@/core/services/eventBus';

/**
 * 选中状态
 */
export interface SelectionState {
  /** 选中的对象 ID 列表 */
  selectedIds: string[];
  /** 是否有选中对象 */
  hasSelection: boolean;
  /** 选中对象数量 */
  count: number;
}

/**
 * useSelectionState - 订阅选中状态
 */
export function useSelectionState(): SelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handleChanged = (data: {
      selectedIds: string[];
      addedIds: string[];
      removedIds: string[];
    }) => {
      setSelectedIds(data.selectedIds);
    };

    const handleCleared = () => {
      setSelectedIds([]);
    };

    // 订阅状态变更事件
    onState('state:selection:changed', handleChanged);
    onState('state:selection:cleared', handleCleared);

    // 清理订阅
    return () => {
      offState('state:selection:changed', handleChanged);
      offState('state:selection:cleared', handleCleared);
    };
  }, []);

  return {
    selectedIds,
    hasSelection: selectedIds.length > 0,
    count: selectedIds.length,
  };
}
