/**
 * ISO 4014 紧固件规格目录
 * 
 * ISO 4014：六角头螺栓 - 全螺纹
 * 
 * 🔴 STUB DATA - 当前数据为示例参考值，精度 ±0.2mm
 * 来源：ISO 4014 标准 + 常见供应商数据表
 */

import type { FastenerSpecCatalogEntry } from '@/core/asset/types';

/**
 * ISO 4014 M5 系列规格
 */
export const ISO4014_M5_SPECS: FastenerSpecCatalogEntry[] = [
  {
    key: 'ISO4014-M5x16-8.8',
    standard: 'ISO4014',
    sizeCode: 'M5',
    length: 16,
    headType: 'hex',
    headWidth: 8, // 对边距 (mm)
    headHeight: 3.5,
    shankDiameter: 5,
    threadPitch: 0.8,
    threadLength: 16, // 全螺纹
    driveType: 'wrench',
    tolerance: {
      length: 0.2,
      diameter: 0.1,
    },
    gradeClass: '8.8',
  },
  {
    key: 'ISO4014-M5x20-8.8',
    standard: 'ISO4014',
    sizeCode: 'M5',
    length: 20,
    headType: 'hex',
    headWidth: 8,
    headHeight: 3.5,
    shankDiameter: 5,
    threadPitch: 0.8,
    threadLength: 20, // 全螺纹
    driveType: 'wrench',
    tolerance: {
      length: 0.2,
      diameter: 0.1,
    },
    gradeClass: '8.8',
  },
  {
    key: 'ISO4014-M5x25-8.8',
    standard: 'ISO4014',
    sizeCode: 'M5',
    length: 25,
    headType: 'hex',
    headWidth: 8,
    headHeight: 3.5,
    shankDiameter: 5,
    threadPitch: 0.8,
    threadLength: 25, // 全螺纹
    driveType: 'wrench',
    tolerance: {
      length: 0.2,
      diameter: 0.1,
    },
    gradeClass: '8.8',
  },
  {
    key: 'ISO4014-M5x30-8.8',
    standard: 'ISO4014',
    sizeCode: 'M5',
    length: 30,
    headType: 'hex',
    headWidth: 8,
    headHeight: 3.5,
    shankDiameter: 5,
    threadPitch: 0.8,
    threadLength: 30, // 全螺纹
    driveType: 'wrench',
    tolerance: {
      length: 0.2,
      diameter: 0.1,
    },
    gradeClass: '8.8',
  },
];

/**
 * ISO 4014 M6 系列规格（预留）
 */
export const ISO4014_M6_SPECS: FastenerSpecCatalogEntry[] = [
  {
    key: 'ISO4014-M6x20-8.8',
    standard: 'ISO4014',
    sizeCode: 'M6',
    length: 20,
    headType: 'hex',
    headWidth: 10, // M6 对边距
    headHeight: 4,
    shankDiameter: 6,
    threadPitch: 1.0,
    threadLength: 20,
    driveType: 'wrench',
    tolerance: {
      length: 0.2,
      diameter: 0.1,
    },
    gradeClass: '8.8',
  },
];

/**
 * 完整的 ISO 4014 规格目录
 */
export const ISO4014_CATALOG = {
  standard: 'ISO4014',
  entries: [...ISO4014_M5_SPECS, ...ISO4014_M6_SPECS],
};

/**
 * 按规格键查找目录条目
 */
export function getISO4014Spec(
  specKey: string
): FastenerSpecCatalogEntry | undefined {
  return ISO4014_CATALOG.entries.find(entry => entry.key === specKey);
}
