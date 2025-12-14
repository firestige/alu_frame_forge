import { AssetRegistry } from './AssetRegistry';
import type {
  ProfileAsset,
  ConnectorAsset,
  FastenerAsset,
  AnyAsset,
} from './types/asset';
import { AssetType, AssetSource, MachiningOpType } from './types/enums';
import { series20Profiles, series30Profiles } from '@/data/profiles';

/**
 * 资产服务
 * 封装 AssetRegistry 的访问接口，提供业务友好的查询 API
 *
 * 职责：
 * - 初始化时加载预置型材数据
 * - 提供按系列、类型分组查询
 * - 封装 AssetRegistry 的底层操作
 */
export class AssetService {
  private registry: AssetRegistry;

  constructor() {
    this.registry = new AssetRegistry();
  }

  /**
   * 初始化 AssetService
   * 注意：内置资产现在由 CoreServiceProvider 在应用启动时注册
   */
  initialize(): void {
    // 不再自动加载预置资产
    // 内置资产由 CoreServiceProvider 统一管理
  }

  /**
   * @deprecated 已废弃 - 内置资产由 CoreServiceProvider 注册
   * 加载预置型材数据
   */
  private loadPresetProfiles(): void {
    // 处理 20 系列
    series20Profiles.forEach(profile => {
      const profileAsset: ProfileAsset = {
        id: profile.id,
        name: profile.name,
        type: AssetType.PROFILE,
        source: AssetSource.BUILTIN,
        description: profile.description,
        crossSection: {
          svgPath: profile.svg,
          width: 20,
          height: 20,
          wallThickness: 2,
        },
        material: {
          name: '6063-T5',
          yieldStrength: 160,
          density: 2700,
          elasticModulus: 69000,
          poissonRatio: 0.33,
          thermalExpansion: 23.6e-6,
        },
        supportedOperations: [
          MachiningOpType.HOLE,
          MachiningOpType.CHAMFER,
          MachiningOpType.THREAD,
        ],
        defaultLength: 500,
        minLength: 100,
        maxLength: 3000,
      };
      this.registry.register(profileAsset);
    });

    // 处理 30 系列
    series30Profiles.forEach(profile => {
      const profileAsset: ProfileAsset = {
        id: profile.id,
        name: profile.name,
        type: AssetType.PROFILE,
        source: AssetSource.BUILTIN,
        description: profile.description,
        crossSection: {
          svgPath: profile.svg,
          width: 30,
          height: 30,
          wallThickness: 3,
        },
        material: {
          name: '6063-T5',
          yieldStrength: 160,
          density: 2700,
          elasticModulus: 69000,
          poissonRatio: 0.33,
          thermalExpansion: 23.6e-6,
        },
        supportedOperations: [
          MachiningOpType.HOLE,
          MachiningOpType.CHAMFER,
          MachiningOpType.THREAD,
        ],
        defaultLength: 500,
        minLength: 100,
        maxLength: 3000,
      };
      this.registry.register(profileAsset);
    });
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
      // 从名称或宽度推断系列
      const width = profile.crossSection.width;
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
