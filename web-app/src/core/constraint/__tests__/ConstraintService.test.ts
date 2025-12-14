/**
 * ConstraintService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstraintService } from '../ConstraintService';
import {
  ConstraintType,
  ConstraintPriority,
  ConstraintStatus,
  type FixedJointConstraint,
  type PointToPointConstraint,
} from '../types';

describe('ConstraintService', () => {
  let service: ConstraintService;

  beforeEach(() => {
    service = new ConstraintService();
  });

  describe('addConstraint()', () => {
    it('should add a valid constraint', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const result = service.addConstraint(constraint);

      expect(result).toBe(true);
      expect(service.getConstraint('constraint-1')).toBe(constraint);
    });

    it('should not add duplicate constraint', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);
      const result = service.addConstraint(constraint);

      expect(result).toBe(false);
    });

    it('should trigger onConstraintAdded callback', () => {
      const callback = vi.fn();
      service.onConstraintAdded = callback;

      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);

      expect(callback).toHaveBeenCalledWith(constraint);
    });
  });

  describe('removeConstraint()', () => {
    it('should remove existing constraint', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);
      const result = service.removeConstraint('constraint-1');

      expect(result).toBe(true);
      expect(service.getConstraint('constraint-1')).toBeUndefined();
    });

    it('should return false for non-existent constraint', () => {
      const result = service.removeConstraint('non-existent');
      expect(result).toBe(false);
    });

    it('should trigger onConstraintRemoved callback', () => {
      const callback = vi.fn();
      service.onConstraintRemoved = callback;

      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);
      service.removeConstraint('constraint-1');

      expect(callback).toHaveBeenCalledWith('constraint-1');
    });
  });

  describe('getConstraintsByObject()', () => {
    it('should return constraints for specific object', () => {
      const constraint1: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const constraint2: PointToPointConstraint = {
        id: 'constraint-2',
        type: ConstraintType.POINT_TO_POINT,
        priority: ConstraintPriority.NORMAL,
        objectIds: ['object-2', 'object-3'],
        enabled: true,
        objectAId: 'object-2',
        objectBId: 'object-3',
        anchorAId: 'anchor-1',
        anchorBId: 'anchor-2',
      };

      service.addConstraint(constraint1);
      service.addConstraint(constraint2);

      const constraints = service.getConstraintsByObject('object-2');

      expect(constraints).toHaveLength(2);
      expect(constraints).toContain(constraint1);
      expect(constraints).toContain(constraint2);
    });

    it('should return empty array for object with no constraints', () => {
      const constraints = service.getConstraintsByObject('object-999');
      expect(constraints).toHaveLength(0);
    });
  });

  describe('solveConstraints()', () => {
    it('should return success with no constraints', () => {
      const result = service.solveConstraints('object-1', {
        position: { x: 10, y: 20, z: 30 },
      });

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.adjustedTransforms.size).toBe(1);
    });

    it('should apply constraints in priority order', () => {
      const constraint1: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const constraint2: FixedJointConstraint = {
        id: 'constraint-2',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.NORMAL,
        objectIds: ['object-1', 'object-3'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-3',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint1);
      service.addConstraint(constraint2);

      const result = service.solveConstraints('object-1', {
        position: { x: 10, y: 20, z: 30 },
      });

      expect(result.success).toBe(true);
      expect(result.constraintStatus.size).toBe(2);
    });

    it('should trigger onSolveCompleted callback', () => {
      const callback = vi.fn();
      service.onSolveCompleted = callback;

      service.solveConstraints('object-1', {
        position: { x: 10, y: 20, z: 30 },
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('validateConstraint()', () => {
    it('should validate constraint with objects', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const result = service.validateConstraint(constraint);

      expect(result.valid).toBe(true);
      expect(result.status).toBe(ConstraintStatus.SATISFIED);
    });

    it('should reject constraint with no objects', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: [],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const result = service.validateConstraint(constraint);

      expect(result.valid).toBe(false);
      expect(result.status).toBe(ConstraintStatus.VIOLATED);
    });
  });

  describe('setConstraintEnabled()', () => {
    it('should enable/disable constraint', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);
      service.setConstraintEnabled('constraint-1', false);

      const retrieved = service.getConstraint('constraint-1');
      expect(retrieved?.enabled).toBe(false);
    });
  });

  describe('clearAllConstraints()', () => {
    it('should clear all constraints', () => {
      const constraint: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint);
      expect(service.getConstraintCount()).toBe(1);

      service.clearAllConstraints();
      expect(service.getConstraintCount()).toBe(0);
    });
  });

  describe('getEnabledConstraintCount()', () => {
    it('should count only enabled constraints', () => {
      const constraint1: FixedJointConstraint = {
        id: 'constraint-1',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-1', 'object-2'],
        enabled: true,
        primaryObjectId: 'object-1',
        secondaryObjectId: 'object-2',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      const constraint2: FixedJointConstraint = {
        id: 'constraint-2',
        type: ConstraintType.FIXED_JOINT,
        priority: ConstraintPriority.HIGH,
        objectIds: ['object-3', 'object-4'],
        enabled: false,
        primaryObjectId: 'object-3',
        secondaryObjectId: 'object-4',
        relativeTransform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      };

      service.addConstraint(constraint1);
      service.addConstraint(constraint2);

      expect(service.getConstraintCount()).toBe(2);
      expect(service.getEnabledConstraintCount()).toBe(1);
    });
  });
});
