import type { Vector3, Euler } from '../renderer/renderer-types';
import type { GeometryParams } from '../renderer';

// ==================== 基础类型定义 ====================

/**
 * 实体模型（泛型版本，支持类型安全的 metadata）
 * @template TMetadata - 元数据类型，默认为 Record<string, unknown>
 */
export interface Model<TMetadata = Record<string, unknown>> {
  id: string;
  name: string;
  type: ModelType;
  renderObject: unknown; // 渲染对象句柄（不依赖具体实现）
  isVisible: boolean;
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  // 参数化属性
  parameters: ModelParameters;
  // 元数据（泛型，支持类型安全）
  metadata: TMetadata;
  // 创建和修改时间
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 模型类型枚举
 */
export const ModelType = {
  ALUMINUM_PROFILE: 'aluminum_profile',
  CONNECTOR: 'connector',
  PANEL: 'panel',
  CUSTOM: 'custom',
} as const;

export type ModelType = (typeof ModelType)[keyof typeof ModelType];

/**
 * 模型参数
 */
export interface ModelParameters {
  // 拉伸长度（针对型材）
  length?: number;
  // 宽度
  width?: number;
  // 高度
  height?: number;
  // 厚度
  thickness?: number;
  // 自定义参数（使用 unknown 代替 any）
  [key: string]: unknown;
}

// ==================== 资产相关类型 ====================

/**
 * 素材库中的预制模型定义
 */
export interface PrebuiltAsset {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  // 默认几何体工厂函数（返回渲染无关的参数）
  createGeometry: (params: ModelParameters) => GeometryParams;
  // 默认材质配置
  defaultMaterial: 'aluminum' | 'connector' | 'panel' | 'standard';
  // 默认参数
  defaultParameters: ModelParameters;
  // 缩略图 URL
  thumbnailUrl?: string;
}

// ==================== 约束相关类型 ====================

/**
 * 约束类型枚举
 */
export const ConstraintType = {
  FIXED: 'fixed',
  ALIGN: 'align',
  DISTANCE: 'distance',
  PARALLEL: 'parallel',
  PERPENDICULAR: 'perpendicular',
} as const;

export type ConstraintType =
  (typeof ConstraintType)[keyof typeof ConstraintType];

/**
 * 约束定义
 */
export interface Constraint {
  id: string;
  type: ConstraintType;
  modelIds: string[]; // 涉及的模型 ID
  parameters: Record<string, unknown>;
  isActive: boolean;
}

// ==================== 碰撞检测类型 ====================

/**
 * 碰撞信息
 */
export interface CollisionInfo {
  modelA: string; // Model ID
  modelB: string; // Model ID
  isColliding: boolean;
  penetrationDepth?: number;
  contactPoints?: Vector3[];
}

// ==================== 场景导入导出类型 ====================

/**
 * 场景导出数据类型
 */
export interface SceneExportData<TMetadata = Record<string, unknown>> {
  models: Array<{
    id: string;
    name: string;
    type: ModelType;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    parameters: ModelParameters;
    metadata: TMetadata;
    isVisible: boolean;
  }>;
  constraints: Constraint[];
  exportedAt: string;
}

// ==================== 外部服务接口 ====================

/**
 * 碰撞检测服务接口（外部实现）
 */
export interface ICollisionDetector<TMetadata = Record<string, unknown>> {
  detectCollisions(models: Model<TMetadata>[]): CollisionInfo[];
  checkCollision(
    modelA: Model<TMetadata>,
    modelB: Model<TMetadata>
  ): CollisionInfo;
}

/**
 * 约束求解器接口（外部实现）
 */
export interface IConstraintSolver<TMetadata = Record<string, unknown>> {
  addConstraint(constraint: Constraint): void;
  removeConstraint(constraintId: string): void;
  solve(models: Model<TMetadata>[]): void;
  validateConstraint(constraint: Constraint): boolean;
}

// ==================== 事件类型定义 ====================

/**
 * 模型事件载荷
 */
export interface ModelEventPayload<TMetadata = Record<string, unknown>> {
  model: Model<TMetadata>;
}

/**
 * 模型更新事件载荷
 */
export interface ModelUpdateEventPayload<TMetadata = Record<string, unknown>> {
  modelId: string;
  model: Model<TMetadata>;
  updates: Partial<Model<TMetadata>>;
}

/**
 * 模型删除事件载荷
 */
export interface ModelDeleteEventPayload {
  modelId: string;
}

/**
 * ObjectManager 事件映射
 */
export type ObjectManagerEvents<TMetadata = Record<string, unknown>> = {
  'model:added': ModelEventPayload<TMetadata>;
  'model:updated': ModelUpdateEventPayload<TMetadata>;
  'model:removed': ModelDeleteEventPayload;
  'models:cleared': void;
};
