/**
 * 几何抽象层类型定义
 *
 * 本模块提供与渲染器无关的几何抽象接口
 * 目的：解耦业务逻辑与具体渲染库（Three.js/Babylon.js）
 *
 * @module core/geometry
 */

import type { Vector2, Vector3 } from '@/types';

/**
 * 曲线类型枚举
 */
export enum CurveType {
  LINE = 'line',
  QUADRATIC_BEZIER = 'quadratic-bezier',
  CUBIC_BEZIER = 'cubic-bezier',
  ARC = 'arc',
}

/**
 * 抽象曲线接口
 *
 * 表示 2D 平面上的一条曲线段
 */
export interface ICurve {
  /** 曲线类型 */
  type: CurveType;

  /** 起点 */
  start: Vector2;

  /** 终点 */
  end: Vector2;

  /** 控制点（贝塞尔曲线使用） */
  controlPoints?: Vector2[];

  /** 圆弧参数（仅 ARC 类型使用） */
  arcParams?: {
    center: Vector2;
    radius: number;
    startAngle: number;
    endAngle: number;
    clockwise: boolean;
  };
}

/**
 * 抽象形状接口
 *
 * 表示由多条曲线组成的 2D 闭合或开放路径
 * 支持孔洞（holes）用于处理复杂截面
 */
export interface IShape {
  /** 组成形状的曲线列表（外轮廓） */
  curves: ICurve[];

  /** 形状是否闭合 */
  isClosed: boolean;

  /** 孔洞列表（内部需要挖空的区域） */
  holes?: IShape[];

  /** 可选的元数据 */
  metadata?: {
    /** 原始 SVG 路径字符串 */
    sourcePath?: string;

    /** 形状名称 */
    name?: string;

    /** 边界框 */
    boundingBox?: {
      min: Vector2;
      max: Vector2;
    };
  };
}

/**
 * 加工操作类型
 */
export enum MachiningOperationType {
  DRILL = 'drill', // 打孔
  CHAMFER = 'chamfer', // 倒角
  SLOT = 'slot', // 槽口
  TAP = 'tap', // 攻丝
  COUNTERSINK = 'countersink', // 沉孔
}

/**
 * 加工操作定义
 */
export interface MachiningOperation {
  /** 操作 ID */
  id: string;

  /** 操作类型 */
  type: MachiningOperationType;

  /** 操作位置（3D 坐标） */
  position: Vector3;

  /** 操作轴向（方向） */
  axis: Vector3;

  /** 操作尺寸参数 */
  dimensions: {
    /** 直径（打孔、沉孔） */
    diameter?: number;

    /** 深度 */
    depth?: number;

    /** 宽度（槽口） */
    width?: number;

    /** 长度（槽口） */
    length?: number;

    /** 倒角角度（度数） */
    chamferAngle?: number;

    /** 倒角深度 */
    chamferDepth?: number;
  };

  /** 附加参数 */
  parameters?: {
    /** 螺纹规格（攻丝） */
    threadSpec?: string;

    /** 沉孔角度 */
    countersinkAngle?: number;

    /** 自定义参数 */
    [key: string]: unknown;
  };
}

/**
 * 几何描述符
 *
 * 完整描述一个 3D 几何体的生成方式
 */
export interface GeometryDescriptor {
  /** 几何类型 */
  type: 'extrusion' | 'primitive' | 'mesh';

  /** 拉伸几何参数 */
  extrusion?: {
    /** 基础形状（截面） */
    baseShape: IShape;

    /** 拉伸长度 */
    length: number;

    /** 拉伸方向（默认 Z 轴） */
    direction?: Vector3;

    /** 是否启用斜角 */
    bevelEnabled?: boolean;

    /** 斜角尺寸 */
    bevelSize?: number;
  };

  /** 原始几何参数 */
  primitive?: {
    /** 原始类型 */
    type: 'box' | 'cylinder' | 'sphere';

    /** 尺寸参数 */
    dimensions: {
      width?: number;
      height?: number;
      depth?: number;
      radius?: number;
      segments?: number;
    };
  };

  /** 加工操作列表 */
  machiningOps?: MachiningOperation[];

  /** 元数据 */
  metadata?: {
    /** 原始资产 ID */
    assetId?: string;

    /** 生成时间戳 */
    generatedAt?: number;
  };
}

/**
 * 材质属性（抽象）
 *
 * 与渲染器无关的材质描述
 */
export interface MaterialProperties {
  /** 材质类型 */
  type: 'metal' | 'plastic' | 'wood' | 'glass' | 'custom';

  /** 基础颜色（RGB hex） */
  color: number;

  /** 金属度 (0-1) */
  metalness?: number;

  /** 粗糙度 (0-1) */
  roughness?: number;

  /** 透明度 (0-1) */
  opacity?: number;

  /** 是否透明 */
  transparent?: boolean;

  /** 发光颜色 */
  emissive?: number;

  /** 发光强度 */
  emissiveIntensity?: number;

  /** 环境遮蔽强度 */
  aoMapIntensity?: number;

  /** 自定义着色器参数 */
  customParams?: Record<string, unknown>;
}
