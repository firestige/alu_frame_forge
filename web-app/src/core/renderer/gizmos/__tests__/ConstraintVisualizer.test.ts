/**
 * ConstraintVisualizer 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ConstraintVisualizer } from '../ConstraintVisualizer';
import type { Constraint } from '@/core/constraint/types';
import type { Vector3 } from '@/types';

describe('ConstraintVisualizer', () => {
  let scene: THREE.Scene;
  let visualizer: ConstraintVisualizer;

  beforeEach(() => {
    scene = new THREE.Scene();
    visualizer = new ConstraintVisualizer(scene);
  });

  afterEach(() => {
    visualizer.dispose();
  });

  describe('初始化', () => {
    it('should create visualizer with default config', () => {
      expect(visualizer).toBeDefined();
      expect(scene.children).toHaveLength(1); // ConstraintsGroup
    });

    it('should create visualizer with custom config', () => {
      const customVisualizer = new ConstraintVisualizer(scene, {
        enabled: false,
        style: {
          normalColor: 0xffffff,
          conflictColor: 0xff0000,
          warningColor: 0xffff00,
          lineWidth: 3,
          symbolSize: 1.0,
          opacity: 0.5,
        },
      });

      expect(customVisualizer).toBeDefined();
      customVisualizer.dispose();
    });
  });

  describe('添加约束', () => {
    const objectPositions: Map<string, Vector3> = new Map([
      ['obj1', { x: 0, y: 0, z: 0 }],
      ['obj2', { x: 1, y: 0, z: 0 }],
    ]);

    it('should add fixed-joint constraint', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
      expect(group!.children.length).toBeGreaterThan(0);
    });

    it('should add point-to-point constraint', () => {
      const constraint: Constraint = {
        id: 'c2',
        type: 'point-to-point',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c2');
      expect(group).toBeDefined();
      expect(group!.children.length).toBeGreaterThan(0);
    });

    it('should add axis-align constraint', () => {
      const constraint: Constraint = {
        id: 'c3',
        type: 'axis-align',
        objectIds: ['obj1', 'obj2'],
        parameters: { axis: 'x' },
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c3');
      expect(group).toBeDefined();
    });

    it('should add sliding-joint constraint', () => {
      const constraint: Constraint = {
        id: 'c4',
        type: 'sliding-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c4');
      expect(group).toBeDefined();
    });

    it('should add distance constraint', () => {
      const constraint: Constraint = {
        id: 'c5',
        type: 'distance',
        objectIds: ['obj1', 'obj2'],
        parameters: { distance: 1.0 },
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c5');
      expect(group).toBeDefined();
    });

    it('should add angle constraint', () => {
      const constraint: Constraint = {
        id: 'c6',
        type: 'angle',
        objectIds: ['obj1', 'obj2'],
        parameters: { angle: 90 },
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      const group = scene.getObjectByName('Constraint-c6');
      expect(group).toBeDefined();
    });

    it('should handle missing object positions', () => {
      const constraint: Constraint = {
        id: 'c7',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj-missing'],
        parameters: {},
        priority: 10,
      };

      visualizer.addConstraint(constraint, objectPositions);

      // 应该不会创建可视化（因为位置不足）
      const group = scene.getObjectByName('Constraint-c7');
      expect(group).toBeUndefined();
    });

    it('should replace existing constraint', () => {
      const constraint1: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const constraint2: Constraint = {
        id: 'c1', // 相同 ID
        type: 'point-to-point',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 20,
      };

      visualizer.addConstraint(constraint1, objectPositions);
      visualizer.addConstraint(constraint2, objectPositions);

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
      expect(group!.children.length).toBeGreaterThan(0);
    });
  });

  describe('移除约束', () => {
    it('should remove constraint', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      expect(scene.getObjectByName('Constraint-c1')).toBeDefined();

      visualizer.removeConstraint('c1');
      expect(scene.getObjectByName('Constraint-c1')).toBeUndefined();
    });

    it('should handle removing non-existent constraint', () => {
      expect(() => visualizer.removeConstraint('non-existent')).not.toThrow();
    });
  });

  describe('约束状态', () => {
    it('should update constraint status to conflict', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      visualizer.updateConstraintStatus('c1', true);

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
    });

    it('should update constraint status to normal', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      visualizer.updateConstraintStatus('c1', true);
      visualizer.updateConstraintStatus('c1', false);

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
    });
  });

  describe('高亮约束', () => {
    it('should highlight constraint', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      visualizer.highlightConstraint('c1');

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
    });

    it('should clear highlight', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      visualizer.highlightConstraint('c1');
      visualizer.highlightConstraint(null);

      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
    });
  });

  describe('清空约束', () => {
    it('should clear all constraints', () => {
      const constraints: Constraint[] = [
        {
          id: 'c1',
          type: 'fixed-joint',
          objectIds: ['obj1', 'obj2'],
          parameters: {},
          priority: 10,
        },
        {
          id: 'c2',
          type: 'point-to-point',
          objectIds: ['obj1', 'obj2'],
          parameters: {},
          priority: 10,
        },
      ];

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      constraints.forEach(c => visualizer.addConstraint(c, objectPositions));
      expect(scene.getObjectByName('Constraint-c1')).toBeDefined();
      expect(scene.getObjectByName('Constraint-c2')).toBeDefined();

      visualizer.clearConstraints();
      expect(scene.getObjectByName('Constraint-c1')).toBeUndefined();
      expect(scene.getObjectByName('Constraint-c2')).toBeUndefined();
    });
  });

  describe('可见性', () => {
    it('should set visibility', () => {
      visualizer.setVisible(false);

      const group = scene.getObjectByName('ConstraintVisualizations');
      expect(group).toBeDefined();
      expect(group!.visible).toBe(false);

      visualizer.setVisible(true);
      expect(group!.visible).toBe(true);
    });
  });

  describe('配置更新', () => {
    it('should update config', () => {
      visualizer.updateConfig({
        style: {
          normalColor: 0xffffff,
          conflictColor: 0x00ff00,
          warningColor: 0x0000ff,
          lineWidth: 3,
          symbolSize: 1.0,
          opacity: 0.5,
        },
      });

      // 验证配置已更新（通过添加约束测试）
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      const group = scene.getObjectByName('Constraint-c1');
      expect(group).toBeDefined();
    });
  });

  describe('销毁', () => {
    it('should dispose resources', () => {
      const constraint: Constraint = {
        id: 'c1',
        type: 'fixed-joint',
        objectIds: ['obj1', 'obj2'],
        parameters: {},
        priority: 10,
      };

      const objectPositions: Map<string, Vector3> = new Map([
        ['obj1', { x: 0, y: 0, z: 0 }],
        ['obj2', { x: 1, y: 0, z: 0 }],
      ]);

      visualizer.addConstraint(constraint, objectPositions);
      expect(scene.children.length).toBeGreaterThan(0);

      visualizer.dispose();
      expect(scene.getObjectByName('ConstraintVisualizations')).toBeUndefined();
    });
  });
});
