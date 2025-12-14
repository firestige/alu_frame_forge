/**
 * AssetService SVG 转换功能测试
 *
 * 测试 convertSVGToCrossSection 方法
 */

import { describe, it, expect } from 'vitest';
import { AssetService } from '../AssetService';

describe('AssetService - SVG 转换', () => {
  it('应该成功转换简单的矩形 SVG', () => {
    const assetService = new AssetService();

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M 10,10 L 90,10 L 90,90 L 10,90 Z"/>
      </svg>
    `;

    const result = assetService.convertSVGToCrossSection(svgContent);

    expect(result).toBeDefined();
    expect(result.outerPath).toBeDefined();
    expect(result.holes).toEqual([]);
  });

  it('应该成功转换带孔洞的 SVG', () => {
    const assetService = new AssetService();

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M 10,10 L 90,10 L 90,90 L 10,90 Z"/>
        <circle cx="50" cy="50" r="10"/>
      </svg>
    `;

    const result = assetService.convertSVGToCrossSection(svgContent, {
      outerPathIndex: 0,
      holeIndices: [1],
    });

    expect(result).toBeDefined();
    expect(result.outerPath).toBeDefined();
    expect(result.holes).toHaveLength(1);
  });

  it('应该在没有路径时抛出错误', () => {
    const assetService = new AssetService();

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      </svg>
    `;

    expect(() => {
      assetService.convertSVGToCrossSection(svgContent);
    }).toThrow('SVG 解析失败：未找到任何路径');
  });

  it('应该在路径索引超出范围时抛出错误', () => {
    const assetService = new AssetService();

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M 10,10 L 90,10 L 90,90 L 10,90 Z"/>
      </svg>
    `;

    expect(() => {
      assetService.convertSVGToCrossSection(svgContent, {
        outerPathIndex: 5,
      });
    }).toThrow('外轮廓索引 5 超出范围');
  });
});
