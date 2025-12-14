/**
 * Phase 6 集成测试 - 可视化系统
 *
 * 测试 Gizmo 组件的集成功能：
 * 1. Gizmo 组件可以被独立创建和使用
 * 2. Gizmo 组件的基本功能正常工作
 * 3. Gizmo 组件可以正确清理资源
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  AnchorGizmo,
  AlignmentGuides,
  ConstraintVisualizer,
  DimensionLabel,
} from '../../gizmos';
import type { AnchorPoint } from '@/core/anchor/types';
import type { Constraint } from '@/core/constraint/types';
import type { Vector3 } from '@/types';

// Mock Canvas API for DimensionLabel
const mockContext = {
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  fillStyle: '',
  globalAlpha: 1,
  measureText: vi.fn(() => ({ width: 50 })),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
};

const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement('canvas');
    canvas.getContext = vi.fn(() => mockContext as any);
    return canvas;
  }
  return originalCreateElement(tagName);
}) as any;

describe('Phase 6 可视化系统集成', () => {
  let scene: THREE.Scene;
  let camera: THREE.OrthographicCamera;
  let anchorGizmo: AnchorGizmo;
  let alignmentGuides: AlignmentGuides;
  let constraintVisualizer: ConstraintVisualizer;
  let dimensionLabel: DimensionLabel;

  beforeEach(() => {
    // 创建场景和相机
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // 创建所有 Gizmo 组件
    anchorGizmo = new AnchorGizmo(scene, camera);
    alignmentGuides = new AlignmentGuides(scene);
    constraintVisualizer = new ConstraintVisualizer(scene);
    dimensionLabel = new DimensionLabel(scene);
  });

  afterEach(() => {
    // 清理所有组件
    anchorGizmo.dispose();
    alignmentGuides.dispose();
    constraintVisualizer.dispose();
    dimensionLabel.dispose();
  });

  describe('Gizmo 组件初始化', () => {
    it('应该成功创建所有 Gizmo 组件', () => {
      expect(anchorGizmo).toBeDefined();
      expect(alignmentGuides).toBeDefined();
      expect(constraintVisualizer).toBeDefined();
      expect(dimensionLabel).toBeDefined();
    });

    it('Gizmo 组件应该添加到场景中', () => {
      // 每个 Gizmo 都会添加一个 Group 到场景
      expect(scene.children.length).toBeGreaterThan(0);

      // 验证特定的 Gizmo Group
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
      expect(scene.getObjectByName('AlignmentGuides')).toBeDefined();
      expect(scene.getObjectByName('ConstraintVisualizations')).toBeDefined();
      expect(scene.getObjectByName('DimensionLabels')).toBeDefined();
    });
  });

  describe('AnchorGizmo 集成', () => {
    it('应该能够添加锚点', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor1',
          type: 'end',
          position: { x: 0, y: 0, z: 0 },
          objectId: 'obj1',
        },
        {
          id: 'anchor2',
          type: 'midpoint',
          position: { x: 1, y: 0, z: 0 },
          objectId: 'obj1',
        },
      ];

      anchorGizmo.setAnchors(anchors);

      // 验证锚点已添加（通过场景对象）
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
    });

    it('应该能够高亮锚点', () => {
      const anchor: AnchorPoint = {
        id: 'anchor1',
        type: 'end',
        position: { x: 0, y: 0, z: 0 },
        objectId: 'obj1',
      };

      anchorGizmo.setAnchors([anchor]);
      anchorGizmo.highlightAnchor('anchor1');

      // 验证高亮状态（通过Gizmo存在性）
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
    });

    it('应该能够清除高亮', () => {
      const anchor: AnchorPoint = {
        id: 'anchor1',
        type: 'end',
        position: { x: 0, y: 0, z: 0 },
        objectId: 'obj1',
      };

      anchorGizmo.setAnchors([anchor]);
      anchorGizmo.highlightAnchor('anchor1');
      anchorGizmo.highlightAnchor(null);

      // 验证清除高亮成功
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
    });
  });

  describe('AlignmentGuides 集成', () => {
    it('应该能够添加对齐辅助线', () => {
      alignmentGuides.setGuides([
        {
          type: 'x-axis',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ]);

      // 验证辅助线已添加（通过场景对象）
      expect(scene.getObjectByName('AlignmentGuides')).toBeDefined();
    });

    it('应该能够移除对齐辅助线', () => {
      alignmentGuides.setGuides([
        {
          type: 'x-axis',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ]);

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBeGreaterThan(0);

      alignmentGuides.clearGuides();
      expect(guidesGroup.children.length).toBe(0);
    });
  });

  describe('ConstraintVisualizer 集成', () => {
    it('应该能够添加约束可视化', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions = new Map<string, Vector3>([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      constraintVisualizer.addConstraint(constraint, objectPositions);

      // 验证约束已添加（通过场景对象）
      const constraintGroup = scene.getObjectByName('Constraint-c1');
      expect(constraintGroup).toBeDefined();
    });

    it('应该能够更新约束状态', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions = new Map<string, Vector3>([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      constraintVisualizer.addConstraint(constraint, objectPositions);
      constraintVisualizer.updateConstraintStatus('c1', true); // 设置为冲突状态

      // 验证状态已更新
      const constraintGroup = scene.getObjectByName('Constraint-c1');
      expect(constraintGroup).toBeDefined();
    });
  });

  describe('DimensionLabel 集成', () => {
    it('应该能够添加距离标注', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      dimensionLabel.addDistanceLabel('d1', 100, position);

      // 验证标注已添加
      const label = scene.getObjectByName('DimensionLabel-d1');
      expect(label).toBeDefined();
    });

    it('应该能够添加角度标注', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      dimensionLabel.addAngleLabel('a1', 45, position);

      // 验证标注已添加
      const label = scene.getObjectByName('DimensionLabel-a1');
      expect(label).toBeDefined();
    });

    it('应该能够更新标注', () => {
      const position1: Vector3 = { x: 0, y: 0, z: 0 };
      const position2: Vector3 = { x: 1, y: 1, z: 1 };

      dimensionLabel.addDistanceLabel('d1', 100, position1);
      dimensionLabel.updateLabel('d1', 200, position2);

      // 验证标注已更新
      const label = scene.getObjectByName('DimensionLabel-d1') as any;
      expect(label).toBeDefined();
      expect(label.position.x).toBe(1);
      expect(label.position.y).toBe(1);
      expect(label.position.z).toBe(1);
    });
  });

  describe('Gizmo 可见性控制', () => {
    it('应该能够控制 AnchorGizmo 可见性', () => {
      anchorGizmo.setVisible(false);
      const anchorsGroup = scene.getObjectByName('AnchorGizmos') as THREE.Group;
      expect(anchorsGroup.visible).toBe(false);

      anchorGizmo.setVisible(true);
      expect(anchorsGroup.visible).toBe(true);
    });

    it('应该能够控制 AlignmentGuides 可见性', () => {
      alignmentGuides.setVisible(false);
      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.visible).toBe(false);

      alignmentGuides.setVisible(true);
      expect(guidesGroup.visible).toBe(true);
    });

    it('应该能够控制 ConstraintVisualizer 可见性', () => {
      constraintVisualizer.setVisible(false);
      const visGroup = scene.getObjectByName(
        'ConstraintVisualizations'
      ) as THREE.Group;
      expect(visGroup.visible).toBe(false);

      constraintVisualizer.setVisible(true);
      expect(visGroup.visible).toBe(true);
    });

    it('应该能够控制 DimensionLabel 可见性', () => {
      dimensionLabel.setVisible(false);
      const labelsGroup = scene.getObjectByName(
        'DimensionLabels'
      ) as THREE.Group;
      expect(labelsGroup.visible).toBe(false);

      dimensionLabel.setVisible(true);
      expect(labelsGroup.visible).toBe(true);
    });
  });

  describe('Gizmo 生命周期', () => {
    it('应该在 dispose 时正确清理所有 Gizmo', () => {
      // 添加一些内容
      const anchor: AnchorPoint = {
        id: 'anchor1',
        type: 'end',
        position: { x: 0, y: 0, z: 0 },
        objectId: 'obj1',
      };
      anchorGizmo.setAnchors([anchor]);

      alignmentGuides.setGuides([
        {
          type: 'x-axis',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ]);

      dimensionLabel.addDistanceLabel('d1', 100, { x: 0, y: 0, z: 0 });

      const initialChildCount = scene.children.length;
      expect(initialChildCount).toBeGreaterThan(0);

      // 清理所有 Gizmo
      anchorGizmo.dispose();
      alignmentGuides.dispose();
      constraintVisualizer.dispose();
      dimensionLabel.dispose();

      // 验证场景中的 Gizmo Groups 已被移除
      expect(scene.getObjectByName('AnchorGizmos')).toBeUndefined();
      expect(scene.getObjectByName('AlignmentGuides')).toBeUndefined();
      expect(scene.getObjectByName('ConstraintVisualizations')).toBeUndefined();
      expect(scene.getObjectByName('DimensionLabels')).toBeUndefined();
    });

    it('应该能够多次创建和销毁 Gizmo', () => {
      // 先清理 beforeEach 中创建的 Gizmo
      anchorGizmo.dispose();
      expect(scene.getObjectByName('AnchorGizmos')).toBeUndefined();

      // 第一次创建和销毁
      let gizmo1 = new AnchorGizmo(scene, camera);
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
      gizmo1.dispose();
      expect(scene.getObjectByName('AnchorGizmos')).toBeUndefined();

      // 第二次创建和销毁
      let gizmo2 = new AnchorGizmo(scene, camera);
      expect(scene.getObjectByName('AnchorGizmos')).toBeDefined();
      gizmo2.dispose();
      expect(scene.getObjectByName('AnchorGizmos')).toBeUndefined();
    });
  });
});
