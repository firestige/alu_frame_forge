/**
 * ConnectorInstanceStrategy - V2 版本
 *
 * 基于双模型体系（Visual Primitives + Functional Compute Data）
 * 从 ConnectorAssetV2 生成 SceneObject
 */

import type { InstanceStrategy } from './InstanceStrategy';
import type { AnyAsset, ConnectorAssetV2 } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ConnectorComputeGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';

/**
 * 连接件实例化策略（V2 - 双模型体系）
 *
 * 职责：
 * 1. Visual: 将 ConnectorVisualModel.primitives 转换为 Three.js mesh（占位）
 * 2. Compute: 将 ConnectorFunctionalData 复制到 SceneObject.compute.geometry
 * 3. 调用 AnchorService.registerFromSceneObject（未来集成）
 */
export class ConnectorInstanceStrategy implements InstanceStrategy {
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

    const connectorAsset = asset as ConnectorAssetV2;

    const id = this.generateId();

    // Visual: 从 primitives 创建简化 mesh（占位）
    const visualMesh = this.createVisualFromPrimitives(connectorAsset);

    // Compute: 复制 functional 数据到 compute geometry
    const computeGeometry: ConnectorComputeGeometry = {
      type: 'connector',
      connectorData: {
        holes: connectorAsset.functional.holes,
        contactFaces: connectorAsset.functional.contactFaces,
        slides: connectorAsset.functional.slides,
        mass: connectorAsset.functional.mass,
        centerOfMass: connectorAsset.functional.centerOfMass,
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
        mass: connectorAsset.functional.mass,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        connectorType: connectorAsset.connectorType,
      },
    };

    // TODO: 调用 AnchorService.registerFromSceneObject(sceneObject)
    // 生成 HoleAnchor, FaceAnchor 等

    return sceneObject;
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ConnectorInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const connectorAsset = asset as ConnectorAssetV2;

    // 更新 visual mesh
    const newMesh = this.createVisualFromPrimitives(connectorAsset);
    sceneObject.visual.mesh = newMesh;

    // 更新 compute geometry
    const computeGeom = sceneObject.compute
      .geometry as ConnectorComputeGeometry;
    computeGeom.connectorData = {
      holes: connectorAsset.functional.holes,
      contactFaces: connectorAsset.functional.contactFaces,
      slides: connectorAsset.functional.slides,
      mass: connectorAsset.functional.mass,
      centerOfMass: connectorAsset.functional.centerOfMass,
    };

    sceneObject.compute.mass = connectorAsset.functional.mass;
    sceneObject.metadata.updatedAt = new Date();

    // TODO: 重新注册锚点
  }

  /**
   * 从 primitives 创建简化 visual mesh（占位实现）
   */
  private createVisualFromPrimitives(asset: ConnectorAssetV2): unknown {
    // 占位实现：返回 primitives 引用
    // 实际应交由 RenderSyncService 根据 primitives 创建 Three.js Group
    return {
      type: 'connector_primitives',
      primitives: asset.visual.primitives,
      meshPath: asset.visual.meshPath,
    };
  }

  private generateId(): string {
    return `connector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
