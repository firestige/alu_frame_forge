import type { ObjectManager } from '@/core/object';
import { AssetType, AssetSource } from '@/core/object';

/**
 * 对象创建服务
 * 负责注册资产和创建场景对象
 */
export class ModelCreationService {
  private objectManager: ObjectManager;
  private assetsRegistered = false;

  constructor(objectManager: ObjectManager) {
    this.objectManager = objectManager;
  }

  /**
   * 注册所有自定义资产
   */
  private registerAssets(): void {
    if (this.assetsRegistered) return;

    // 注册立方体资产（作为 ACCESSORY）
    const cubeAsset = {
      id: 'custom_cube',
      name: '立方体',
      type: AssetType.ACCESSORY,
      source: AssetSource.CUSTOM,
      description: '简单的立方体',
      category: 'basic_shape',
      defaultParams: {
        size: 1000,
      },
      dimensions: {
        width: 1000,
        height: 1000,
        depth: 1000,
      },
      material: {
        type: 'aluminum' as const,
        density: 2700,
        youngsModulus: 69000,
        poissonsRatio: 0.33,
        yieldStrength: 240,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.objectManager.registerAsset(cubeAsset as any);

    // 注册长方体资产
    const boxAsset = {
      id: 'custom_box',
      name: '长方体',
      type: AssetType.ACCESSORY,
      source: AssetSource.CUSTOM,
      description: '可调整的长方体',
      category: 'basic_shape',
      defaultParams: {
        width: 1000,
        height: 2000,
        depth: 1000,
      },
      dimensions: {
        width: 1000,
        height: 2000,
        depth: 1000,
      },
      material: {
        type: 'aluminum' as const,
        density: 2700,
        youngsModulus: 69000,
        poissonsRatio: 0.33,
        yieldStrength: 240,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.objectManager.registerAsset(boxAsset as any);

    this.assetsRegistered = true;
  }

  /**
   * 创建立方体
   */
  public createCube(): void {
    this.registerAssets();

    const object = this.objectManager.createObjectFromAsset('custom_cube', {
      name: `立方体_${Date.now()}`,
      transform: {
        position: {
          x: (Math.random() - 0.5) * 4000,
          y: (Math.random() - 0.5) * 4000,
          z: (Math.random() - 0.5) * 4000,
        },
      },
      userParams: {
        size: 1000,
      },
    });

    console.log('添加立方体:', object);
  }

  /**
   * 创建长方体
   */
  public createBox(): void {
    this.registerAssets();

    const object = this.objectManager.createObjectFromAsset('custom_box', {
      name: `长方体_${Date.now()}`,
      transform: {
        position: {
          x: (Math.random() - 0.5) * 4000,
          y: (Math.random() - 0.5) * 4000,
          z: (Math.random() - 0.5) * 4000,
        },
      },
      userParams: {
        width: 1000,
        height: 2000,
        depth: 1000,
      },
    });

    console.log('添加长方体:', object);
  }

  /**
   * 创建铝型材
   */
  public createAluminumProfile(): void {
    const object = this.objectManager.createObjectFromAsset('profile_2020', {
      name: `铝型材_${Date.now()}`,
      transform: {
        position: {
          x: (Math.random() - 0.5) * 4000,
          y: (Math.random() - 0.5) * 4000,
          z: (Math.random() - 0.5) * 4000,
        },
      },
      userParams: {
        length: 1500,
      },
    });

    console.log('添加铝型材:', object);
  }

  /**
   * 创建面板
   */
  public createPanel(): void {
    const object = this.objectManager.createObjectFromAsset('acrylic_panel', {
      name: `面板_${Date.now()}`,
      transform: {
        position: {
          x: (Math.random() - 0.5) * 4000,
          y: (Math.random() - 0.5) * 4000,
          z: (Math.random() - 0.5) * 4000,
        },
      },
      userParams: {
        width: 500,
        height: 500,
        thickness: 3,
      },
    });

    console.log('添加面板:', object);
  }

  /**
   * 创建连接件
   */
  public createConnector(): void {
    const object = this.objectManager.createObjectFromAsset(
      'corner_connector',
      {
        name: `连接件_${Date.now()}`,
        transform: {
          position: {
            x: (Math.random() - 0.5) * 4000,
            y: (Math.random() - 0.5) * 4000,
            z: (Math.random() - 0.5) * 4000,
          },
        },
        userParams: {},
      }
    );

    console.log('添加连接件:', object);
  }
}
