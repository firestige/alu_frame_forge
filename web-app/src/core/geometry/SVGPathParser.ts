/**
 * SVG 路径解析器
 *
 * 将 SVG Path 字符串转换为抽象的 IShape 对象
 * 不依赖任何渲染库（Three.js/Babylon.js）
 *
 * 技术选型：使用 svg-path-parser 库解析 SVG 命令
 *
 * @module core/geometry
 */

import type { IShape, ICurve, CurveType } from './types';
import type { Vector2 } from '@/types';

/**
 * SVG 路径命令类型（简化版）
 */
interface SVGCommand {
  code: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  rx?: number;
  ry?: number;
  xAxisRotation?: number;
  largeArc?: number;
  sweep?: number;
}

/**
 * SVG 路径解析器
 *
 * @example
 * ```typescript
 * const shape = SVGPathParser.parse("M0,0 L20,0 L20,20 L0,20 Z");
 * console.log(shape.curves.length); // 4
 * console.log(shape.isClosed); // true
 * ```
 */
export class SVGPathParser {
  /**
   * 解析 SVG 路径字符串为 IShape
   *
   * @param svgPath - SVG 路径字符串
   * @returns 抽象形状对象
   * @throws {Error} 如果路径无效
   */
  static parse(svgPath: string): IShape {
    console.log(
      '[SVGPathParser] 📐 开始解析SVG路径:',
      svgPath.substring(0, 100)
    );

    if (!svgPath || typeof svgPath !== 'string') {
      throw new Error('Invalid SVG path: path must be a non-empty string');
    }

    // 简单的 SVG 命令解析（临时实现，后续集成 svg-path-parser）
    const commands = this.parseCommands(svgPath.trim());
    console.log('[SVGPathParser] 📊 解析到命令数量:', commands.length);

    // 支持多个子路径（用于识别孔洞）
    const subPaths: IShape[] = [];
    let currentCurves: ICurve[] = [];
    let currentPoint: Vector2 = { x: 0, y: 0 };
    let startPoint: Vector2 = { x: 0, y: 0 };
    let currentClosed = false;

    for (const cmd of commands) {
      switch (cmd.code) {
        case 'M': // MoveTo
          // 如果当前已有曲线，保存为一个子路径
          if (currentCurves.length > 0) {
            subPaths.push({
              curves: currentCurves,
              isClosed: currentClosed,
            });
            currentCurves = [];
            currentClosed = false;
          }
          currentPoint = { x: cmd.x!, y: cmd.y! };
          startPoint = { ...currentPoint };
          break;

        case 'L': // LineTo
          currentCurves.push({
            type: 'line' as CurveType,
            start: { ...currentPoint },
            end: { x: cmd.x!, y: cmd.y! },
          });
          currentPoint = { x: cmd.x!, y: cmd.y! };
          break;

        case 'H': // Horizontal LineTo
          currentCurves.push({
            type: 'line' as CurveType,
            start: { ...currentPoint },
            end: { x: cmd.x!, y: currentPoint.y },
          });
          currentPoint.x = cmd.x!;
          break;

        case 'V': // Vertical LineTo
          currentCurves.push({
            type: 'line' as CurveType,
            start: { ...currentPoint },
            end: { x: currentPoint.x, y: cmd.y! },
          });
          currentPoint.y = cmd.y!;
          break;

        case 'C': // Cubic Bezier
          currentCurves.push({
            type: 'cubic-bezier' as CurveType,
            start: { ...currentPoint },
            end: { x: cmd.x!, y: cmd.y! },
            controlPoints: [
              { x: cmd.x1!, y: cmd.y1! },
              { x: cmd.x2!, y: cmd.y2! },
            ],
          });
          currentPoint = { x: cmd.x!, y: cmd.y! };
          break;

        case 'Q': // Quadratic Bezier
          currentCurves.push({
            type: 'quadratic-bezier' as CurveType,
            start: { ...currentPoint },
            end: { x: cmd.x!, y: cmd.y! },
            controlPoints: [{ x: cmd.x1!, y: cmd.y1! }],
          });
          currentPoint = { x: cmd.x!, y: cmd.y! };
          break;

        case 'A': // Arc（圆弧 - 简化处理）
          // TODO: 实现完整的圆弧转换
          // 当前简化为直线
          currentCurves.push({
            type: 'line' as CurveType,
            start: { ...currentPoint },
            end: { x: cmd.x!, y: cmd.y! },
          });
          currentPoint = { x: cmd.x!, y: cmd.y! };
          break;

        case 'Z': // ClosePath
        case 'z':
          if (
            currentPoint.x !== startPoint.x ||
            currentPoint.y !== startPoint.y
          ) {
            currentCurves.push({
              type: 'line' as CurveType,
              start: { ...currentPoint },
              end: { ...startPoint },
            });
          }
          currentClosed = true;
          currentPoint = { ...startPoint }; // 闭合后回到起点
          break;
      }
    }

    // 保存最后一个子路径
    if (currentCurves.length > 0) {
      subPaths.push({
        curves: currentCurves,
        isClosed: currentClosed,
      });
    }

    console.log('[SVGPathParser] 🔍 识别到子路径数量:', subPaths.length);

    // 如果只有一个子路径，直接返回
    if (subPaths.length === 1) {
      const boundingBox = this.calculateBoundingBox(subPaths[0].curves);
      return {
        curves: subPaths[0].curves,
        isClosed: subPaths[0].isClosed,
        metadata: {
          sourcePath: svgPath,
          boundingBox,
        },
      };
    }

    // 多个子路径：第一个作为外轮廓，其余作为孔洞
    const mainShape = subPaths[0];
    const holes = subPaths.slice(1);
    const boundingBox = this.calculateBoundingBox(mainShape.curves);

    console.log(
      '[SVGPathParser] 🎯 主轮廓curves数量:',
      mainShape.curves.length
    );
    console.log('[SVGPathParser] 🕳️  孔洞数量:', holes.length);

    return {
      curves: mainShape.curves,
      isClosed: mainShape.isClosed,
      holes,
      metadata: {
        sourcePath: svgPath,
        boundingBox,
      },
    };
  }

  /**
   * 验证 SVG 路径是否有效
   *
   * @param svgPath - SVG 路径字符串
   * @returns 是否有效
   */
  static validate(svgPath: string): boolean {
    try {
      this.parse(svgPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查路径是否闭合
   *
   * @param svgPath - SVG 路径字符串
   * @returns 是否闭合
   */
  static isClosedPath(svgPath: string): boolean {
    return /[Zz]\s*$/.test(svgPath.trim());
  }

  /**
   * 简单的 SVG 命令解析器（临时实现）
   *
   * TODO: 替换为 svg-path-parser 库
   *
   * @private
   */
  private static parseCommands(path: string): SVGCommand[] {
    const commands: SVGCommand[] = [];

    // 简单的正则解析（仅支持常见命令）
    const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
    let match;

    while ((match = commandRegex.exec(path)) !== null) {
      const code = match[1].toUpperCase();
      const params = match[2]
        .trim()
        .split(/[\s,]+/)
        .filter(p => p)
        .map(Number);

      switch (code) {
        case 'M':
        case 'L':
          if (params.length >= 2) {
            commands.push({ code, x: params[0], y: params[1] });
          }
          break;

        case 'H':
          if (params.length >= 1) {
            commands.push({ code, x: params[0] });
          }
          break;

        case 'V':
          if (params.length >= 1) {
            commands.push({ code, y: params[0] });
          }
          break;

        case 'C':
          if (params.length >= 6) {
            commands.push({
              code,
              x1: params[0],
              y1: params[1],
              x2: params[2],
              y2: params[3],
              x: params[4],
              y: params[5],
            });
          }
          break;

        case 'Q':
          if (params.length >= 4) {
            commands.push({
              code,
              x1: params[0],
              y1: params[1],
              x: params[2],
              y: params[3],
            });
          }
          break;

        case 'A':
          if (params.length >= 7) {
            commands.push({
              code,
              rx: params[0],
              ry: params[1],
              xAxisRotation: params[2],
              largeArc: params[3],
              sweep: params[4],
              x: params[5],
              y: params[6],
            });
          }
          break;

        case 'Z':
          commands.push({ code });
          break;
      }
    }

    return commands;
  }

  /**
   * 计算曲线集合的边界框
   *
   * @private
   */
  private static calculateBoundingBox(curves: ICurve[]): {
    min: Vector2;
    max: Vector2;
  } {
    if (curves.length === 0) {
      return {
        min: { x: 0, y: 0 },
        max: { x: 0, y: 0 },
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const curve of curves) {
      // 检查起点和终点
      minX = Math.min(minX, curve.start.x, curve.end.x);
      minY = Math.min(minY, curve.start.y, curve.end.y);
      maxX = Math.max(maxX, curve.start.x, curve.end.x);
      maxY = Math.max(maxY, curve.start.y, curve.end.y);

      // 检查控制点
      if (curve.controlPoints) {
        for (const cp of curve.controlPoints) {
          minX = Math.min(minX, cp.x);
          minY = Math.min(minY, cp.y);
          maxX = Math.max(maxX, cp.x);
          maxY = Math.max(maxY, cp.y);
        }
      }
    }

    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    };
  }
}
