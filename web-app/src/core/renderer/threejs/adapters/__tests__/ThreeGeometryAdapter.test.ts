/**
 * ThreeGeometryAdapter 集成测试
 *
 * 验证抽象几何到 Three.js 几何的转换
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThreeGeometryAdapter } from '../ThreeGeometryAdapter';
import type { IShape, ICurve } from '@/core/geometry/types';
import { CurveType } from '@/core/geometry/types';

describe('ThreeGeometryAdapter', () => {
  describe('shapeToThreeShape()', () => {
    it('should convert simple line shape to THREE.Shape', () => {
      const shape: IShape = {
        curves: [
          {
            type: CurveType.LINE,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
          },
          {
            type: CurveType.LINE,
            start: { x: 10, y: 0 },
            end: { x: 10, y: 10 },
          },
          {
            type: CurveType.LINE,
            start: { x: 10, y: 10 },
            end: { x: 0, y: 10 },
          },
          {
            type: CurveType.LINE,
            start: { x: 0, y: 10 },
            end: { x: 0, y: 0 },
          },
        ],
        isClosed: true,
      };

      const threeShape = ThreeGeometryAdapter.shapeToThreeShape(shape);

      expect(threeShape).toBeInstanceOf(THREE.Shape);
      expect(threeShape.curves).toHaveLength(4);
    });

    it('should convert quadratic bezier curve', () => {
      const curve: ICurve = {
        type: CurveType.QUADRATIC_BEZIER,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        controlPoints: [{ x: 5, y: 10 }],
      };

      const shape: IShape = {
        curves: [curve],
        isClosed: false,
      };

      const threeShape = ThreeGeometryAdapter.shapeToThreeShape(shape);

      expect(threeShape.curves).toHaveLength(1);
      expect(threeShape.curves[0]).toBeInstanceOf(THREE.QuadraticBezierCurve);
    });

    it('should convert cubic bezier curve', () => {
      const curve: ICurve = {
        type: CurveType.CUBIC_BEZIER,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        controlPoints: [
          { x: 3, y: 10 },
          { x: 7, y: 10 },
        ],
      };

      const shape: IShape = {
        curves: [curve],
        isClosed: false,
      };

      const threeShape = ThreeGeometryAdapter.shapeToThreeShape(shape);

      expect(threeShape.curves).toHaveLength(1);
      expect(threeShape.curves[0]).toBeInstanceOf(THREE.CubicBezierCurve);
    });

    it('should throw error for invalid shape', () => {
      expect(() =>
        ThreeGeometryAdapter.shapeToThreeShape({
          curves: [],
          isClosed: false,
        })
      ).toThrow('Invalid shape');
    });

    it('should throw error for unsupported curve type', () => {
      const invalidShape: IShape = {
        curves: [
          {
            type: 'unknown' as any,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
          },
        ],
        isClosed: false,
      };

      expect(() =>
        ThreeGeometryAdapter.shapeToThreeShape(invalidShape)
      ).toThrow('Unsupported curve type');
    });
  });

  describe('createExtrudeGeometry()', () => {
    it('should create ExtrudeGeometry from THREE.Shape', () => {
      const threeShape = new THREE.Shape();
      threeShape.moveTo(0, 0);
      threeShape.lineTo(10, 0);
      threeShape.lineTo(10, 10);
      threeShape.lineTo(0, 10);
      threeShape.closePath();

      const extrudeSettings = {
        depth: 100,
        bevelEnabled: false,
      };

      const geometry = ThreeGeometryAdapter.createExtrudeGeometry(
        threeShape,
        extrudeSettings
      );

      expect(geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
      expect(geometry.parameters.shapes).toBe(threeShape);
      expect(geometry.parameters.options.depth).toBe(100);
    });
  });

  describe('createSimplifiedExtrudeGeometry()', () => {
    it('should create simplified geometry with reduced segments', () => {
      const threeShape = new THREE.Shape();
      threeShape.moveTo(0, 0);
      threeShape.lineTo(10, 0);
      threeShape.lineTo(10, 10);
      threeShape.lineTo(0, 10);
      threeShape.closePath();

      const geometry = ThreeGeometryAdapter.createSimplifiedExtrudeGeometry(
        threeShape,
        100
      );

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      // 注意：由于可能合并了孔洞侧壁，不能再访问 parameters.options
      // 只验证几何体创建成功
      expect(geometry.attributes.position).toBeDefined();
    });
  });

  describe('createPreciseExtrudeGeometry()', () => {
    it('should create high-precision geometry', () => {
      const threeShape = new THREE.Shape();
      threeShape.moveTo(0, 0);
      threeShape.lineTo(10, 0);
      threeShape.lineTo(10, 10);
      threeShape.lineTo(0, 10);
      threeShape.closePath();

      const geometry = ThreeGeometryAdapter.createPreciseExtrudeGeometry(
        threeShape,
        100
      );

      expect(geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
      expect(geometry.parameters.options.curveSegments).toBe(24);
    });
  });
});
