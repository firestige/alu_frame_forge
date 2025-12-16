/**
 * 2020 系列 L 型角件 STUB 资产
 * 
 * 🔴 STUB DATA - 精度 ±2mm，仅用于验证双模型体系
 * 
 * 参考数据：
 * - 80/20 #4112 角件（近似）
 * - 材质：铝合金 6063-T5
 * - 尺寸：40mm × 40mm × 5mm
 * - 孔位：M5 螺纹孔 + 紧固件通孔
 */

import type { ConnectorAssetV2 } from '@/core/asset/types';
import { AssetType, AssetSource } from '@/core/asset/types';

export const connectorLBracket2020: ConnectorAssetV2 = {
  id: 'connector.l_bracket.2020',
  name: 'L型角件 2020',
  type: AssetType.CONNECTOR,
  source: AssetSource.BUILTIN,
  description: '2020系列L型角件，40×40×5mm，铝合金，用于90度直角连接',
  
  connectorType: 'l-bracket',
  compatibleSeries: ['2020'],
  recommendedFasteners: ['ISO4014-M5x16-8.8', 'ISO4014-M5x20-8.8'],
  
  // Visual: 简化 primitives（两个矩形板）
  visual: {
    type: 'simplified',
    primitives: [
      // 水平板
      {
        type: 'box',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        dimensions: {
          width: 40,
          height: 5,
          depth: 40,
        },
        materialHint: {
          color: '#B0B0B0',
          metalness: 0.7,
          roughness: 0.4,
        },
      },
      // 垂直板
      {
        type: 'box',
        position: { x: 0, y: 20, z: -20 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        dimensions: {
          width: 40,
          height: 40,
          depth: 5,
        },
        materialHint: {
          color: '#B0B0B0',
          metalness: 0.7,
          roughness: 0.4,
        },
      },
    ],
  },
  
  // Functional: 精确的孔位、接触面、质量等
  functional: {
    // 接触面定义（用于面面约束）
    contactFaces: [
      // 水平板底面（与型材端面接触）
      {
        id: 'face-horizontal-bottom',
        normal: { x: 0, y: -1, z: 0 },
        origin: { x: 0, y: -2.5, z: 0 },
        width: 40,
        height: 40,
        matingRule: 'mate:profile-end',
        surfaceType: 'plane',
      },
      // 垂直板后面（与型材端面接触）
      {
        id: 'face-vertical-back',
        normal: { x: 0, y: 0, z: -1 },
        origin: { x: 0, y: 20, z: -22.5 },
        width: 40,
        height: 40,
        matingRule: 'mate:profile-end',
        surfaceType: 'plane',
      },
    ],
    
    // 孔定义
    holes: [
      // 水平板孔（型材附着）- M5 螺纹孔
      {
        id: 'hole-h1',
        role: 'threaded',
        localPosition: { x: -10, y: 0, z: 10 },
        axis: { x: 0, y: 1, z: 0 },
        diameter: 5,
        depth: -1, // 通孔
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
          toleranceClass: '6H', // 内螺纹公差
          threadType: 'coarse',
        },
        matingHints: ['fastener:M5'],
      },
      {
        id: 'hole-h2',
        role: 'threaded',
        localPosition: { x: 10, y: 0, z: 10 },
        axis: { x: 0, y: 1, z: 0 },
        diameter: 5,
        depth: -1,
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
          toleranceClass: '6H',
          threadType: 'coarse',
        },
        matingHints: ['fastener:M5'],
      },
      
      // 垂直板孔（型材附着）- M5 螺纹孔
      {
        id: 'hole-v1',
        role: 'threaded',
        localPosition: { x: -10, y: 10, z: -20 },
        axis: { x: 0, y: 0, z: -1 },
        diameter: 5,
        depth: -1,
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
          toleranceClass: '6H',
          threadType: 'coarse',
        },
        matingHints: ['fastener:M5'],
      },
      {
        id: 'hole-v2',
        role: 'threaded',
        localPosition: { x: 10, y: 10, z: -20 },
        axis: { x: 0, y: 0, z: -1 },
        diameter: 5,
        depth: -1,
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
          toleranceClass: '6H',
          threadType: 'coarse',
        },
        matingHints: ['fastener:M5'],
      },
      
      // 紧固件通孔（用于连接两个板）
      {
        id: 'hole-corner-1',
        role: 'fastener-pass-through',
        localPosition: { x: -10, y: 10, z: 10 },
        axis: { x: 0, y: 1, z: 0 },
        diameter: 5.5, // 留出间隙
        depth: -1,
        matingHints: ['fastener:M5:pass-through'],
      },
      {
        id: 'hole-corner-2',
        role: 'fastener-pass-through',
        localPosition: { x: 10, y: 10, z: 10 },
        axis: { x: 0, y: 1, z: 0 },
        diameter: 5.5,
        depth: -1,
        matingHints: ['fastener:M5:pass-through'],
      },
    ],
    
    // 质量（估算）
    mass: 0.05, // kg (50g)
    
    // 质心位置（近似中心）
    centerOfMass: { x: 0, y: 10, z: -10 },
    
    // 材料属性
    material: {
      name: 'Aluminum 6063-T5',
      density: 2700, // kg/m³
      yieldStrength: 145, // MPa
    },
  },
  
  metadata: {
    manufacturer: 'Generic',
    partNumber: 'L-BRACKET-2020',
    tags: ['l-bracket', '2020-series', 'corner', 'aluminum'],
  },
};
