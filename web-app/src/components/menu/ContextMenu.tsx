import * as React from 'react';

export interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onShowProperties: () => void;
  onDelete?: () => void;
  targetName?: string;
  isVisible?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  visible,
  onClose,
  onEdit,
  onToggleVisibility,
  onShowProperties,
  onDelete,
  targetName = '对象',
  isVisible = true,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  React.useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 延迟添加事件监听，避免立即触发
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <div className="px-3 py-1 text-xs text-slate-400 border-b border-slate-700">
        {targetName}
      </div>
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
      >
        <span>✏️</span>
        <span>修改</span>
      </button>
      <button
        onClick={() => {
          onToggleVisibility();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
      >
        <span>{isVisible ? '👁️' : '🚫'}</span>
        <span>{isVisible ? '隐藏' : '显示'}</span>
      </button>
      <button
        onClick={() => {
          onShowProperties();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
      >
        <span>📋</span>
        <span>属性</span>
      </button>
      {onDelete && (
        <>
          <div className="border-t border-slate-700 my-1"></div>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>删除</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
