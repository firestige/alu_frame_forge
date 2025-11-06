import * as THREE from 'three';
import { ObjectManager, ModelType } from '../../../core/object/ObjectManager.ts';

/**
 * 模型创建服务
 * 负责注册素材和创建各种类型的模型
 */
export class ModelCreationService {
  private objectManager: ObjectManager;
  private assetsRegistered = false;

  constructor(objectManager: ObjectManager) {
    this.objectManager = objectManager;
  }

  /**
   * 注册所有自定义素材
   */
  private registerAssets(): void {
    if (this.assetsRegistered) return;

    // 注册立方体素材
    if (!this.objectManager.getPrebuiltAsset('custom_cube')) {
      this.objectManager.registerPrebuiltAsset({
        id: 'custom_cube',
        name: '立方体',
        type: ModelType.CUSTOM,
        description: '简单的立方体',
        createGeometry: () => new THREE.BoxGeometry(1, 1, 1),
        defaultMaterial: new THREE.MeshStandardMaterial({
          color: 0x007bff,
          metalness: 0.3,
          roughness: 0.7,
        }),
        defaultParameters: {
          width: 1,
          height: 1,
          thickness: 1,
        },
      });
    }

    // 注册长方体素材
    if (!this.objectManager.getPrebuiltAsset('custom_box')) {
      this.objectManager.registerPrebuiltAsset({
        id: 'custom_box',
        name: '长方体',
        type: ModelType.CUSTOM,
        description: '可调整的长方体',
        createGeometry: params => {
          const width = params.width || 1;
          const height = params.height || 2;
          const depth = params.thickness || 1;
          return new THREE.BoxGeometry(width, height, depth);
        },
        defaultMaterial: new THREE.MeshStandardMaterial({
          color: 0xff6600,
          metalness: 0.4,
          roughness: 0.6,
        }),
        defaultParameters: {
          width: 1,
          height: 2,
          thickness: 1,
        },
      });
    }

    this.assetsRegistered = true;
  }

  /**
   * 创建立方体
   */
  public createCube(): void {
    this.registerAssets();

    const model = this.objectManager.createModelFromAsset('custom_cube', {
      name: `立方体_${Date.now()}`,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
    });

    console.log('添加立方体:', model);
  }

  /**
   * 创建长方体
   */
  public createBox(): void {
    this.registerAssets();

    const model = this.objectManager.createModelFromAsset('custom_box', {
      name: `长方体_${Date.now()}`,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      parameters: {
        width: 1,
        height: 2,
        thickness: 1,
      },
    });

    console.log('添加长方体:', model);
  }

  /**
   * 创建铝型材
   */
  public createAluminumProfile(): void {
    const model = this.objectManager.createModelFromAsset('alu_profile_40x40', {
      name: `铝型材_${Date.now()}`,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      parameters: {
        length: 1500,
      },
    });

    console.log('添加铝型材:', model);
  }

  /**
   * 创建面板
   */
  public createPanel(): void {
    const model = this.objectManager.createModelFromAsset('acrylic_panel', {
      name: `面板_${Date.now()}`,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      parameters: {
        width: 500,
        height: 500,
        thickness: 3,
      },
    });

    console.log('添加面板:', model);
  }

  /**
   * 创建连接件
   */
  public createConnector(): void {
    const model = this.objectManager.createModelFromAsset('corner_connector', {
      name: `连接件_${Date.now()}`,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
    });

    console.log('添加连接件:', model);
  }
}
