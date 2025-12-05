import * as React from 'react';

export type ContextMenuType = 'scene' | 'object' | 'objectList';

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  type: ContextMenuType | null;
  targetId?: string; // 对象 ID（如果是对象菜单）
}

/**
 * useContextMenu - 右键菜单状态管理 Hook
 *
 * 统一管理右键菜单的显示、位置和上下文信息
 *
 * @example
 * const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();
 *
 * <div onContextMenu={(e) => openContextMenu(e, 'object', 'obj-1')}>
 *   右键点击
 * </div>
 */
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    type: null,
  });

  const openContextMenu = React.useCallback(
    (event: React.MouseEvent, type: ContextMenuType, targetId?: string) => {
      event.preventDefault();
      event.stopPropagation();

      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        type,
        targetId,
      });
    },
    []
  );

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(prev => ({ ...prev, open: false }));
  }, []);

  return { contextMenu, openContextMenu, closeContextMenu };
};
