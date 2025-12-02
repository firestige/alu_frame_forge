import React from 'react';
import { usePersistentState } from '@/features/designer/hooks/usePersistentState';
import LibraryToolbar from './LibraryToolbar';
import GalleryView from './GalleryView';
import ListView from './ListView';

interface Asset {
  id: string;
  name: string;
  description: string;
  svg: string;
  series: number;
}

export interface LibraryPageUIProps {
  onSearch: (query: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  onImport: () => void;
  onExport: () => void;
  assets: Asset[];
  groupedAssets: Map<number, Asset[]>;
  selectedAssets: string[];
  onSelectAsset: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
}

/**
 * LibraryPageUI - 型材库显示层组件
 *
 * 职责：
 * - 负责组织具体的显示层实现，通过 props 接收数据和回调
 * - 管理视图模式状态（持久化用户偏好）
 *
 * 修复：Issue #11 - 视图模式现在持久化到 localStorage
 */
const LibraryPageUI: React.FC<LibraryPageUIProps> = ({
  onSearch,
  onAdd,
  onDelete,
  onImport,
  onExport,
  groupedAssets,
  assets,
  selectedAssets,
  onSelectAsset,
  onSelectAll,
}) => {
  // 使用持久化状态保存用户的视图模式偏好
  const [viewMode, setViewMode] = usePersistentState<'gallery' | 'list'>(
    'library.viewMode',
    'gallery'
  );
  return (
    <div className="library-page-ui flex flex-col h-full">
      <LibraryToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSearch={onSearch}
        onAdd={onAdd}
        onDelete={onDelete}
        onImport={onImport}
        onExport={onExport}
        onSelectAll={onSelectAll}
        selectedCount={selectedAssets.length}
        totalCount={assets.length}
      />

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {viewMode === 'gallery' ? (
          <GalleryView
            groupedAssets={groupedAssets}
            selectedAssets={selectedAssets}
            onSelectAsset={onSelectAsset}
          />
        ) : (
          <ListView
            assets={assets}
            selectedAssets={selectedAssets}
            onSelectAsset={onSelectAsset}
          />
        )}
      </div>
    </div>
  );
};

export default LibraryPageUI;
