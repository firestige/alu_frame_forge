import * as React from 'react';
import type { ProfileAsset } from '@/core/asset';

/**
 * ProfileDropdownPanel Props
 */
export interface ProfileDropdownPanelProps {
  availableSeries: number[];
  activeSeries: number;
  profiles: ProfileAsset[];
  onSeriesChange: (series: number) => void;
  onSelectProfile: (assetId: string) => void;
}

/**
 * ProfileItem - 单个型材项
 */
interface ProfileItemProps {
  profile: ProfileAsset;
  onClick: () => void;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ profile, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors rounded"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">📦</span>
        <div className="flex-1">
          <div className="text-white font-medium">{profile.name}</div>
          <div className="text-slate-400 text-xs">
            {profile.description ||
              `${profile.crossSection.width}x${profile.crossSection.height}mm`}
          </div>
        </div>
      </div>
    </button>
  );
};

/**
 * EmptyState - 空状态组件
 */
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="py-8 text-center text-slate-500">
      <div className="text-4xl mb-2">📭</div>
      <div className="text-sm">{message}</div>
    </div>
  );
};

/**
 * ProfileDropdownPanel - 型材选择下拉面板
 *
 * 功能：
 * - Tab 切换系列（20/30/40）
 * - 显示当前系列的型材列表
 * - 点击型材触发选择回调
 */
const ProfileDropdownPanel: React.FC<ProfileDropdownPanelProps> = ({
  availableSeries,
  activeSeries,
  profiles,
  onSeriesChange,
  onSelectProfile,
}) => {
  return (
    <div className="w-80 max-h-96 bg-slate-800 rounded shadow-lg overflow-hidden">
      {/* 标题 */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-white text-lg font-semibold">选择铝型材类型</h3>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-700 bg-slate-750">
        {availableSeries.map(series => (
          <button
            key={series}
            onClick={() => onSeriesChange(series)}
            className={`
              px-4 py-2 rounded text-sm font-medium transition-colors
              ${
                activeSeries === series
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
            `}
          >
            {series}系列
          </button>
        ))}
      </div>

      {/* 型材列表 */}
      <div className="overflow-y-auto max-h-64">
        {profiles.length > 0 ? (
          <div className="p-2">
            {profiles.map(profile => (
              <ProfileItem
                key={profile.id}
                profile={profile}
                onClick={() => onSelectProfile(profile.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="该系列暂无型材" />
        )}
      </div>
    </div>
  );
};

export default ProfileDropdownPanel;
