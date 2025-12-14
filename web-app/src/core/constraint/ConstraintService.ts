/**
 * ConstraintService - 约束管理服务
 *
 * 职责：
 * 1. 管理约束集合（添加、删除、查询）
 * 2. 提供约束求解接口
 * 3. 验证约束可行性
 * 4. 检测约束冲突
 *
 * 设计要点：
 * - 约束数据从 SceneObject.compute 模型获取
 * - 使用 AnchorService 进行锚点查询
 * - 通过回调向上报告状态
 * - 不直接依赖渲染器（Three.js）
 *
 * @module core/constraint
 */

import type {
  Constraint,
  ConstraintType,
  ConstraintPriority,
  ConstraintSolveResult,
  ConstraintValidationResult,
  ConstraintStatus,
} from './types';
import { ConstraintStatus as Status } from './types';
import type { AnchorService } from '@/core/anchor/AnchorService';
import type { Vector3 } from '@/types';

/**
 * 约束服务
 */
export class ConstraintService {
  /** 约束集合 */
  private constraints = new Map<string, Constraint>();

  /** AnchorService 引用（用于查询锚点） */
  private anchorService: AnchorService | null = null;

  /** 回调：约束添加通知 */
  public onConstraintAdded?: (constraint: Constraint) => void;

  /** 回调：约束移除通知 */
  public onConstraintRemoved?: (constraintId: string) => void;

  /** 回调：约束求解完成 */
  public onSolveCompleted?: (result: ConstraintSolveResult) => void;

  /** 回调：约束冲突检测 */
  public onConflictDetected?: (conflicts: string[]) => void;

  /**
   * 设置 AnchorService
   */
  setAnchorService(anchorService: AnchorService): void {
    this.anchorService = anchorService;
  }

  /**
   * 添加约束
   *
   * @param constraint - 约束对象
   * @returns 是否成功添加
   */
  addConstraint(constraint: Constraint): boolean {
    // 检查是否已存在
    if (this.constraints.has(constraint.id)) {
      console.warn(`Constraint already exists: ${constraint.id}`);
      return false;
    }

    // 验证约束
    const validation = this.validateConstraint(constraint);
    if (!validation.valid) {
      console.error(`Invalid constraint: ${validation.error}`);
      return false;
    }

    // 添加到集合
    this.constraints.set(constraint.id, constraint);

    // 触发回调
    if (this.onConstraintAdded) {
      this.onConstraintAdded(constraint);
    }

    return true;
  }

  /**
   * 移除约束
   *
   * @param constraintId - 约束 ID
   * @returns 是否成功移除
   */
  removeConstraint(constraintId: string): boolean {
    const removed = this.constraints.delete(constraintId);

    if (removed && this.onConstraintRemoved) {
      this.onConstraintRemoved(constraintId);
    }

    return removed;
  }

  /**
   * 获取约束
   *
   * @param constraintId - 约束 ID
   * @returns 约束对象，如果不存在则返回 undefined
   */
  getConstraint(constraintId: string): Constraint | undefined {
    return this.constraints.get(constraintId);
  }

  /**
   * 获取对象相关的所有约束
   *
   * @param objectId - 对象 ID
   * @returns 约束数组
   */
  getConstraintsByObject(objectId: string): Constraint[] {
    const result: Constraint[] = [];

    for (const constraint of this.constraints.values()) {
      if (constraint.objectIds.includes(objectId)) {
        result.push(constraint);
      }
    }

    return result;
  }

  /**
   * 获取所有约束
   *
   * @returns 约束数组
   */
  getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * 启用/禁用约束
   *
   * @param constraintId - 约束 ID
   * @param enabled - 是否启用
   */
  setConstraintEnabled(constraintId: string, enabled: boolean): void {
    const constraint = this.constraints.get(constraintId);
    if (constraint) {
      constraint.enabled = enabled;
    }
  }

  /**
   * 求解约束
   *
   * @param changedObjectId - 发生变化的对象 ID
   * @param proposedTransform - 提议的变换
   * @returns 求解结果
   */
  solveConstraints(
    changedObjectId: string,
    proposedTransform: {
      position: Vector3;
      rotation?: { x: number; y: number; z: number };
    }
  ): ConstraintSolveResult {
    const startTime = performance.now();

    // 获取相关约束
    const relevantConstraints = this.getConstraintsByObject(changedObjectId)
      .filter(c => c.enabled)
      .sort((a, b) => b.priority - a.priority); // 按优先级降序

    if (relevantConstraints.length === 0) {
      // 无约束，直接返回提议的变换
      const result: ConstraintSolveResult = {
        success: true,
        adjustedTransforms: new Map([
          [
            changedObjectId,
            {
              position: proposedTransform.position,
              rotation: proposedTransform.rotation || { x: 0, y: 0, z: 0 },
            },
          ],
        ]),
        constraintStatus: new Map(),
        conflicts: [],
        solveTime: performance.now() - startTime,
      };

      // 触发回调
      if (this.onSolveCompleted) {
        this.onSolveCompleted(result);
      }

      return result;
    }

    // 简化求解：应用约束修正
    const adjustedTransforms = new Map<
      string,
      { position: Vector3; rotation: { x: number; y: number; z: number } }
    >();
    const constraintStatus = new Map<string, ConstraintStatus>();
    const conflicts: string[] = [];

    // 当前变换（初始为提议的变换）
    let currentTransform = {
      position: { ...proposedTransform.position },
      rotation: proposedTransform.rotation || { x: 0, y: 0, z: 0 },
    };

    // 逐个应用约束
    for (const constraint of relevantConstraints) {
      const validation = this.validateConstraint(constraint);

      if (!validation.valid) {
        constraintStatus.set(constraint.id, Status.VIOLATED);
        conflicts.push(constraint.id);
        continue;
      }

      // 根据约束类型应用修正
      const adjusted = this.applyConstraint(constraint, currentTransform);

      if (adjusted) {
        currentTransform = adjusted;
        constraintStatus.set(constraint.id, Status.SATISFIED);
      } else {
        constraintStatus.set(constraint.id, Status.PARTIAL);
      }
    }

    adjustedTransforms.set(changedObjectId, currentTransform);

    const result: ConstraintSolveResult = {
      success: conflicts.length === 0,
      adjustedTransforms,
      constraintStatus,
      conflicts,
      solveTime: performance.now() - startTime,
    };

    // 触发回调
    if (this.onSolveCompleted) {
      this.onSolveCompleted(result);
    }

    if (conflicts.length > 0 && this.onConflictDetected) {
      this.onConflictDetected(conflicts);
    }

    return result;
  }

  /**
   * 应用约束修正
   *
   * @private
   */
  private applyConstraint(
    constraint: Constraint,
    currentTransform: {
      position: Vector3;
      rotation: { x: number; y: number; z: number };
    }
  ): {
    position: Vector3;
    rotation: { x: number; y: number; z: number };
  } | null {
    // TODO: 实现具体的约束求解逻辑
    // 当前简化：返回原始变换
    return currentTransform;
  }

  /**
   * 验证约束
   *
   * @param constraint - 约束对象
   * @returns 验证结果
   */
  validateConstraint(constraint: Constraint): ConstraintValidationResult {
    // 检查对象 ID 是否存在
    if (!constraint.objectIds || constraint.objectIds.length === 0) {
      return {
        valid: false,
        status: Status.VIOLATED,
        error: 'Constraint has no objects',
      };
    }

    // TODO: 添加更详细的验证逻辑
    // - 检查对象是否存在
    // - 检查锚点是否存在
    // - 检查约束参数是否合理

    return {
      valid: true,
      status: Status.SATISFIED,
    };
  }

  /**
   * 检测约束冲突
   *
   * @returns 冲突的约束 ID 数组
   */
  detectConflicts(): string[] {
    const conflicts: string[] = [];

    // TODO: 实现冲突检测算法
    // - 检查同一对象的多个约束是否冲突
    // - 检查约束循环
    // - 检查不可满足的约束组合

    return conflicts;
  }

  /**
   * 清空所有约束
   */
  clearAllConstraints(): void {
    this.constraints.clear();
  }

  /**
   * 获取约束数量
   */
  getConstraintCount(): number {
    return this.constraints.size;
  }

  /**
   * 获取启用的约束数量
   */
  getEnabledConstraintCount(): number {
    let count = 0;
    for (const constraint of this.constraints.values()) {
      if (constraint.enabled) {
        count++;
      }
    }
    return count;
  }
}
