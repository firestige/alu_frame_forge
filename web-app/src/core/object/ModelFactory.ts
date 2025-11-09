import type { AnyAsset } from '../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
} from './types/scene-object';
import type { AssetRegistry } from '../asset';
import type { InstanceStrategy } from './strategies';
import { AssetType } from '../asset/types/enums';

/**
 * 模型工厂
 * 负责从素材创建场景对象的核心服务
 *
 * 采用策略模式：
 * - 每种素材类型对应一个实例化策略
 * - 策略可动态注册，支持扩展
 * - 工厂负责策略的选择和调用
 *
 * 职责：
 * - 管理实例化策略的注册
 * - 根据素材类型选择合适的策略
 * - 统一的场景对象创建接口
 * - 几何体更新接口
 */
export class ModelFactory {
  /** 素材注册表引用 */
  private assetRegistry: AssetRegistry;

  /** 策略映射表：素材类型 -> 实例化策略 */
  private strategyMap: Map<AssetType, InstanceStrategy> = new Map();

  constructor(assetRegistry: AssetRegistry) {
    this.assetRegistry = assetRegistry;
  }

  // ==================== 策略管理 ====================

  /**
   * 注册实例化策略
   * 将策略与素材类型绑定
   */
  registerStrategy(assetType: AssetType, strategy: InstanceStrategy): void {
    if (this.strategyMap.has(assetType)) {
      console.warn(
        `[ModelFactory] Strategy for ${assetType} already exists, overwriting`
      );
    }
    this.strategyMap.set(assetType, strategy);
    console.log(`[ModelFactory] Registered strategy for ${assetType}`);
  }

  /**
   * 获取指定类型的策略
   */
  getStrategy(assetType: AssetType): InstanceStrategy | undefined {
    return this.strategyMap.get(assetType);
  }

  /**
   * 检查是否支持该类型
   */
  hasStrategy(assetType: AssetType): boolean {
    return this.strategyMap.has(assetType);
  }

  // ==================== 创建场景对象 ====================

  /**
   * 从素材创建场景对象
   * 这是外部调用的主要接口
   *
   * @param assetId 素材 ID
   * @param options 创建选项（用户参数、变换等）
   * @returns 完整的场景对象
   */
  createFromAsset(
    assetId: string,
    options: SceneObjectCreateOptions
  ): SceneObject {
    // 1. 获取素材定义
    const asset = this.assetRegistry.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // 2. 选择合适的策略
    const strategy = this.selectStrategy(asset);

    // 3. 使用策略创建场景对象
    const sceneObject = strategy.createSceneObject(asset, options);

    console.log(
      `[ModelFactory] Created scene object: ${sceneObject.name} (${sceneObject.id})`
    );

    return sceneObject;
  }

  /**
   * 批量创建场景对象
   */
  createBatch(
    requests: Array<{
      assetId: string;
      options: SceneObjectCreateOptions;
    }>
  ): SceneObject[] {
    return requests.map(req => this.createFromAsset(req.assetId, req.options));
  }

  // ==================== 更新几何体 ====================

  /**
   * 更新场景对象的几何体
   * 当用户参数或加工操作改变时调用
   *
   * @param sceneObject 待更新的场景对象
   */
  updateGeometry(sceneObject: SceneObject): void {
    // 1. 获取素材定义
    const asset = this.assetRegistry.get(sceneObject.assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${sceneObject.assetId}`);
    }

    // 2. 选择策略
    const strategy = this.selectStrategy(asset);

    // 3. 更新几何体
    strategy.updateGeometry(sceneObject, asset);

    console.log(
      `[ModelFactory] Updated geometry for: ${sceneObject.name} (${sceneObject.id})`
    );
  }

  /**
   * 批量更新几何体
   */
  updateGeometryBatch(sceneObjects: SceneObject[]): void {
    sceneObjects.forEach(obj => this.updateGeometry(obj));
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 选择合适的实例化策略
   * 根据素材类型从策略映射表中查找
   */
  private selectStrategy(asset: AnyAsset): InstanceStrategy {
    const strategy = this.strategyMap.get(asset.type);

    if (!strategy) {
      throw new Error(
        `No instance strategy found for asset type: ${asset.type}. ` +
          `Please register a strategy for this type.`
      );
    }

    // 双重检查：策略是否声称能处理该素材
    if (!strategy.canHandle(asset)) {
      throw new Error(
        `Strategy for ${asset.type} cannot handle asset: ${asset.id}`
      );
    }

    return strategy;
  }

  /**
   * 获取工厂统计信息
   */
  getStats() {
    return {
      registeredStrategies: Array.from(this.strategyMap.keys()),
      strategyCount: this.strategyMap.size,
    };
  }
}
