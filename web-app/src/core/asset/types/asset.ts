import type {
  AssetType,
  AssetSource,
  FastenerFamily,
  ConnectorFamily,
  ThreadType,
  MachiningOpType,
} from './enums';
import type { ParameterDefinitions } from './parameters';
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
 * 模型变体定义
 * 用于参数化标准件的变体管理
 */
export interface ModelVariant {
  /** 变体键，通常由参数组合而成，如 "M5-coarse" */
  key: string;
  /** 基础 3D 模型文件路径（GLB/GLTF 格式） */
  baseModel: string;
  /** 可通过程序调整的参数列表 */
  adjustableParams: string[];
  /** 该变体适用的参数值 */
  parameterValues?: Record<string, unknown>;
}

/**
 * 紧固件 FEA 参数
 * 用于有限元分析的紧固件参数
 */
export interface FEAFastenerParams {
  /** 紧固件类型 */
  type: FastenerFamily;
  /** 直径规格 */
  diameter: string;
  /** 长度 (mm) */
  length: number;
  /** 螺纹类型 */
  threadType?: ThreadType;
  /** 螺纹长度 (mm) */
  threadLength?: number;
  /** 材料 */
  material: string;
  /** 预紧力 (N) - 用于装配约束 */
  preload?: number;
}

/**
 * 紧固件素材
 * 参数化标准件，使用预制模型 + 参数调整
 */
export interface FastenerAsset extends Asset {
  type: typeof AssetType.FASTENER;
  /** 紧固件族 */
  family: FastenerFamily;
  /** 参数定义（用于生成 UI 表单） */
  parameters: ParameterDefinitions;
  /** 模型变体映射 */
  variants: Record<string, ModelVariant>;
  /**
   * 参数映射函数
   * 将用户参数转换为 FEA 计算所需的参数格式
   */
  computeParamsMap: (userParams: Record<string, unknown>) => FEAFastenerParams;
}

/**
 * 连接件 FEA 参数
 * 用于有限元分析的连接件参数
 */
export interface FEAConnectorParams {
  /** 连接件类型 */
  type: ConnectorFamily;
  /** 尺寸参数 */
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  /** 材料 */
  material: string;
  /** 连接方式 */
  connectionType?: string;
}

/**
 * 连接件素材
 * 参数化标准件，类似紧固件
 */
export interface ConnectorAsset extends Asset {
  type: typeof AssetType.CONNECTOR;
  /** 连接件族 */
  family: ConnectorFamily;
  /** 参数定义 */
  parameters: ParameterDefinitions;
  /** 模型变体映射 */
  variants: Record<string, ModelVariant>;
  /**
   * 参数映射函数
   * 将用户参数转换为 FEA 计算所需的参数格式
   */
  computeParamsMap: (userParams: Record<string, unknown>) => FEAConnectorParams;
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
 *
 * 注意：FastenerAsset 和 ConnectorAsset 有新旧两个版本
 * - 旧版本（FastenerAsset/ConnectorAsset）：基于模型变体的简化实现
 * - 新版本（FastenerAssetV2/ConnectorAssetV2）：基于双模型体系的完整实现
 * 当前同时保留两个版本以支持渐进式迁移
 */
export type AnyAsset =
  | ProfileAsset
  | FastenerAsset
  | ConnectorAsset
  | FastenerAssetV2
  | ConnectorAssetV2
  | AccessoryAsset;
