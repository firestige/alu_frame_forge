import type { Model, Constraint, SceneExportData } from './types';

/**
 * 场景 I/O 服务
 * 负责场景数据的导出和导入
 */
export class SceneIO<TMetadata = Record<string, unknown>> {
  private repository: {
    getAll: () => Model<TMetadata>[];
    clear: () => void;
  };

  private constraintManager: {
    getAll: () => Constraint[];
    add: (
      constraint: Constraint,
      modelValidator: (modelId: string) => boolean
    ) => void;
  };

  private modelFactory: {
    createFromAsset: (
      assetId: string,
      options?: {
        name?: string;
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number; order: string };
        parameters?: Record<string, unknown>;
        metadata?: TMetadata;
      }
    ) => Model<TMetadata>;
  };

  private modelValidator: (modelId: string) => boolean;

  constructor(
    repository: {
      getAll: () => Model<TMetadata>[];
      clear: () => void;
    },
    constraintManager: {
      getAll: () => Constraint[];
      add: (
        constraint: Constraint,
        modelValidator: (modelId: string) => boolean
      ) => void;
    },
    modelFactory: {
      createFromAsset: (
        assetId: string,
        options?: {
          name?: string;
          position?: { x: number; y: number; z: number };
          rotation?: { x: number; y: number; z: number; order: string };
          parameters?: Record<string, unknown>;
          metadata?: TMetadata;
        }
      ) => Model<TMetadata>;
    },
    modelValidator: (modelId: string) => boolean
  ) {
    this.repository = repository;
    this.constraintManager = constraintManager;
    this.modelFactory = modelFactory;
    this.modelValidator = modelValidator;
  }

  /**
   * 导出场景数据
   */
  public export(): SceneExportData<TMetadata> {
    const models = this.repository.getAll().map(model => ({
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
  public import(data: SceneExportData<TMetadata>): void {
    this.repository.clear();

    // 导入模型
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach(modelData => {
        const assetId = (modelData.metadata as Record<string, unknown>).assetId;
        if (assetId && typeof assetId === 'string') {
          this.modelFactory.createFromAsset(assetId, {
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
        this.constraintManager.add(constraint, this.modelValidator);
      });
    }

    console.log('Scene imported', data);
  }

  /**
   * 导出为 JSON 字符串
   */
  public exportToJSON(pretty = false): string {
    const data = this.export();
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * 从 JSON 字符串导入
   */
  public importFromJSON(json: string): void {
    const data = JSON.parse(json) as SceneExportData<TMetadata>;
    this.import(data);
  }
}
