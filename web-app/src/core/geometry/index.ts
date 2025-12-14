/**
 * 几何抽象层模块
 *
 * 提供与渲染器无关的几何定义和操作
 *
 * @module core/geometry
 */

// 类型定义
export type {
  ICurve,
  IShape,
  MachiningOperation,
  GeometryDescriptor,
  MaterialProperties,
} from './types';

export { CurveType, MachiningOperationType } from './types';

// SVG 路径解析器
export { SVGPathParser } from './SVGPathParser';
