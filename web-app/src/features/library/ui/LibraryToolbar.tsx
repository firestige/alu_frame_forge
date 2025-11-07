import React from 'react';
import { IconButton, OutlinedButton, ButtonGroup } from '@/components/Button';
import { Toolbar } from '@/components/Toolbar';
import { VerticalDivider } from '@/components/Divider';

export interface LibraryToolbarProps {
  viewMode: 'gallery' | 'list';
  onViewModeChange: (mode: 'gallery' | 'list') => void;
  onSearch: (query: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  onImport: () => void;
  onExport: () => void;
  onSelectAll: () => void;
  selectedCount: number;
  totalCount: number;
}

/**
 * LibraryToolbar - 型材库工具栏
 * 通过 props 接收状态和回调函数，不直接管理状态
 */
const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onSearch,
  onAdd,
  onDelete,
  onImport,
  onExport,
  onSelectAll,
  selectedCount,
  totalCount,
}) => {
  return (
    <Toolbar>
      <div className="flex items-center justify-between w-full gap-4">
        {/* 左侧：视图切换 */}
        <ButtonGroup>
          <span className="text-sm text-secondary-600">视图：</span>
          <IconButton
            icon={<span className="icon-[mdi--view-grid-plus] w-5 h-5" />}
            onClick={() => onViewModeChange('gallery')}
            className={
              viewMode === 'gallery'
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }
            title="画廊视图"
          />
          <IconButton
            icon={
              <span className="icon-[mdi--format-list-bulleted-square] w-5 h-5" />
            }
            onClick={() => onViewModeChange('list')}
            className={
              viewMode === 'list'
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }
            title="列表视图"
          />
        </ButtonGroup>

        {/* 全选和选中计数 */}
        <ButtonGroup>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedCount === totalCount && totalCount > 0}
              onChange={onSelectAll}
              className="w-4 h-4 cursor-pointer accent-primary-500"
            />
            <span className="text-sm text-secondary-600">
              全选 ({selectedCount}/{totalCount})
            </span>
          </label>
        </ButtonGroup>

        {/* 中间：搜索框 */}
        <div className="flex-1 max-w-md mx-4">
          <input
            type="text"
            placeholder="搜索型材..."
            onChange={e => onSearch(e.target.value)}
            className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* 右侧：操作按钮 */}
        <ButtonGroup>
          <IconButton
            icon={<span className="icon-[mdi--file-plus] w-5 h-5" />}
            onClick={onAdd}
            className="bg-success-500 text-white hover:bg-success-600"
            title="添加型材"
          />
          <IconButton
            icon={<span className="icon-[mdi--delete-forever] w-5 h-5" />}
            onClick={onDelete}
            className="bg-error-500 text-white hover:bg-error-600"
            title="删除型材"
          />
          <VerticalDivider className="mx-2" />
          <OutlinedButton onClick={onImport} className="text-sm">
            导入
          </OutlinedButton>
          <OutlinedButton onClick={onExport} className="text-sm">
            导出
          </OutlinedButton>
        </ButtonGroup>
      </div>
    </Toolbar>
  );
};

export default LibraryToolbar;
