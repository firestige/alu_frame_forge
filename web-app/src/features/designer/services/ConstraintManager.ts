/**
 * ConstraintManager - Features 层约束管理器
 *
 * 职责：
 * 1. 管理 Core 层的 ConstraintService
 * 2. 设置回调并连接到 EventBus
 * 3. 提供 Features 层的约束管理 API
 * 4. 集成 AnchorManager 进行约束求解
 *
 * 设计模式：
 * - Facade 模式：简化 Core 层服务的使用
 * - Observer 模式：监听 Core 服务事件并发布到 EventBus
 *
 * @module features/designer/services
 */

import { ConstraintService } from '@/core/constraint/ConstraintService';
import type {
  Constraint,
  ConstraintSolveResult,
  ConstraintValidationResult,
} from '@/core/constraint/types';
import type { AnchorManager } from './AnchorManager';
import type { EventBus } from '@/core/services/eventBus';
import type { Vector3 } from '@/types';

/**
 * 约束管理器配置
 */
export interface ConstraintManagerConfig {
  /** 是否自动求解约束 */
  autoSolve?: boolean;

  /** 求解超时时间（毫秒） */
  solveTimeout?: number;

  /** 是否启用冲突检测 */
  enableConflictDetection?: boolean;
}

/**
 * 约束管理器
 */
export class ConstraintManager {
  private constraintService: ConstraintService;
  private anchorManager: AnchorManager;
  private eventBus: EventBus;
  private config: Required<ConstraintManagerConfig>;

  constructor(
    eventBus: EventBus,
    anchorManager: AnchorManager,
    config?: ConstraintManagerConfig
  ) {
    this.eventBus = eventBus;
    this.anchorManager = anchorManager;
    this.constraintService = new ConstraintService();

    // 默认配置
    this.config = {
      autoSolve: true,
      solveTimeout: 1000,
      enableConflictDetection: true,
      ...config,
    };

    this.setupCallbacks();
    this.setupAnchorService();
  }

  /**
   * 设置 Core 服务回调，连接到 EventBus
   *
   * @private
   */
  private setupCallbacks(): void {
    // 约束添加回调
    this.constraintService.onConstraintAdded = (constraint: Constraint) => {
      this.eventBus.emit('state:constraint:added', {
        constraintId: constraint.id,
        type: constraint.type,
        objectIds: constraint.objectIds,
        timestamp: Date.now(),
      });
    };

    // 约束移除回调
    this.constraintService.onConstraintRemoved = (constraintId: string) => {
      this.eventBus.emit('state:constraint:removed', {
        constraintId,
        timestamp: Date.now(),
      });
    };

    // 约束求解完成回调
    this.constraintService.onSolveCompleted = (
      result: ConstraintSolveResult
    ) => {
      this.eventBus.emit('state:constraint:solved', {
        success: result.success,
        adjustedObjectCount: result.adjustedTransforms.size,
        conflicts: result.conflicts,
        solveTime: result.solveTime,
        timestamp: Date.now(),
      });

      // 如果求解成功，发布变换更新命令
      if (result.success) {
        for (const [
          objectId,
          transform,
        ] of result.adjustedTransforms.entries()) {
          this.eventBus.emit('command:object:updateTransform', {
            objectId,
            transform,
            source: 'constraint-solver',
            timestamp: Date.now(),
          });
        }
      }
    };

    // 约束冲突检测回调
    this.constraintService.onConflictDetected = (conflicts: string[]) => {
      this.eventBus.emit('state:constraint:conflict', {
        conflicts,
        count: conflicts.length,
        timestamp: Date.now(),
      });
    };
  }

  /**
   * 设置 AnchorService 到 ConstraintService
   *
   * @private
   */
  private setupAnchorService(): void {
    const anchorService = this.anchorManager.getAnchorService();
    this.constraintService.setAnchorService(anchorService);
  }

  /**
   * 添加约束
   *
   * @param constraint - 约束对象
   * @returns 是否成功添加
   */
  addConstraint(constraint: Constraint): boolean {
    const success = this.constraintService.addConstraint(constraint);

    // 如果启用自动求解且添加成功，触发求解
    if (success && this.config.autoSolve) {
      this.solveConstraints();
    }

    return success;
  }

  /**
   * 移除约束
   *
   * @param constraintId - 约束 ID
   * @returns 是否成功移除
   */
  removeConstraint(constraintId: string): boolean {
    const success = this.constraintService.removeConstraint(constraintId);

    // 如果启用自动求解且移除成功，触发求解
    if (success && this.config.autoSolve) {
      this.solveConstraints();
    }

    return success;
  }

  /**
   * 获取约束
   *
   * @param constraintId - 约束 ID
   * @returns 约束对象
   */
  getConstraint(constraintId: string): Constraint | undefined {
    return this.constraintService.getConstraint(constraintId);
  }

  /**
   * 获取对象相关的约束
   *
   * @param objectId - 对象 ID
   * @returns 约束数组
   */
  getConstraintsByObject(objectId: string): Constraint[] {
    return this.constraintService.getConstraintsByObject(objectId);
  }

  /**
   * 获取所有约束
   *
   * @returns 约束数组
   */
  getAllConstraints(): Constraint[] {
    return this.constraintService.getAllConstraints();
  }

  /**
   * 启用/禁用约束
   *
   * @param constraintId - 约束 ID
   * @param enabled - 是否启用
   */
  setConstraintEnabled(constraintId: string, enabled: boolean): void {
    this.constraintService.setConstraintEnabled(constraintId, enabled);

    // 发布状态变化事件
    this.eventBus.emit('state:constraint:enabledChanged', {
      constraintId,
      enabled,
      timestamp: Date.now(),
    });

    // 如果启用自动求解，触发求解
    if (this.config.autoSolve) {
      this.solveConstraints();
    }
  }

  /**
   * 求解约束
   *
   * @param changedObjectId - 发生变化的对象 ID（可选）
   * @param proposedTransform - 提议的变换（可选）
   * @returns 求解结果
   */
  solveConstraints(
    changedObjectId?: string,
    proposedTransform?: {
      position: Vector3;
      rotation?: { x: number; y: number; z: number };
    }
  ): ConstraintSolveResult | null {
    if (!changedObjectId || !proposedTransform) {
      // 如果没有指定对象，不执行求解
      // TODO: 实现全局约束求解
      return null;
    }

    return this.constraintService.solveConstraints(
      changedObjectId,
      proposedTransform
    );
  }

  /**
   * 验证约束
   *
   * @param constraint - 约束对象
   * @returns 验证结果
   */
  validateConstraint(constraint: Constraint): ConstraintValidationResult {
    return this.constraintService.validateConstraint(constraint);
  }

  /**
   * 检测约束冲突
   *
   * @returns 冲突的约束 ID 数组
   */
  detectConflicts(): string[] {
    if (!this.config.enableConflictDetection) {
      return [];
    }

    return this.constraintService.detectConflicts();
  }

  /**
   * 清空所有约束
   */
  clearAllConstraints(): void {
    this.constraintService.clearAllConstraints();

    // 发布清空事件
    this.eventBus.emit('state:constraint:cleared', {
      timestamp: Date.now(),
    });
  }

  /**
   * 创建 L 型装配约束
   *
   * @param profileAId - 型材 A ID
   * @param profileBId - 型材 B ID
   * @param connectorId - 角码 ID
   * @returns 是否成功创建
   */
  createLJointAssembly(
    profileAId: string,
    profileBId: string,
    connectorId: string
  ): boolean {
    // TODO: 实现 L 型装配约束创建逻辑
    // 1. 创建固定连接约束
    // 2. 创建点对点约束（角码孔与型材端面）
    // 3. 创建轴对齐约束

    this.eventBus.emit('command:assembly:createLJoint', {
      profileAId,
      profileBId,
      connectorId,
      timestamp: Date.now(),
    });

    return false; // 暂时返回 false
  }

  /**
   * 创建 T 型滑动装配约束
   *
   * @param mainProfileId - 主型材 ID
   * @param sideProfileId - 侧型材 ID
   * @param position - 滑动位置
   * @returns 是否成功创建
   */
  createTJointAssembly(
    mainProfileId: string,
    sideProfileId: string,
    position: number
  ): boolean {
    // TODO: 实现 T 型装配约束创建逻辑
    // 1. 创建滑动约束
    // 2. 创建点对点约束（侧型材端面与主型材侧面）

    this.eventBus.emit('command:assembly:createTJoint', {
      mainProfileId,
      sideProfileId,
      position,
      timestamp: Date.now(),
    });

    return false; // 暂时返回 false
  }

  /**
   * 更新 T 型装配的滑动位置
   *
   * @param constraintId - 约束 ID
   * @param newPosition - 新位置
   */
  updateTJointPosition(constraintId: string, newPosition: number): void {
    // TODO: 更新滑动约束的位置参数

    this.eventBus.emit('command:assembly:updateTJointPosition', {
      constraintId,
      newPosition,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalConstraints: number;
    enabledConstraints: number;
    conflicts: number;
  } {
    return {
      totalConstraints: this.constraintService.getConstraintCount(),
      enabledConstraints: this.constraintService.getEnabledConstraintCount(),
      conflicts: this.detectConflicts().length,
    };
  }

  /**
   * 获取底层 ConstraintService（用于高级场景）
   */
  getConstraintService(): ConstraintService {
    return this.constraintService;
  }

  /**
   * 更新配置
   *
   * @param config - 新配置
   */
  updateConfig(config: Partial<ConstraintManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<ConstraintManagerConfig> {
    return { ...this.config };
  }
}
