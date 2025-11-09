import type { InstanceStrategy } from './InstanceStrategy';
import type { ProfileAsset, AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ExtrudedProfileGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';

/**
 * 型材实例化策略
 * 负责将型材素材转换为场景对象
 *
 * 核心逻辑：
 * 1. 使用截面 + 长度参数生成拉伸几何体
 * 2. 创建简化的渲染网格（用于性能优化）
 * 3. 创建完整的计算几何（用于 FEA）
 * 4. 支持加工操作的应用
 */
export class ProfileInstanceStrategy implements InstanceStrategy {
  /**
   * 渲染器工厂的引用
   * 用于创建 Three.js 网格对象
   */
  private geometryFactory: {
    createExtrudedProfile: (
      svgPath: string,
      length: number,
      simplified?: boolean
    ) => unknown;
  };

  constructor(geometryFactory: {
    createExtrudedProfile: (
      svgPath: string,
      length: number,
      simplified?: boolean
    ) => unknown;
  }) {
    this.geometryFactory = geometryFactory;
  }

  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.PROFILE;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ProfileInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const profileAsset = asset as ProfileAsset;
    const length =
      (options.userParams.length as number) ||
      profileAsset.defaultLength ||
      1000;

    // 生成唯一 ID
    const id = this.generateId();

    // 创建渲染网格（简化版）
    const visualMesh = this.geometryFactory.createExtrudedProfile(
      profileAsset.crossSection.svgPath,
      length,
      true // 简化模式
    );

    // 创建计算几何（完整版）
    const computeGeometry: ExtrudedProfileGeometry = {
      type: 'extruded_profile',
      crossSection: profileAsset.crossSection.svgPath,
      length,
      machiningOps: options.machiningOps || [],
      material: profileAsset.material,
    };

    // 计算质量（密度 * 体积）
    const volume = (profileAsset.crossSection.area || 0) * length; // mm³
    const mass = (profileAsset.material.density * volume) / 1e9; // kg

    const sceneObject: SceneObject = {
      id,
      name: options.name || `${profileAsset.name}_${Date.now()}`,
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
      userParams: {
        length,
        ...options.userParams,
      },
      machiningOps: options.machiningOps || [],
      visual: {
        mesh: visualMesh,
        isVisible: true,
      },
      compute: {
        geometry: computeGeometry,
        material: profileAsset.material,
        connections: [],
        mass,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    return sceneObject;
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ProfileInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const profileAsset = asset as ProfileAsset;
    const length = sceneObject.userParams.length as number;

    // 重新生成渲染网格
    const newMesh = this.geometryFactory.createExtrudedProfile(
      profileAsset.crossSection.svgPath,
      length,
      true
    );

    // 更新视觉模型
    sceneObject.visual.mesh = newMesh;

    // 更新计算几何
    const computeGeom = sceneObject.compute.geometry as ExtrudedProfileGeometry;
    computeGeom.length = length;
    computeGeom.machiningOps = sceneObject.machiningOps;

    // 重新计算质量
    const volume = (profileAsset.crossSection.area || 0) * length;
    sceneObject.compute.mass = (profileAsset.material.density * volume) / 1e9;

    // 更新时间戳
    sceneObject.metadata.updatedAt = new Date();
  }

  private generateId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
