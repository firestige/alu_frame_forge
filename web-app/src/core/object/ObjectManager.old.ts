import type { IRenderer, Vector3, Euler } from '../renderer/renderer-types';
import {
  GeometryFactory,
  MaterialFactory,
  MeshFactory,
  type GeometryParams,
} from '../renderer';

// ==================== 类型定义 ====================

/**
 * 实体模型（泛型版本，支持类型安全的 metadata）
 * @template TMetadata - 元数据类型，默认为 Record<string, unknown>
 */
export interface Model<TMetadata = Record<string, unknown>> {
  id: string;
  name: string;
  type: ModelType;
  renderObject: unknown; // 渲染对象句柄（不依赖具体实现）
  isVisible: boolean;
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  // 参数化属性
  parameters: ModelParameters;
  // 元数据（泛型，支持类型安全）
  metadata: TMetadata;
  // 创建和修改时间
  createdAt: Date;
  updatedAt: Date;
}

// 模型类型
export const ModelType = {
  ALUMINUM_PROFILE: 'aluminum_profile',
  CONNECTOR: 'connector',
  PANEL: 'panel',
  CUSTOM: 'custom',
} as const;

export type ModelType = (typeof ModelType)[keyof typeof ModelType];

// 模型参数
export interface ModelParameters {
  // 拉伸长度（针对型材）
  length?: number;
  // 宽度
  width?: number;
  // 高度
  height?: number;
  // 厚度
  thickness?: number;
  // 自定义参数（使用 unknown 代替 any）
  [key: string]: unknown;
}

// 素材库中的预制模型定义
export interface PrebuiltAsset {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  // 默认几何体工厂函数（返回渲染无关的参数）
  createGeometry: (params: ModelParameters) => GeometryParams;
  // 默认材质配置
  defaultMaterial: 'aluminum' | 'connector' | 'panel' | 'standard';
  // 默认参数
  defaultParameters: ModelParameters;
  // 缩略图 URL
  thumbnailUrl?: string;
}

// 碰撞信息
export interface CollisionInfo {
  modelA: string; // Model ID
  modelB: string; // Model ID
  isColliding: boolean;
  penetrationDepth?: number;
  contactPoints?: Vector3[];
}

// 约束类型
export const ConstraintType = {
  FIXED: 'fixed',
  ALIGN: 'align',
  DISTANCE: 'distance',
  PARALLEL: 'parallel',
  PERPENDICULAR: 'perpendicular',
} as const;

export type ConstraintType =
  (typeof ConstraintType)[keyof typeof ConstraintType];

// 约束定义
export interface Constraint {
  id: string;
  type: ConstraintType;
  modelIds: string[]; // 涉及的模型 ID
  parameters: Record<string, unknown>;
  isActive: boolean;
}

// ==================== 外部依赖接口 ====================

// 场景导出数据类型
export interface SceneExportData<TMetadata = Record<string, unknown>> {
  models: Array<{
    id: string;
    name: string;
    type: ModelType;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    parameters: ModelParameters;
    metadata: TMetadata;
    isVisible: boolean;
  }>;
  constraints: Constraint[];
  exportedAt: string;
}

// 碰撞检测服务接口（外部实现）
export interface ICollisionDetector<TMetadata = Record<string, unknown>> {
  detectCollisions(models: Model<TMetadata>[]): CollisionInfo[];
  checkCollision(
    modelA: Model<TMetadata>,
    modelB: Model<TMetadata>
  ): CollisionInfo;
}

// 约束求解器接口（外部实现）
export interface IConstraintSolver<TMetadata = Record<string, unknown>> {
  addConstraint(constraint: Constraint): void;
  removeConstraint(constraintId: string): void;
  solve(models: Model<TMetadata>[]): void;
  validateConstraint(constraint: Constraint): boolean;
}

// ==================== 实体管理服务 ====================

/**
 * 对象管理器（泛型版本）
 * @template TMetadata - 模型元数据类型，默认为 Record<string, unknown>
 */
export class ObjectManager<TMetadata = Record<string, unknown>> {
  private models: Map<string, Model<TMetadata>> = new Map();
  private prebuiltAssets: Map<string, PrebuiltAsset> = new Map();
  private collisionDetector?: ICollisionDetector<TMetadata>;
  private constraintSolver?: IConstraintSolver<TMetadata>;
  private constraints: Map<string, Constraint> = new Map();
  private renderer?: IRenderer;

  constructor(
    renderer?: IRenderer,
    collisionDetector?: ICollisionDetector<TMetadata>,
    constraintSolver?: IConstraintSolver<TMetadata>
  ) {
    this.renderer = renderer;
    this.collisionDetector = collisionDetector;
    this.constraintSolver = constraintSolver;
    this.initializePrebuiltAssets();
  }

  // ==================== 渲染器管理 ====================

  public setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  // ==================== 实体基础操作 ====================

  /**
   * 添加实体到管理器
   */
  public addModel(model: Model<TMetadata>): void {
    if (this.models.has(model.id)) {
      throw new Error(`Model with id ${model.id} already exists`);
    }

    this.models.set(model.id, model);

    // 通过渲染器添加到场景
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
   * 根据 ID 移除实体
   */
  public removeModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) {
      console.warn(`Model ${modelId} not found`);
      return false;
    }

    // 通过渲染器从场景移除
    if (this.renderer && model.renderObject) {
      this.renderer.removeObject(model.renderObject);
      this.renderer.disposeObject(model.renderObject);
    }

    this.models.delete(modelId);

    // 移除相关约束
    this.removeConstraintsByModel(modelId);

    console.log(`Model ${model.name} (${modelId}) removed`);
    return true;
  }

  /**
   * 根据 ID 获取实体
   */
  public getModel(modelId: string): Model<TMetadata> | undefined {
    return this.models.get(modelId);
  }

  /**
   * 根据名称获取实体
   */
  public getModelByName(name: string): Model<TMetadata> | undefined {
    return Array.from(this.models.values()).find(m => m.name === name);
  }

  /**
   * 获取所有实体
   */
  public getAllModels(): Model<TMetadata>[] {
    return Array.from(this.models.values());
  }

  /**
   * 根据类型获取实体列表
   */
  public getModelsByType(type: ModelType): Model<TMetadata>[] {
    return Array.from(this.models.values()).filter(m => m.type === type);
  }

  /**
   * 更新实体属性
   */
  public updateModel(
    modelId: string,
    updates: Partial<Model<TMetadata>>
  ): void {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // 更新基本属性
    Object.assign(model, updates);
    model.updatedAt = new Date();

    // 通过渲染器同步变换
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

  // ==================== 素材库管理 ====================

  /**
   * 初始化预制素材库
   */
  private initializePrebuiltAssets(): void {
    // 铝型材 - 20x20mm
    this.registerPrebuiltAsset({
      id: 'alu_profile_20x20',
      name: '20x20 铝型材',
      type: ModelType.ALUMINUM_PROFILE,
      description: '标准 20x20mm 铝型材',
      createGeometry: (params: ModelParameters) => ({
        length: params.length || 1000,
        width: 20,
        height: 20,
      }),
      defaultMaterial: 'aluminum',
      defaultParameters: {
        length: 1000,
        width: 20,
        height: 20,
      },
    });

    // 铝型材 - 40x40mm
    this.registerPrebuiltAsset({
      id: 'alu_profile_40x40',
      name: '40x40 铝型材',
      type: ModelType.ALUMINUM_PROFILE,
      description: '标准 40x40mm 铝型材',
      createGeometry: (params: ModelParameters) => ({
        length: params.length || 1000,
        width: 40,
        height: 40,
      }),
      defaultMaterial: 'aluminum',
      defaultParameters: {
        length: 1000,
        width: 40,
        height: 40,
      },
    });

    // 连接件
    this.registerPrebuiltAsset({
      id: 'corner_connector',
      name: '直角连接件',
      type: ModelType.CONNECTOR,
      description: '90度直角连接件',
      createGeometry: () => ({
        width: 30,
        height: 30,
        thickness: 30,
      }),
      defaultMaterial: 'connector',
      defaultParameters: {
        width: 30,
        height: 30,
        thickness: 30,
      },
    });

    // 面板
    this.registerPrebuiltAsset({
      id: 'acrylic_panel',
      name: '亚克力面板',
      type: ModelType.PANEL,
      description: '透明亚克力面板',
      createGeometry: (params: ModelParameters) => ({
        width: params.width || 500,
        height: params.height || 500,
        thickness: params.thickness || 3,
      }),
      defaultMaterial: 'panel',
      defaultParameters: {
        width: 500,
        height: 500,
        thickness: 3,
      },
    });
  }

  /**
   * 注册预制素材
   */
  public registerPrebuiltAsset(asset: PrebuiltAsset): void {
    this.prebuiltAssets.set(asset.id, asset);
    console.log(`Prebuilt asset ${asset.name} registered`);
  }

  /**
   * 获取所有预制素材
   */
  public getAllPrebuiltAssets(): PrebuiltAsset[] {
    return Array.from(this.prebuiltAssets.values());
  }

  /**
   * 根据 ID 获取预制素材
   */
  public getPrebuiltAsset(assetId: string): PrebuiltAsset | undefined {
    return this.prebuiltAssets.get(assetId);
  }

  /**
   * 根据类型获取预制素材
   */
  public getPrebuiltAssetsByType(type: ModelType): PrebuiltAsset[] {
    return Array.from(this.prebuiltAssets.values()).filter(
      asset => asset.type === type
    );
  }

  /**
   * 从预制素材创建实体
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
    const asset = this.prebuiltAssets.get(assetId);
    if (!asset) {
      throw new Error(`Prebuilt asset ${assetId} not found`);
    }

    // 合并参数
    const parameters = {
      ...asset.defaultParameters,
      ...options?.parameters,
    };

    // 获取几何体参数
    const geometryParams = asset.createGeometry(parameters);

    // 根据类型创建网格对象
    let mesh: unknown;
    switch (asset.type) {
      case ModelType.ALUMINUM_PROFILE: {
        const size =
          geometryParams.width === 20 || geometryParams.height === 20
            ? '20x20'
            : '40x40';
        mesh = MeshFactory.createAluminumProfileMesh(size, geometryParams);
        break;
      }
      case ModelType.CONNECTOR: {
        mesh = MeshFactory.createConnectorMesh(geometryParams);
        break;
      }
      case ModelType.PANEL: {
        mesh = MeshFactory.createPanelMesh(geometryParams);
        break;
      }
      default: {
        // 自定义类型使用标准材质
        const geometry = GeometryFactory.createBox(
          (geometryParams.width || 100) / 1000,
          (geometryParams.height || 100) / 1000,
          (geometryParams.thickness || 100) / 1000
        );
        const material = MaterialFactory.createStandard();
        mesh = MeshFactory.createMesh(geometry, material);
      }
    }

    // 设置位置和旋转（通过渲染器）
    if (this.renderer && mesh) {
      if (options?.position || options?.rotation) {
        this.renderer.updateObjectTransform(mesh, {
          position: options?.position,
          rotation: options?.rotation,
        });
      }
    }

    // 创建模型
    const model: Model<TMetadata> = {
      id: this.generateId(),
      name: options?.name || `${asset.name}_${Date.now()}`,
      type: asset.type,
      renderObject: mesh,
      isVisible: true,
      position: options?.position || { x: 0, y: 0, z: 0 },
      rotation: options?.rotation || { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
      parameters,
      metadata: (options?.metadata || {
        assetId,
      }) as TMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // 合并参数
    model.parameters = {
      ...model.parameters,
      ...parameters,
    };
    model.updatedAt = new Date();

    // 重新生成几何体
    const assetId = (model.metadata as Record<string, unknown>).assetId;
    if (assetId && typeof assetId === 'string') {
      const asset = this.prebuiltAssets.get(assetId);
      if (asset) {
        this.regenerateGeometry(model, asset);
      }
    }

    console.log(`Model ${model.name} parameters updated`, parameters);
  }

  /**
   * 拉伸模型长度（针对型材）
   */
  public stretchModel(modelId: string, length: number): void {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }

    this.updateModelParameters(modelId, { length });
  }

  /**
   * 扩大面的面积（调整宽度和高度）
   */
  public resizeFace(modelId: string, width?: number, height?: number): void {
    const updates: Partial<ModelParameters> = {};

    if (width !== undefined && width > 0) {
      updates.width = width;
    }
    if (height !== undefined && height > 0) {
      updates.height = height;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('At least one dimension must be provided');
    }

    this.updateModelParameters(modelId, updates);
  }

  /**
   * 重新生成几何体
   * 通过销毁旧对象并创建新对象来更新几何体
   */
  private regenerateGeometry(
    model: Model<TMetadata>,
    asset: PrebuiltAsset
  ): void {
    if (!model.renderObject) {
      return;
    }

    // 销毁旧对象
    if (this.renderer) {
      this.renderer.removeObject(model.renderObject);
      this.renderer.disposeObject(model.renderObject);
    }

    // 获取新的几何体参数
    const geometryParams = asset.createGeometry(model.parameters);

    // 根据类型创建新网格对象
    let newMesh: unknown;
    switch (asset.type) {
      case ModelType.ALUMINUM_PROFILE: {
        const size =
          geometryParams.width === 20 || geometryParams.height === 20
            ? '20x20'
            : '40x40';
        newMesh = MeshFactory.createAluminumProfileMesh(size, geometryParams);
        break;
      }
      case ModelType.CONNECTOR: {
        newMesh = MeshFactory.createConnectorMesh(geometryParams);
        break;
      }
      case ModelType.PANEL: {
        newMesh = MeshFactory.createPanelMesh(geometryParams);
        break;
      }
      default: {
        const geometry = GeometryFactory.createBox(
          (geometryParams.width || 100) / 1000,
          (geometryParams.height || 100) / 1000,
          (geometryParams.thickness || 100) / 1000
        );
        const material = MaterialFactory.createStandard();
        newMesh = MeshFactory.createMesh(geometry, material);
      }
    }

    // 更新模型的渲染对象
    model.renderObject = newMesh;

    // 添加到场景并恢复变换
    if (this.renderer && newMesh) {
      this.renderer.addObject(newMesh, {
        interactive: true,
        modelId: model.id,
        name: model.name,
      });

      this.renderer.updateObjectTransform(newMesh, {
        position: model.position,
        rotation: model.rotation,
        scale: model.scale,
      });

      this.renderer.setObjectVisibility(newMesh, model.isVisible);
    }
  }

  // ==================== 碰撞检测 ====================

  /**
   * 设置碰撞检测器
   */
  public setCollisionDetector(detector: ICollisionDetector<TMetadata>): void {
    this.collisionDetector = detector;
  }

  /**
   * 检测所有实体的碰撞
   */
  public detectAllCollisions(): CollisionInfo[] {
    if (!this.collisionDetector) {
      console.warn('Collision detector not set');
      return [];
    }

    const models = this.getAllModels();
    return this.collisionDetector.detectCollisions(models);
  }

  /**
   * 检测两个实体的碰撞
   */
  public checkCollisionBetween(
    modelIdA: string,
    modelIdB: string
  ): CollisionInfo | null {
    if (!this.collisionDetector) {
      console.warn('Collision detector not set');
      return null;
    }

    const modelA = this.models.get(modelIdA);
    const modelB = this.models.get(modelIdB);

    if (!modelA || !modelB) {
      throw new Error('One or both models not found');
    }

    return this.collisionDetector.checkCollision(modelA, modelB);
  }

  // ==================== 约束管理 ====================

  /**
   * 设置约束求解器
   */
  public setConstraintSolver(solver: IConstraintSolver<TMetadata>): void {
    this.constraintSolver = solver;
  }

  /**
   * 添加约束
   */
  public addConstraint(constraint: Constraint): void {
    // 验证涉及的模型是否存在
    for (const modelId of constraint.modelIds) {
      if (!this.models.has(modelId)) {
        throw new Error(`Model ${modelId} not found`);
      }
    }

    // 验证约束
    if (this.constraintSolver) {
      if (!this.constraintSolver.validateConstraint(constraint)) {
        throw new Error('Invalid constraint');
      }
      this.constraintSolver.addConstraint(constraint);
    }

    this.constraints.set(constraint.id, constraint);
    console.log(`Constraint ${constraint.id} added`);
  }

  /**
   * 移除约束
   */
  public removeConstraint(constraintId: string): boolean {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return false;
    }

    if (this.constraintSolver) {
      this.constraintSolver.removeConstraint(constraintId);
    }

    this.constraints.delete(constraintId);
    console.log(`Constraint ${constraintId} removed`);
    return true;
  }

  /**
   * 移除与某个模型相关的所有约束
   */
  private removeConstraintsByModel(modelId: string): void {
    const toRemove: string[] = [];

    for (const [id, constraint] of this.constraints) {
      if (constraint.modelIds.includes(modelId)) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.removeConstraint(id));
  }

  /**
   * 获取所有约束
   */
  public getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * 获取与某个模型相关的约束
   */
  public getConstraintsByModel(modelId: string): Constraint[] {
    return Array.from(this.constraints.values()).filter(c =>
      c.modelIds.includes(modelId)
    );
  }

  /**
   * 求解约束
   */
  public solveConstraints(): void {
    if (!this.constraintSolver) {
      console.warn('Constraint solver not set');
      return;
    }

    const models = this.getAllModels();
    this.constraintSolver.solve(models);

    // 约束求解后，模型位置已在约束求解器中更新
    // 需要将更新后的位置同步到渲染器
    models.forEach(model => {
      if (model.renderObject && this.renderer) {
        this.renderer.updateObjectTransform(model.renderObject, {
          position: model.position,
          rotation: model.rotation,
          scale: model.scale,
        });
      }
    });
  }

  // ==================== 辅助方法 ====================

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清空所有实体
   */
  public clear(): void {
    // 移除所有模型
    const modelIds = Array.from(this.models.keys());
    modelIds.forEach(id => this.removeModel(id));

    // 清空约束
    this.constraints.clear();

    console.log('ObjectManager cleared');
  }

  /**
   * 导出场景数据
   */
  public exportScene(): SceneExportData<TMetadata> {
    const models = this.getAllModels().map(model => ({
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

    const constraints = this.getAllConstraints();

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

    console.log('Scene imported');
  }
}

// 导出单例实例（可选，使用泛型）
let objectManagerInstance: ObjectManager<Record<string, unknown>> | null = null;

export function getObjectManager<TMetadata = Record<string, unknown>>(
  renderer?: IRenderer,
  collisionDetector?: ICollisionDetector<TMetadata>,
  constraintSolver?: IConstraintSolver<TMetadata>
): ObjectManager<TMetadata> {
  if (!objectManagerInstance) {
    objectManagerInstance = new ObjectManager<Record<string, unknown>>(
      renderer,
      collisionDetector as ICollisionDetector<Record<string, unknown>>,
      constraintSolver as IConstraintSolver<Record<string, unknown>>
    );
  }
  return objectManagerInstance as unknown as ObjectManager<TMetadata>;
}

export function resetObjectManager(): void {
  if (objectManagerInstance) {
    objectManagerInstance.clear();
    objectManagerInstance = null;
  }
}
