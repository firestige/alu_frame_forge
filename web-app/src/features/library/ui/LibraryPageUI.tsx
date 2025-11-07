import React from 'react';
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
  viewMode: 'gallery' | 'list';
  onViewModeChange: (mode: 'gallery' | 'list') => void;
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
 * 负责组织具体的显示层实现，通过 props 接收数据和回调
 */
const LibraryPageUI: React.FC<LibraryPageUIProps> = ({
  viewMode,
  onViewModeChange,
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
  return (
    <div className="library-page-ui flex flex-col h-full">
      <LibraryToolbar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
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
