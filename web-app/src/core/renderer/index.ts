/**
 * 渲染器模块导出
 * 提供与渲染库无关的抽象接口和 Three.js 实现
 */

export * from './renderer-types';
export { ThreeRenderer, createThreeRenderer } from './threejs/ThreeRenderer';
export {
  GeometryFactory,
  MaterialFactory,
  MeshFactory,
  type GeometryParams,
  type MaterialConfig,
} from './threejs/GeometryFactory';
