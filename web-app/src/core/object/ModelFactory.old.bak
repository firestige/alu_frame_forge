import type { Model, ModelParameters, PrebuiltAsset } from './types';
import { ModelType } from './types';
import type { Vector3, Euler } from '../renderer/renderer-types';
import {
  GeometryFactory,
  MaterialFactory,
  MeshFactory,
  type GeometryParams,
} from '../renderer';

/**
 * 模型工厂
 * 负责从预制资产创建模型实例
 */
export class ModelFactory<TMetadata = Record<string, unknown>> {
  private assetRegistry: {
    getAsset: (id: string) => PrebuiltAsset | undefined;
  };

  private idGenerator: () => string;

  constructor(
    assetRegistry: { getAsset: (id: string) => PrebuiltAsset | undefined },
    idGenerator: () => string
  ) {
    this.assetRegistry = assetRegistry;
    this.idGenerator = idGenerator;
  }

  /**
   * 从预制素材创建模型
   */
  public createFromAsset(
    assetId: string,
    options?: {
      name?: string;
      position?: Vector3;
      rotation?: Euler;
      parameters?: Partial<ModelParameters>;
      metadata?: TMetadata;
    }
  ): Model<TMetadata> {
    const asset = this.assetRegistry.getAsset(assetId);
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
    const mesh = this.createMesh(asset.type, geometryParams);

    // 创建模型
    const model: Model<TMetadata> = {
      id: this.idGenerator(),
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

    return model;
  }

  /**
   * 根据类型创建网格
   */
  private createMesh(type: ModelType, geometryParams: GeometryParams): unknown {
    switch (type) {
      case ModelType.ALUMINUM_PROFILE: {
        const size =
          geometryParams.width === 20 || geometryParams.height === 20
            ? '20x20'
            : '40x40';
        return MeshFactory.createAluminumProfileMesh(size, geometryParams);
      }
      case ModelType.CONNECTOR: {
        return MeshFactory.createConnectorMesh(geometryParams);
      }
      case ModelType.PANEL: {
        return MeshFactory.createPanelMesh(geometryParams);
      }
      default: {
        // 自定义类型使用标准材质
        const geometry = GeometryFactory.createBox(
          (geometryParams.width || 100) / 1000,
          (geometryParams.height || 100) / 1000,
          (geometryParams.thickness || 100) / 1000
        );
        const material = MaterialFactory.createStandard();
        return MeshFactory.createMesh(geometry, material);
      }
    }
  }

  /**
   * 重新生成网格（用于参数更新）
   */
  public recreateMesh(model: Model<TMetadata>, asset: PrebuiltAsset): unknown {
    // 获取新的几何体参数
    const geometryParams = asset.createGeometry(model.parameters);

    // 根据类型创建新网格对象
    return this.createMesh(asset.type, geometryParams);
  }
}
