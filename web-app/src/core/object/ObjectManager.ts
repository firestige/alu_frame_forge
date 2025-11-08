import type { IRenderer, Vector3, Euler } from '../renderer/renderer-types';
import type {
  Model,
  ModelType,
  ModelParameters,
  PrebuiltAsset,
  Constraint,
  CollisionInfo,
  ICollisionDetector,
  IConstraintSolver,
  SceneExportData,
  ObjectManagerEvents,
} from './types';
import mitt, { type Emitter } from 'mitt';
import { AssetRegistry } from './AssetRegistry';
import { ModelRepository } from './ModelRepository';
import { ModelFactory } from './ModelFactory';
import { ModelOperations } from './ModelOperations';
import { ConstraintManager } from './ConstraintManager';

/**
 * 对象管理器（重构版本 - 使用组合模式 + 事件驱动）
 * 负责模型、资产、约束等的统一管理
 *
 * 注意：从 v2.0 开始，渲染同步已迁移到 RenderSyncService
 * 建议使用 RenderSyncService 代替直接传入 renderer
 *
 * @template TMetadata - 模型元数据类型，默认为 Record<string, unknown>
 */
export class ObjectManager<TMetadata = Record<string, unknown>> {
  // 子模块
  private assetRegistry: AssetRegistry;
  private modelRepository: ModelRepository<TMetadata>;
  private modelFactory: ModelFactory<TMetadata>;
  private modelOperations: ModelOperations<TMetadata>;
  private constraintManager: ConstraintManager<TMetadata>;

  // 事件总线
  private eventBus: Emitter<ObjectManagerEvents<TMetadata>>;

  // 渲染器引用（向后兼容，建议使用 RenderSyncService 代替）
  /** @deprecated 使用 RenderSyncService 代替直接渲染器依赖 */
  private renderer?: IRenderer;
  private collisionDetector?: ICollisionDetector<TMetadata>;

  constructor(
    renderer?: IRenderer,
    collisionDetector?: ICollisionDetector<TMetadata>,
    constraintSolver?: IConstraintSolver<TMetadata>
  ) {
    this.renderer = renderer;
    this.collisionDetector = collisionDetector;

    // 初始化事件总线
    this.eventBus = mitt<ObjectManagerEvents<TMetadata>>();

    // 初始化子模块
    this.assetRegistry = new AssetRegistry();
    this.modelRepository = new ModelRepository<TMetadata>();
    this.modelFactory = new ModelFactory<TMetadata>(this.assetRegistry, () =>
      this.modelRepository.generateId()
    );
    this.modelOperations = new ModelOperations<TMetadata>(
      this.modelRepository,
      this.assetRegistry,
      this.modelFactory
    );
    this.constraintManager = new ConstraintManager<TMetadata>(constraintSolver);
  }

  // ==================== 渲染器管理 ====================

  /**
   * 设置渲染器
   * @deprecated 使用 RenderSyncService 代替直接渲染器依赖
   */
  public setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  // ==================== 事件管理 ====================

  /**
   * 订阅事件
   */
  public on<K extends keyof ObjectManagerEvents<TMetadata>>(
    event: K,
    handler: (data: ObjectManagerEvents<TMetadata>[K]) => void
  ): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 取消订阅
   */
  public off<K extends keyof ObjectManagerEvents<TMetadata>>(
    event: K,
    handler: (data: ObjectManagerEvents<TMetadata>[K]) => void
  ): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 发布事件
   */
  private emit<K extends keyof ObjectManagerEvents<TMetadata>>(
    event: K,
    data: ObjectManagerEvents<TMetadata>[K]
  ): void {
    this.eventBus.emit(event, data);
  }

  // ==================== 模型基础操作 ====================

  /**
   * 添加模型到管理器
   */
  public addModel(model: Model<TMetadata>): void {
    this.modelRepository.add(model);

    // 发布事件
    this.emit('model:added', { model });

    // 同步到渲染器
    if (this.renderer && model.renderObject) {
      this.renderer.addObject(model.renderObject, {
        interactive: true,
        modelId: model.id,
        name: model.name,
      });
    }

    console.log(`Model ${model.name} (${model.id}) added`);
  }

  /**
   * 根据 ID 移除模型
   */
  public removeModel(modelId: string): boolean {
    const model = this.modelRepository.getById(modelId);
    if (!model) {
      console.warn(`Model ${modelId} not found`);
      return false;
    }

    // 从渲染器移除
    if (this.renderer && model.renderObject) {
      this.renderer.removeObject(model.renderObject);
      this.renderer.disposeObject(model.renderObject);
    }

    // 从仓储移除
    this.modelRepository.remove(modelId);

    // 移除相关约束
    this.constraintManager.removeByModel(modelId);

    // 发布事件
    this.emit('model:removed', { modelId });

    console.log(`Model ${model.name} (${modelId}) removed`);
    return true;
  }

  /**
   * 根据 ID 获取模型
   */
  public getModel(modelId: string): Model<TMetadata> | undefined {
    return this.modelRepository.getById(modelId);
  }

  /**
   * 根据名称获取模型
   */
  public getModelByName(name: string): Model<TMetadata> | undefined {
    return this.modelRepository.getByName(name);
  }

  /**
   * 获取所有模型
   */
  public getAllModels(): Model<TMetadata>[] {
    return this.modelRepository.getAll();
  }

  /**
   * 根据类型获取模型列表
   */
  public getModelsByType(type: ModelType): Model<TMetadata>[] {
    return this.modelRepository.getByType(type);
  }

  /**
   * 更新模型属性
   */
  public updateModel(
    modelId: string,
    updates: Partial<Model<TMetadata>>
  ): void {
    const model = this.modelRepository.update(modelId, updates);

    // 发布事件
    this.emit('model:updated', { modelId, model, updates });

    // 同步到渲染器
    if (this.renderer && model.renderObject) {
      this.renderer.updateObjectTransform(model.renderObject, {
        position: updates.position,
        rotation: updates.rotation,
        scale: updates.scale,
      });

      if (updates.isVisible !== undefined) {
        this.renderer.setObjectVisibility(
          model.renderObject,
          updates.isVisible
        );
      }
    }
  }

  // ==================== 资产管理 ====================

  /**
   * 注册预制资产
   */
  public registerPrebuiltAsset(asset: PrebuiltAsset): void {
    this.assetRegistry.registerAsset(asset);
  }

  /**
   * 获取所有预制资产
   */
  public getAllPrebuiltAssets(): PrebuiltAsset[] {
    return this.assetRegistry.getAllAssets();
  }

  /**
   * 根据 ID 获取预制资产
   */
  public getPrebuiltAsset(assetId: string): PrebuiltAsset | undefined {
    return this.assetRegistry.getAsset(assetId);
  }

  /**
   * 根据类型获取预制资产
   */
  public getPrebuiltAssetsByType(type: ModelType): PrebuiltAsset[] {
    return this.assetRegistry.getAssetsByType(type);
  }

  /**
   * 从预制资产创建模型
   */
  public createModelFromAsset(
    assetId: string,
    options?: {
      name?: string;
      position?: Vector3;
      rotation?: Euler;
      parameters?: Partial<ModelParameters>;
      metadata?: TMetadata;
    }
  ): Model<TMetadata> {
    const model = this.modelFactory.createFromAsset(assetId, options);

    // 设置位置和旋转（通过渲染器）
    if (this.renderer && model.renderObject) {
      if (options?.position || options?.rotation) {
        this.renderer.updateObjectTransform(model.renderObject, {
          position: options?.position,
          rotation: options?.rotation,
        });
      }
    }

    this.addModel(model);
    return model;
  }

  // ==================== 参数化调整 ====================

  /**
   * 更新模型参数（参数化调整）
   */
  public updateModelParameters(
    modelId: string,
    parameters: Partial<ModelParameters>
  ): void {
    this.modelOperations.updateParameters(
      modelId,
      parameters,
      (oldMesh, newMesh) => {
        if (!this.renderer) return;

        const model = this.modelRepository.getById(modelId);
        if (!model) return;

        // 移除旧网格
        this.renderer.removeObject(oldMesh);
        this.renderer.disposeObject(oldMesh);

        // 添加新网格
        this.renderer.addObject(newMesh, {
          interactive: true,
          modelId: model.id,
          name: model.name,
        });

        // 恢复变换
        this.renderer.updateObjectTransform(newMesh, {
          position: model.position,
          rotation: model.rotation,
          scale: model.scale,
        });

        this.renderer.setObjectVisibility(newMesh, model.isVisible);
      }
    );
  }

  /**
   * 拉伸模型长度（针对型材）
   */
  public stretchModel(modelId: string, length: number): void {
    this.modelOperations.stretchLength(modelId, length);
  }

  /**
   * 扩大面的面积（调整宽度和高度）
   */
  public resizeFace(modelId: string, width?: number, height?: number): void {
    this.modelOperations.resizeFace(modelId, width, height);
  }

  // ==================== 碰撞检测 ====================

  /**
   * 设置碰撞检测器
   */
  public setCollisionDetector(detector: ICollisionDetector<TMetadata>): void {
    this.collisionDetector = detector;
  }

  /**
   * 检测所有模型的碰撞
   */
  public detectCollisions(): CollisionInfo[] {
    if (!this.collisionDetector) {
      console.warn('Collision detector not set');
      return [];
    }

    const models = this.modelRepository.getAll();
    return this.collisionDetector.detectCollisions(models);
  }

  /**
   * 检测单个模型的碰撞
   */
  public detectCollision(modelId: string): CollisionInfo {
    if (!this.collisionDetector) {
      throw new Error('Collision detector not set');
    }

    const model = this.modelRepository.getById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const models = this.modelRepository.getAll();
    const otherModel = models.find(m => m.id !== modelId);
    if (!otherModel) {
      throw new Error('Need at least two models for collision detection');
    }

    return this.collisionDetector.checkCollision(model, otherModel);
  }

  // ==================== 约束管理 ====================

  /**
   * 设置约束求解器
   */
  public setConstraintSolver(solver: IConstraintSolver<TMetadata>): void {
    this.constraintManager.setSolver(solver);
  }

  /**
   * 添加约束
   */
  public addConstraint(constraint: Constraint): void {
    this.constraintManager.add(constraint, (modelId: string) =>
      this.modelRepository.has(modelId)
    );
  }

  /**
   * 移除约束
   */
  public removeConstraint(constraintId: string): boolean {
    return this.constraintManager.remove(constraintId);
  }

  /**
   * 获取所有约束
   */
  public getAllConstraints(): Constraint[] {
    return this.constraintManager.getAll();
  }

  /**
   * 获取与某个模型相关的约束
   */
  public getConstraintsByModel(modelId: string): Constraint[] {
    return this.constraintManager.getByModel(modelId);
  }

  /**
   * 求解约束
   */
  public solveConstraints(): void {
    const models = this.modelRepository.getAll();
    this.constraintManager.solve(models, model => {
      if (model.renderObject && this.renderer) {
        this.renderer.updateObjectTransform(model.renderObject, {
          position: model.position,
          rotation: model.rotation,
          scale: model.scale,
        });
      }
    });
  }

  // ==================== 场景 I/O ====================

  /**
   * 导出场景数据
   */
  public exportScene(): SceneExportData<TMetadata> {
    const models = this.modelRepository.getAll().map(model => ({
      id: model.id,
      name: model.name,
      type: model.type,
      position: [model.position.x, model.position.y, model.position.z] as [
        number,
        number,
        number,
      ],
      rotation: [model.rotation.x, model.rotation.y, model.rotation.z] as [
        number,
        number,
        number,
      ],
      scale: [model.scale.x, model.scale.y, model.scale.z] as [
        number,
        number,
        number,
      ],
      parameters: model.parameters,
      metadata: model.metadata,
      isVisible: model.isVisible,
    }));

    const constraints = this.constraintManager.getAll();

    return {
      models,
      constraints,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * 导入场景数据
   */
  public importScene(data: SceneExportData<TMetadata>): void {
    this.clear();

    // 导入模型
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach(modelData => {
        const assetId = (modelData.metadata as Record<string, unknown>).assetId;
        if (assetId && typeof assetId === 'string') {
          this.createModelFromAsset(assetId, {
            name: modelData.name,
            position: {
              x: modelData.position[0],
              y: modelData.position[1],
              z: modelData.position[2],
            },
            rotation: {
              x: modelData.rotation[0],
              y: modelData.rotation[1],
              z: modelData.rotation[2],
              order: 'XYZ',
            },
            parameters: modelData.parameters,
            metadata: modelData.metadata,
          });
        }
      });
    }

    // 导入约束
    if (data.constraints && Array.isArray(data.constraints)) {
      data.constraints.forEach((constraint: Constraint) => {
        this.addConstraint(constraint);
      });
    }

    console.log('Scene imported', data);
  }

  // ==================== 辅助方法 ====================

  /**
   * 清空所有模型
   */
  public clear(): void {
    // 清理渲染对象
    const models = this.modelRepository.getAll();
    models.forEach(model => {
      if (this.renderer && model.renderObject) {
        this.renderer.removeObject(model.renderObject);
        this.renderer.disposeObject(model.renderObject);
      }
    });

    this.modelRepository.clear();

    // 发布事件
    this.emit('models:cleared', undefined);

    console.log('All models cleared');
  }
}
