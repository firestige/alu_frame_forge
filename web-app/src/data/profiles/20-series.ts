import type { AluminumExtrusionAsset } from '@/domain/Asset';

/**
 * 20系列铝型材预置数据
 *
 * 截面SVG路径来自 src/assets/shape/2020.svg
 * 包含完整的型材截面轮廓（中心圆孔 + 四角槽口）
 *
 * SVG坐标系统说明：
 * - viewBox: 0 0 356.89 356.89 (SVG单位)
 * - 实际尺寸: 20mm x 20mm (2020型材标称尺寸)
 * - 中心点: (178.44, 178.44)
 * - 解析器会自动处理坐标缩放和居中
 */

// 2020 型材截面路径（直接从 2020.svg 提取，保持原始坐标）
const profile2020Path =
  'M344.82,123.28v-8.9h11.57V27.19c0-14.74-11.95-26.69-26.69-26.69h-87.19v11.57h-8.9v17.79h48.04v29.02l-52.84,52.84h-100.74l-52.84-52.84v-29.02h48.04V12.07h-8.9V.5H27.19C12.45.5.5,12.45.5,27.19v87.19h11.57v8.9h17.79v-48.04h29.02l52.84,52.84v100.74l-52.84,52.84h-29.02v-48.04H12.07v8.9H.5v87.19c0,14.74,11.95,26.69,26.69,26.69h87.19v-11.57h8.9v-17.79h-48.04v-29.02l52.84-52.84h100.74l52.84,52.84v29.02h-48.04v17.79h8.9v11.57h87.19c14.74,0,26.69-11.95,26.69-26.69v-87.19h-11.57v-8.9h-17.79v48.04h-29.02l-52.84-52.84v-100.74l52.84-52.84h29.02v48.04h17.79ZM178.44,222.93c-24.57,0-44.49-19.92-44.49-44.49s19.92-44.49,44.49-44.49,44.49,19.92,44.49,44.49-19.92,44.49-44.49,44.49Z';

/**
 * 30系列铝型材预置数据
 */
export const series20Profiles: AluminumExtrusionAsset[] = [
  {
    id: 'profile-2020',
    name: '2020',
    svg: profile2020Path,
    description: '20x20mm 标准型材',
  },
  {
    id: 'profile-2020l',
    name: '2020L',
    svg: profile2020Path,
    description: '20x20mm 轻型型材',
  },
  {
    id: 'profile-2020w',
    name: '2020W',
    svg: profile2020Path,
    description: '20x20mm 加宽型材',
  },
  {
    id: 'profile-2040',
    name: '2040',
    svg: profile2020Path,
    description: '20x40mm 型材',
  },
  {
    id: 'profile-2060',
    name: '2060',
    svg: profile2020Path,
    description: '20x60mm 型材',
  },
  {
    id: 'profile-2020le',
    name: '2020LE',
    svg: profile2020Path,
    description: '20x20mm 经济轻型型材',
  },
];
