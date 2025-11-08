import type { Constraint, IConstraintSolver, Model } from './types';

/**
 * 约束管理器
 * 负责约束的添加、移除、查询和求解
 */
export class ConstraintManager<TMetadata = Record<string, unknown>> {
  private constraints: Map<string, Constraint> = new Map();
  private solver?: IConstraintSolver<TMetadata>;

  constructor(solver?: IConstraintSolver<TMetadata>) {
    this.solver = solver;
  }

  // ==================== 求解器管理 ====================

  /**
   * 设置约束求解器
   */
  public setSolver(solver: IConstraintSolver<TMetadata>): void {
    this.solver = solver;
  }

  // ==================== 约束操作 ====================

  /**
   * 添加约束
   */
  public add(
    constraint: Constraint,
    modelValidator: (modelId: string) => boolean
  ): void {
    if (this.constraints.has(constraint.id)) {
      throw new Error(`Constraint ${constraint.id} already exists`);
    }

    // 验证模型是否存在
    for (const modelId of constraint.modelIds) {
      if (!modelValidator(modelId)) {
        throw new Error(`Model ${modelId} not found`);
      }
    }

    // 验证约束
    if (this.solver) {
      if (!this.solver.validateConstraint(constraint)) {
        throw new Error('Invalid constraint');
      }
      this.solver.addConstraint(constraint);
    }

    this.constraints.set(constraint.id, constraint);
    console.log(`Constraint ${constraint.id} added`);
  }

  /**
   * 移除约束
   */
  public remove(constraintId: string): boolean {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return false;
    }

    if (this.solver) {
      this.solver.removeConstraint(constraintId);
    }

    this.constraints.delete(constraintId);
    console.log(`Constraint ${constraintId} removed`);
    return true;
  }

  /**
   * 移除与某个模型相关的所有约束
   */
  public removeByModel(modelId: string): void {
    const toRemove: string[] = [];

    for (const [id, constraint] of this.constraints) {
      if (constraint.modelIds.includes(modelId)) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.remove(id));
  }

  // ==================== 查询操作 ====================

  /**
   * 获取所有约束
   */
  public getAll(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * 获取与某个模型相关的约束
   */
  public getByModel(modelId: string): Constraint[] {
    return Array.from(this.constraints.values()).filter(c =>
      c.modelIds.includes(modelId)
    );
  }

  /**
   * 根据 ID 获取约束
   */
  public getById(constraintId: string): Constraint | undefined {
    return this.constraints.get(constraintId);
  }

  /**
   * 检查约束是否存在
   */
  public has(constraintId: string): boolean {
    return this.constraints.has(constraintId);
  }

  /**
   * 获取约束数量
   */
  public getCount(): number {
    return this.constraints.size;
  }

  // ==================== 约束求解 ====================

  /**
   * 求解约束并返回更新的模型数据
   */
  public solve(
    models: Model<TMetadata>[],
    onModelUpdated?: (model: Model<TMetadata>) => void
  ): void {
    if (!this.solver) {
      console.warn('Constraint solver not set');
      return;
    }

    // 求解约束（求解器会更新模型的位置）
    this.solver.solve(models);

    // 通知外部更新
    if (onModelUpdated) {
      models.forEach(model => onModelUpdated(model));
    }
  }
}
