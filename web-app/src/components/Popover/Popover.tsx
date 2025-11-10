import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Popover 定位坐标
 */
export interface PopoverPosition {
  x: number;
  y: number;
}

/**
 * 锚点对齐配置
 */
export interface OriginConfig {
  vertical: 'top' | 'center' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}

/**
 * 位置偏移配置
 */
export interface OffsetConfig {
  x?: number;
  y?: number;
}

/**
 * Popover 组件属性
 *
 * @example
 * // 坐标定位 (用于右键菜单)
 * <Popover
 *   open={contextMenu.visible}
 *   position={{ x: contextMenu.x, y: contextMenu.y }}
 *   onClose={handleClose}
 * >
 *   <div>菜单内容</div>
 * </Popover>
 *
 * @example
 * // 元素引用定位 (用于下拉菜单)
 * <Popover
 *   open={dropdownOpen}
 *   anchorEl={buttonRef.current}
 *   anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
 *   transformOrigin={{ vertical: 'top', horizontal: 'left' }}
 *   onClose={handleClose}
 * >
 *   <div>下拉内容</div>
 * </Popover>
 */
export interface PopoverProps {
  /** 是否显示 Popover */
  open: boolean;

  /** Popover 内容 */
  children: React.ReactNode;

  /** 关闭回调 */
  onClose: () => void;

  /** 坐标定位 (与 anchorEl 二选一) */
  position?: PopoverPosition;

  /** 元素引用定位 (与 position 二选一) */
  anchorEl?: HTMLElement | null;

  /** anchorEl 模式下的锚点位置 (默认: { vertical: 'top', horizontal: 'left' }) */
  anchorOrigin?: OriginConfig;

  /** Popover 自身的对齐点 (默认: { vertical: 'top', horizontal: 'left' }) */
  transformOrigin?: OriginConfig;

  /** 位置偏移 (默认: { x: 0, y: 0 }) */
  offset?: OffsetConfig;

  /** 自定义样式类 */
  className?: string;

  /** 是否在按 ESC 键时关闭 (默认: true) */
  closeOnEscape?: boolean;

  /** 是否在点击外部时关闭 (默认: true) */
  closeOnClickOutside?: boolean;

  /** 是否防止溢出屏幕 (默认: true) */
  preventOverflow?: boolean;
}

/**
 * 计算基于坐标的位置
 */
function calculatePositionFromCoords(
  position: PopoverPosition,
  offset: OffsetConfig,
  popoverRect: DOMRect,
  preventOverflow: boolean
): React.CSSProperties {
  let x = position.x + (offset.x || 0);
  let y = position.y + (offset.y || 0);

  if (preventOverflow) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 使用 clamp 函数一次性约束位置，避免顺序检查导致的冲突
    // Clamp x to keep popover within viewport
    x = Math.max(8, Math.min(x, viewportWidth - popoverRect.width - 8));

    // Clamp y to keep popover within viewport
    y = Math.max(8, Math.min(y, viewportHeight - popoverRect.height - 8));
  }

  return {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: 9999,
  };
}

/**
 * 计算基于元素引用的位置
 */
function calculatePositionFromAnchor(
  anchorEl: HTMLElement,
  anchorOrigin: OriginConfig,
  transformOrigin: OriginConfig,
  offset: OffsetConfig,
  popoverRect: DOMRect,
  preventOverflow: boolean
): React.CSSProperties {
  const anchorRect = anchorEl.getBoundingClientRect();

  // 计算锚点位置
  let anchorX = anchorRect.left;
  if (anchorOrigin.horizontal === 'center') {
    anchorX = anchorRect.left + anchorRect.width / 2;
  } else if (anchorOrigin.horizontal === 'right') {
    anchorX = anchorRect.right;
  }

  let anchorY = anchorRect.top;
  if (anchorOrigin.vertical === 'center') {
    anchorY = anchorRect.top + anchorRect.height / 2;
  } else if (anchorOrigin.vertical === 'bottom') {
    anchorY = anchorRect.bottom;
  }

  // 计算 Popover 对齐点偏移
  let transformX = 0;
  if (transformOrigin.horizontal === 'center') {
    transformX = popoverRect.width / 2;
  } else if (transformOrigin.horizontal === 'right') {
    transformX = popoverRect.width;
  }

  let transformY = 0;
  if (transformOrigin.vertical === 'center') {
    transformY = popoverRect.height / 2;
  } else if (transformOrigin.vertical === 'bottom') {
    transformY = popoverRect.height;
  }

  // 计算最终位置
  let x = anchorX - transformX + (offset.x || 0);
  let y = anchorY - transformY + (offset.y || 0);

  if (preventOverflow) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 使用 clamp 函数一次性约束位置，避免顺序检查导致的冲突
    // Clamp x to keep popover within viewport
    x = Math.max(8, Math.min(x, viewportWidth - popoverRect.width - 8));

    // Clamp y to keep popover within viewport
    y = Math.max(8, Math.min(y, viewportHeight - popoverRect.height - 8));
  }

  return {
    position: 'fixed',
    left: `${x}px`,
    top: `${y}px`,
    zIndex: 9999,
  };
}

/**
 * Popover 通用弹出组件
 *
 * 提供坐标定位和元素引用定位两种模式，支持边界检测、ESC 关闭、点击外部关闭等功能。
 *
 * **架构说明**:
 * - 这是一个纯 UI 组件，不包含任何业务逻辑
 * - 不依赖 features/ 目录的任何代码
 * - 可被任意 feature 或 page 复用
 */
export const Popover: React.FC<PopoverProps> = ({
  open,
  children,
  onClose,
  position,
  anchorEl,
  anchorOrigin = { vertical: 'top', horizontal: 'left' },
  transformOrigin = { vertical: 'top', horizontal: 'left' },
  offset = { x: 0, y: 0 },
  className = '',
  closeOnEscape = true,
  closeOnClickOutside = true,
  preventOverflow = true,
}) => {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: 'fixed',
    left: '0px',
    top: '0px',
    zIndex: 9999,
    opacity: 0,
  });

  // 计算位置
  React.useEffect(() => {
    if (!open || !popoverRef.current) {
      return;
    }

    const popoverRect = popoverRef.current.getBoundingClientRect();

    let computedStyle: React.CSSProperties;

    if (position) {
      // 坐标定位模式
      computedStyle = calculatePositionFromCoords(
        position,
        offset,
        popoverRect,
        preventOverflow
      );
    } else if (anchorEl) {
      // 元素引用定位模式 - 添加 DOM 挂载检查
      if (!document.body.contains(anchorEl)) {
        console.warn('Popover: anchorEl is not mounted in the DOM');
        // 返回一个隐藏在屏幕外的样式
        setStyle({
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          zIndex: 9999,
          opacity: 0,
        });
        return;
      }

      computedStyle = calculatePositionFromAnchor(
        anchorEl,
        anchorOrigin,
        transformOrigin,
        offset,
        popoverRect,
        preventOverflow
      );
    } else {
      console.warn('Popover: 必须提供 position 或 anchorEl 其中之一');
      return;
    }

    setStyle({ ...computedStyle, opacity: 1 });
  }, [
    open,
    // 使用 JSON.stringify 避免对象引用变化导致的不必要重渲染
    JSON.stringify(position),
    anchorEl,
    JSON.stringify(anchorOrigin),
    JSON.stringify(transformOrigin),
    JSON.stringify(offset),
    preventOverflow,
  ]);

  // ESC 键关闭
  React.useEffect(() => {
    if (!open || !closeOnEscape) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  // 点击外部关闭
  React.useEffect(() => {
    if (!open || !closeOnClickOutside) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        // 排除点击 anchorEl 元素的情况，避免触发关闭后立即重新打开
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    // 延迟添加事件监听，避免触发打开的 mousedown 事件立即触发关闭
    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, closeOnClickOutside, anchorEl, onClose]);

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div ref={popoverRef} style={style} className={className}>
      {children}
    </div>,
    document.body
  );
};
