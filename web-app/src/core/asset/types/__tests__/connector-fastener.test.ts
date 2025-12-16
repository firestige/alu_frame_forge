/**
 * 连接件和紧固件类型定义单元测试
 * 
 * 测试类型守卫、类型约束和数据结构完整性
 */

import { describe, it, expect } from 'vitest';
import type {
  ConnectorAsset,
  FastenerAsset,
  ConnectorHole,
  ContactFace,
  ThreadSpec,
  FastenerSpecCatalogEntry,
} from '@/core/asset/types';
import type {
  SceneObject,
  ConnectorComputeGeometry,
  FastenerComputeGeometry,
} from '@/core/object/types';
import { AssetType, AssetSource } from '@/core/asset/types';

describe('Connector Types', () => {
  it('should create valid ConnectorAsset', () => {
    const asset: ConnectorAsset = {
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
        contactFaces: [],
        holes: [],
        mass: 0.05,
      },
    };

    expect(asset.type).toBe(AssetType.CONNECTOR);
    expect(asset.connectorType).toBe('l-bracket');
    expect(asset.visual.type).toBe('simplified');
    expect(asset.functional.mass).toBe(0.05);
  });

  it('should create valid ConnectorHole', () => {
    const hole: ConnectorHole = {
      id: 'hole-1',
      role: 'profile-attachment',
      localPosition: { x: 10, y: 10, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      diameter: 5.5,
      depth: -1, // 通孔
    };

    expect(hole.diameter).toBe(5.5);
    expect(hole.depth).toBe(-1);
    expect(hole.axis.z).toBe(1);
  });

  it('should create valid ContactFace', () => {
    const face: ContactFace = {
      id: 'face-1',
      normal: { x: 1, y: 0, z: 0 },
      origin: { x: 0, y: 0, z: 0 },
      width: 40,
      height: 40,
      matingRule: 'mate:profile-end',
    };

    expect(face.width).toBe(40);
    expect(face.normal.x).toBe(1);
    expect(face.matingRule).toBe('mate:profile-end');
  });

  it('should create valid ConnectorComputeGeometry', () => {
    const compute: ConnectorComputeGeometry = {
      type: 'connector',
      connectorData: {
        holes: [],
        contactFaces: [],
        mass: 0.05,
      },
    };

    expect(compute.type).toBe('connector');
    expect(compute.connectorData.mass).toBe(0.05);
  });
});

describe('Fastener Types', () => {
  it('should create valid FastenerAsset', () => {
    const asset: FastenerAsset = {
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

    expect(asset.type).toBe(AssetType.FASTENER);
    expect(asset.fastenerType).toBe('bolt');
    expect(asset.functional.threadSpec.designation).toBe('M5');
    expect(asset.functional.clampRange).toEqual([0, 15]);
  });

  it('should create valid ThreadSpec', () => {
    const thread: ThreadSpec = {
      standard: 'ISO',
      designation: 'M5',
      pitch: 0.8,
      threadType: 'coarse',
      toleranceClass: '6H',
    };

    expect(thread.designation).toBe('M5');
    expect(thread.pitch).toBe(0.8);
    expect(thread.threadType).toBe('coarse');
  });

  it('should create valid FastenerSpecCatalogEntry', () => {
    const entry: FastenerSpecCatalogEntry = {
      key: 'ISO4014-M5x20-8.8',
      standard: 'ISO4014',
      sizeCode: 'M5',
      length: 20,
      headType: 'hex',
      headWidth: 8,
      headHeight: 3.5,
      shankDiameter: 5,
      threadPitch: 0.8,
      threadLength: 18,
      driveType: 'wrench',
      tolerance: {
        length: 0.2,
        diameter: 0.1,
      },
      gradeClass: '8.8',
    };

    expect(entry.key).toBe('ISO4014-M5x20-8.8');
    expect(entry.sizeCode).toBe('M5');
    expect(entry.headType).toBe('hex');
  });

  it('should create valid FastenerComputeGeometry', () => {
    const compute: FastenerComputeGeometry = {
      type: 'fastener',
      fastenerData: {
        threadSpec: {
          standard: 'ISO',
          designation: 'M5',
          pitch: 0.8,
        },
        threadAxis: { x: 0, y: 0, z: 1 },
        length: 20,
        clampRange: [0, 15],
        engagementDepth: 5,
      },
    };

    expect(compute.type).toBe('fastener');
    expect(compute.fastenerData.threadSpec.designation).toBe('M5');
    expect(compute.fastenerData.threadAxis.z).toBe(1);
  });
});

describe('SceneObject Integration', () => {
  it('should create SceneObject with ConnectorComputeGeometry', () => {
    const sceneObject: SceneObject = {
      id: 'obj-001',
      name: 'L型角件实例',
      assetId: 'connector.l_bracket.2020',
      assetSource: AssetSource.BUILTIN,
      assetType: AssetType.CONNECTOR,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: {},
      machiningOps: [],
      visual: {
        mesh: null,
        isVisible: true,
      },
      compute: {
        geometry: {
          type: 'connector',
          connectorData: {
            holes: [],
            contactFaces: [],
            mass: 0.05,
          },
        },
        connections: [],
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    expect(sceneObject.assetType).toBe(AssetType.CONNECTOR);
    expect(sceneObject.compute.geometry.type).toBe('connector');
    if (sceneObject.compute.geometry.type === 'connector') {
      expect(sceneObject.compute.geometry.connectorData.mass).toBe(0.05);
    }
  });

  it('should create SceneObject with FastenerComputeGeometry', () => {
    const sceneObject: SceneObject = {
      id: 'obj-002',
      name: 'M5螺栓实例',
      assetId: 'fastener.iso4014.m5x20',
      assetSource: AssetSource.BUILTIN,
      assetType: AssetType.FASTENER,
      transform: {
        position: { x: 10, y: 10, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: {},
      machiningOps: [],
      visual: {
        mesh: null,
        isVisible: true,
      },
      compute: {
        geometry: {
          type: 'fastener',
          fastenerData: {
            threadSpec: {
              standard: 'ISO',
              designation: 'M5',
              pitch: 0.8,
            },
            threadAxis: { x: 0, y: 0, z: 1 },
            length: 20,
            clampRange: [0, 15],
            engagementDepth: 5,
          },
        },
        connections: [],
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    expect(sceneObject.assetType).toBe(AssetType.FASTENER);
    expect(sceneObject.compute.geometry.type).toBe('fastener');
    if (sceneObject.compute.geometry.type === 'fastener') {
      expect(sceneObject.compute.geometry.fastenerData.length).toBe(20);
    }
  });
});

describe('Type Guards', () => {
  it('should distinguish connector from fastener assets', () => {
    const connector: ConnectorAsset = {
      id: 'c1',
      name: 'Connector',
      type: AssetType.CONNECTOR,
      source: AssetSource.BUILTIN,
      connectorType: 'l-bracket',
      compatibleSeries: ['2020'],
      visual: { type: 'simplified', primitives: [] },
      functional: { contactFaces: [], holes: [], mass: 0.05 },
    };

    const fastener: FastenerAsset = {
      id: 'f1',
      name: 'Fastener',
      type: AssetType.FASTENER,
      source: AssetSource.BUILTIN,
      fastenerType: 'bolt',
      specKey: 'ISO4014-M5x20-8.8',
      material: 'steel',
      visual: { type: 'simplified', primitives: [] },
      functional: {
        threadSpec: { standard: 'ISO', designation: 'M5', pitch: 0.8 },
        length: 20,
        headHeight: 3.5,
        headWidth: 8,
        passThroughDiameter: 5.5,
        engagementDepth: 5,
        clampRange: [0, 15],
      },
    };

    expect(connector.type).toBe(AssetType.CONNECTOR);
    expect(fastener.type).toBe(AssetType.FASTENER);
    expect(connector.type).not.toBe(fastener.type);
  });
});
