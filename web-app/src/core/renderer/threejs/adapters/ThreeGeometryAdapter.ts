/**
 * Three.js 几何适配器
 *
 * 将抽象的 IShape 转换为 Three.js 的 THREE.Shape
 * 实现 Adapter 模式，隔离 Three.js 依赖
 *
 * @module core/renderer/threejs/adapters
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
   * @param shape - 抽象形状对象（或已经是 THREE.Shape）
   * @param targetSize - 目标尺寸(mm)，如果提供则自动缩放和居中
   * @returns Three.js Shape 对象
   * @throws {Error} 如果形状无效或包含不支持的曲线类型
   */
  static shapeToThreeShape(shape: IShape, targetSize?: number): THREE.Shape {
    // 检查是否已经是 THREE.Shape（来自 SVGLoader）
    if (shape instanceof THREE.Shape) {
      console.log('[ThreeGeometryAdapter] 检测到 THREE.Shape，直接使用');

      // 如果需要缩放，应用缩放变换
      if (targetSize) {
        return this.scaleShape(shape, targetSize);
      }

      return shape;
    }

    // 否则按原有逻辑处理抽象 IShape
    if (!shape || !shape.curves || shape.curves.length === 0) {
      throw new Error('Invalid shape: must contain at least one curve');
    }

    const threeShape = new THREE.Shape();

    // 单位转换：SVG 坐标假设为 mm，需要转换为 m（Three.js 标准单位）
    const MM_TO_M = 0.001;

    // 如果提供了targetSize，先计算边界框以确定缩放比例和偏移
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (targetSize) {
      // 计算所有点的边界框
      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      for (const curve of shape.curves) {
        const points = [curve.start, curve.end];
        if (curve.controlPoints) {
          points.push(...curve.controlPoints);
        }
        for (const point of points) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      }

      const width = maxX - minX;
      const height = maxY - minY;
      const maxDim = Math.max(width, height);

      // 缩放到目标尺寸
      scale = targetSize / maxDim;

      // 计算居中偏移
      offsetX = -(minX + maxX) / 2;
      offsetY = -(minY + maxY) / 2;

      console.log('[ThreeGeometryAdapter] 🎯 SVG坐标转换:', {
        SVG边界: { minX, minY, maxX, maxY },
        SVG尺寸: { width, height },
        '目标尺寸(mm)': targetSize,
        缩放比例: scale,
        居中偏移: { offsetX, offsetY },
      });
    }

    // 设置起点（第一条曲线的起点）
    const firstCurve = shape.curves[0];
    const startX = (firstCurve.start.x + offsetX) * scale * MM_TO_M;
    const startY = (firstCurve.start.y + offsetY) * scale * MM_TO_M;
    threeShape.moveTo(startX, startY);

    // 转换每条曲线
    for (const curve of shape.curves) {
      this.addCurveToShape(
        threeShape,
        curve,
        MM_TO_M * scale,
        offsetX,
        offsetY
      );
    }

    // 如果形状闭合，自动闭合路径
    if (shape.isClosed) {
      threeShape.closePath();
    }

    // 处理孔洞
    if (shape.holes && shape.holes.length > 0) {
      console.log(
        '[ThreeGeometryAdapter] 🕳️  处理孔洞数量:',
        shape.holes.length
      );

      for (const hole of shape.holes) {
        const holePath = new THREE.Path();

        // 设置孔洞起点
        const holeFirstCurve = hole.curves[0];
        const holeStartX = (holeFirstCurve.start.x + offsetX) * scale * MM_TO_M;
        const holeStartY = (holeFirstCurve.start.y + offsetY) * scale * MM_TO_M;
        holePath.moveTo(holeStartX, holeStartY);

        // 转换孔洞的每条曲线
        for (const curve of hole.curves) {
          this.addCurveToPath(
            holePath,
            curve,
            MM_TO_M * scale,
            offsetX,
            offsetY
          );
        }

        // 闭合孔洞路径
        if (hole.isClosed) {
          holePath.closePath();
        }

        // 添加到主形状的孔洞列表
        threeShape.holes.push(holePath);
      }
    }

    return threeShape;
  }

  /**
   * 将 ICurve 添加到 THREE.Path (用于孔洞)
   * @private
   */
  private static addCurveToPath(
    threePath: THREE.Path,
    curve: ICurve,
    scale: number = 0.001,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    // 与 addCurveToShape 相同的逻辑，但操作对象是 Path
    switch (curve.type) {
      case CurveType.LINE:
        threePath.lineTo(
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.QUADRATIC_BEZIER:
        if (!curve.controlPoints || curve.controlPoints.length < 1) {
          throw new Error('Quadratic bezier curve requires 1 control point');
        }
        threePath.quadraticCurveTo(
          (curve.controlPoints[0].x + offsetX) * scale,
          (curve.controlPoints[0].y + offsetY) * scale,
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.CUBIC_BEZIER:
        if (!curve.controlPoints || curve.controlPoints.length < 2) {
          throw new Error('Cubic bezier curve requires 2 control points');
        }
        threePath.bezierCurveTo(
          (curve.controlPoints[0].x + offsetX) * scale,
          (curve.controlPoints[0].y + offsetY) * scale,
          (curve.controlPoints[1].x + offsetX) * scale,
          (curve.controlPoints[1].y + offsetY) * scale,
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.ARC:
        if (!curve.arcParams) {
          throw new Error('Arc curve requires arcParams');
        }
        threePath.absarc(
          (curve.arcParams.center.x + offsetX) * scale,
          (curve.arcParams.center.y + offsetY) * scale,
          curve.arcParams.radius * scale,
          curve.arcParams.startAngle,
          curve.arcParams.endAngle,
          !curve.arcParams.clockwise
        );
        break;

      default:
        throw new Error(`Unsupported curve type: ${curve.type}`);
    }
  }

  /**
   * 将 ICurve 添加到 THREE.Shape
   *
   * @private
   */
  private static addCurveToShape(
    threeShape: THREE.Shape,
    curve: ICurve,
    scale: number = 0.001,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    switch (curve.type) {
      case CurveType.LINE:
        // 直线
        threeShape.lineTo(
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.QUADRATIC_BEZIER:
        // 二次贝塞尔曲线
        if (!curve.controlPoints || curve.controlPoints.length < 1) {
          throw new Error('Quadratic bezier curve requires 1 control point');
        }
        threeShape.quadraticCurveTo(
          (curve.controlPoints[0].x + offsetX) * scale,
          (curve.controlPoints[0].y + offsetY) * scale,
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.CUBIC_BEZIER:
        // 三次贝塞尔曲线
        if (!curve.controlPoints || curve.controlPoints.length < 2) {
          throw new Error('Cubic bezier curve requires 2 control points');
        }
        threeShape.bezierCurveTo(
          (curve.controlPoints[0].x + offsetX) * scale,
          (curve.controlPoints[0].y + offsetY) * scale,
          (curve.controlPoints[1].x + offsetX) * scale,
          (curve.controlPoints[1].y + offsetY) * scale,
          (curve.end.x + offsetX) * scale,
          (curve.end.y + offsetY) * scale
        );
        break;

      case CurveType.ARC:
        // 圆弧
        if (!curve.arcParams) {
          throw new Error('Arc curve requires arcParams');
        }
        threeShape.absarc(
          (curve.arcParams.center.x + offsetX) * scale,
          (curve.arcParams.center.y + offsetY) * scale,
          curve.arcParams.radius * scale,
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
  ): THREE.BufferGeometry {
    // 单位转换：length 参数为 mm，转换为 m
    const MM_TO_M = 0.001;
    const depthInMeters = length * MM_TO_M;

    // 简化参数：禁用斜角，减少细分
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depthInMeters,
      bevelEnabled: false,
      curveSegments: 8, // 减少曲线细分（默认 12）
    };

    const baseGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 如果有孔洞，需要手动添加孔洞侧壁
    if (shape.holes && shape.holes.length > 0) {
      console.log(
        '[ThreeGeometryAdapter] 🔧 生成孔洞侧壁，孔洞数量:',
        shape.holes.length
      );

      const geometries: THREE.BufferGeometry[] = [baseGeometry];

      for (const hole of shape.holes) {
        try {
          // 为每个孔洞创建侧壁几何体
          const holeWallGeometry = this.createHoleWallGeometry(
            hole,
            depthInMeters,
            extrudeSettings.curveSegments || 8
          );
          geometries.push(holeWallGeometry);
        } catch (error) {
          console.error('[ThreeGeometryAdapter] ❌ 生成孔洞侧壁失败:', error);
        }
      }

      // 合并所有几何体
      const mergedGeometry = mergeGeometries(geometries);
      if (!mergedGeometry) {
        console.error(
          '[ThreeGeometryAdapter] ❌ 几何体合并失败，返回基础几何体'
        );
        return baseGeometry;
      }

      // 清理旧几何体
      geometries.forEach(g => g.dispose());

      return mergedGeometry;
    }

    return baseGeometry;
  }

  /**
   * 创建孔洞侧壁几何体
   * @private
   */
  private static createHoleWallGeometry(
    hole: THREE.Path,
    depth: number,
    curveSegments: number
  ): THREE.BufferGeometry {
    // 获取孔洞路径上的点
    const points = hole.getPoints(curveSegments);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // 为每条边创建四边形（两个三角形）
    const numPoints = points.length;

    for (let i = 0; i < numPoints; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % numPoints];

      // 计算边的方向和法向量
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const edgeLength = Math.sqrt(dx * dx + dy * dy);

      // 法向量指向孔洞内部（顺时针方向）
      const nx = dy / edgeLength;
      const ny = -dx / edgeLength;

      // 当前四边形的四个顶点索引
      const baseIndex = i * 4;

      // 顶点位置：前表面两个点 + 后表面两个点
      // 前表面
      positions.push(p1.x, p1.y, 0);
      positions.push(p2.x, p2.y, 0);
      // 后表面
      positions.push(p1.x, p1.y, depth);
      positions.push(p2.x, p2.y, depth);

      // 法向量（四个顶点共享同一个法向量）
      for (let j = 0; j < 4; j++) {
        normals.push(nx, ny, 0);
      }

      // UV 坐标
      const uStep = i / numPoints;
      const uStepNext = (i + 1) / numPoints;
      uvs.push(uStep, 0); // 前表面左下
      uvs.push(uStepNext, 0); // 前表面右下
      uvs.push(uStep, 1); // 后表面左上
      uvs.push(uStepNext, 1); // 后表面右上

      // 索引：两个三角形构成四边形
      // 第一个三角形：0 -> 1 -> 2
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      // 第二个三角形：1 -> 3 -> 2
      indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(normals, 3)
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
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
  ): THREE.BufferGeometry {
    // 单位转换：length 参数为 mm，转换为 m
    const MM_TO_M = 0.001;
    const depthInMeters = length * MM_TO_M;

    // 高精度参数
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: depthInMeters,
      bevelEnabled: false,
      curveSegments: 24, // 高细分
    };

    const baseGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 如果有孔洞，需要手动添加孔洞侧壁
    if (shape.holes && shape.holes.length > 0) {
      const geometries: THREE.BufferGeometry[] = [baseGeometry];

      for (const hole of shape.holes) {
        try {
          const holeWallGeometry = this.createHoleWallGeometry(
            hole,
            depthInMeters,
            extrudeSettings.curveSegments || 24
          );
          geometries.push(holeWallGeometry);
        } catch (error) {
          console.error(
            '[ThreeGeometryAdapter] ❌ 生成高精度孔洞侧壁失败:',
            error
          );
        }
      }

      const mergedGeometry = mergeGeometries(geometries);
      if (!mergedGeometry) {
        console.error(
          '[ThreeGeometryAdapter] ❌ 高精度几何体合并失败，返回基础几何体'
        );
        return baseGeometry;
      }
      geometries.forEach(g => g.dispose());
      return mergedGeometry;
    }

    return baseGeometry;
  }

  /**
   * 缩放 THREE.Shape 到目标尺寸
   *
   * @param shape - Three.js Shape
   * @param targetSize - 目标尺寸(mm)
   * @returns 缩放后的 Shape
   */
  private static scaleShape(
    shape: THREE.Shape,
    targetSize: number
  ): THREE.Shape {
    const MM_TO_M = 0.001;

    // 计算当前 Shape 的边界框
    const points = shape.getPoints();
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const maxDim = Math.max(width, height);

    // 计算缩放比例和偏移
    const scale = (targetSize * MM_TO_M) / maxDim;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    console.log('[ThreeGeometryAdapter] 🎯 Shape缩放:', {
      原始边界: { minX, minY, maxX, maxY },
      原始尺寸: { width, height },
      '目标尺寸(mm)': targetSize,
      缩放比例: scale,
      居中偏移: { centerX, centerY },
    });

    // 创建新的 Shape 应用变换
    const newShape = new THREE.Shape();

    // 变换主轮廓
    const transformedPoints = points.map(p => ({
      x: (p.x - centerX) * scale,
      y: (p.y - centerY) * scale,
    }));

    if (transformedPoints.length > 0) {
      newShape.moveTo(transformedPoints[0].x, transformedPoints[0].y);
      for (let i = 1; i < transformedPoints.length; i++) {
        newShape.lineTo(transformedPoints[i].x, transformedPoints[i].y);
      }
      newShape.closePath();
    }

    // 变换孔洞
    for (const hole of shape.holes) {
      const holePoints = hole.getPoints();
      const transformedHolePoints = holePoints.map(p => ({
        x: (p.x - centerX) * scale,
        y: (p.y - centerY) * scale,
      }));

      if (transformedHolePoints.length > 0) {
        const holePath = new THREE.Path();
        holePath.moveTo(transformedHolePoints[0].x, transformedHolePoints[0].y);
        for (let i = 1; i < transformedHolePoints.length; i++) {
          holePath.lineTo(
            transformedHolePoints[i].x,
            transformedHolePoints[i].y
          );
        }
        holePath.closePath();
        newShape.holes.push(holePath);
      }
    }

    console.log(
      '[ThreeGeometryAdapter] ✅ Shape缩放完成, holes:',
      newShape.holes.length
    );
    return newShape;
  }
}
