import type { AnyAsset, Asset } from './types/asset';
import { AssetType, AssetSource } from './types/enums';

/**
 * 素材注册表
 * 负责管理所有素材的注册、查询和分类存储
 *
 * 核心职责：
 * - 分类存储内置素材和自定义素材
 * - 提供类型安全的查询接口
 * - 支持素材的增删改查
 * - 管理素材的生命周期
 */
export class AssetRegistry {
  /** 内置素材存储 */
  private builtinAssets: Map<string, AnyAsset> = new Map();

  /** 自定义素材存储 */
  private customAssets: Map<string, AnyAsset> = new Map();

  constructor() {
    // 初始化完成，等待外部加载内置素材
  }

  // ==================== 注册方法 ====================

  /**
   * 注册素材
   * 根据素材来源自动存储到对应的 Map
   */
  register(asset: AnyAsset): void {
    const targetMap =
      asset.source === AssetSource.BUILTIN
        ? this.builtinAssets
        : this.customAssets;

    // 检查 ID 冲突
    if (targetMap.has(asset.id)) {
      throw new Error(`Asset with id "${asset.id}" already exists`);
    }

    targetMap.set(asset.id, asset);
  }

  /**
   * 批量注册素材
   */
  registerBatch(assets: AnyAsset[]): void {
    assets.forEach(asset => this.register(asset));
  }

  // ==================== 查询方法 ====================

  /**
   * 根据 ID 获取素材
   * 先查找内置素材，再查找自定义素材
   */
  get(assetId: string): AnyAsset | undefined {
    return this.builtinAssets.get(assetId) ?? this.customAssets.get(assetId);
  }

  /**
   * 检查素材是否存在
   */
  has(assetId: string): boolean {
    return this.builtinAssets.has(assetId) || this.customAssets.has(assetId);
  }

  /**
   * 获取所有素材
   * @param includeCustom 是否包含自定义素材，默认 true
   */
  getAll(includeCustom = true): AnyAsset[] {
    const builtin = Array.from(this.builtinAssets.values());
    if (!includeCustom) {
      return builtin;
    }
    const custom = Array.from(this.customAssets.values());
    return [...builtin, ...custom];
  }

  /**
   * 根据类型获取素材
   */
  getByType(type: AssetType, includeCustom = true): AnyAsset[] {
    return this.getAll(includeCustom).filter(asset => asset.type === type);
  }

  /**
   * 根据来源获取素材
   */
  getBySource(source: AssetSource): AnyAsset[] {
    const map =
      source === AssetSource.BUILTIN ? this.builtinAssets : this.customAssets;
    return Array.from(map.values());
  }

  /**
   * 搜索素材（根据名称或描述）
   */
  search(query: string, includeCustom = true): AnyAsset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll(includeCustom).filter(
      asset =>
        asset.name.toLowerCase().includes(lowerQuery) ||
        asset.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // ==================== 修改和删除 ====================

  /**
   * 更新素材
   * 只能更新自定义素材
   */
  update(assetId: string, updates: Partial<Asset>): boolean {
    const asset = this.customAssets.get(assetId);
    if (!asset) {
      return false;
    }

    // 合并更新
    Object.assign(asset, updates, {
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * 删除素材
   * 只能删除自定义素材
   */
  delete(assetId: string): boolean {
    if (this.builtinAssets.has(assetId)) {
      return false;
    }

    return this.customAssets.delete(assetId);
  }

  /**
   * 清空所有自定义素材
   */
  clearCustomAssets(): void {
    this.customAssets.clear();
  }

  // ==================== 统计信息 ====================

  /**
   * 获取素材统计信息
   */
  getStats() {
    return {
      builtin: {
        total: this.builtinAssets.size,
        byType: {
          profile: this.getByType(AssetType.PROFILE, false).length,
          fastener: this.getByType(AssetType.FASTENER, false).length,
          connector: this.getByType(AssetType.CONNECTOR, false).length,
          accessory: this.getByType(AssetType.ACCESSORY, false).length,
        },
      },
      custom: {
        total: this.customAssets.size,
        byType: {
          profile: this.customAssets.size, // 目前只支持自定义型材
        },
      },
    };
  }
}
