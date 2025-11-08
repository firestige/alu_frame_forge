// 重新导出核心类型
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

// 重新导出主类
export { ObjectManager } from './ObjectManager';

// 重新导出子模块（按需导出）
export { AssetRegistry } from './AssetRegistry';
export { ModelRepository } from './ModelRepository';
export { ModelFactory } from './ModelFactory';
export { ModelOperations } from './ModelOperations';
export { ConstraintManager } from './ConstraintManager';
export { SceneIO } from './SceneIO';
