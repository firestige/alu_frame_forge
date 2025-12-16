/**
 * ISO4014 M5×20 六角头螺栓 STUB 资产
 * 
 * 🔴 STUB DATA - 精度 ±2mm，仅用于验证双模型体系
 * 
 * 参考数据：
 * - ISO 4014 标准
 * - 材质：8.8 级钢
 * - 表面处理：镀锌
 */

import type { FastenerAssetV2 } from '@/core/asset/types';
import { AssetType, AssetSource } from '@/core/asset/types';
import { getISO4014Spec } from './catalog/iso4014';

const specKey = 'ISO4014-M5x20-8.8';
const catalogEntry = getISO4014Spec(specKey);

if (!catalogEntry) {
  throw new Error(`Catalog entry not found: ${specKey}`);
}

export const fastenerISO4014M5x20: FastenerAssetV2 = {
  id: 'fastener.iso4014.m5x20',
  name: 'ISO4014 六角头螺栓 M5×20',
  type: AssetType.FASTENER,
  source: AssetSource.BUILTIN,
  description: 'ISO4014 全螺纹六角头螺栓，M5×20mm，8.8级钢，镀锌',
  
  fastenerType: 'bolt',
  specKey,
  material: 'steel-8.8',
  finish: 'zinc',
  
  compatibleProfiles: ['2020', '3030', '4040'],
  
  // Visual: 简化 primitives（杆体圆柱 + 六角头棱柱）
  visual: {
    type: 'simplified',
    primitives: [
      // 杆体（圆柱）
      {
        type: 'cylinder',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        dimensions: {
          radius: catalogEntry.shankDiameter / 2,
          height: catalogEntry.length,
        },
        materialHint: {
          color: '#C0C0C0',
          metalness: 0.9,
          roughness: 0.3,
        },
      },
      // 六角头（棱柱）
      {
        type: 'hexPrism',
        position: { x: 0, y: 0, z: catalogEntry.length },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        dimensions: {
          radius: catalogEntry.headWidth / 2,
          height: catalogEntry.headHeight,
          sides: 6,
        },
        materialHint: {
          color: '#C0C0C0',
          metalness: 0.9,
          roughness: 0.3,
        },
      },
    ],
  },
  
  // Functional: 精确的螺纹规格、夹紧参数等
  functional: {
    threadSpec: {
      standard: 'ISO',
      designation: catalogEntry.sizeCode,
      pitch: catalogEntry.threadPitch,
      toleranceClass: '6g', // 外螺纹公差
      threadType: 'coarse',
    },
    
    length: catalogEntry.length,
    headHeight: catalogEntry.headHeight,
    headWidth: catalogEntry.headWidth,
    
    // 通孔直径（留出间隙）
    passThroughDiameter: catalogEntry.shankDiameter + 0.5,
    
    // 有效啮合深度（最小螺纹啮合长度）
    engagementDepth: 5, // 经验值：约 1d (d=5mm)
    
    // 可用夹紧长度区间 [min, max]
    // 考虑头部高度和最小啮合深度
    clampRange: [0, catalogEntry.length - catalogEntry.headHeight - 5],
    
    // 扭矩推荐值（8.8 级 M5）
    torqueRecommendations: [
      {
        gradeClass: '8.8',
        torque: 5.5, // N·m
        range: {
          min: 4.5,
          max: 6.5,
        },
      },
    ],
    
    // 头部包络体积（用于干涉检测）
    headClearanceVolume: {
      type: 'hexPrism',
      size: catalogEntry.headWidth + 2, // 留出扳手操作空间
      height: catalogEntry.headHeight + 1,
    },
    
    // 螺纹轴线（局部坐标，沿 Z 轴正向）
    threadAxis: { x: 0, y: 0, z: 1 },
    
    // 材料属性
    material: {
      name: 'Steel 8.8',
      gradeClass: '8.8',
      tensileStrength: 800, // MPa
    },
  },
  
  metadata: {
    manufacturer: 'Generic',
    partNumber: 'ISO4014-M5x20-8.8',
    dataSheetUrl: 'https://www.iso.org/standard/1234.html',
    tags: ['bolt', 'hex-head', 'full-thread', '8.8-grade'],
  },
};
