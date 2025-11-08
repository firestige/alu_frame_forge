/**
 * GeometryFactory - Three.js 几何体和材质工厂
 * 负责创建各种预制几何体和材质
 * 将 Three.js 特定实现内聚在渲染器模块内
 */

import * as THREE from 'three';

/**
 * 几何体参数
 */
export interface GeometryParams {
  length?: number;
  width?: number;
  height?: number;
  thickness?: number;
  [key: string]: unknown;
}

/**
 * 材质配置
 */
export interface MaterialConfig {
  color?: number | string;
  metalness?: number;
  roughness?: number;
  transparent?: boolean;
  opacity?: number;
  transmission?: number;
}

/**
 * 几何体工厂类
 */
export class GeometryFactory {
  /**
   * 创建盒子几何体
   */
  static createBox(
    width: number,
    height: number,
    depth: number
  ): THREE.BufferGeometry {
    return new THREE.BoxGeometry(width, height, depth);
  }

  /**
   * 创建铝型材几何体（20x20mm）
   */
  static createAluminumProfile20x20(
    params: GeometryParams
  ): THREE.BufferGeometry {
    const length = params.length || 1000;
    return new THREE.BoxGeometry(0.02, 0.02, length / 1000);
  }

  /**
   * 创建铝型材几何体（40x40mm）
   */
  static createAluminumProfile40x40(
    params: GeometryParams
  ): THREE.BufferGeometry {
    const length = params.length || 1000;
    return new THREE.BoxGeometry(0.04, 0.04, length / 1000);
  }

  /**
   * 创建连接件几何体
   */
  static createConnector(params: GeometryParams): THREE.BufferGeometry {
    const size = (params.width || 30) / 1000;
    return new THREE.BoxGeometry(size, size, size);
  }

  /**
   * 创建面板几何体
   */
  static createPanel(params: GeometryParams): THREE.BufferGeometry {
    const width = (params.width || 500) / 1000;
    const height = (params.height || 500) / 1000;
    const thickness = (params.thickness || 3) / 1000;
    return new THREE.BoxGeometry(width, height, thickness);
  }
}

/**
 * 材质工厂类
 */
export class MaterialFactory {
  /**
   * 创建标准材质
   */
  static createStandard(config: MaterialConfig = {}): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: config.color ?? 0xffffff,
      metalness: config.metalness ?? 0.5,
      roughness: config.roughness ?? 0.5,
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1.0,
    });
  }

  /**
   * 创建铝型材材质
   */
  static createAluminumMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.7,
      roughness: 0.3,
    });
  }

  /**
   * 创建连接件材质
   */
  static createConnectorMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2,
    });
  }

  /**
   * 创建透明面板材质
   */
  static createPanelMaterial(): THREE.Material {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      transmission: 0.9,
      roughness: 0.1,
    });
  }

  /**
   * 创建物理材质
   */
  static createPhysical(config: MaterialConfig = {}): THREE.Material {
    return new THREE.MeshPhysicalMaterial({
      color: config.color ?? 0xffffff,
      metalness: config.metalness ?? 0.5,
      roughness: config.roughness ?? 0.5,
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1.0,
      transmission: config.transmission ?? 0,
    });
  }
}

/**
 * 网格对象工厂
 */
export class MeshFactory {
  /**
   * 创建网格对象
   */
  static createMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * 创建铝型材网格
   */
  static createAluminumProfileMesh(
    size: '20x20' | '40x40',
    params: GeometryParams
  ): THREE.Mesh {
    const geometry =
      size === '20x20'
        ? GeometryFactory.createAluminumProfile20x20(params)
        : GeometryFactory.createAluminumProfile40x40(params);

    const material = MaterialFactory.createAluminumMaterial();
    return this.createMesh(geometry, material);
  }

  /**
   * 创建连接件网格
   */
  static createConnectorMesh(params: GeometryParams = {}): THREE.Mesh {
    const geometry = GeometryFactory.createConnector(params);
    const material = MaterialFactory.createConnectorMaterial();
    return this.createMesh(geometry, material);
  }

  /**
   * 创建面板网格
   */
  static createPanelMesh(params: GeometryParams): THREE.Mesh {
    const geometry = GeometryFactory.createPanel(params);
    const material = MaterialFactory.createPanelMaterial();
    return this.createMesh(geometry, material);
  }
}
