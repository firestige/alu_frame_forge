import type { PrebuiltAsset, ModelType, ModelParameters } from './types';

/**
 * 资产注册管理器
 * 负责管理预制资产的注册、查询和初始化
 */
export class AssetRegistry {
  private assets: Map<string, PrebuiltAsset> = new Map();

  constructor() {
    this.initializePrebuiltAssets();
  }

  // ==================== 初始化 ====================

  /**
   * 初始化预制素材库
   */
  private initializePrebuiltAssets(): void {
    // 铝型材 - 20x20mm
    this.registerAsset({
      id: 'alu_profile_20x20',
      name: '20x20 铝型材',
      type: 'aluminum_profile',
      description: '标准 20x20mm 铝型材',
      createGeometry: (params: ModelParameters) => ({
        length: params.length || 1000,
        width: 20,
        height: 20,
      }),
      defaultMaterial: 'aluminum',
      defaultParameters: {
        length: 1000,
        width: 20,
        height: 20,
      },
    });

    // 铝型材 - 40x40mm
    this.registerAsset({
      id: 'alu_profile_40x40',
      name: '40x40 铝型材',
      type: 'aluminum_profile',
      description: '标准 40x40mm 铝型材',
      createGeometry: (params: ModelParameters) => ({
        length: params.length || 1000,
        width: 40,
        height: 40,
      }),
      defaultMaterial: 'aluminum',
      defaultParameters: {
        length: 1000,
        width: 40,
        height: 40,
      },
    });

    // 连接件
    this.registerAsset({
      id: 'corner_connector',
      name: '直角连接件',
      type: 'connector',
      description: '90度直角连接件',
      createGeometry: () => ({
        width: 30,
        height: 30,
        thickness: 30,
      }),
      defaultMaterial: 'connector',
      defaultParameters: {
        width: 30,
        height: 30,
        thickness: 30,
      },
    });

    // 面板
    this.registerAsset({
      id: 'acrylic_panel',
      name: '亚克力面板',
      type: 'panel',
      description: '透明亚克力面板',
      createGeometry: (params: ModelParameters) => ({
        width: params.width || 500,
        height: params.height || 500,
        thickness: params.thickness || 3,
      }),
      defaultMaterial: 'panel',
      defaultParameters: {
        width: 500,
        height: 500,
        thickness: 3,
      },
    });
  }

  // ==================== 注册和查询 ====================

  /**
   * 注册预制素材
   */
  public registerAsset(asset: PrebuiltAsset): void {
    this.assets.set(asset.id, asset);
    console.log(`Prebuilt asset ${asset.name} registered`);
  }

  /**
   * 获取所有预制素材
   */
  public getAllAssets(): PrebuiltAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * 根据 ID 获取预制素材
   */
  public getAsset(assetId: string): PrebuiltAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * 根据类型获取预制素材
   */
  public getAssetsByType(type: ModelType): PrebuiltAsset[] {
    return Array.from(this.assets.values()).filter(
      asset => asset.type === type
    );
  }

  /**
   * 检查资产是否存在
   */
  public hasAsset(assetId: string): boolean {
    return this.assets.has(assetId);
  }

  /**
   * 获取资产数量
   */
  public getAssetCount(): number {
    return this.assets.size;
  }
}
