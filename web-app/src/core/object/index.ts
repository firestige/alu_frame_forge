/**
 * 对象管理系统统一导出（SceneObject 新架构）
 */

// ==================== 类型导出 ====================

// 导出所有类型（从 types/ 目录）
export type * from './types';

// 导出枚举（作为值）
export { AssetType, AssetSource, MachiningOpType } from './types/enums';

// ==================== 核心类导出 ====================

// 对象管理器
export { ObjectManager } from './ObjectManager';

// 资产注册表
export { AssetRegistry } from './AssetRegistry';

// 模型工厂
export { ModelFactory } from './ModelFactory';

// 场景 I/O
export { ProjectSerializer, CADExporter } from './SceneIO';
export type { ProjectFileFormat, CADExportFormat } from './SceneIO';
