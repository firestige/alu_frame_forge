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
import type {
  IRenderer,
  ExtrusionParams,
} from '@/core/renderer/renderer-types';

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

    // 🔍 Debug: 检查资产数据结构
    console.log('[ProfileInstanceStrategy] 🔍 Asset data check:', {
      assetId: asset.id,
      assetName: asset.name,
      hasCrossSection: !!profileAsset.crossSection,
      crossSectionKeys: profileAsset.crossSection
        ? Object.keys(profileAsset.crossSection)
        : 'undefined',
      crossSectionValue: profileAsset.crossSection,
    });

    if (!profileAsset.crossSection) {
      throw new Error(`ProfileAsset ${asset.id} missing crossSection data`);
    }

    if (!profileAsset.crossSection.outerPath) {
      throw new Error(
        `ProfileAsset ${asset.id} missing crossSection.outerPath`
      );
    }

    const length =
      (options.userParams.length as number) ||
      profileAsset.lengthConstraints?.default ||
      1000;

    console.log('[ProfileInstanceStrategy] Creating profile:', {
      assetId: asset.id,
      assetName: asset.name,
      outerPath: profileAsset.crossSection.outerPath.substring(0, 50) + '...',
      holes: profileAsset.crossSection.holes.length,
      length,
      userParams: options.userParams,
    });

    // 生成唯一 ID
    const id = this.generateId();

    // 1. 解析 SVG 路径为抽象形状（使用契约数据）
    const shape = SVGPathParser.parse(profileAsset.crossSection.outerPath);
    console.log('[ProfileInstanceStrategy] Outer shape parsed:', shape);

    // TODO: 处理孔洞（holes）
    if (profileAsset.crossSection.holes.length > 0) {
      console.log(
        '[ProfileInstanceStrategy] Holes detected:',
        profileAsset.crossSection.holes.length
      );
      // 未来实现：解析 holes 并传递给渲染器
    }

    // 2. 转换材质属性（明显的铝合金银色）
    const materialProps: MaterialProperties = {
      type: 'metal',
      color: 0xd4d4d4, // 明亮的铝合金银色，便于观察
      metalness: 0.8,
      roughness: 0.2,
    };

    // 3. 创建拉伸参数
    const extrusionParams: ExtrusionParams = {
      shape,
      length,
      targetSize: profileAsset.crossSection.dimensions.width, // 使用契约的 dimensions.width
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

    // 🔍 记录几何体尺寸信息
    if (visualMesh && 'geometry' in visualMesh) {
      const geometry = (visualMesh as any).geometry;
      if (geometry && geometry.computeBoundingBox) {
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        if (bbox) {
          const size = {
            x: bbox.max.x - bbox.min.x,
            y: bbox.max.y - bbox.min.y,
            z: bbox.max.z - bbox.min.z,
          };
          console.log('[ProfileInstanceStrategy] 🎯 创建对象几何体信息:', {
            'BoundingBox(米)': bbox,
            '尺寸(米)': size,
            '尺寸(毫米)': {
              x: size.x * 1000,
              y: size.y * 1000,
              z: size.z * 1000,
            },
            '输入参数length(毫米)': length,
            截面outerPath:
              profileAsset.crossSection.outerPath.substring(0, 50) + '...',
            截面holes数量: profileAsset.crossSection.holes.length,
          });
        }
      }
    }

    // 创建计算几何（完整版）
    const computeGeometry: ExtrudedProfileGeometry = {
      type: 'extruded_profile',
      crossSection: profileAsset.crossSection.outerPath, // 使用 outerPath
      length,
      machiningOps: options.machiningOps || [],
      material: profileAsset.material,
    };

    // 计算质量（密度 * 体积）
    const area = profileAsset.crossSection.geometricProperties?.area || 0; // 使用契约的 geometricProperties
    const volume = area * length; // mm³
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

    // 1. 解析 SVG 路径（使用契约数据）
    const shape = SVGPathParser.parse(profileAsset.crossSection.outerPath);

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
      targetSize: profileAsset.crossSection.dimensions.width, // 使用契约的 dimensions.width
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
    const area = profileAsset.crossSection.geometricProperties?.area || 0; // 使用契约的 geometricProperties
    const volume = area * length;
    sceneObject.compute.mass = (profileAsset.material.density * volume) / 1e9;

    // 更新时间戳
    sceneObject.metadata.updatedAt = new Date();
  }

  private generateId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
