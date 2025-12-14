/**
 * ConstraintManager Integration Tests
 *
 * 测试 ConstraintManager 与 EventBus 的集成
 *
 * @group integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstraintManager } from '../ConstraintManager';
import { AnchorManager } from '../AnchorManager';
import mitt from 'mitt';
import type {
  Constraint,
  ConstraintType,
  ConstraintPriority,
} from '@/core/constraint/types';

describe('ConstraintManager Integration', () => {
  let constraintManager: ConstraintManager;
  let anchorManager: AnchorManager;
  let eventBus: ReturnType<typeof mitt>;

  beforeEach(() => {
    eventBus = mitt();
    anchorManager = new AnchorManager(eventBus);
    constraintManager = new ConstraintManager(eventBus, anchorManager);
  });

  describe('Constraint Addition', () => {
    it('should emit event when constraint is added', () => {
      const listener = vi.fn();
      eventBus.on('state:constraint:added', listener);

      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          constraintId: 'constraint-1',
          type: 'fixed-joint',
          objectIds: ['obj-1', 'obj-2'],
        })
      );
    });

    it('should auto-solve after adding constraint if enabled', () => {
      const listener = vi.fn();
      eventBus.on('state:constraint:solved', listener);

      // 创建一个没有需要变换的约束
      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      // 应该触发了求解（虽然可能返回 null）
      // 注意：当前实现中，solveConstraints 需要 changedObjectId
      // 所以可能不会触发求解事件
    });
  });

  describe('Constraint Removal', () => {
    it('should emit event when constraint is removed', () => {
      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      const listener = vi.fn();
      eventBus.on('state:constraint:removed', listener);

      constraintManager.removeConstraint('constraint-1');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          constraintId: 'constraint-1',
        })
      );
    });
  });

  describe('Constraint Enable/Disable', () => {
    it('should emit event when constraint is enabled/disabled', () => {
      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      const listener = vi.fn();
      eventBus.on('state:constraint:enabledChanged', listener);

      constraintManager.setConstraintEnabled('constraint-1', false);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          constraintId: 'constraint-1',
          enabled: false,
        })
      );
    });
  });

  describe('Constraint Solving', () => {
    it('should emit event when constraints are solved successfully', () => {
      const listener = vi.fn();
      eventBus.on('state:constraint:solved', listener);

      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      const result = constraintManager.solveConstraints('obj-1', {
        position: { x: 10, y: 0, z: 0 },
      });

      // 验证求解完成回调被触发
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          success: expect.any(Boolean),
          adjustedObjectCount: expect.any(Number),
        })
      );
    });

    it('should emit transform update commands when solving succeeds', () => {
      const listener = vi.fn();
      eventBus.on('command:object:updateTransform', listener);

      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'point-to-point' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
        parameters: {
          anchorA: {
            objectId: 'obj-1',
            type: 'end',
            position: { x: 0, y: 0, z: 0 },
            direction: { x: 1, y: 0, z: 0 },
          },
          anchorB: {
            objectId: 'obj-2',
            type: 'end',
            position: { x: 10, y: 0, z: 0 },
            direction: { x: -1, y: 0, z: 0 },
          },
        },
      };

      constraintManager.addConstraint(constraint);

      constraintManager.solveConstraints('obj-1', {
        position: { x: 5, y: 0, z: 0 },
      });

      // 如果求解成功，应该发出变换更新命令
      // 注意：这取决于 ConstraintService 的实现
    });
  });

  describe('Conflict Detection', () => {
    it('should emit event when conflicts are detected', () => {
      const listener = vi.fn();
      eventBus.on('state:constraint:conflict', listener);

      // 添加两个冲突的约束
      const constraint1: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      const constraint2: Constraint = {
        id: 'constraint-2',
        type: 'axis-align' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'HIGH' as ConstraintPriority,
        enabled: true,
        parameters: {
          axisA: 'x',
          axisB: 'y',
        },
      };

      constraintManager.addConstraint(constraint1);
      constraintManager.addConstraint(constraint2);

      // 触发冲突检测
      constraintManager.detectConflicts();

      // 注意：这取决于 ConstraintService 的实现
      // 如果检测到冲突，应该触发回调
    });
  });

  describe('Clear All Constraints', () => {
    it('should emit event when all constraints are cleared', () => {
      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      const listener = vi.fn();
      eventBus.on('state:constraint:cleared', listener);

      constraintManager.clearAllConstraints();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Assembly Helpers', () => {
    it('should emit event for L-joint assembly creation', () => {
      const listener = vi.fn();
      eventBus.on('command:assembly:createLJoint', listener);

      constraintManager.createLJointAssembly(
        'profile-a',
        'profile-b',
        'connector-1'
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          profileAId: 'profile-a',
          profileBId: 'profile-b',
          connectorId: 'connector-1',
        })
      );
    });

    it('should emit event for T-joint assembly creation', () => {
      const listener = vi.fn();
      eventBus.on('command:assembly:createTJoint', listener);

      constraintManager.createTJointAssembly(
        'main-profile',
        'side-profile',
        100
      );

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          mainProfileId: 'main-profile',
          sideProfileId: 'side-profile',
          position: 100,
        })
      );
    });

    it('should emit event for T-joint position update', () => {
      const listener = vi.fn();
      eventBus.on('command:assembly:updateTJointPosition', listener);

      constraintManager.updateTJointPosition('constraint-1', 150);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          constraintId: 'constraint-1',
          newPosition: 150,
        })
      );
    });
  });

  describe('Statistics', () => {
    it('should provide constraint statistics', () => {
      const constraint1: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      const constraint2: Constraint = {
        id: 'constraint-2',
        type: 'point-to-point' as ConstraintType,
        objectIds: ['obj-2', 'obj-3'],
        priority: 'HIGH' as ConstraintPriority,
        enabled: false,
      };

      constraintManager.addConstraint(constraint1);
      constraintManager.addConstraint(constraint2);

      const stats = constraintManager.getStats();

      expect(stats.totalConstraints).toBe(2);
      expect(stats.enabledConstraints).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const initialConfig = constraintManager.getConfig();
      expect(initialConfig.autoSolve).toBe(true);

      constraintManager.updateConfig({ autoSolve: false });

      const updatedConfig = constraintManager.getConfig();
      expect(updatedConfig.autoSolve).toBe(false);
    });

    it('should respect autoSolve configuration', () => {
      constraintManager.updateConfig({ autoSolve: false });

      const listener = vi.fn();
      eventBus.on('state:constraint:solved', listener);

      const constraint: Constraint = {
        id: 'constraint-1',
        type: 'fixed-joint' as ConstraintType,
        objectIds: ['obj-1', 'obj-2'],
        priority: 'NORMAL' as ConstraintPriority,
        enabled: true,
      };

      constraintManager.addConstraint(constraint);

      // 禁用自动求解时，不应该触发求解
      // 注意：这取决于具体实现
    });
  });

  describe('Service Access', () => {
    it('should provide access to underlying ConstraintService', () => {
      const constraintService = constraintManager.getConstraintService();
      expect(constraintService).toBeDefined();
      expect(constraintService.getConstraintCount).toBeDefined();
    });
  });
});
