/**
 * Connector/Fastener 实例化策略单元测试
 *
 * 测试 ConnectorInstanceStrategy 和 FastenerInstanceStrategy
 * 验证它们能够正确从 AssetV2 生成 SceneObject 结构
 */

import { describe, it, expect } from 'vitest';
import { ConnectorInstanceStrategy } from '../ConnectorInstanceStrategy';
import { FastenerInstanceStrategy } from '../FastenerInstanceStrategy';
import type { ConnectorAssetV2, FastenerAssetV2 } from '@/core/asset/types';
import { AssetType, AssetSource } from '@/core/asset/types';

describe('ConnectorInstanceStrategy', () => {
  const strategy = new ConnectorInstanceStrategy();

  it('should handle CONNECTOR type assets', () => {
    const asset: ConnectorAssetV2 = {
      id: 'connector-test',
      name: 'Test Connector',
      type: AssetType.CONNECTOR,
      source: AssetSource.BUILTIN,
      connectorType: 'l-bracket',
      compatibleSeries: ['2020'],
      visual: {
        type: 'simplified',
        primitives: [],
      },
      functional: {
        contactFaces: [],
        holes: [],
        mass: 0.05,
      },
    };

    expect(strategy.canHandle(asset)).toBe(true);
  });

  it('should create SceneObject from ConnectorAssetV2', () => {
    const asset: ConnectorAssetV2 = {
      id: 'connector.l_bracket.2020',
      name: 'L型角件 2020',
      type: AssetType.CONNECTOR,
      source: AssetSource.BUILTIN,
      connectorType: 'l-bracket',
      compatibleSeries: ['2020'],
      visual: {
        type: 'simplified',
        primitives: [
          {
            type: 'box',
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 40, height: 40, depth: 5 },
          },
        ],
      },
      functional: {
        contactFaces: [
          {
            id: 'face-1',
            normal: { x: 1, y: 0, z: 0 },
            origin: { x: 0, y: 0, z: 0 },
            width: 40,
            height: 40,
          },
        ],
        holes: [
          {
            id: 'hole-1',
            role: 'profile-attachment',
            localPosition: { x: 10, y: 10, z: 0 },
            axis: { x: 0, y: 0, z: 1 },
            diameter: 5.5,
            depth: -1,
          },
        ],
        mass: 0.05,
      },
    };

    const sceneObject = strategy.createSceneObject(asset, {
      userParams: {},
    });

    // 验证基础结构
    expect(sceneObject.id).toMatch(/^connector-/);
    expect(sceneObject.assetId).toBe('connector.l_bracket.2020');
    expect(sceneObject.assetType).toBe(AssetType.CONNECTOR);
    expect(sceneObject.assetSource).toBe(AssetSource.BUILTIN);

    // 验证 transform 默认值
    expect(sceneObject.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(sceneObject.transform.rotation.order).toBe('XYZ');
    expect(sceneObject.transform.scale).toEqual({ x: 1, y: 1, z: 1 });

    // 验证 visual（占位）
    expect(sceneObject.visual.isVisible).toBe(true);
    expect(sceneObject.visual.mesh).toBeDefined();

    // 验证 compute geometry
    expect(sceneObject.compute.geometry.type).toBe('connector');
    if (sceneObject.compute.geometry.type === 'connector') {
      expect(sceneObject.compute.geometry.connectorData.holes).toHaveLength(1);
      expect(sceneObject.compute.geometry.connectorData.contactFaces).toHaveLength(1);
      expect(sceneObject.compute.geometry.connectorData.mass).toBe(0.05);
    }

    // 验证 metadata
    expect(sceneObject.metadata.createdAt).toBeInstanceOf(Date);
    expect(sceneObject.metadata.connectorType).toBe('l-bracket');
  });

  it('should update SceneObject geometry', () => {
    const asset: ConnectorAssetV2 = {
      id: 'connector-test',
      name: 'Test',
      type: AssetType.CONNECTOR,
      source: AssetSource.BUILTIN,
      connectorType: 'l-bracket',
      compatibleSeries: ['2020'],
      visual: {
        type: 'simplified',
        primitives: [],
      },
      functional: {
        contactFaces: [],
        holes: [],
        mass: 0.05,
      },
    };

    const sceneObject = strategy.createSceneObject(asset, {
      userParams: {},
    });

    const oldUpdatedAt = sceneObject.metadata.updatedAt;

    // 等待一点时间确保时间戳不同
    setTimeout(() => {
      strategy.updateGeometry(sceneObject, asset);
      expect(sceneObject.metadata.updatedAt).not.toBe(oldUpdatedAt);
    }, 10);
  });
});

describe('FastenerInstanceStrategy', () => {
  const strategy = new FastenerInstanceStrategy();

  it('should handle FASTENER type assets', () => {
    const asset: FastenerAssetV2 = {
      id: 'fastener-test',
      name: 'Test Fastener',
      type: AssetType.FASTENER,
      source: AssetSource.BUILTIN,
      fastenerType: 'bolt',
      specKey: 'ISO4014-M5x20-8.8',
      material: 'steel-8.8',
      visual: {
        type: 'simplified',
        primitives: [],
      },
      functional: {
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
        },
        length: 20,
        headHeight: 3.5,
        headWidth: 8,
        passThroughDiameter: 5.5,
        engagementDepth: 5,
        clampRange: [0, 15],
      },
    };

    expect(strategy.canHandle(asset)).toBe(true);
  });

  it('should create SceneObject from FastenerAssetV2', () => {
    const asset: FastenerAssetV2 = {
      id: 'fastener.iso4014.m5x20',
      name: 'ISO4014 六角头螺栓 M5×20',
      type: AssetType.FASTENER,
      source: AssetSource.BUILTIN,
      fastenerType: 'bolt',
      specKey: 'ISO4014-M5x20-8.8',
      material: 'steel-8.8',
      visual: {
        type: 'simplified',
        primitives: [
          {
            type: 'cylinder',
            position: { x: 0, y: 0, z: 0 },
            dimensions: { radius: 2.5, height: 20 },
          },
        ],
      },
      functional: {
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
        },
        length: 20,
        headHeight: 3.5,
        headWidth: 8,
        passThroughDiameter: 5.5,
        engagementDepth: 5,
        clampRange: [0, 15],
      },
    };

    const sceneObject = strategy.createSceneObject(asset, {
      userParams: {},
    });

    // 验证基础结构
    expect(sceneObject.id).toMatch(/^fastener-/);
    expect(sceneObject.assetId).toBe('fastener.iso4014.m5x20');
    expect(sceneObject.assetType).toBe(AssetType.FASTENER);
    expect(sceneObject.assetSource).toBe(AssetSource.BUILTIN);

    // 验证 transform 默认值
    expect(sceneObject.transform.position).toEqual({ x: 0, y: 0, z: 0 });

    // 验证 visual（占位）
    expect(sceneObject.visual.isVisible).toBe(true);
    expect(sceneObject.visual.mesh).toBeDefined();

    // 验证 compute geometry
    expect(sceneObject.compute.geometry.type).toBe('fastener');
    if (sceneObject.compute.geometry.type === 'fastener') {
      const data = sceneObject.compute.geometry.fastenerData;
      expect(data.threadSpec.designation).toBe('M5');
      expect(data.length).toBe(20);
      expect(data.clampRange).toEqual([0, 15]);
      expect(data.threadAxis).toEqual({ x: 0, y: 0, z: 1 });
      expect(data.engagementDepth).toBe(5);
    }

    // 验证 metadata
    expect(sceneObject.metadata.createdAt).toBeInstanceOf(Date);
    expect(sceneObject.metadata.fastenerType).toBe('bolt');
    expect(sceneObject.metadata.specKey).toBe('ISO4014-M5x20-8.8');
  });

  it('should update SceneObject geometry', () => {
    const asset: FastenerAssetV2 = {
      id: 'fastener-test',
      name: 'Test',
      type: AssetType.FASTENER,
      source: AssetSource.BUILTIN,
      fastenerType: 'bolt',
      specKey: 'ISO4014-M5x20-8.8',
      material: 'steel',
      visual: {
        type: 'simplified',
        primitives: [],
      },
      functional: {
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
        },
        length: 20,
        headHeight: 3.5,
        headWidth: 8,
        passThroughDiameter: 5.5,
        engagementDepth: 5,
        clampRange: [0, 15],
      },
    };

    const sceneObject = strategy.createSceneObject(asset, {
      userParams: {},
    });

    const oldUpdatedAt = sceneObject.metadata.updatedAt;

    setTimeout(() => {
      strategy.updateGeometry(sceneObject, asset);
      expect(sceneObject.metadata.updatedAt).not.toBe(oldUpdatedAt);
    }, 10);
  });
});
