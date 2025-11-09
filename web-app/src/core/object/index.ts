/**
 * 对象管理系统统一导出（SceneObject 新架构）
 */

// ==================== 类型导出 ====================

// 导出场景对象相关类型（从 types/ 目录）
export type {
  SceneObject,
  SceneObjectCreateOptions,
  Transform,
} from './types/scene-object';

// ==================== 核心类导出 ====================

// 对象管理器
export { ObjectManager } from './ObjectManager';

// 模型工厂
export { ModelFactory } from './ModelFactory';

// 场景 I/O
export { ProjectSerializer, CADExporter } from './SceneIO';
export type { ProjectFileFormat, CADExportFormat } from './SceneIO';
