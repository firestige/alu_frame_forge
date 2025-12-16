/**
 * FastenerInstanceStrategy - V2 版本
 *
 * 基于双模型体系（Visual Primitives + Functional Compute Data）
 * 从 FastenerAssetV2 生成 SceneObject
 */

import type { InstanceStrategy } from './InstanceStrategy';
import type { AnyAsset, FastenerAssetV2 } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  FastenerComputeGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';

/**
 * 紧固件实例化策略（V2 - 双模型体系）
 *
 * 职责：
 * 1. Visual: 将 FastenerVisualModel.primitives 转换为 Three.js mesh（占位）
 * 2. Compute: 将 FastenerFunctionalData 转换为 FastenerComputeGeometry
 * 3. 生成 threadAxis, clampRange, headClearanceVolume 等计算数据
 */
export class FastenerInstanceStrategy implements InstanceStrategy {
  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.FASTENER;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    if (!this.canHandle(asset)) {
      throw new Error(
        `FastenerInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const fastenerAsset = asset as FastenerAssetV2;

    const id = this.generateId();

    // Visual: 从 primitives 创建简化 mesh（占位）
    const visualMesh = this.createVisualFromPrimitives(fastenerAsset);

    // Compute: 构建 FastenerComputeGeometry
    const computeGeometry: FastenerComputeGeometry = {
      type: 'fastener',
      fastenerData: {
        threadSpec: fastenerAsset.functional.threadSpec,
        threadAxis: fastenerAsset.functional.threadAxis || {
          x: 0,
          y: 0,
          z: 1,
        },
        length: fastenerAsset.functional.length,
        clampRange: fastenerAsset.functional.clampRange,
        headClearanceVolume: fastenerAsset.functional.headClearanceVolume,
        engagementDepth: fastenerAsset.functional.engagementDepth,
        torqueLimit:
          fastenerAsset.functional.torqueRecommendations?.[0]?.torque,
      },
    };

    const sceneObject: SceneObject = {
      id,
      name: options.name || `${fastenerAsset.name}_${Date.now()}`,
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
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        fastenerType: fastenerAsset.fastenerType,
        specKey: fastenerAsset.specKey,
      },
    };

    return sceneObject;
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    if (!this.canHandle(asset)) {
      throw new Error(
        `FastenerInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const fastenerAsset = asset as FastenerAssetV2;

    // 更新 visual mesh
    const newMesh = this.createVisualFromPrimitives(fastenerAsset);
    sceneObject.visual.mesh = newMesh;

    // 更新 compute geometry
    const computeGeom = sceneObject.compute.geometry as FastenerComputeGeometry;
    computeGeom.fastenerData = {
      threadSpec: fastenerAsset.functional.threadSpec,
      threadAxis: fastenerAsset.functional.threadAxis || { x: 0, y: 0, z: 1 },
      length: fastenerAsset.functional.length,
      clampRange: fastenerAsset.functional.clampRange,
      headClearanceVolume: fastenerAsset.functional.headClearanceVolume,
      engagementDepth: fastenerAsset.functional.engagementDepth,
      torqueLimit: fastenerAsset.functional.torqueRecommendations?.[0]?.torque,
    };

    sceneObject.metadata.updatedAt = new Date();
  }

  /**
   * 从 primitives 创建简化 visual mesh（占位实现）
   */
  private createVisualFromPrimitives(asset: FastenerAssetV2): unknown {
    // 占位实现：返回 primitives 引用
    // 实际应交由 RenderSyncService 根据 primitives 创建 Three.js Group
    return {
      type: 'fastener_primitives',
      primitives: asset.visual.primitives,
    };
  }

  private generateId(): string {
    return `fastener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
