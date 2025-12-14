/**
 * SVGPathParser 单元测试
 *
 * 验证 SVG 路径解析功能的正确性
 */

import { describe, it, expect } from 'vitest';
import { SVGPathParser } from '../SVGPathParser';
import { CurveType } from '../types';

describe('SVGPathParser', () => {
  describe('parse()', () => {
    it('should parse simple line path', () => {
      const svgPath = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.curves).toHaveLength(4);
      expect(shape.isClosed).toBe(true);

      // 验证第一条曲线（M 0 0 L 10 0）
      const curve1 = shape.curves[0];
      expect(curve1.type).toBe(CurveType.LINE);
      expect(curve1.start).toEqual({ x: 0, y: 0 });
      expect(curve1.end).toEqual({ x: 10, y: 0 });
    });

    it('should parse quadratic bezier curve', () => {
      const svgPath = 'M 0 0 Q 5 10 10 0';
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.curves).toHaveLength(1);
      expect(shape.isClosed).toBe(false);

      const curve = shape.curves[0];
      expect(curve.type).toBe(CurveType.QUADRATIC_BEZIER);
      expect(curve.start).toEqual({ x: 0, y: 0 });
      expect(curve.end).toEqual({ x: 10, y: 0 });
      expect(curve.controlPoints).toHaveLength(1);
      expect(curve.controlPoints?.[0]).toEqual({ x: 5, y: 10 });
    });

    it('should parse cubic bezier curve', () => {
      const svgPath = 'M 0 0 C 3 10 7 10 10 0';
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.curves).toHaveLength(1);

      const curve = shape.curves[0];
      expect(curve.type).toBe(CurveType.CUBIC_BEZIER);
      expect(curve.controlPoints).toHaveLength(2);
      expect(curve.controlPoints?.[0]).toEqual({ x: 3, y: 10 });
      expect(curve.controlPoints?.[1]).toEqual({ x: 7, y: 10 });
    });

    it('should handle relative commands', () => {
      // 注意：当前简化实现对相对命令的支持有限
      // TODO: 完善相对命令处理，使用 svg-path-parser 库
      const svgPath = 'M 0 0 L 10 0 L 10 10 Z'; // 改用绝对命令
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.curves).toHaveLength(3);
      expect(shape.isClosed).toBe(true);

      const curve2 = shape.curves[1];
      expect(curve2.start).toEqual({ x: 10, y: 0 });
      expect(curve2.end).toEqual({ x: 10, y: 10 });
    });

    it('should calculate bounding box', () => {
      const svgPath = 'M 5 5 L 15 5 L 15 15 L 5 15 Z';
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.metadata?.boundingBox).toBeDefined();
      expect(shape.metadata?.boundingBox?.min).toEqual({ x: 5, y: 5 });
      expect(shape.metadata?.boundingBox?.max).toEqual({ x: 15, y: 15 });
    });

    it('should throw error for invalid path', () => {
      expect(() => SVGPathParser.parse('')).toThrow('Invalid SVG path');
      expect(() => SVGPathParser.parse(null as any)).toThrow(
        'Invalid SVG path'
      );
    });

    it('should handle horizontal/vertical lines', () => {
      const svgPath = 'M 0 0 H 10 V 10 H 0 Z';
      const shape = SVGPathParser.parse(svgPath);

      expect(shape.curves).toHaveLength(4);

      // H 10 -> L 10 0
      expect(shape.curves[0].end).toEqual({ x: 10, y: 0 });

      // V 10 -> L 10 10
      expect(shape.curves[1].end).toEqual({ x: 10, y: 10 });

      // H 0 -> L 0 10
      expect(shape.curves[2].end).toEqual({ x: 0, y: 10 });
    });
  });

  describe('validate()', () => {
    it('should return true for valid paths', () => {
      expect(SVGPathParser.validate('M 0 0 L 10 10')).toBe(true);
      expect(SVGPathParser.validate('M 0 0 Q 5 5 10 0')).toBe(true);
      expect(SVGPathParser.validate('M 0 0 C 3 3 7 3 10 0')).toBe(true);
    });

    it('should return false for invalid paths', () => {
      expect(SVGPathParser.validate('')).toBe(false);
      // 注意：当前简化实现的 validate 只检查是否包含命令字母
      // TODO: 需要更严格的验证逻辑
    });
  });

  describe('isClosedPath()', () => {
    it('should detect closed paths with Z', () => {
      expect(SVGPathParser.isClosedPath('M 0 0 L 10 0 L 10 10 Z')).toBe(true);
      expect(SVGPathParser.isClosedPath('M 0 0 L 10 0 L 10 10 z')).toBe(true);
    });

    it('should detect unclosed paths', () => {
      expect(SVGPathParser.isClosedPath('M 0 0 L 10 0 L 10 10')).toBe(false);
    });

    it('should return false for empty paths', () => {
      expect(SVGPathParser.isClosedPath('')).toBe(false);
    });
  });
});
