import type { AssetSource, AssetType } from '../../asset/types/enums';
import type { MachiningOperation } from './machining';
import type { MaterialProperties } from '../../asset/types/asset';

/**
 * 三维向量
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 欧拉角旋转
 */
export interface Euler {
  x: number;
  y: number;
  z: number;
  order: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
}

/**
 * 变换信息
 * 包含位置、旋转、缩放
 */
export interface Transform {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}

/**
 * 连接约束
 * 描述两个物体之间的装配关系
 */
export interface Connection {
  /** 连接类型 */
  type: 'bolted' | 'welded' | 'glued' | 'fitted';
  /** 连接的另一个对象 ID */
  targetObjectId: string;
  /** 连接点位置（相对于对象本地坐标系） */
  localPosition: Vector3;
  /** 连接参数（如螺栓预紧力） */
  parameters?: Record<string, unknown>;
}

/**
 * 计算几何 - 拉伸型材
 * 用于 FEA 的完整几何描述
 */
export interface ExtrudedProfileGeometry {
  type: 'extruded_profile';
  /** 截面 SVG 路径 */
  crossSection: string;
  /** 拉伸长度 (mm) */
  length: number;
  /** 加工操作列表 */
  machiningOps: MachiningOperation[];
  /** 材料属性 */
  material: MaterialProperties;
}

/**
 * 计算几何 - 参数化紧固件
 * 用于 FEA 的参数化描述（不需要完整几何）
 */
export interface ParametricFastenerGeometry {
  type: 'parametric_fastener';
  /** 紧固件参数 */
  params: {
    fastenerType: string;
    diameter: string;
    length: number;
    material: string;
    preload?: number;
    [key: string]: unknown;
  };
}

/**
 * 计算几何 - 参数化连接件
 */
export interface ParametricConnectorGeometry {
  type: 'parametric_connector';
  /** 连接件参数 */
  params: {
    connectorType: string;
    dimensions: {
      width: number;
      height: number;
      thickness: number;
    };
    material: string;
    [key: string]: unknown;
  };
}

/**
 * 计算几何 - 网格模型
 * 用于复杂几何的完整网格描述
 */
export interface MeshGeometry {
  type: 'mesh';
  /** 顶点数据 */
  vertices: Float32Array | number[];
  /** 面索引 */
  faces: Uint32Array | number[];
  /** 法线（可选） */
  normals?: Float32Array | number[];
  /** 体积 (mm³) */
  volume?: number;
  /** 质心 */
  centerOfMass?: Vector3;
}

/**
 * 计算几何联合类型
 */
export type ComputeGeometry =
  | ExtrudedProfileGeometry
  | ParametricFastenerGeometry
  | ParametricConnectorGeometry
  | MeshGeometry;

/**
 * 视觉模型
 * 用于渲染的简化表示
 */
export interface VisualModel {
  /** Three.js 网格对象引用 */
  mesh: unknown;
  /** 是否可见 */
  isVisible: boolean;
  /** LOD 级别（可选，用于性能优化） */
  lodLevel?: number;
}

/**
 * 计算模型
 * 用于 FEA 和干涉检测的完整表示
 */
export interface ComputeModel {
  /** 几何描述 */
  geometry: ComputeGeometry;
  /** 材料属性（型材专用） */
  material?: MaterialProperties;
  /** 连接关系 */
  connections: Connection[];
  /** 质量 (kg) */
  mass?: number;
}

/**
 * 场景对象
 * 场景中的实际实例，替代原有的 Model 类型
 * 采用双模型系统：渲染用简化模型 + 计算用完整模型
 */
export interface SceneObject {
  /** 唯一标识符 */
  id: string;
  /** 对象名称 */
  name: string;
  /** 关联的素材 ID */
  assetId: string;
  /** 素材来源 */
  assetSource: AssetSource;
  /** 素材类型（冗余存储，便于类型判断） */
  assetType: AssetType;

  /** 变换信息 */
  transform: Transform;

  /**
   * 用户参数
   * 对于型材：{ length: 1000 }
   * 对于紧固件：{ diameter: "M5", length: 20, threadType: "coarse" }
   */
  userParams: Record<string, unknown>;

  /**
   * 加工操作（仅对型材有效）
   * 其他类型保持空数组
   */
  machiningOps: MachiningOperation[];

  /** 视觉模型（用于渲染） */
  visual: VisualModel;

  /** 计算模型（用于 FEA 和干涉检测） */
  compute: ComputeModel;

  /** 元数据 */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    /** 自定义数据 */
    [key: string]: unknown;
  };
}

/**
 * 场景对象创建选项
 */
export interface SceneObjectCreateOptions {
  name?: string;
  transform?: Partial<Transform>;
  userParams: Record<string, unknown>;
  machiningOps?: MachiningOperation[];
}
