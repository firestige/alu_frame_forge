import { useEffect, useCallback } from 'react';
import { sendCommand } from '@/core/services/eventBus';

/**
 * usePlacementInput - 处理放置模式的输入事件
 *
 * 职责：
 * - 监听 DOM 事件（pointermove, pointerdown, keydown）
 * - 获取屏幕坐标和视口信息
 * - 发送命令到 eventBus 供 PlacementController 处理
 *
 * 架构：
 * - UI 层职责：监听 DOM，获取视口信息，发送命令
 * - Core 层职责：监听命令，计算 NDC，执行业务逻辑
 */
export function usePlacementInput(
  containerRef: React.RefObject<HTMLElement | null>,
  isPlacementActive: boolean
) {
  /**
   * 处理指针移动
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isPlacementActive) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      sendCommand('command:placement:updatePointer', {
        screen: {
          x: event.clientX,
          y: event.clientY,
        },
        viewport: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        shiftKey: event.shiftKey, // 传递 Shift 键状态
      });
    },
    [isPlacementActive, containerRef]
  );

  /**
   * 处理指针点击（确认放置）
   */
  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!isPlacementActive) return;
      if (event.button !== 0) return; // 只处理左键

      event.preventDefault();
      event.stopPropagation();

      sendCommand('command:placement:confirm', undefined);
    },
    [isPlacementActive]
  );

  /**
   * 处理键盘事件（ESC 取消）
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isPlacementActive) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        sendCommand('command:placement:cancel', undefined);
      }
    },
    [isPlacementActive]
  );

  /**
   * 注册事件监听器
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isPlacementActive) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('keydown', handleKeyDown);

      // 设置光标样式
      container.style.cursor = 'crosshair';
    }

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);

      // 恢复光标样式
      if (container) {
        container.style.cursor = '';
      }
    };
  }, [
    containerRef,
    isPlacementActive,
    handlePointerMove,
    handlePointerDown,
    handleKeyDown,
  ]);
}
