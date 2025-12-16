/**
 * ISO4014 M5×16 六角头螺栓 STUB 资产
 *
 * 🔴 STUB DATA - 精度 ±2mm，仅用于验证双模型体系
 */

import type { FastenerAssetV2 } from '@/core/asset/types';
import { AssetType, AssetSource } from '@/core/asset/types';
import { getISO4014Spec } from './catalog/iso4014';

const specKey = 'ISO4014-M5x16-8.8';
const catalogEntry = getISO4014Spec(specKey);

if (!catalogEntry) {
  throw new Error(`Catalog entry not found: ${specKey}`);
}

export const fastenerISO4014M5x16: FastenerAssetV2 = {
  id: 'fastener.iso4014.m5x16',
  name: 'ISO4014 六角头螺栓 M5×16',
  type: AssetType.FASTENER,
  source: AssetSource.BUILTIN,
  description: 'ISO4014 全螺纹六角头螺栓，M5×16mm，8.8级钢，镀锌',

  fastenerType: 'bolt',
  specKey,
  material: 'steel-8.8',
  finish: 'zinc',

  compatibleProfiles: ['2020', '3030', '4040'],

  visual: {
    type: 'simplified',
    primitives: [
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

  functional: {
    threadSpec: {
      standard: 'ISO',
      designation: catalogEntry.sizeCode,
      pitch: catalogEntry.threadPitch,
      toleranceClass: '6g',
      threadType: 'coarse',
    },

    length: catalogEntry.length,
    headHeight: catalogEntry.headHeight,
    headWidth: catalogEntry.headWidth,

    passThroughDiameter: catalogEntry.shankDiameter + 0.5,
    engagementDepth: 5,
    clampRange: [0, catalogEntry.length - catalogEntry.headHeight - 5],

    torqueRecommendations: [
      {
        gradeClass: '8.8',
        torque: 5.0,
        range: {
          min: 4.0,
          max: 6.0,
        },
      },
    ],

    headClearanceVolume: {
      type: 'hexPrism',
      size: catalogEntry.headWidth + 2,
      height: catalogEntry.headHeight + 1,
    },

    threadAxis: { x: 0, y: 0, z: 1 },

    material: {
      name: 'Steel 8.8',
      gradeClass: '8.8',
      tensileStrength: 800,
    },
  },

  metadata: {
    manufacturer: 'Generic',
    partNumber: 'ISO4014-M5x16-8.8',
    dataSheetUrl: 'https://www.iso.org/standard/1234.html',
    tags: ['bolt', 'hex-head', 'full-thread', '8.8-grade'],
  },
};
