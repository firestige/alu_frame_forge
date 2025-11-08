// 重新导出新架构的核心类型
export type * from './types';

// 重新导出新架构的枚举（作为值）
export { AssetType, AssetSource, MachiningOpType } from './types/enums';

// 重新导出旧类型（兼容性，逐步废弃）
export type {
  Model,
  ModelParameters,
  PrebuiltAsset,
  Constraint,
  ConstraintType,
  CollisionInfo,
  SceneExportData,
  ICollisionDetector,
  IConstraintSolver,
  ObjectManagerEvents,
  ModelEventPayload,
  ModelUpdateEventPayload,
  ModelDeleteEventPayload,
  ModelType as ModelTypeValue,
} from './types';

// 重新导出常量和枚举（作为值）
export { ModelType } from './types';

// 重新导出主类（新架构）
export { ObjectManager } from './ObjectManager';
export { AssetRegistry } from './AssetRegistry';
export { ModelFactory } from './ModelFactory';

// 重新导出旧的子模块（按需导出，兼容性）
export { ModelRepository } from './ModelRepository';
export { ModelOperations } from './ModelOperations';
export { ConstraintManager } from './ConstraintManager';
export { SceneIO } from './SceneIO';
