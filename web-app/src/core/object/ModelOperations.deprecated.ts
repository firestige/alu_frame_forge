import type { Model, ModelParameters, PrebuiltAsset } from './types';

/**
 * 模型操作服务
 * 负责模型参数更新、拉伸、调整等操作
 */
export class ModelOperations<TMetadata = Record<string, unknown>> {
  private repository: {
    getById: (id: string) => Model<TMetadata> | undefined;
    update: (
      id: string,
      updates: Partial<Model<TMetadata>>
    ) => Model<TMetadata>;
  };

  private assetRegistry: {
    getAsset: (id: string) => PrebuiltAsset | undefined;
  };

  private modelFactory: {
    recreateMesh: (model: Model<TMetadata>, asset: PrebuiltAsset) => unknown;
  };

  constructor(
    repository: {
      getById: (id: string) => Model<TMetadata> | undefined;
      update: (
        id: string,
        updates: Partial<Model<TMetadata>>
      ) => Model<TMetadata>;
    },
    assetRegistry: {
      getAsset: (id: string) => PrebuiltAsset | undefined;
    },
    modelFactory: {
      recreateMesh: (model: Model<TMetadata>, asset: PrebuiltAsset) => unknown;
    }
  ) {
    this.repository = repository;
    this.assetRegistry = assetRegistry;
    this.modelFactory = modelFactory;
  }

  /**
   * 更新模型参数（参数化调整）
   */
  public updateParameters(
    modelId: string,
    parameters: Partial<ModelParameters>,
    onMeshRecreated?: (oldMesh: unknown, newMesh: unknown) => void
  ): void {
    const model = this.repository.getById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // 合并参数
    const newParameters = {
      ...model.parameters,
      ...parameters,
    };

    // 更新模型参数
    this.repository.update(modelId, {
      parameters: newParameters,
      updatedAt: new Date(),
    });

    // 重新生成几何体
    const assetId = (model.metadata as Record<string, unknown>).assetId;
    if (assetId && typeof assetId === 'string') {
      const asset = this.assetRegistry.getAsset(assetId);
      if (asset) {
        this.regenerateGeometry(model, asset, onMeshRecreated);
      }
    }

    console.log(`Model ${model.name} parameters updated`, parameters);
  }

  /**
   * 拉伸模型长度（针对型材）
   */
  public stretchLength(modelId: string, length: number): void {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }

    this.updateParameters(modelId, { length });
  }

  /**
   * 调整面的尺寸（调整宽度和高度）
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

    this.updateParameters(modelId, updates);
  }

  /**
   * 重新生成几何体
   * 通过工厂重新创建网格对象
   */
  private regenerateGeometry(
    model: Model<TMetadata>,
    asset: PrebuiltAsset,
    onMeshRecreated?: (oldMesh: unknown, newMesh: unknown) => void
  ): void {
    if (!model.renderObject) {
      return;
    }

    const oldMesh = model.renderObject;

    // 通过工厂创建新网格对象
    const newMesh = this.modelFactory.recreateMesh(model, asset);

    // 更新模型的渲染对象
    this.repository.update(model.id, {
      renderObject: newMesh,
    });

    // 通知外部系统处理新旧网格切换
    if (onMeshRecreated) {
      onMeshRecreated(oldMesh, newMesh);
    }
  }
}
