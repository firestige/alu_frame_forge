/**
 * 2020型材对象创建测试
 * 验证契约统一后的数据流
 */

import { describe, it, expect } from 'vitest';
import { profile2020Asset } from '@/data/profiles/generated/2020-profile';
import { AssetType, AssetSource } from '@/core/asset/types/enums';

describe('2020型材数据契约验证', () => {
  it('应该包含所有必需字段', () => {
    expect(profile2020Asset.id).toBe('profile-2020');
    expect(profile2020Asset.name).toBe('2020型材');
    expect(profile2020Asset.type).toBe(AssetType.PROFILE);
    expect(profile2020Asset.source).toBe(AssetSource.BUILTIN);
  });

  it('crossSection应该是NormalizedCrossSection格式', () => {
    const { crossSection } = profile2020Asset;

    // 契约核心字段
    expect(crossSection.outerPath).toBeDefined();
    expect(typeof crossSection.outerPath).toBe('string');
    expect(crossSection.outerPath.length).toBeGreaterThan(0);

    expect(crossSection.holes).toBeDefined();
    expect(Array.isArray(crossSection.holes)).toBe(true);
    expect(crossSection.holes.length).toBe(1);

    // dimensions字段
    expect(crossSection.dimensions).toBeDefined();
    expect(crossSection.dimensions.width).toBe(20);
    expect(crossSection.dimensions.height).toBe(20);
    expect(crossSection.dimensions.wallThickness).toBe(1.5);
    expect(crossSection.dimensions.origin.type).toBe('center');
  });

  it('应该包含几何属性', () => {
    const { geometricProperties } = profile2020Asset.crossSection;

    expect(geometricProperties).toBeDefined();
    expect(geometricProperties?.area).toBeGreaterThan(0);
    expect(geometricProperties?.momentOfInertia).toBeDefined();
    expect(geometricProperties?.momentOfInertia?.Ix).toBeGreaterThan(0);
    expect(geometricProperties?.momentOfInertia?.Iy).toBeGreaterThan(0);
  });

  it('应该包含材料属性', () => {
    const { material } = profile2020Asset;

    expect(material.name).toBe('6063-T5');
    expect(material.density).toBe(2700);
    expect(material.yieldStrength).toBe(160);
    expect(material.elasticModulus).toBe(69000);
  });

  it('应该包含长度约束', () => {
    const { lengthConstraints } = profile2020Asset;

    expect(lengthConstraints.min).toBe(100);
    expect(lengthConstraints.max).toBe(3000);
    expect(lengthConstraints.default).toBe(500);
    expect(lengthConstraints.step).toBe(50);
  });

  it('应该包含追溯元数据', () => {
    const { annotation } = profile2020Asset.crossSection;

    expect(annotation).toBeDefined();
    expect(annotation?.originalFileName).toBe('2020.svg');
    expect(annotation?.annotatedBy).toBe('auto-classifier');
    expect(annotation?.autoDetected).toBe(true);
    expect(annotation?.schemaVersion).toBe('2.0.0');
  });
});
