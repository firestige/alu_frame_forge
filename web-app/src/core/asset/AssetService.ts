import { AssetRegistry } from './AssetRegistry';
import type {
  ProfileAsset,
  ConnectorAsset,
  FastenerAsset,
  AnyAsset,
} from './types/asset';
import { AssetType, AssetSource, MachiningOpType } from './types/enums';

/**
 * 资产服务
 * 封装 AssetRegistry 的访问接口，提供业务友好的查询 API
 *
 * 职责：
 * - 初始化时从索引文件动态加载预置资产
 * - 提供按系列、类型分组查询
 * - 封装 AssetRegistry 的底层操作
 * - 作为资产管理的唯一核心服务
 */
export class AssetService {
  private registry: AssetRegistry;
  private initialized: boolean = false;
  private isInitializing: boolean = false; // 🆕 防止异步竞态

  constructor() {
    this.registry = new AssetRegistry();
  }

  /**
   * 初始化 AssetService
   * 加载所有预置资产（BUILTIN）
   * 注意：此方法是幂等的，多次调用只会执行一次（支持并发调用）
   */
  async initialize(): Promise<void> {
    // 已完成初始化
    if (this.initialized) {
      console.log('[AssetService] ⏭️  已初始化，跳过重复加载');
      return;
    }

    // 正在初始化中（防止并发调用）
    if (this.isInitializing) {
      console.log('[AssetService] ⏳ 正在初始化中，等待完成...');
      // 等待初始化完成
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    // 开始初始化
    this.isInitializing = true;
    try {
      await this.loadBuiltinAssets();
      this.initialized = true;
      console.log('[AssetService] ✅ 初始化完成');
    } catch (error) {
      console.error('[AssetService] ❌ 初始化失败:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 加载预置资产
   * 从 data/profiles/generated/index.ts 动态导入所有生成的资产
   */
  private async loadBuiltinAssets(): Promise<void> {
    try {
      // 动态导入所有预置型材
      const profilesModule = await import('@/data/profiles/generated');

      // 注册所有导出的资产
      if (profilesModule.profile2020Asset) {
        this.registerAsset(profilesModule.profile2020Asset);
        console.log('[AssetService] ✅ 已加载预置资产: profile-2020');
      }

      // 未来可以遍历 profilesModule 的所有导出自动注册
      // Object.values(profilesModule).forEach(asset => {
      //   if (asset && typeof asset === 'object' && 'id' in asset) {
      //     this.registerAsset(asset);
      //   }
      // });
    } catch (error) {
      console.error('[AssetService] ❌ 加载预置资产失败:', error);
    }
  }

  /**
   * 注册资产到注册表
   * 供外部（如 CoreServiceProvider）或内部使用
   * 注意：如果资产已存在会抛出异常，由调用方决定如何处理
   */
  registerAsset(asset: AnyAsset): void {
    this.registry.register(asset);
  }

  /**
   * @deprecated 已废弃 - 预置资产由 initialize() 方法统一加载
   * 加载预置型材数据
   */
  private loadPresetProfiles(): void {
    // 空实现 - 预置资产由 initialize() 方法从 data/profiles/generated/ 动态加载
  }

  // ==================== 型材查询 ====================

  /**
   * 获取所有型材
   */
  getAllProfiles(): ProfileAsset[] {
    return this.registry.getByType(AssetType.PROFILE) as ProfileAsset[];
  }

  /**
   * 按系列获取型材
   * @param series 系列编号（20, 30, 40 等）
   */
  getProfilesBySeries(series: number): ProfileAsset[] {
    const allProfiles = this.getAllProfiles();
    return allProfiles.filter(profile => {
      // 从截面尺寸推断系列
      const width = profile.crossSection.dimensions?.width;
      return width === series;
    });
  }

  /**
   * 根据 ID 获取型材
   */
  getProfileById(id: string): ProfileAsset | undefined {
    const asset = this.registry.get(id);
    return asset?.type === AssetType.PROFILE
      ? (asset as ProfileAsset)
      : undefined;
  }

  /**
   * 获取所有可用的系列编号
   * @returns 系列编号数组，如 [20, 30, 40]
   */
  getAvailableSeries(): number[] {
    const allProfiles = this.getAllProfiles();
    const seriesSet = new Set<number>();

    allProfiles.forEach(profile => {
      seriesSet.add(profile.crossSection.width);
    });

    return Array.from(seriesSet).sort((a, b) => a - b);
  }

  // ==================== 其他资产类型查询 ====================

  /**
   * 获取所有连接件
   */
  getAllConnectors(): ConnectorAsset[] {
    return this.registry.getByType(AssetType.CONNECTOR) as ConnectorAsset[];
  }

  /**
   * 获取所有紧固件
   */
  getAllFasteners(): FastenerAsset[] {
    return this.registry.getByType(AssetType.FASTENER) as FastenerAsset[];
  }

  // ==================== 通用查询 ====================

  /**
   * 搜索资产
   * @param query 搜索关键词
   */
  searchAssets(query: string): AnyAsset[] {
    return this.registry.search(query);
  }

  /**
   * 根据 ID 获取任意资产
   */
  getAssetById(id: string): AnyAsset | undefined {
    return this.registry.get(id);
  }

  /**
   * 获取资产统计信息
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * 获取底层 Registry（仅供内部使用）
   */
  getRegistry(): AssetRegistry {
    return this.registry;
  }
}
