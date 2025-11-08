import type { InstanceStrategy } from './InstanceStrategy';
import type { ConnectorAsset, AnyAsset } from '../types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ParametricConnectorGeometry,
} from '../types/scene-object';
import { AssetType } from '../types/enums';

/**
 * 连接件实例化策略
 * 负责将连接件素材转换为场景对象
 *
 * 逻辑类似 FastenerInstanceStrategy
 * 连接件也采用双模型系统（渲染用 GLB + 计算用参数）
 */
export class ConnectorInstanceStrategy implements InstanceStrategy {
  private modelLoader: {
    loadModel: (path: string) => Promise<unknown>;
  };

  constructor(modelLoader: { loadModel: (path: string) => Promise<unknown> }) {
    this.modelLoader = modelLoader;
  }

  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.CONNECTOR;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ConnectorInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const connectorAsset = asset as ConnectorAsset;

    // 选择变体
    const variantKey = this.selectVariant(connectorAsset, options.userParams);
    const variant = connectorAsset.variants[variantKey];

    if (!variant) {
      throw new Error(
        `No suitable variant found for parameters: ${JSON.stringify(options.userParams)}`
      );
    }

    const id = this.generateId();
    const visualMesh = this.createPlaceholderMesh(variant.baseModel);

    // 生成 FEA 参数
    const feaParams = connectorAsset.computeParamsMap(options.userParams);

    const computeGeometry: ParametricConnectorGeometry = {
      type: 'parametric_connector',
      params: {
        connectorType: connectorAsset.family,
        ...feaParams,
      },
    };

    const sceneObject: SceneObject = {
      id,
      name: options.name || `${connectorAsset.name}_${Date.now()}`,
      assetId: asset.id,
      assetSource: asset.source,
      assetType: asset.type,
      transform: {
        position: options.transform?.position || { x: 0, y: 0, z: 0 },
        rotation: options.transform?.rotation || {
          x: 0,
          y: 0,
          z: 0,
          order: 'XYZ',
        },
        scale: options.transform?.scale || { x: 1, y: 1, z: 1 },
      },
      userParams: options.userParams,
      machiningOps: [],
      visual: {
        mesh: visualMesh,
        isVisible: true,
      },
      compute: {
        geometry: computeGeometry,
        connections: [],
        mass: 0.05, // 连接件质量估算
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        variantKey,
      },
    };

    return sceneObject;
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ConnectorInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const connectorAsset = asset as ConnectorAsset;

    const variantKey = this.selectVariant(
      connectorAsset,
      sceneObject.userParams
    );
    const variant = connectorAsset.variants[variantKey];

    if (!variant) {
      console.warn(`No suitable variant found, skipping update`);
      return;
    }

    if (sceneObject.metadata.variantKey !== variantKey) {
      const newMesh = this.createPlaceholderMesh(variant.baseModel);
      sceneObject.visual.mesh = newMesh;
      sceneObject.metadata.variantKey = variantKey;
    }

    const feaParams = connectorAsset.computeParamsMap(sceneObject.userParams);
    const computeGeom = sceneObject.compute
      .geometry as ParametricConnectorGeometry;
    computeGeom.params = {
      connectorType: connectorAsset.family,
      ...feaParams,
    };

    sceneObject.metadata.updatedAt = new Date();
  }

  private selectVariant(
    _asset: ConnectorAsset,
    userParams: Record<string, unknown>
  ): string {
    // 简化实现
    const size = userParams.size as string;
    return size || 'default';
  }

  private createPlaceholderMesh(modelPath: string): unknown {
    return { type: 'placeholder', path: modelPath };
  }

  private generateId(): string {
    return `connector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
