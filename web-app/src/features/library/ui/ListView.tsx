import React, { useState, useMemo } from 'react';

interface Asset {
  id: string;
  name: string;
  description: string;
  svg: string;
  series: number;
}

export interface ListViewProps {
  assets: Asset[];
  selectedAssets: string[];
  onSelectAsset: (id: string, selected: boolean) => void;
  pageSize?: number;
}

/**
 * ListView - 列表视图组件
 * 以表格形式展示型材，支持分页
 */
const ListView: React.FC<ListViewProps> = ({
  assets,
  selectedAssets,
  onSelectAsset,
  pageSize = 20,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // 计算分页数据
  const totalPages = Math.ceil(assets.length / pageSize);
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return assets.slice(startIndex, endIndex);
  }, [assets, currentPage, pageSize]);

  // 分页控制
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // 生成页码按钮
  const renderPageButtons = () => {
    const buttons = [];
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          className={`px-3 py-1 rounded ${
            i === currentPage
              ? 'bg-primary-500 text-white'
              : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
          }`}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 列表表格 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* 表头 */}
        <div className="grid grid-cols-[auto_auto_2fr_3fr_1fr_auto] gap-4 px-4 py-2 bg-secondary-100 font-semibold text-sm border-b border-secondary-200">
          <div>选择</div>
          <div>截面图</div>
          <div>名称</div>
          <div>描述</div>
          <div>系列</div>
          <div>操作</div>
        </div>

        {/* 表格内容 */}
        <div className="flex-1 overflow-y-auto">
          {paginatedAssets.map(profile => (
            <div
              key={profile.id}
              className="grid grid-cols-[auto_auto_2fr_3fr_1fr_auto] gap-4 px-4 py-3 border-b border-secondary-200 hover:bg-secondary-50 transition-colors items-center"
            >
              <div>
                <input
                  type="checkbox"
                  checked={selectedAssets.includes(profile.id)}
                  onChange={e => onSelectAsset(profile.id, e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-primary-500"
                />
              </div>
              <div className="w-12 h-12 flex items-center justify-center">
                <img
                  src={profile.svg}
                  alt={profile.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="font-medium">{profile.name}</div>
              <div className="text-secondary-600">{profile.description}</div>
              <div className="text-secondary-500">{profile.series}</div>
              <div className="flex gap-2">
                <button className="text-primary-500 hover:text-primary-700">
                  查看
                </button>
                <button className="text-error-500 hover:text-error-700">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-200 bg-white">
          <div className="text-sm text-secondary-600">
            显示 {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, assets.length)} 条，共{' '}
            {assets.length} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-secondary-100 text-secondary-700 hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <div className="flex gap-1">{renderPageButtons()}</div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-secondary-100 text-secondary-700 hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
