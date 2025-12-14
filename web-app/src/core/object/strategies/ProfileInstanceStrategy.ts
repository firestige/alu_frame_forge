import type { InstanceStrategy } from './InstanceStrategy';
import type { ProfileAsset, AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ExtrudedProfileGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';
import { SVGPathParser } from '@/core/geometry/SVGPathParser';
import type { MaterialProperties } from '@/core/geometry/types';
import type { IRenderer, ExtrusionParams } from '@/core/renderer/renderer-types';

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
   * 渲染器引用
   * 用于创建拉伸网格
   */
  private renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
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

    // 1. 解析 SVG 路径为抽象形状
    const shape = SVGPathParser.parse(profileAsset.crossSection.svgPath);

    // 2. 转换材质属性
    const materialProps: MaterialProperties = {
      type: 'metal', // TODO: 从 profileAsset.material 推断类型
      color: 0x999999, // TODO: 从素材获取颜色
      metalness: 0.9,
      roughness: 0.3,
    };

    // 3. 创建拉伸参数
    const extrusionParams: ExtrusionParams = {
      shape,
      length,
      material: materialProps,
      transform: options.transform,
      userData: {
        objectId: id,
        assetId: asset.id,
      },
    };

    // 4. 创建渲染网格
    const meshHandle = this.renderer.createExtrudedMesh(extrusionParams);
    const visualMesh = meshHandle.nativeObject;

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

    // 1. 解析 SVG 路径
    const shape = SVGPathParser.parse(profileAsset.crossSection.svgPath);

    // 2. 转换材质属性
    const materialProps: MaterialProperties = {
      type: 'metal',
      color: 0x999999,
      metalness: 0.9,
      roughness: 0.3,
    };

    // 3. 创建拉伸参数
    const extrusionParams: ExtrusionParams = {
      shape,
      length,
      material: materialProps,
      transform: sceneObject.transform,
      userData: {
        objectId: sceneObject.id,
        assetId: asset.id,
      },
    };

    // 4. 重新生成渲染网格
    const meshHandle = this.renderer.createExtrudedMesh(extrusionParams);
    const newMesh = meshHandle.nativeObject;

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
