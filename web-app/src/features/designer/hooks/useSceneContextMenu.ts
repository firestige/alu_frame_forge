import * as React from 'react';
import type { IRenderer } from '@/core/renderer';
import { useContextMenu } from './useContextMenu';

/**
 * useSceneContextMenu - 3D 场景右键菜单管理
 *
 * 监听 3D 场景容器的 contextmenu 事件，根据点击位置判断：
 * - 点击对象 → 显示对象菜单
 * - 点击空白 → 显示场景菜单
 *
 * @param containerRef - 3D 场景容器的引用
 * @param renderer - 渲染器实例（用于射线检测）
 *
 * @example
 * const { contextMenu, closeContextMenu } = useSceneContextMenu(
 *   containerRef,
 *   renderer
 * );
 *
 * return (
 *   <>
 *     <div ref={containerRef}>场景容器</div>
 *     {contextMenu.open && (
 *       <CommandContextMenu
 *         position={{ x: contextMenu.x, y: contextMenu.y }}
 *         open={contextMenu.open}
 *         actions={contextMenu.type === 'object' ? OBJECT_MENU : SCENE_MENU}
 *         context={{ objectId: contextMenu.targetId }}
 *         onClose={closeContextMenu}
 *       />
 *     )}
 *   </>
 * );
 */
export const useSceneContextMenu = (
  containerRef: React.RefObject<HTMLDivElement>,
  renderer: IRenderer | null
) => {
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !renderer) {
      return;
    }

    // 跟踪右键按下的位置和是否发生了拖拽
    let rightMouseDownPos: { x: number; y: number } | null = null;
    let hasDragged = false;
    const dragThreshold = 5; // 移动超过 5 像素才算拖拽

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        // 右键按下
        rightMouseDownPos = { x: e.clientX, y: e.clientY };
        hasDragged = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (rightMouseDownPos && e.buttons === 2) {
        // 右键按住时移动
        const dx = Math.abs(e.clientX - rightMouseDownPos.x);
        const dy = Math.abs(e.clientY - rightMouseDownPos.y);

        if (dx > dragThreshold || dy > dragThreshold) {
          hasDragged = true;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        // 右键抬起
        rightMouseDownPos = null;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果发生了拖拽，不显示菜单
      if (hasDragged) {
        hasDragged = false;
        return;
      }

      // 获取容器的位置和尺寸
      const rect = container.getBoundingClientRect();

      // 计算视口坐标
      const viewport = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };

      // 使用 raycastFromScreen 进行射线检测
      try {
        const hits = renderer.raycastFromScreen(
          e.clientX,
          e.clientY,
          viewport,
          {
            includeHelpers: false,
            ignoreHandles: [], // 可以添加需要忽略的对象
          }
        );

        // 检查是否点击到对象
        if (hits.length > 0) {
          const firstHit = hits[0];
          // handle 已经是正确的 modelId（RaycasterService 会向上查找）
          const objectId = firstHit.handle;

          if (objectId && typeof objectId === 'string') {
            // 点击了对象 → 显示对象菜单
            openContextMenu(e.clientX, e.clientY, 'object', objectId, {
              isVisible: firstHit.userData?.isVisible ?? true,
            });
          } else {
            // 对象没有有效 ID → 显示场景菜单
            openContextMenu(e.clientX, e.clientY, 'scene');
          }
        } else {
          // 点击空白 → 显示场景菜单
          openContextMenu(e.clientX, e.clientY, 'scene');
        }
      } catch (error) {
        console.error('[useSceneContextMenu] 射线检测失败:', error);
        // 发生错误时，默认显示场景菜单
        openContextMenu(e.clientX, e.clientY, 'scene');
      }
    };

    // 添加事件监听器
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);

    // 清理函数
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [containerRef, renderer, openContextMenu]);

  return {
    contextMenu,
    closeContextMenu,
  };
};
