/**
 * useBoxSelect - 框选 Hook
 *
 * 职责：
 * - 监听容器的鼠标事件（mousedown/mousemove/mouseup）
 * - 检测框选手势（拖拽）
 * - 发送框选命令到 eventBus
 * - 在框选期间禁用 OrbitControls
 * - 支持 Shift/Ctrl 修饰键切换选择模式
 * - ESC 取消框选
 */

import { useEffect, useRef } from 'react';
import type { IRenderer } from '@/core/renderer/renderer-types';
import { sendCommand } from '@/core/services/eventBus';
import { BoxSelectMode } from '../services/BoxSelectController';

/**
 * 最小拖拽距离（像素），避免点击被误判为框选
 */
const MIN_DRAG_DISTANCE = 5;

/**
 * useBoxSelect Hook
 */
export function useBoxSelect(
  containerRef: React.RefObject<HTMLDivElement>,
  renderer: IRenderer | null,
  enabled: boolean = true
): void {
  const isDraggingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasStartedBoxSelectRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !renderer || !enabled) {
      return;
    }

    const container = containerRef.current;

    /**
     * 处理鼠标按下
     */
    const handleMouseDown = (event: MouseEvent) => {
      // 只响应左键
      if (event.button !== 0) {
        return;
      }

      // 只有按住 Shift 键时才启动框选（避免干扰普通点击和相机拖拽）
      if (!event.shiftKey) {
        return;
      }

      // 如果点击到了特定元素（如工具栏按钮），不启动框选
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-no-box-select]')) {
        return;
      }

      isDraggingRef.current = true;
      startPointRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      hasStartedBoxSelectRef.current = false;

      console.log('[useBoxSelect] Mouse down with Shift, waiting for drag');
    };

    /**
     * 处理鼠标移动
     */
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !startPointRef.current) {
        return;
      }

      const currentX = event.clientX;
      const currentY = event.clientY;

      // 计算拖拽距离
      const distance = Math.sqrt(
        Math.pow(currentX - startPointRef.current.x, 2) +
          Math.pow(currentY - startPointRef.current.y, 2)
      );

      // 如果还没开始框选，检查是否超过最小拖拽距离
      if (!hasStartedBoxSelectRef.current) {
        if (distance < MIN_DRAG_DISTANCE) {
          return; // 距离太小，不启动框选
        }

        // 启动框选
        hasStartedBoxSelectRef.current = true;

        // 确定选择模式
        const mode = getSelectMode(event);
        sendCommand('command:boxselect:start', {
          x: startPointRef.current.x,
          y: startPointRef.current.y,
        });

        // 禁用 OrbitControls
        renderer.requestDisableOrbitControls('box-selection');

        console.log('[useBoxSelect] Box selection started, mode:', mode);
      }

      // 更新框选区域
      if (hasStartedBoxSelectRef.current) {
        sendCommand('command:boxselect:update', {
          x: currentX,
          y: currentY,
        });
      }
    };

    /**
     * 处理鼠标释放
     */
    const handleMouseUp = (event: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      // 如果框选已启动，结束框选
      if (hasStartedBoxSelectRef.current) {
        // 阻止事件传播，避免触发 useSceneClick 的点击事件
        event.stopPropagation();
        event.preventDefault();

        sendCommand('command:boxselect:end', undefined);

        // 恢复 OrbitControls
        renderer.releaseDisableOrbitControls('box-selection');

        console.log('[useBoxSelect] Box selection ended');
      }

      // 重置状态
      isDraggingRef.current = false;
      startPointRef.current = null;
      hasStartedBoxSelectRef.current = false;
    };

    /**
     * 处理键盘按下（ESC 取消）
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && hasStartedBoxSelectRef.current) {
        sendCommand('command:boxselect:cancel', undefined);

        // 恢复 OrbitControls
        renderer.releaseDisableOrbitControls('box-selection');

        // 重置状态
        isDraggingRef.current = false;
        startPointRef.current = null;
        hasStartedBoxSelectRef.current = false;

        console.log('[useBoxSelect] Box selection cancelled by ESC');
      }
    };

    /**
     * 获取选择模式（根据修饰键）
     */
    function getSelectMode(event: MouseEvent | KeyboardEvent): BoxSelectMode {
      if (event.shiftKey) {
        return BoxSelectMode.ADD;
      } else if (event.ctrlKey || event.metaKey) {
        return BoxSelectMode.TOGGLE;
      } else {
        return BoxSelectMode.REPLACE;
      }
    }

    // 添加事件监听
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);

      // 清理：如果框选还在进行中，取消它
      if (hasStartedBoxSelectRef.current) {
        sendCommand('command:boxselect:cancel', undefined);
        renderer.releaseDisableOrbitControls('box-selection');
      }
    };
  }, [containerRef, renderer, enabled]);
}
