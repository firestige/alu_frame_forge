import React, { useState } from 'react';
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
 * 负责组织具体的显示层实现，通过 props 接收数据和回调
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
  // viewMode 是内部状态：生产者（toolbar）和消费者（渲染逻辑）都在组件内部
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
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
