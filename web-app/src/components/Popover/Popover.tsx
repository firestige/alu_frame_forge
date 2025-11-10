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

    // 防止右侧溢出
    if (x + popoverRect.width > viewportWidth) {
      x = Math.max(0, viewportWidth - popoverRect.width - 8);
    }

    // 防止底部溢出
    if (y + popoverRect.height > viewportHeight) {
      y = Math.max(0, viewportHeight - popoverRect.height - 8);
    }

    // 防止左侧溢出
    if (x < 0) {
      x = 8;
    }

    // 防止顶部溢出
    if (y < 0) {
      y = 8;
    }
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

    // 防止右侧溢出
    if (x + popoverRect.width > viewportWidth) {
      x = Math.max(0, viewportWidth - popoverRect.width - 8);
    }

    // 防止底部溢出
    if (y + popoverRect.height > viewportHeight) {
      y = Math.max(0, viewportHeight - popoverRect.height - 8);
    }

    // 防止左侧溢出
    if (x < 0) {
      x = 8;
    }

    // 防止顶部溢出
    if (y < 0) {
      y = 8;
    }
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
      // 元素引用定位模式
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
  }, [open, position, anchorEl, anchorOrigin, transformOrigin, offset, preventOverflow]);

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
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 使用 mousedown 而不是 click，避免与菜单项点击冲突
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, closeOnClickOutside, onClose]);

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
