import React from 'react';
import GalleryCard from './GalleryCard';

interface Asset {
  id: string;
  name: string;
  description: string;
  svg: string;
  series: number;
}

export interface GalleryViewProps {
  groupedAssets: Map<number, Asset[]>;
  selectedAssets: string[];
  onSelectAsset: (id: string, selected: boolean) => void;
}

/**
 * GalleryView - 画廊视图组件
 * 以网格卡片形式展示型材，按系列分组
 */
const GalleryView: React.FC<GalleryViewProps> = ({
  groupedAssets,
  selectedAssets,
  onSelectAsset,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {Array.from(groupedAssets.entries()).map(([series, profiles]) => (
        <div key={series} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-secondary-600">
            {series}系列型材
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {profiles.map(profile => (
              <GalleryCard
                key={profile.id}
                name={profile.name}
                src={profile.svg}
                desc={profile.description}
                selected={selectedAssets.includes(profile.id)}
                onSelect={selected => onSelectAsset(profile.id, selected)}
                onMenuClick={() => console.log('Menu:', profile.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GalleryView;
