/**
 * 紧固件资产类型定义
 *
 * 按照双模型体系设计：
 * - Visual: 简化 primitives（杆体 + 头部 + 驱动凹槽）
 * - Functional: 精确的螺纹规格、夹紧参数、头部包络
 */

import type { Asset, AssetType } from './asset';
import type { Vector3, Euler } from '@/types';
import type { ThreadSpec } from './connector';

/**
 * 紧固件类型枚举
 */
export const FastenerType = {
  /** 螺栓 */
  BOLT: 'bolt',
  /** 螺母 */
  NUT: 'nut',
  /** 螺钉 */
  SCREW: 'screw',
  /** T 型螺母 */
  T_NUT: 't-nut',
  /** 垫片 */
  WASHER: 'washer',
} as const;

export type FastenerType = (typeof FastenerType)[keyof typeof FastenerType];

/**
 * 头部类型
 */
export const HeadType = {
  /** 六角头 */
  HEX: 'hex',
  /** 内六角 */
  SOCKET: 'socket',
  /** 一字槽 */
  SLOTTED: 'slotted',
  /** 十字槽 */
  PHILLIPS: 'phillips',
  /** 梅花槽 */
  TORX: 'torx',
  /** 沉头 */
  COUNTERSUNK: 'countersunk',
  /** 平头 */
  FLAT: 'flat',
} as const;

export type HeadType = (typeof HeadType)[keyof typeof HeadType];

/**
 * 驱动方式
 */
export const DriveType = {
  /** 六角扳手 */
  HEX: 'hex',
  /** 一字螺丝刀 */
  SLOT: 'slot',
  /** 十字螺丝刀 */
  CROSS: 'cross',
  /** 梅花螺丝刀 */
  TORX: 'torx',
  /** 外六角扳手 */
  WRENCH: 'wrench',
} as const;

export type DriveType = (typeof DriveType)[keyof typeof DriveType];

/**
 * 紧固件规格目录条目
 *
 * 来自标准规范（ISO/DIN/ANSI 等），记录所有静态几何尺寸
 */
export interface FastenerSpecCatalogEntry {
  /** 唯一键，格式：标准-尺寸-材质，如 "ISO4014-M5x20-8.8" */
  key: string;

  /** 标准（如 "ISO4014", "DIN933" 等） */
  standard: string;

  /** 尺寸代码（如 "M5", "M6" 等） */
  sizeCode: string;

  /** 长度 (mm) */
  length: number;

  /** 头部类型 */
  headType: HeadType;

  /** 头部宽度（对边距或直径，mm） */
  headWidth: number;

  /** 头部高度 (mm) */
  headHeight: number;

  /** 杆径 (mm) */
  shankDiameter: number;

  /** 螺纹螺距 (mm) */
  threadPitch: number;

  /** 螺纹有效长度 (mm) */
  threadLength: number;

  /** 驱动方式 */
  driveType?: DriveType;

  /** 公差 */
  tolerance: {
    length: number;
    diameter: number;
  };

  /** 材质等级（如 "8.8", "10.9" 等） */
  gradeClass?: string;
}

/**
 * 几何原语描述符（用于 visual 层）
 */
export interface FastenerPrimitiveDescriptor {
  /** 原语类型 */
  type: 'cylinder' | 'box' | 'cone' | 'hexPrism';
  /** 局部位置（相对紧固件轴线，mm） */
  position: Vector3;
  /** 局部旋转 */
  rotation?: Euler;
  /** 尺寸参数 */
  dimensions: {
    radius?: number;
    height?: number;
    width?: number;
    depth?: number;
    sides?: number; // 用于棱柱
  };
  /** 材质提示 */
  materialHint?: {
    color?: string;
    metalness?: number;
    roughness?: number;
  };
}

/**
 * 紧固件视觉模型
 */
export interface FastenerVisualModel {
  /** 视觉表现类型 */
  type: 'simplified';
  /** 简化 primitives（杆体、头部、驱动凹槽等） */
  primitives: FastenerPrimitiveDescriptor[];
}

/**
 * 扭矩推荐值
 */
export interface TorqueRecommendation {
  /** 材质等级 */
  gradeClass: string;
  /** 推荐扭矩 (N·m) */
  torque: number;
  /** 扭矩范围 */
  range?: {
    min: number;
    max: number;
  };
}

/**
 * 紧固件功能数据
 */
export interface FastenerFunctionalData {
  /** 螺纹规格 */
  threadSpec: ThreadSpec;

  /** 紧固件总长度 (mm) */
  length: number;

  /** 头部高度 (mm) */
  headHeight: number;

  /** 头部宽度（对边距或直径，mm） */
  headWidth: number;

  /** 通孔直径 (mm) - 用于配合检查 */
  passThroughDiameter: number;

  /** 有效啮合深度 (mm) - 最小螺纹啮合长度 */
  engagementDepth: number;

  /** 可用夹紧长度区间 (mm) */
  clampRange: [number, number];

  /** 扭矩推荐值 */
  torqueRecommendations?: TorqueRecommendation[];

  /** 头部包络体积（用于干涉检测） */
  headClearanceVolume?: {
    /** 包络类型 */
    type: 'cylinder' | 'hexPrism' | 'box';
    /** 包络半径或宽度 (mm) */
    size: number;
    /** 包络高度 (mm) */
    height: number;
  };

  /** 螺纹轴线（局部坐标，单位向量） */
  threadAxis?: Vector3;

  /** 材料属性 */
  material?: {
    name: string;
    gradeClass: string;
    tensileStrength?: number; // MPa
  };
}

/**
 * 紧固件资产（新版本，符合双模型体系）
 */
export interface FastenerAssetV2 extends Asset {
  type: typeof AssetType.FASTENER;

  /** 紧固件具体类型 */
  fastenerType: FastenerType;

  /** 规格目录键（引用 FastenerSpecCatalogEntry） */
  specKey: string;

  /** 材质 */
  material: string;

  /** 表面处理（如 "zinc", "black-oxide" 等） */
  finish?: string;

  /** 兼容的型材系列 */
  compatibleProfiles?: string[];

  /** 推荐配合的连接件族 */
  recommendedConnectorFamilies?: string[];

  /** 视觉模型 */
  visual: FastenerVisualModel;

  /** 功能数据 */
  functional: FastenerFunctionalData;

  /** 元数据 */
  metadata?: {
    manufacturer?: string;
    partNumber?: string;
    dataSheetUrl?: string;
    tags?: string[];
  };
}

/**
 * 紧固件规格目录
 *
 * 按标准组织的静态规格数据
 */
export interface FastenerSpecCatalog {
  /** 标准名称 */
  standard: string;
  /** 条目列表 */
  entries: FastenerSpecCatalogEntry[];
}
