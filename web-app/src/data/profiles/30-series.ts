import type { AluminumExtrusionAsset } from '@/domain/Asset';

/**
 * 30系列铝型材预置数据
 *
 * TODO: svg 字段应该是 SVG path 字符串，而不是文件路径
 * 临时使用简化的矩形路径（30x30mm，中心有圆孔）
 */

// 临时的简化 3030 型材截面路径
// 外框 30x30mm，中心有 8x8mm 的方孔
const profile3030Path =
  'M-15,-15 L15,-15 L15,15 L-15,15 Z ' + // 外框 30x30mm
  'M-4,-4 L4,-4 L4,4 L-4,4 Z'; // 中心方孔 8x8mm

/**
 * 30系列铝型材预置数据
 */
export const series30Profiles: AluminumExtrusionAsset[] = [
  {
    id: 'profile-3030',
    name: '3030',
    svg: profile3030Path,
    description: '30x30mm 标准型材',
  },
  {
    id: 'profile-3030l',
    name: '3030L',
    svg: profile3030Path,
    description: '30x30mm 轻型型材',
  },
  {
    id: 'profile-3030w',
    name: '3030W',
    svg: profile3030Path,
    description: '30x30mm 加宽型材',
  },
  {
    id: 'profile-3040',
    name: '3040',
    svg: profile3030Path,
    description: '30x40mm 型材',
  },
  {
    id: 'profile-3060',
    name: '3060',
    svg: profile3030Path,
    description: '30x60mm 型材',
  },
  {
    id: 'profile-3030le',
    name: '3030LE',
    svg: profile3030Path,
    description: '30x30mm 经济轻型型材',
  },
];
