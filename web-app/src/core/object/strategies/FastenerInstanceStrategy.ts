import type { InstanceStrategy } from './InstanceStrategy';
import type { FastenerAsset, AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ParametricFastenerGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';

/**
 * 紧固件实例化策略
 * 负责将紧固件素材转换为场景对象
 *
 * 核心逻辑：
 * 1. 根据用户参数选择合适的模型变体
 * 2. 加载基础 3D 模型并进行参数化调整（如长度）
 * 3. 生成 FEA 参数（不需要完整几何）
 *
 * 注意：紧固件采用双模型系统
 * - 渲染：简化的 GLB 模型 + 贴图
 * - 计算：参数化描述（diameter, length, material 等）
 */
export class FastenerInstanceStrategy implements InstanceStrategy {
  /**
   * 模型加载器的引用
   * 用于加载和调整 GLB/GLTF 模型
   */
  private modelLoader: {
    loadModel: (path: string) => Promise<unknown>;
    adjustModelLength: (model: unknown, length: number) => unknown;
  };

  constructor(modelLoader: {
    loadModel: (path: string) => Promise<unknown>;
    adjustModelLength: (model: unknown, length: number) => unknown;
  }) {
    this.modelLoader = modelLoader;
  }

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

    const fastenerAsset = asset as FastenerAsset;

    // 根据参数选择变体
    const variantKey = this.selectVariant(fastenerAsset, options.userParams);
    const variant = fastenerAsset.variants[variantKey];

    if (!variant) {
      throw new Error(
        `No suitable variant found for parameters: ${JSON.stringify(options.userParams)}`
      );
    }

    // 生成唯一 ID
    const id = this.generateId();

    // 加载基础模型（这里需要异步处理，实际使用时可能需要改为同步或返回 Promise）
    // 为了简化，这里假设模型已经预加载或使用占位符
    const visualMesh = this.createPlaceholderMesh(variant.baseModel);

    // 生成 FEA 参数
    const feaParams = fastenerAsset.computeParamsMap(options.userParams);

    // 创建计算几何
    const computeGeometry: ParametricFastenerGeometry = {
      type: 'parametric_fastener',
      params: {
        fastenerType: fastenerAsset.family,
        ...feaParams,
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
      machiningOps: [], // 紧固件不支持加工操作
      visual: {
        mesh: visualMesh,
        isVisible: true,
      },
      compute: {
        geometry: computeGeometry,
        connections: [],
        // 紧固件质量通常很小，可以从数据库查询或忽略
        mass: 0.01,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        variantKey, // 存储变体键以便后续更新
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

    const fastenerAsset = asset as FastenerAsset;

    // 重新选择变体
    const variantKey = this.selectVariant(
      fastenerAsset,
      sceneObject.userParams
    );
    const variant = fastenerAsset.variants[variantKey];

    if (!variant) {
      console.warn(`No suitable variant found, skipping update`);
      return;
    }

    // 如果变体改变，需要重新加载模型
    if (sceneObject.metadata.variantKey !== variantKey) {
      const newMesh = this.createPlaceholderMesh(variant.baseModel);
      sceneObject.visual.mesh = newMesh;
      sceneObject.metadata.variantKey = variantKey;
    }

    // 更新 FEA 参数
    const feaParams = fastenerAsset.computeParamsMap(sceneObject.userParams);
    const computeGeom = sceneObject.compute
      .geometry as ParametricFastenerGeometry;
    computeGeom.params = {
      fastenerType: fastenerAsset.family,
      ...feaParams,
    };

    // 更新时间戳
    sceneObject.metadata.updatedAt = new Date();
  }

  /**
   * 根据用户参数选择合适的变体
   * 变体键通常由关键参数组合而成，如 "M5-coarse"
   */
  private selectVariant(
    asset: FastenerAsset,
    userParams: Record<string, unknown>
  ): string {
    // 简化实现：直接从参数构建变体键
    // 实际项目中可能需要更复杂的匹配逻辑
    const diameter = userParams.diameter as string;
    const threadType = userParams.threadPitch as string;
    return `${diameter}-${threadType}`;
  }

  /**
   * 创建占位符网格
   * 实际项目中应该异步加载真实模型
   */
  private createPlaceholderMesh(modelPath: string): unknown {
    // 返回模型路径作为占位符
    // 实际渲染器会根据路径加载模型
    return { type: 'placeholder', path: modelPath };
  }

  private generateId(): string {
    return `fastener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
