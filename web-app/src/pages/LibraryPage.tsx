import React, { useEffect, useMemo } from 'react';
import LibraryPageUI from '@/features/library/ui/LibraryPageUI';
import { useLibraryStore } from '@/stores/libraryStore';
import { series20Profiles, series30Profiles } from '@/data/profiles';

/**
 * LibraryPage - 型材库页面容器
 * 负责：
 * 1. 初始化 library 数据
 * 2. 管理 zustand 状态
 * 3. 绑定业务逻辑和数据
 * 4. 将状态和回调传递给显示层组件
 */
const LibraryPage: React.FC = () => {
  const {
    assets,
    viewMode,
    searchQuery,
    selectedAssets,
    setAssets,
    setViewMode,
    setSearchQuery,
    removeAssets,
    toggleSelectAsset,
    clearSelection,
  } = useLibraryStore();

  // 初始化加载型材数据
  useEffect(() => {
    const allAssets = [
      ...series20Profiles.map(p => ({ ...p, series: 20 })),
      ...series30Profiles.map(p => ({ ...p, series: 30 })),
    ];
    setAssets(allAssets);
  }, [setAssets]);

  // 根据搜索关键词过滤型材
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(
      asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // 按系列分组型材
  const groupedAssets = useMemo(() => {
    const groups = new Map<number, typeof filteredAssets>();
    filteredAssets.forEach(asset => {
      if (!groups.has(asset.series)) {
        groups.set(asset.series, []);
      }
      groups.get(asset.series)!.push(asset);
    });
    return groups;
  }, [filteredAssets]);

  // 业务逻辑处理
  const handleAdd = () => {
    console.log('添加型材');
    // TODO: 打开添加对话框
  };

  const handleDelete = () => {
    if (selectedAssets.length === 0) {
      console.warn('没有选中的型材');
      return;
    }
    console.log('删除选中的型材:', selectedAssets);
    // TODO: 显示确认对话框
    removeAssets(selectedAssets);
  };

  const handleImport = () => {
    console.log('导入型材');
    // TODO: 打开文件选择器
  };

  const handleExport = () => {
    console.log('导出型材');
    // TODO: 导出选中或全部型材
  };

  const handleSelectAsset = (id: string, selected: boolean) => {
    if (selected) {
      toggleSelectAsset(id);
    } else {
      toggleSelectAsset(id);
    }
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      clearSelection();
    } else {
      filteredAssets.forEach(asset => {
        if (!selectedAssets.includes(asset.id)) {
          toggleSelectAsset(asset.id);
        }
      });
    }
  };

  return (
    <LibraryPageUI
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSearch={setSearchQuery}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onImport={handleImport}
      onExport={handleExport}
      assets={filteredAssets}
      groupedAssets={groupedAssets}
      selectedAssets={selectedAssets}
      onSelectAsset={handleSelectAsset}
      onSelectAll={handleSelectAll}
    />
  );
};

export default LibraryPage;
