import * as THREE from 'three';

// ==================== 类型定义 ====================

// 实体模型
export interface Model {
  id: string;
  name: string;
  type: ModelType;
  object3D: THREE.Object3D;
  isVisible: boolean;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  // 参数化属性
  parameters: ModelParameters;
  // 元数据
  metadata: Record<string, any>;
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
  // 自定义参数
  [key: string]: any;
}

// 素材库中的预制模型定义
export interface PrebuiltAsset {
  id: string;
  name: string;
  type: ModelType;
  description: string;
  // 默认几何体工厂函数
  createGeometry: (params: ModelParameters) => THREE.BufferGeometry;
  // 默认材质
  defaultMaterial: THREE.Material;
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
  contactPoints?: THREE.Vector3[];
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
  parameters: Record<string, any>;
  isActive: boolean;
}

// ==================== 外部依赖接口 ====================

// 碰撞检测服务接口（外部实现）
export interface ICollisionDetector {
  detectCollisions(models: Model[]): CollisionInfo[];
  checkCollision(modelA: Model, modelB: Model): CollisionInfo;
}

// 约束求解器接口（外部实现）
export interface IConstraintSolver {
  addConstraint(constraint: Constraint): void;
  removeConstraint(constraintId: string): void;
  solve(models: Model[]): void;
  validateConstraint(constraint: Constraint): boolean;
}

// ==================== 实体管理服务 ====================

export class ObjectManager {
  private models: Map<string, Model> = new Map();
  private prebuiltAssets: Map<string, PrebuiltAsset> = new Map();
  private collisionDetector?: ICollisionDetector;
  private constraintSolver?: IConstraintSolver;
  private constraints: Map<string, Constraint> = new Map();
  private scene?: THREE.Scene;

  constructor(
    scene?: THREE.Scene,
    collisionDetector?: ICollisionDetector,
    constraintSolver?: IConstraintSolver
  ) {
    this.scene = scene;
    this.collisionDetector = collisionDetector;
    this.constraintSolver = constraintSolver;
    this.initializePrebuiltAssets();
  }

  // ==================== 场景管理 ====================

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  // ==================== 实体基础操作 ====================

  /**
   * 添加实体到管理器
   */
  public addModel(model: Model): void {
    if (this.models.has(model.id)) {
      throw new Error(`Model with id ${model.id} already exists`);
    }

    this.models.set(model.id, model);

    // 添加到场景
    if (this.scene && model.object3D) {
      this.scene.add(model.object3D);
    }

    // 标记为可交互
    if (model.object3D) {
      model.object3D.userData.interactive = true;
      model.object3D.userData.modelId = model.id;
      model.object3D.name = model.name;
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

    // 从场景移除
    if (this.scene && model.object3D) {
      this.scene.remove(model.object3D);
    }

    // 清理几何体和材质
    if (model.object3D instanceof THREE.Mesh) {
      model.object3D.geometry.dispose();
      if (Array.isArray(model.object3D.material)) {
        model.object3D.material.forEach(mat => mat.dispose());
      } else {
        model.object3D.material.dispose();
      }
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
  public getModel(modelId: string): Model | undefined {
    return this.models.get(modelId);
  }

  /**
   * 根据名称获取实体
   */
  public getModelByName(name: string): Model | undefined {
    return Array.from(this.models.values()).find(m => m.name === name);
  }

  /**
   * 获取所有实体
   */
  public getAllModels(): Model[] {
    return Array.from(this.models.values());
  }

  /**
   * 根据类型获取实体列表
   */
  public getModelsByType(type: ModelType): Model[] {
    return Array.from(this.models.values()).filter(m => m.type === type);
  }

  /**
   * 更新实体属性
   */
  public updateModel(modelId: string, updates: Partial<Model>): void {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // 更新基本属性
    Object.assign(model, updates);
    model.updatedAt = new Date();

    // 同步 Object3D 属性
    if (model.object3D) {
      if (updates.position) {
        model.object3D.position.copy(updates.position);
      }
      if (updates.rotation) {
        model.object3D.rotation.copy(updates.rotation);
      }
      if (updates.scale) {
        model.object3D.scale.copy(updates.scale);
      }
      if (updates.isVisible !== undefined) {
        model.object3D.visible = updates.isVisible;
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
      createGeometry: (params: ModelParameters) => {
        const length = params.length || 1000;
        return new THREE.BoxGeometry(0.02, 0.02, length / 1000);
      },
      defaultMaterial: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.7,
        roughness: 0.3,
      }),
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
      createGeometry: (params: ModelParameters) => {
        const length = params.length || 1000;
        return new THREE.BoxGeometry(0.04, 0.04, length / 1000);
      },
      defaultMaterial: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.7,
        roughness: 0.3,
      }),
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
      createGeometry: () => {
        return new THREE.BoxGeometry(0.03, 0.03, 0.03);
      },
      defaultMaterial: new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.2,
      }),
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
      createGeometry: (params: ModelParameters) => {
        const width = (params.width || 500) / 1000;
        const height = (params.height || 500) / 1000;
        const thickness = (params.thickness || 3) / 1000;
        return new THREE.BoxGeometry(width, height, thickness);
      },
      defaultMaterial: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        transmission: 0.9,
        roughness: 0.1,
      }),
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
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      parameters?: Partial<ModelParameters>;
    }
  ): Model {
    const asset = this.prebuiltAssets.get(assetId);
    if (!asset) {
      throw new Error(`Prebuilt asset ${assetId} not found`);
    }

    // 合并参数
    const parameters = {
      ...asset.defaultParameters,
      ...options?.parameters,
    };

    // 创建几何体
    const geometry = asset.createGeometry(parameters);
    const material = asset.defaultMaterial.clone();
    const mesh = new THREE.Mesh(geometry, material);

    // 设置位置和旋转
    if (options?.position) {
      mesh.position.copy(options.position);
    }
    if (options?.rotation) {
      mesh.rotation.copy(options.rotation);
    }

    // 创建模型
    const model: Model = {
      id: this.generateId(),
      name: options?.name || `${asset.name}_${Date.now()}`,
      type: asset.type,
      object3D: mesh,
      isVisible: true,
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      parameters,
      metadata: {
        assetId,
      },
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
    const assetId = model.metadata.assetId;
    if (assetId) {
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
   */
  private regenerateGeometry(model: Model, asset: PrebuiltAsset): void {
    if (!(model.object3D instanceof THREE.Mesh)) {
      return;
    }

    const mesh = model.object3D as THREE.Mesh;

    // 销毁旧几何体
    mesh.geometry.dispose();

    // 创建新几何体
    const newGeometry = asset.createGeometry(model.parameters);
    mesh.geometry = newGeometry;
  }

  // ==================== 碰撞检测 ====================

  /**
   * 设置碰撞检测器
   */
  public setCollisionDetector(detector: ICollisionDetector): void {
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
  public setConstraintSolver(solver: IConstraintSolver): void {
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

    // 同步模型位置
    models.forEach(model => {
      if (model.object3D) {
        model.position.copy(model.object3D.position);
        model.rotation.copy(model.object3D.rotation);
        model.scale.copy(model.object3D.scale);
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
  public exportScene(): any {
    const models = this.getAllModels().map(model => ({
      id: model.id,
      name: model.name,
      type: model.type,
      position: model.position.toArray(),
      rotation: model.rotation.toArray(),
      scale: model.scale.toArray(),
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
  public importScene(data: any): void {
    this.clear();

    // 导入模型
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((modelData: any) => {
        const assetId = modelData.metadata?.assetId;
        if (assetId) {
          this.createModelFromAsset(assetId, {
            name: modelData.name,
            position: new THREE.Vector3().fromArray(modelData.position),
            rotation: new THREE.Euler().fromArray(modelData.rotation),
            parameters: modelData.parameters,
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

// 导出单例实例（可选）
let objectManagerInstance: ObjectManager | null = null;

export function getObjectManager(
  scene?: THREE.Scene,
  collisionDetector?: ICollisionDetector,
  constraintSolver?: IConstraintSolver
): ObjectManager {
  if (!objectManagerInstance) {
    objectManagerInstance = new ObjectManager(
      scene,
      collisionDetector,
      constraintSolver
    );
  }
  return objectManagerInstance;
}

export function resetObjectManager(): void {
  if (objectManagerInstance) {
    objectManagerInstance.clear();
    objectManagerInstance = null;
  }
}
