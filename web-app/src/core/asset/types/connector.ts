/**
 * 连接件资产类型定义
 *
 * 按照双模型体系设计：
 * - Visual: 简化 primitives 用于渲染
 * - Functional: 完整的孔位、接触面、滑槽等几何数据
 */

import type { Asset, AssetType } from './asset';
import type { Vector3, Euler } from '@/types';

/**
 * 连接件类型枚举
 */
export const ConnectorType = {
  /** L 型角件 */
  L_BRACKET: 'l-bracket',
  /** 三维角码 */
  CORNER_CUBE: 'corner-cube',
  /** 端面连接块 */
  END_PLATE: 'end-plate',
  /** 滑槽连接块 */
  SLIDE_CONNECTOR: 'slide-connector',
  /** 铰链连接件 */
  HINGE: 'hinge',
} as const;

export type ConnectorType = (typeof ConnectorType)[keyof typeof ConnectorType];

/**
 * 连接件孔的角色
 */
export const ConnectorHoleRole = {
  /** 型材附着 - 用于连接型材端面或侧面 */
  PROFILE_ATTACHMENT: 'profile-attachment',
  /** 紧固件通孔 - 螺栓穿过 */
  FASTENER_PASS_THROUGH: 'fastener-pass-through',
  /** 螺纹孔 - 可直接拧入螺栓 */
  THREADED: 'threaded',
} as const;

export type ConnectorHoleRole =
  (typeof ConnectorHoleRole)[keyof typeof ConnectorHoleRole];

/**
 * 螺纹规格
 */
export interface ThreadSpec {
  /** 标准（ISO/DIN/ANSI 等） */
  standard: string;
  /** 标识（如 "M5", "M6" 等） */
  designation: string;
  /** 螺距 (mm) */
  pitch: number;
  /** 公差等级（如 "6H", "6g"） */
  toleranceClass?: string;
  /** 螺纹类型（粗牙/细牙） */
  threadType?: 'coarse' | 'fine';
}

/**
 * 连接件孔定义
 */
export interface ConnectorHole {
  /** 孔 ID */
  id: string;
  /** 孔的角色 */
  role: ConnectorHoleRole;
  /** 孔中心位置（局部坐标，mm） */
  localPosition: Vector3;
  /** 孔轴线方向（单位向量） */
  axis: Vector3;
  /** 孔直径 (mm) */
  diameter: number;
  /** 孔深度 (mm)，负值表示通孔 */
  depth: number;
  /** 螺纹规格（仅当 role=THREADED 时） */
  threadSpec?: ThreadSpec;
  /** 配合说明（用于约束生成） */
  matingHints?: string[];
}

/**
 * 接触面定义
 */
export interface ContactFace {
  /** 面 ID */
  id: string;
  /** 面法向量（单位向量，局部坐标） */
  normal: Vector3;
  /** 面基准点（局部坐标，mm） */
  origin: Vector3;
  /** 面宽度 (mm) */
  width: number;
  /** 面高度 (mm) */
  height: number;
  /** 配合规则（如 "mate:profile-end"） */
  matingRule?: string;
  /** 接触面类型（平面/柱面等） */
  surfaceType?: 'plane' | 'cylinder' | 'sphere';
}

/**
 * 滑槽通道定义
 */
export interface SlideChannel {
  /** 滑槽 ID */
  id: string;
  /** 滑槽起点（局部坐标，mm） */
  start: Vector3;
  /** 滑槽终点（局部坐标，mm） */
  end: Vector3;
  /** 滑槽宽度 (mm) */
  width: number;
  /** 滑槽深度 (mm) */
  depth: number;
  /** 滑槽方向（单位向量） */
  direction: Vector3;
}

/**
 * 几何原语描述符（用于 visual 层）
 */
export interface PrimitiveDescriptor {
  /** 原语类型 */
  type: 'box' | 'cylinder' | 'sphere' | 'plate';
  /** 局部位置（相对连接件中心，mm） */
  position: Vector3;
  /** 局部旋转 */
  rotation?: Euler;
  /** 尺寸参数 */
  dimensions: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    length?: number;
  };
  /** 材质提示 */
  materialHint?: {
    color?: string;
    metalness?: number;
    roughness?: number;
  };
}

/**
 * 连接件视觉模型
 */
export interface ConnectorVisualModel {
  /** 视觉表现类型 */
  type: 'simplified' | 'customMesh';
  /** 简化 primitives（当 type=simplified 时） */
  primitives?: PrimitiveDescriptor[];
  /** 自定义网格路径（当 type=customMesh 时） */
  meshPath?: string;
}

/**
 * 连接件功能数据
 */
export interface ConnectorFunctionalData {
  /** 接触面列表 */
  contactFaces: ContactFace[];
  /** 孔列表 */
  holes: ConnectorHole[];
  /** 滑槽列表（可选） */
  slides?: SlideChannel[];
  /** 质量 (kg) */
  mass: number;
  /** 质心位置（局部坐标，mm） */
  centerOfMass?: Vector3;
  /** 材料属性 */
  material?: {
    name: string;
    density: number;
    yieldStrength?: number;
  };
}

/**
 * 连接件资产（新版本，符合双模型体系）
 */
export interface ConnectorAssetV2 extends Asset {
  type: typeof AssetType.CONNECTOR;

  /** 连接件具体类型 */
  connectorType: ConnectorType;

  /** 兼容的型材系列（如 ["2020", "3030"]） */
  compatibleSeries: string[];

  /** 推荐使用的紧固件规格 */
  recommendedFasteners?: string[];

  /** 视觉模型 */
  visual: ConnectorVisualModel;

  /** 功能数据 */
  functional: ConnectorFunctionalData;

  /** 元数据 */
  metadata?: {
    manufacturer?: string;
    partNumber?: string;
    dataSheetUrl?: string;
    tags?: string[];
  };
}
