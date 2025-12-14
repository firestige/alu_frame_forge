/**
 * Three.js 几何适配器
 * 
 * 将抽象的 IShape 转换为 Three.js 的 THREE.Shape
 * 实现 Adapter 模式，隔离 Three.js 依赖
 * 
 * @module core/renderer/threejs/adapters
 */

import * as THREE from 'three';
import type { IShape, ICurve } from '@/core/geometry/types';
import { CurveType } from '@/core/geometry/types';

/**
 * Three.js 几何适配器
 * 
 * 负责将抽象几何类型转换为 Three.js 特定类型
 */
export class ThreeGeometryAdapter {
  /**
   * 将 IShape 转换为 THREE.Shape
   * 
   * @param shape - 抽象形状对象
   * @returns Three.js Shape 对象
   * @throws {Error} 如果形状无效或包含不支持的曲线类型
   */
  static shapeToThreeShape(shape: IShape): THREE.Shape {
    if (!shape || !shape.curves || shape.curves.length === 0) {
      throw new Error('Invalid shape: must contain at least one curve');
    }

    const threeShape = new THREE.Shape();
    
    // 设置起点（第一条曲线的起点）
    const firstCurve = shape.curves[0];
    threeShape.moveTo(firstCurve.start.x, firstCurve.start.y);

    // 转换每条曲线
    for (const curve of shape.curves) {
      this.addCurveToShape(threeShape, curve);
    }

    // 如果形状闭合，自动闭合路径
    if (shape.isClosed) {
      threeShape.closePath();
    }

    return threeShape;
  }

  /**
   * 将 ICurve 添加到 THREE.Shape
   * 
   * @private
   */
  private static addCurveToShape(threeShape: THREE.Shape, curve: ICurve): void {
    switch (curve.type) {
      case CurveType.LINE:
        // 直线
        threeShape.lineTo(curve.end.x, curve.end.y);
        break;

      case CurveType.QUADRATIC_BEZIER:
        // 二次贝塞尔曲线
        if (!curve.controlPoints || curve.controlPoints.length < 1) {
          throw new Error('Quadratic bezier curve requires 1 control point');
        }
        threeShape.quadraticCurveTo(
          curve.controlPoints[0].x,
          curve.controlPoints[0].y,
          curve.end.x,
          curve.end.y
        );
        break;

      case CurveType.CUBIC_BEZIER:
        // 三次贝塞尔曲线
        if (!curve.controlPoints || curve.controlPoints.length < 2) {
          throw new Error('Cubic bezier curve requires 2 control points');
        }
        threeShape.bezierCurveTo(
          curve.controlPoints[0].x,
          curve.controlPoints[0].y,
          curve.controlPoints[1].x,
          curve.controlPoints[1].y,
          curve.end.x,
          curve.end.y
        );
        break;

      case CurveType.ARC:
        // 圆弧
        if (!curve.arcParams) {
          throw new Error('Arc curve requires arcParams');
        }
        threeShape.absarc(
          curve.arcParams.center.x,
          curve.arcParams.center.y,
          curve.arcParams.radius,
          curve.arcParams.startAngle,
          curve.arcParams.endAngle,
          !curve.arcParams.clockwise // Three.js 使用反向参数
        );
        break;

      default:
        throw new Error(`Unsupported curve type: ${curve.type}`);
    }
  }

  /**
   * 从 THREE.Shape 创建 ExtrudeGeometry
   * 
   * @param shape - Three.js Shape
   * @param extrudeSettings - 拉伸参数
   * @returns Three.js ExtrudeGeometry
   */
  static createExtrudeGeometry(
    shape: THREE.Shape,
    extrudeSettings: THREE.ExtrudeGeometryOptions
  ): THREE.ExtrudeGeometry {
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * 创建简化的拉伸几何体（用于渲染优化）
   * 
   * @param shape - Three.js Shape
   * @param length - 拉伸长度
   * @returns 简化的 ExtrudeGeometry
   */
  static createSimplifiedExtrudeGeometry(
    shape: THREE.Shape,
    length: number
  ): THREE.ExtrudeGeometry {
    // 简化参数：禁用斜角，减少细分
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      curveSegments: 8, // 减少曲线细分（默认 12）
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * 创建完整的拉伸几何体（用于 FEA 分析）
   * 
   * @param shape - Three.js Shape
   * @param length - 拉伸长度
   * @returns 高精度 ExtrudeGeometry
   */
  static createPreciseExtrudeGeometry(
    shape: THREE.Shape,
    length: number
  ): THREE.ExtrudeGeometry {
    // 高精度参数
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: length,
      bevelEnabled: false,
      curveSegments: 24, // 高细分
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }
}
