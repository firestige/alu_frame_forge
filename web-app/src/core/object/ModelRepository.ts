import type { Model, ModelType } from './types';

/**
 * 模型仓储
 * 负责模型的 CRUD 操作和查询
 */
export class ModelRepository<TMetadata = Record<string, unknown>> {
  private models: Map<string, Model<TMetadata>> = new Map();
  private idCounter = 0;

  // ==================== ID 生成 ====================

  /**
   * 生成唯一 ID
   */
  public generateId(): string {
    return `model_${++this.idCounter}_${Date.now()}`;
  }

  // ==================== CRUD 操作 ====================

  /**
   * 添加模型到仓储
   */
  public add(model: Model<TMetadata>): void {
    if (this.models.has(model.id)) {
      throw new Error(`Model with id ${model.id} already exists`);
    }

    this.models.set(model.id, model);
    console.log(`Model ${model.name} (${model.id}) added to repository`);
  }

  /**
   * 从仓储移除模型
   */
  public remove(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) {
      console.warn(`Model ${modelId} not found in repository`);
      return false;
    }

    this.models.delete(modelId);
    console.log(`Model ${model.name} (${modelId}) removed from repository`);
    return true;
  }

  /**
   * 更新模型
   */
  public update(
    modelId: string,
    updates: Partial<Model<TMetadata>>
  ): Model<TMetadata> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // 更新属性
    Object.assign(model, updates);
    model.updatedAt = new Date();

    return model;
  }

  // ==================== 查询操作 ====================

  /**
   * 根据 ID 获取模型
   */
  public getById(modelId: string): Model<TMetadata> | undefined {
    return this.models.get(modelId);
  }

  /**
   * 根据名称获取模型
   */
  public getByName(name: string): Model<TMetadata> | undefined {
    return Array.from(this.models.values()).find(m => m.name === name);
  }

  /**
   * 获取所有模型
   */
  public getAll(): Model<TMetadata>[] {
    return Array.from(this.models.values());
  }

  /**
   * 根据类型获取模型列表
   */
  public getByType(type: ModelType): Model<TMetadata>[] {
    return Array.from(this.models.values()).filter(m => m.type === type);
  }

  /**
   * 检查模型是否存在
   */
  public has(modelId: string): boolean {
    return this.models.has(modelId);
  }

  /**
   * 获取模型数量
   */
  public getCount(): number {
    return this.models.size;
  }

  /**
   * 清空所有模型
   */
  public clear(): void {
    this.models.clear();
    console.log('All models cleared from repository');
  }

  /**
   * 根据条件查询模型
   */
  public query(
    predicate: (model: Model<TMetadata>) => boolean
  ): Model<TMetadata>[] {
    return Array.from(this.models.values()).filter(predicate);
  }
}
