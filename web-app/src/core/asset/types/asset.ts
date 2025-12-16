import type { AssetType, AssetSource, MachiningOpType } from './enums';
import type { NormalizedCrossSection } from '../contract/ProfileCrossSectionContract';
import type { ConnectorAssetV2 } from './connector';
import type { FastenerAssetV2 } from './fastener';

/**
 * 素材基础接口
 * 所有素材类型的共同属性
 */
export interface Asset {
  /** 唯一标识符 */
  id: string;
  /** 素材名称 */
  name: string;
  /** 素材类型 */
  type: AssetType;
  /** 素材来源（内置/自定义） */
  source: AssetSource;
  /** 描述信息 */
  description?: string;
  /** 缩略图 URL */
  thumbnailUrl?: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 材料属性
 * 铝型材的物理和力学性能参数
 */
export interface MaterialProperties {
  /** 材料牌号，如 "6063-T5" */
  name: string;
  /** 屈服强度 (MPa) */
  yieldStrength: number;
  /** 密度 (kg/m³) */
  density: number;
  /** 弹性模量 (MPa) */
  elasticModulus: number;
  /** 泊松比 */
  poissonRatio?: number;
  /** 热膨胀系数 (1/°C) */
  thermalExpansion?: number;
}

/**
 * 铝型材素材
 * 通过截面拉伸生成，支持加工操作
 */
export interface ProfileAsset extends Asset {
  type: typeof AssetType.PROFILE;

  /** 系列标识（20系列、30系列等） */
  series: string;

  /** 截面数据（使用标准化契约格式） */
  crossSection: NormalizedCrossSection;

  /** 材料属性 */
  material: MaterialProperties;

  /** 长度约束 */
  lengthConstraints: {
    /** 最小长度 (mm) */
    min: number;
    /** 最大长度 (mm) */
    max: number;
    /** 默认长度 (mm) */
    default: number;
    /** 长度步进 (mm) */
    step: number;
  };

  /** 支持的加工操作类型 */
  supportedOperations: MachiningOpType[];

  /** 元数据 */
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}

/**
 * 配件素材
 * 简单的静态模型，如封板、脚垫等
 */
export interface AccessoryAsset extends Asset {
  type: typeof AssetType.ACCESSORY;
  /** 3D 模型文件路径 */
  modelPath: string;
  /** 尺寸信息 */
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

/**
 * 素材联合类型
 * 包含所有素材类型
 */
export type AnyAsset =
  | ProfileAsset
  | FastenerAssetV2
  | ConnectorAssetV2
  | AccessoryAsset;
