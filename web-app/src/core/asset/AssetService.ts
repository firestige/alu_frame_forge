import { AssetRegistry } from './AssetRegistry';
import type {
  ProfileAsset,
  ConnectorAssetV2,
  FastenerAssetV2,
  AnyAsset,
  NormalizedCrossSection,
} from './types/asset';
import { AssetType, AssetSource, MachiningOpType } from './types/enums';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

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

      // 加载连接件和紧固件
      await this.loadConnectorAssets();
      await this.loadFastenerAssets();

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
   * 加载连接件资产
   */
  private async loadConnectorAssets(): Promise<void> {
    try {
      const { connectorLBracket2020 } = await import(
        '@/data/connectors/l-bracket-2020.stub'
      );
      this.registerAsset(connectorLBracket2020);
      console.log('[AssetService] ✅ 已加载连接件资产: l-bracket-2020');
    } catch (error) {
      console.error('[AssetService] ❌ 加载连接件资产失败:', error);
    }
  }

  /**
   * 加载紧固件资产
   */
  private async loadFastenerAssets(): Promise<void> {
    try {
      const { fastenerISO4014M5x20 } = await import(
        '@/data/fasteners/iso4014-m5x20.stub'
      );
      this.registerAsset(fastenerISO4014M5x20);
      console.log('[AssetService] ✅ 已加载紧固件资产: iso4014-m5x20');
    } catch (error) {
      console.error('[AssetService] ❌ 加载紧固件资产失败:', error);
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
  getAllConnectors(): ConnectorAssetV2[] {
    return this.registry.getByType(AssetType.CONNECTOR) as ConnectorAssetV2[];
  }

  /**
   * 获取所有紧固件
   */
  getAllFasteners(): FastenerAssetV2[] {
    return this.registry.getByType(AssetType.FASTENER) as FastenerAssetV2[];
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

  // ==================== SVG 转换功能 ====================

  /**
   * 将 SVG 内容转换为 NormalizedCrossSection
   *
   * 职责：
   * - 解析 SVG 路径
   * - 验证路径闭合性
   * - 转换为抽象层数据结构
   *
   * 不负责：
   * - 渲染器特定的方向验证（由 Strategy 层负责）
   *
   * @param svgContent SVG 文件内容
   * @param options 可选配置
   * @returns 规范化的截面数据
   */
  convertSVGToCrossSection(
    svgContent: string,
    options?: {
      outerPathIndex?: number;
      holeIndices?: number[];
    }
  ): NormalizedCrossSection {
    // 1. 解析 SVG
    const loader = new SVGLoader();
    const svgData = loader.parse(svgContent);

    if (svgData.paths.length === 0) {
      throw new Error('[AssetService] SVG 解析失败：未找到任何路径');
    }

    // 2. 提取路径
    const outerIndex = options?.outerPathIndex ?? 0;
    if (outerIndex >= svgData.paths.length) {
      throw new Error(
        `[AssetService] 外轮廓索引 ${outerIndex} 超出范围（共 ${svgData.paths.length} 条路径）`
      );
    }

    const outerPath = this.extractPathData(svgData.paths[outerIndex]);

    const holeIndices = options?.holeIndices ?? [];
    const holes = holeIndices.map(i => {
      if (i >= svgData.paths.length) {
        throw new Error(
          `[AssetService] 孔洞索引 ${i} 超出范围（共 ${svgData.paths.length} 条路径）`
        );
      }
      return this.extractPathData(svgData.paths[i]);
    });

    // 3. 验证闭合性
    this.validateClosedPath(outerPath);
    holes.forEach((h, idx) => {
      try {
        this.validateClosedPath(h);
      } catch (error) {
        throw new Error(`[AssetService] 孔洞 ${idx} 验证失败: ${error}`);
      }
    });

    console.log('[AssetService] ✅ SVG 转换成功:', {
      outerPath: outerPath.substring(0, 50) + '...',
      holes: holes.length,
    });

    return { outerPath, holes };
  }

  /**
   * 从 SVGPath 对象提取 path data 字符串
   *
   * @param svgPath SVGLoader 解析的路径对象
   * @returns path data 字符串（保持原始方向）
   */
  private extractPathData(svgPath: any): string {
    // SVGPath 包含 subPaths，每个 subPath 有 commands
    // 我们需要重建完整的 path data 字符串

    const commands: string[] = [];

    for (const subPath of svgPath.subPaths) {
      for (const curve of subPath.curves) {
        if (curve.type === 'LineCurve') {
          // L 命令
          const p = curve.v2;
          if (commands.length === 0) {
            commands.push(`M ${p.x},${p.y}`);
          } else {
            commands.push(`L ${p.x},${p.y}`);
          }
        } else if (curve.type === 'CubicBezierCurve') {
          // C 命令
          commands.push(
            `C ${curve.v1.x},${curve.v1.y} ${curve.v2.x},${curve.v2.y} ${curve.v3.x},${curve.v3.y}`
          );
        } else if (curve.type === 'QuadraticBezierCurve') {
          // Q 命令
          commands.push(
            `Q ${curve.v1.x},${curve.v1.y} ${curve.v2.x},${curve.v2.y}`
          );
        } else if (curve.type === 'EllipseCurve') {
          // A 命令（弧线）
          const {
            aX,
            aY,
            xRadius,
            yRadius,
            aStartAngle,
            aEndAngle,
            aClockwise,
          } = curve;

          // 计算起点和终点
          const startX = aX + xRadius * Math.cos(aStartAngle);
          const startY = aY + yRadius * Math.sin(aStartAngle);
          const endX = aX + xRadius * Math.cos(aEndAngle);
          const endY = aY + yRadius * Math.sin(aEndAngle);

          if (commands.length === 0) {
            commands.push(`M ${startX},${startY}`);
          }

          // large-arc-flag: 如果弧度 > 180°
          const deltaAngle = aEndAngle - aStartAngle;
          const largeArc = Math.abs(deltaAngle) > Math.PI ? 1 : 0;

          // sweep-flag: 顺时针 = 1, 逆时针 = 0
          const sweep = aClockwise ? 0 : 1;

          commands.push(
            `A ${xRadius},${yRadius} 0 ${largeArc},${sweep} ${endX},${endY}`
          );
        }
      }
    }

    // 添加闭合命令
    commands.push('Z');

    return commands.join(' ');
  }

  /**
   * 验证路径是否闭合
   *
   * @param pathData path data 字符串
   * @throws 如果路径未闭合
   */
  private validateClosedPath(pathData: string): void {
    // 基本验证：必须包含 M 命令和 Z 命令
    if (!pathData.includes('M') && !pathData.includes('m')) {
      throw new Error('路径必须以 M/m 命令开始');
    }

    if (!pathData.includes('Z') && !pathData.includes('z')) {
      throw new Error('路径必须以 Z/z 命令结束（闭合）');
    }

    // 可选：更严格的验证可以检查起点和终点是否重合
    // 这里暂时只做基本检查
  }
}
