import React from 'react';

export interface GalleryCardProps {
  name: string;
  src: string;
  desc: string;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onMenuClick?: () => void;
}

/**
 * GalleryCard - 型材库卡片组件
 * 宽高比 0.618:1（黄金比例），内部采用 flex-col 布局
 * - 第一行：图片，1:1 宽高比，padding 2
 * - 第二行：资源名称，2rem 字号，加粗，居中
 * - 第三行：型材标准代号/描述，0.8rem，居中
 * - 左上角：复选框
 * - 右上角：菜单按钮（三个点）
 */
const GalleryCard: React.FC<GalleryCardProps> = ({
  name,
  src,
  desc,
  selected = false,
  onSelect,
  onMenuClick,
}) => {
  return (
    <div className="w-full p-2 flex flex-col border border-secondary-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden bg-white aspect-[1/1.618] relative">
      {/* 左上角复选框 */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={e => onSelect?.(e.target.checked)}
          className="w-5 h-5 cursor-pointer accent-primary-500"
        />
      </div>

      {/* 右上角菜单按钮 */}
      <button
        onClick={onMenuClick}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center hover:bg-secondary-100 rounded transition-colors"
        title="更多操作"
      >
        <span className="icon-[mdi--dots-vertical] w-5 h-5 text-secondary-600" />
      </button>

      {/* 图片区域 - 1:1 宽高比 */}
      <div className="w-full aspect-square p-2 mt-6">
        <img className="w-full h-full object-contain" alt={name} src={src} />
      </div>

      {/* 资源名称 - 2rem 字号，加粗，水平和垂直居中 */}
      <div className="px-3 py-1 flex-1 flex items-center justify-center">
        <h3 className="text-[2rem] font-bold text-secondary-900 leading-tight text-center">
          {name}
        </h3>
      </div>

      {/* 型材描述 - 0.8rem 字号，居中 */}
      <div className="px-3 pb-2 flex-1 flex justify-center">
        <p className="text-[0.8rem] text-secondary-600 leading-tight text-center">
          {desc}
        </p>
      </div>
    </div>
  );
};

export default GalleryCard;
