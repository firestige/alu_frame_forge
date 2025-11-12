import { useState, useEffect } from 'react';
import { designerEventBus } from '@/core/services/eventBus';

/**
 * usePlacementState - 订阅放置状态变化
 *
 * 职责：
 * - 监听 PlacementController 发布的状态变更事件
 * - 提供响应式的放置状态给 UI 层
 *
 * 架构：
 * - Core 层：PlacementController 通过 publishState 发布状态
 * - UI 层：通过此 hook 订阅状态变更
 */
export function usePlacementState() {
  const [isPlacementActive, setIsPlacementActive] = useState(false);

  useEffect(() => {
    const handleStarted = () => {
      setIsPlacementActive(true);
    };

    const handleCompleted = () => {
      setIsPlacementActive(false);
    };

    const handleCancelled = () => {
      setIsPlacementActive(false);
    };

    // 订阅状态变更事件
    designerEventBus.on('state:placement:started', handleStarted);
    designerEventBus.on('state:placement:completed', handleCompleted);
    designerEventBus.on('state:placement:cancelled', handleCancelled);

    // 清理订阅
    return () => {
      designerEventBus.off('state:placement:started', handleStarted);
      designerEventBus.off('state:placement:completed', handleCompleted);
      designerEventBus.off('state:placement:cancelled', handleCancelled);
    };
  }, []);

  return { isPlacementActive };
}
