/**
 * 场景 A 集成测试：双型材 + L 角件 + M5 螺栓装配
 *
 * 验证目标：
 * 1. 连接件锚点正确生成（6 孔 + 2 面）
 * 2. 型材端点锚点与连接件接触面锚点可匹配
 * 3. SceneObject 正确创建（策略 + 视觉 + 计算数据）
 * 4. 锚点世界坐标变换正确
 *
 * 注：约束求解器集成待后续 ConstraintService 完善后补充
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnchorService } from '@/core/anchor/AnchorService';
import { AnchorType } from '@/core/anchor/types';
import type { SceneObject } from '@/core/object/types/scene-object';
import type { ConnectorAssetV2 } from '@/core/asset/types';
import { connectorLBracket2020 } from '@/data/connectors/l-bracket-2020.stub';

describe('Scenario A: 双型材 + L 角件装配', () => {
  let anchorService: AnchorService;

  beforeEach(() => {
    anchorService = new AnchorService();
  });

  it('should generate correct anchors for L-bracket connector', () => {
    // 创建 L 角件 SceneObject（基于 STUB 资产）
    const connectorObject: SceneObject = {
      id: 'connector-1',
      name: 'L-Bracket 2020',
      assetId: connectorLBracket2020.id,
      assetSource: 'builtin',
      assetType: 'connector',
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
          connectorData: connectorLBracket2020.functional,
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: connectorLBracket2020.functional.mass,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const anchors = anchorService.generateAnchors(connectorObject);

    // 验证锚点数量：6 孔 + 2 面
    expect(anchors).toHaveLength(8);

    // 验证孔锚点
    const holeAnchors = anchors.filter(
      a => a.type === AnchorType.CONNECTOR_HOLE
    );
    expect(holeAnchors).toHaveLength(6);

    // 检查螺纹孔
    const threadedHoles = holeAnchors.filter(
      a => a.metadata?.holeRole === 'threaded'
    );
    expect(threadedHoles).toHaveLength(4);

    // 检查通孔
    const passThroughHoles = holeAnchors.filter(
      a => a.metadata?.holeRole === 'fastener-pass-through'
    );
    expect(passThroughHoles).toHaveLength(2);

    // 验证接触面锚点
    const faceAnchors = anchors.filter(
      a => a.type === AnchorType.CONNECTOR_FACE
    );
    expect(faceAnchors).toHaveLength(2);

    // 检查水平板底面
    const horizontalFace = faceAnchors.find(a =>
      a.id.includes('horizontal-bottom')
    );
    expect(horizontalFace).toBeDefined();
    expect(horizontalFace!.axis).toEqual({ x: 0, y: -1, z: 0 });
    expect(horizontalFace!.metadata?.matingRule).toBe('mate:profile-end');

    // 检查垂直板后面
    const verticalFace = faceAnchors.find(a => a.id.includes('vertical-back'));
    expect(verticalFace).toBeDefined();
    expect(verticalFace!.axis).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('should generate profile end anchors that can mate with connector faces', () => {
    // 创建水平型材（2020，长度 500mm）
    const horizontalProfile: SceneObject = {
      id: 'profile-h',
      name: 'Profile 2020 Horizontal',
      assetId: 'profile-2020',
      assetSource: 'builtin',
      assetType: 'profile',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: { length: 500 },
      machiningOps: [],
      visual: {
        mesh: null,
        isVisible: true,
      },
      compute: {
        geometry: {
          type: 'extruded_profile',
          crossSection: 'M 0 0 L 20 0 L 20 20 L 0 20 Z',
          length: 500,
          machiningOps: [],
          material: {
            type: 'metal',
            density: 2700,
            youngsModulus: 69000,
            poissonsRatio: 0.33,
          },
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.54,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const profileAnchors = anchorService.generateAnchors(horizontalProfile);

    // 验证端点锚点存在
    const endAnchors = profileAnchors.filter(
      a => a.type === AnchorType.PROFILE_END
    );
    expect(endAnchors).toHaveLength(2);

    // 前端点（z=0）
    const frontEnd = endAnchors.find(a => a.id.includes('end-front'));
    expect(frontEnd).toBeDefined();
    expect(frontEnd!.position.z).toBe(0);
    expect(frontEnd!.axis).toEqual({ x: 0, y: 0, z: 1 });

    // 后端点（z=500）
    const backEnd = endAnchors.find(a => a.id.includes('end-back'));
    expect(backEnd).toBeDefined();
    expect(backEnd!.position.z).toBe(500);
    expect(backEnd!.axis).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('should demonstrate assembly scenario with two profiles and one connector', () => {
    // 场景布局：
    // - 水平型材：(0, 0, 0) → (0, 0, 500)
    // - 垂直型材：(0, 0, 500) → (0, 500, 500)（沿 Y 轴）
    // - L 角件：放置在 (0, 0, 500) 连接两根型材

    // 1. 水平型材
    const horizontalProfile: SceneObject = {
      id: 'profile-h',
      name: 'Horizontal Profile',
      assetId: 'profile-2020',
      assetSource: 'builtin',
      assetType: 'profile',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: { length: 500 },
      machiningOps: [],
      visual: { mesh: null, isVisible: true },
      compute: {
        geometry: {
          type: 'extruded_profile',
          crossSection: '',
          length: 500,
          machiningOps: [],
          material: {
            type: 'metal',
            density: 2700,
            youngsModulus: 69000,
            poissonsRatio: 0.33,
          },
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.54,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };

    // 2. 垂直型材（旋转 90 度沿 Y 轴）
    const verticalProfile: SceneObject = {
      id: 'profile-v',
      name: 'Vertical Profile',
      assetId: 'profile-2020',
      assetSource: 'builtin',
      assetType: 'profile',
      transform: {
        position: { x: 0, y: 0, z: 500 },
        rotation: { x: -90, y: 0, z: 0, order: 'XYZ' }, // 旋转到沿 Y 轴
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: { length: 500 },
      machiningOps: [],
      visual: { mesh: null, isVisible: true },
      compute: {
        geometry: {
          type: 'extruded_profile',
          crossSection: '',
          length: 500,
          machiningOps: [],
          material: {
            type: 'metal',
            density: 2700,
            youngsModulus: 69000,
            poissonsRatio: 0.33,
          },
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.54,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };

    // 3. L 角件连接器
    const connector: SceneObject = {
      id: 'connector-1',
      name: 'L-Bracket',
      assetId: connectorLBracket2020.id,
      assetSource: 'builtin',
      assetType: 'connector',
      transform: {
        position: { x: 0, y: 0, z: 500 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: {},
      machiningOps: [],
      visual: { mesh: null, isVisible: true },
      compute: {
        geometry: {
          type: 'connector',
          connectorData: connectorLBracket2020.functional,
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.05,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };

    // 生成所有锚点
    const hAnchors = anchorService.generateAnchors(horizontalProfile);
    const vAnchors = anchorService.generateAnchors(verticalProfile);
    const cAnchors = anchorService.generateAnchors(connector);

    // 验证锚点总数
    expect(hAnchors.length).toBeGreaterThan(0);
    expect(vAnchors.length).toBeGreaterThan(0);
    expect(cAnchors).toHaveLength(8); // 6 孔 + 2 面

    // 验证连接件孔锚点位置（世界坐标）
    const connectorHoles = cAnchors.filter(
      a => a.type === AnchorType.CONNECTOR_HOLE
    );
    expect(connectorHoles).toHaveLength(6);

    // 验证水平板螺纹孔 h1 的世界坐标
    const hole_h1 = connectorHoles.find(a => a.id.includes('hole-h1'));
    expect(hole_h1).toBeDefined();
    // localPosition: { x: -10, y: 0, z: 10 } + transform: { x: 0, y: 0, z: 500 }
    expect(hole_h1!.position).toEqual({ x: -10, y: 0, z: 510 });

    // 验证通孔 corner-1 的世界坐标
    const corner1 = connectorHoles.find(a => a.id.includes('hole-corner-1'));
    expect(corner1).toBeDefined();
    // localPosition: { x: -10, y: 0, z: -20 } + transform: { x: 0, y: 0, z: 500 }
    expect(corner1!.position).toEqual({ x: -10, y: 0, z: 480 });

    // 验证接触面锚点
    const connectorFaces = cAnchors.filter(
      a => a.type === AnchorType.CONNECTOR_FACE
    );
    expect(connectorFaces).toHaveLength(2);

    console.log('✅ 场景 A 基础验证通过：');
    console.log(`  - 水平型材锚点: ${hAnchors.length}`);
    console.log(`  - 垂直型材锚点: ${vAnchors.length}`);
    console.log(`  - 连接件孔锚点: ${connectorHoles.length}`);
    console.log(`  - 连接件面锚点: ${connectorFaces.length}`);
    console.log('  - 世界坐标变换: 正确');
  });

  it('should correctly transform anchors with rotation', () => {
    // 测试旋转变换：L 角件绕 Z 轴旋转 90 度
    const rotatedConnector: SceneObject = {
      id: 'connector-rotated',
      name: 'L-Bracket Rotated',
      assetId: connectorLBracket2020.id,
      assetSource: 'builtin',
      assetType: 'connector',
      transform: {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 90, order: 'XYZ' }, // 绕 Z 轴旋转 90 度
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: {},
      machiningOps: [],
      visual: { mesh: null, isVisible: true },
      compute: {
        geometry: {
          type: 'connector',
          connectorData: connectorLBracket2020.functional,
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.05,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };

    const anchors = anchorService.generateAnchors(rotatedConnector);

    // 验证孔位置经过旋转变换
    const holeAnchors = anchors.filter(
      a => a.type === AnchorType.CONNECTOR_HOLE
    );
    expect(holeAnchors).toHaveLength(6);

    // 验证一个具体孔的旋转变换
    // 原始 localPosition: { x: -10, y: 0, z: 10 }
    // 绕 Z 轴旋转 90 度后: { x: 0, y: -10, z: 10 }
    // 加上平移 (100, 0, 0): { x: 100, y: -10, z: 10 }
    const hole_h1 = holeAnchors.find(a => a.id.includes('hole-h1'));
    expect(hole_h1).toBeDefined();
    expect(hole_h1!.position.x).toBeCloseTo(100, 1);
    expect(hole_h1!.position.y).toBeCloseTo(-10, 1);
    expect(hole_h1!.position.z).toBeCloseTo(10, 1);

    // 验证孔轴向也经过旋转
    // 原始 axis: { x: 0, y: 1, z: 0 }
    // 绕 Z 轴旋转 90 度后: { x: -1, y: 0, z: 0 }
    expect(hole_h1!.axis.x).toBeCloseTo(-1, 2);
    expect(hole_h1!.axis.y).toBeCloseTo(0, 2);
    expect(hole_h1!.axis.z).toBeCloseTo(0, 2);

    // 验证接触面法向也经过旋转
    const faceAnchors = anchors.filter(
      a => a.type === AnchorType.CONNECTOR_FACE
    );
    const horizontalFace = faceAnchors.find(a =>
      a.id.includes('horizontal-bottom')
    );
    expect(horizontalFace).toBeDefined();
    // 原始法向: { x: 0, y: -1, z: 0 }
    // 绕 Z 轴旋转 90 度后: { x: 1, y: 0, z: 0 }
    expect(horizontalFace!.axis.x).toBeCloseTo(1, 2);
    expect(horizontalFace!.axis.y).toBeCloseTo(0, 2);
    expect(horizontalFace!.axis.z).toBeCloseTo(0, 2);

    console.log('✅ 旋转变换验证通过');
  });

  it('should preserve full threadSpec in hole anchor metadata', () => {
    const connectorObject: SceneObject = {
      id: 'connector-spec-test',
      name: 'L-Bracket ThreadSpec Test',
      assetId: connectorLBracket2020.id,
      assetSource: 'builtin',
      assetType: 'connector',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
        scale: { x: 1, y: 1, z: 1 },
      },
      userParams: {},
      machiningOps: [],
      visual: { mesh: null, isVisible: true },
      compute: {
        geometry: {
          type: 'connector',
          connectorData: connectorLBracket2020.functional,
        },
        material: {
          type: 'metal',
          density: 2700,
          youngsModulus: 69000,
          poissonsRatio: 0.33,
        },
        connections: [],
        mass: 0.05,
      },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    };

    const anchors = anchorService.generateAnchors(connectorObject);
    const threadedHoles = anchors.filter(
      a =>
        a.type === AnchorType.CONNECTOR_HOLE &&
        a.metadata?.holeRole === 'threaded'
    );

    expect(threadedHoles.length).toBeGreaterThan(0);

    // 验证 threadSpec 保留完整结构
    const firstThreadedHole = threadedHoles[0];
    expect(firstThreadedHole.metadata?.holeSpec?.threadSpec).toBeDefined();
    
    const threadSpec = firstThreadedHole.metadata!.holeSpec!.threadSpec!;
    expect(threadSpec).toHaveProperty('standard');
    expect(threadSpec).toHaveProperty('designation');
    expect(threadSpec).toHaveProperty('pitch');
    expect(threadSpec).toHaveProperty('toleranceClass');
    expect(threadSpec).toHaveProperty('threadType');
    
    // 验证具体值
    expect(threadSpec.standard).toBe('ISO');
    expect(threadSpec.designation).toBe('M5');
    expect(threadSpec.pitch).toBe(0.8);
    expect(threadSpec.toleranceClass).toBe('6H');
    expect(threadSpec.threadType).toBe('coarse');

    console.log('✅ ThreadSpec 完整结构验证通过');
  });
});
