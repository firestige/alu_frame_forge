// 重新导出系列数据
export { series20Profiles } from './20-series';
export { series30Profiles } from './30-series';

// 导入用于聚合
import { series20Profiles } from './20-series';
import { series30Profiles } from './30-series';
import type { AluminumExtrusionAsset } from '../../domain/Asset';

/**
 * 所有预置型材数据
 */
export const allProfiles: AluminumExtrusionAsset[] = [
  ...series20Profiles,
  ...series30Profiles,
];

/**
 * 按系列分组的型材数据
 */
export const profilesBySeries = {
  20: series20Profiles,
  30: series30Profiles,
} as const;

/**
 * 根据 ID 获取型材
 */
export function getProfileById(id: string): AluminumExtrusionAsset | undefined {
  return allProfiles.find(profile => profile.id === id);
}

/**
 * 根据名称获取型材
 */
export function getProfileByName(
  name: string
): AluminumExtrusionAsset | undefined {
  return allProfiles.find(profile => profile.name === name);
}
