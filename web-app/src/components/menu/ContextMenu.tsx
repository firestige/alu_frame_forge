import * as React from 'react';
import { PopoverMenu } from '@/components/Popover';

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
  return (
    <PopoverMenu
      open={visible}
      position={{ x, y }}
      onClose={onClose}
      className="bg-slate-800 border-slate-700 py-1 min-w-40"
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
    </PopoverMenu>
  );
};

export default ContextMenu;
