/**
 * 型材库与设计器之间的数据契约 Schema
 *
 * 定义铝型材截面的标准化数据格式，确保：
 * 1. 型材库能够明确描述截面几何
 * 2. 设计器能够准确渲染和计算
 * 3. 消除解析歧义（不依赖路径顺序）
 * 4. 支持向后兼容和未来扩展
 *
 * @module ProfileCrossSectionContract
 * @version 2.0
 * @since 2025-12-14
 */

// ============================================================================
// 核心数据契约
// ============================================================================

/**
 * 归一化的截面几何数据（契约核心）
 *
 * 职责：
 * - 明确区分主轮廓和孔洞，去除解析歧义
 * - 提供完整的尺寸和元数据
 * - 支持追溯和审计
 *
 * 使用场景：
 * - 型材库：保存用户标注的截面数据
 * - 设计器：读取并渲染为 3D 几何体
 * - 导出：生成 CAD 文件时的截面参考
 */
export interface NormalizedCrossSection {
  /**
   * 主轮廓路径（必须唯一）
   *
   * 格式：SVG path data (M...Z 闭合路径)
   * 约定：
   * - 必须是闭合路径（以 Z 结束）
   * - 坐标单位：mm
   * - 原点：根据 dimensions.origin 确定
   * - **路径方向：逆时针 (CCW)**（Three.js ExtrudeGeometry 标准）
   *   - 确保法向量向外
   *   - 面积计算为正值
   *
   * @example "M0,0 L20,0 L20,20 L0,20 Z"  // 逆时针绘制
   */
  outerPath: string;

  /**
   * 孔洞路径列表（可有多个）
   *
   * 格式：SVG path data 数组
   * 约定：
   * - 每个孔洞必须是闭合路径
   * - 坐标系与 outerPath 一致
   * - 孔洞必须完全位于 outerPath 内部（验证时检查）
   * - **路径方向：顺时针 (CW)**（与外轮廓相反）
   *   - 确保孔洞法向量向内
   *   - 与 outerPath 方向相反以正确挖空
   *
   * @example ["M8,8 L8,12 L12,12 L12,8 Z"]  // 顺时针绘制（与外轮廓相反）
   */
  holes: string[];

  /**
   * 截面尺寸元数据
   *
   * 职责：
   * - 提供标称尺寸（如 2020 型材的 20x20mm）
   * - 定义坐标系原点位置
   * - 支持快速边界检查（无需解析路径）
   */
  dimensions: CrossSectionDimensions;

  /**
   * 几何属性（用于结构计算）
   *
   * 职责：
   * - 提供力学计算所需参数
   * - 支持 FEA 分析
   *
   * 注意：可选字段，不影响渲染
   */
  geometricProperties?: GeometricProperties;

  /**
   * 标注信息（用于追溯和审计）
   *
   * 职责：
   * - 记录数据来源和处理过程
   * - 支持版本管理和质量追溯
   */
  annotation?: AnnotationMetadata;
}

/**
 * 截面尺寸定义
 */
export interface CrossSectionDimensions {
  /**
   * 截面标称宽度 (mm)
   *
   * 定义：沿 X 轴方向的最大尺寸
   * 用途：
   * - 型材规格命名（如 2020 的第一个 20）
   * - SVG 自动缩放的目标尺寸
   * - 快速碰撞检测的包围盒
   */
  width: number;

  /**
   * 截面标称高度 (mm)
   *
   * 定义：沿 Y 轴方向的最大尺寸
   * 用途：同 width
   */
  height: number;

  /**
   * 壁厚 (mm)
   *
   * 定义：型材最小壁厚
   * 用途：
   * - 结构强度估算
   * - 加工工艺参数
   *
   * @example 1.5  // 2020 型材典型壁厚
   */
  wallThickness: number;

  /**
   * 坐标系原点定义
   *
   * 约定：
   * - type='center': 原点在截面几何中心（对称型材）
   * - type='corner': 原点在左下角 (minX, minY)
   * - type='custom': 原点由 customOffset 指定
   *
   * 默认：center（适用于大多数标准型材）
   */
  origin: OriginDefinition;
}

/**
 * 原点定义
 */
export type OriginDefinition =
  | { type: 'center' }
  | { type: 'corner' }
  | {
      type: 'custom';
      /** 相对于边界框左下角的偏移 (mm) */
      customOffset: { x: number; y: number };
    };

/**
 * 几何属性（用于结构计算）
 */
export interface GeometricProperties {
  /**
   * 截面面积 (mm²)
   *
   * 定义：outerPath 面积 - 所有 holes 面积之和
   * 用途：
   * - 质量计算（质量 = 面积 × 长度 × 密度）
   * - 应力计算（应力 = 力 / 面积）
   */
  area: number;

  /**
   * 惯性矩 (mm⁴)
   *
   * 定义：截面对主轴的二阶矩
   * 用途：
   * - 弯曲刚度计算
   * - 梁单元 FEA 分析
   */
  momentOfInertia: {
    /** 绕 X 轴的惯性矩 */
    Ix: number;
    /** 绕 Y 轴的惯性矩 */
    Iy: number;
    /** 极惯性矩（可选） */
    Ip?: number;
  };

  /**
   * 截面模量 (mm³)
   *
   * 定义：惯性矩 / 距中性轴最远距离
   * 用途：抗弯强度计算
   */
  sectionModulus?: {
    Wx: number;
    Wy: number;
  };

  /**
   * 质心位置 (mm)
   *
   * 定义：相对于原点的质心坐标
   * 用途：
   * - 计算物体重心
   * - 转动惯量计算
   *
   * 注意：对于对称型材，质心通常在原点
   */
  centroid?: {
    x: number;
    y: number;
  };
}

/**
 * 标注信息（用于追溯）
 */
export interface AnnotationMetadata {
  /**
   * 原始文件名
   *
   * @example "2020.svg"
   */
  originalFileName?: string;

  /**
   * 标注者
   *
   * - 系统预置：'system'
   * - 用户标注：用户名或 ID
   * - 自动检测：'auto-classifier'
   */
  annotatedBy: string;

  /**
   * 标注时间（ISO 8601 格式）
   *
   * @example "2025-12-14T10:30:00Z"
   */
  annotatedAt: string;

  /**
   * 是否由自动检测生成（未来扩展）
   *
   * true: 自动算法分类
   * false: 人工标注
   */
  autoDetected?: boolean;

  /**
   * 自动检测置信度（0-1，未来扩展）
   *
   * 仅当 autoDetected=true 时有效
   * - > 0.9: 高置信度，可直接使用
   * - 0.5-0.9: 中置信度，建议人工审核
   * - < 0.5: 低置信度，必须人工标注
   */
  confidence?: number;

  /**
   * 数据版本号
   *
   * 格式：语义化版本（semver）
   * 用途：处理数据格式升级和迁移
   *
   * @example "2.0.0"
   */
  schemaVersion?: string;

  /**
   * 备注
   */
  notes?: string;
}

// ============================================================================
// Asset 层契约（型材库）
// ============================================================================

/**
 * 铝型材 Asset（型材库中的数据格式）
 *
 * 职责：
 * - 存储型材的完整信息（几何、材料、参数）
 * - 提供给设计器创建 SceneObject
 *
 * 数据流：
 * Library (ProfileAsset) → Designer (SceneObject)
 */
export interface ProfileAsset {
  // -------- 基础信息 --------
  /** 唯一标识符 */
  id: string;

  /** 型材名称 */
  name: string;

  /** 型材系列 */
  series: string;

  /** 描述信息 */
  description?: string;

  /** 缩略图 URL */
  thumbnailUrl?: string;

  // -------- 几何数据（契约核心） --------
  /**
   * 截面几何（归一化格式）
   *
   * 这是型材库与设计器之间的核心契约
   */
  crossSection: NormalizedCrossSection;

  // -------- 材料属性 --------
  /**
   * 材料信息
   */
  material: MaterialProperties;

  // -------- 参数定义 --------
  /**
   * 长度参数约束
   */
  lengthConstraints: {
    /** 最小长度 (mm) */
    min: number;
    /** 最大长度 (mm) */
    max: number;
    /** 默认长度 (mm) */
    default: number;
    /** 步长 (mm)，用于 UI 滑块 */
    step?: number;
  };

  /**
   * 支持的加工操作类型
   *
   * @example ['drilling', 'cutting', 'tapping']
   */
  supportedOperations?: string[];

  // -------- 元数据 --------
  metadata?: {
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
    /** 标签（用于搜索和分类） */
    tags?: string[];
    /** 自定义数据 */
    [key: string]: unknown;
  };
}

/**
 * 材料属性
 */
export interface MaterialProperties {
  /** 材料牌号 */
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

  /** 颜色（用于渲染） */
  color?: string;
}

// ============================================================================
// SceneObject 层契约（设计器）
// ============================================================================

/**
 * 场景对象的截面引用（设计器中的数据格式）
 *
 * 职责：
 * - 引用 ProfileAsset 的截面数据
 * - 记录实例化参数（长度、加工操作等）
 *
 * 数据流：
 * ProfileAsset → SceneObject.crossSectionRef
 */
export interface CrossSectionReference {
  /**
   * 引用的 ProfileAsset ID
   *
   * 用途：
   * - 反查型材库获取完整截面数据
   * - 支持截面数据的延迟加载
   */
  assetId: string;

  /**
   * 实例化参数
   *
   * 职责：
   * - 记录用户设置的具体参数
   * - 用于生成实际几何体
   */
  instanceParams: {
    /** 型材长度 (mm) */
    length: number;

    /** 加工操作列表 */
    machiningOps?: MachiningOperation[];
  };

  /**
   * 缓存的截面数据（可选）
   *
   * 用途：
   * - 性能优化：避免频繁查询 Asset
   * - 离线模式：支持断网渲染
   *
   * 注意：
   * - 必须与 assetId 指向的数据一致
   * - 更新 Asset 时需要同步更新
   */
  cachedCrossSection?: NormalizedCrossSection;
}

/**
 * 加工操作（未来扩展）
 */
export interface MachiningOperation {
  type: 'drilling' | 'cutting' | 'tapping' | 'milling';
  position: { x: number; y: number; z: number };
  parameters: Record<string, unknown>;
}

// ============================================================================
// 验证和工具接口
// ============================================================================

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;

  /** 错误列表 */
  errors: ValidationError[];

  /** 警告列表 */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * 契约验证器接口
 *
 * 职责：
 * - 验证数据格式的正确性
 * - 检查几何约束
 * - 提供错误诊断
 */
export interface CrossSectionValidator {
  /**
   * 验证归一化截面数据
   *
   * 检查项：
   * - outerPath 和 holes 必须是闭合路径
   * - 孔洞必须在外轮廓内部
   * - 尺寸必须为正数
   * - 坐标系原点定义合法
   */
  validateNormalizedCrossSection(
    data: NormalizedCrossSection
  ): ValidationResult;

  /**
   * 验证 ProfileAsset
   *
   * 检查项：
   * - crossSection 通过 validateNormalizedCrossSection
   * - lengthConstraints.min < max
   * - material 属性完整
   */
  validateProfileAsset(asset: ProfileAsset): ValidationResult;

  /**
   * 验证截面引用
   *
   * 检查项：
   * - assetId 存在于型材库
   * - instanceParams.length 在允许范围内
   * - cachedCrossSection 与 Asset 一致（如果存在）
   */
  validateCrossSectionReference(
    ref: CrossSectionReference,
    assetRegistry?: Map<string, ProfileAsset>
  ): ValidationResult;
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 核心契约
  NormalizedCrossSection,
  CrossSectionDimensions,
  OriginDefinition,
  GeometricProperties,
  AnnotationMetadata,

  // Asset 层
  ProfileAsset,
  MaterialProperties,

  // SceneObject 层
  CrossSectionReference,
  MachiningOperation,

  // 验证
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CrossSectionValidator,
};

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 创建一个预置的 2020 型材 Asset
 */
export const example2020ProfileAsset: ProfileAsset = {
  id: 'profile-2020',
  name: '2020',
  series: '20-series',
  description: '20x20mm 标准铝型材',

  crossSection: {
    outerPath: 'M0,-10 L10,-10 L10,10 L-10,10 L-10,-10 L0,-10 Z', // 简化示例
    holes: ['M-3,-3 L3,-3 L3,3 L-3,3 Z'], // 中心方孔
    dimensions: {
      width: 20,
      height: 20,
      wallThickness: 1.5,
      origin: { type: 'center' },
    },
    geometricProperties: {
      area: 360, // mm²
      momentOfInertia: {
        Ix: 12000,
        Iy: 12000,
      },
    },
    annotation: {
      annotatedBy: 'system',
      annotatedAt: '2025-12-14T00:00:00Z',
      autoDetected: false,
      schemaVersion: '2.0.0',
    },
  },

  material: {
    name: '6063-T5',
    yieldStrength: 160,
    density: 2700,
    elasticModulus: 69000,
    poissonRatio: 0.33,
    color: '#C0C0C0',
  },

  lengthConstraints: {
    min: 100,
    max: 3000,
    default: 500,
    step: 50,
  },

  supportedOperations: ['drilling', 'cutting', 'tapping'],

  metadata: {
    createdAt: '2025-12-14T00:00:00Z',
    updatedAt: '2025-12-14T00:00:00Z',
    tags: ['standard', 'symmetric', '20-series'],
  },
};

/**
 * 示例 2: 在设计器中创建场景对象时的截面引用
 */
export const exampleCrossSectionReference: CrossSectionReference = {
  assetId: 'profile-2020',

  instanceParams: {
    length: 800, // 用户设置的长度
    machiningOps: [
      {
        type: 'drilling',
        position: { x: 0, y: 0, z: 100 },
        parameters: { diameter: 5 },
      },
    ],
  },

  // 可选：缓存截面数据以提高性能
  cachedCrossSection: example2020ProfileAsset.crossSection,
};
