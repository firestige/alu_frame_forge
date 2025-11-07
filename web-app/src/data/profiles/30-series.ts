import type { AluminumExtrusionAsset } from '../../domain/Asset';

/**
 * 30系列铝型材预置数据
 */
export const series30Profiles: AluminumExtrusionAsset[] = [
  {
    id: 'profile-3030',
    name: '3030',
    svg: '/src/assets/shape/3030.svg',
    description: '30x30mm 标准型材',
  },
  {
    id: 'profile-3030l',
    name: '3030L',
    svg: '/src/assets/shape/3030.svg',
    description: '30x30mm 轻型型材',
  },
  {
    id: 'profile-3030w',
    name: '3030W',
    svg: '/src/assets/shape/3030.svg',
    description: '30x30mm 加宽型材',
  },
  {
    id: 'profile-3040',
    name: '3040',
    svg: '/src/assets/shape/3030.svg',
    description: '30x40mm 型材',
  },
  {
    id: 'profile-3060',
    name: '3060',
    svg: '/src/assets/shape/3030.svg',
    description: '30x60mm 型材',
  },
  {
    id: 'profile-3030le',
    name: '3030LE',
    svg: '/src/assets/shape/3030.svg',
    description: '30x30mm 经济轻型型材',
  },
];
