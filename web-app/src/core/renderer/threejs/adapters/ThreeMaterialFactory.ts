/**
 * Three.js 材质工厂
 *
 * 将抽象的 MaterialProperties 转换为 Three.js 材质
 * 实现 Factory 模式，封装材质创建逻辑
 *
 * @module core/renderer/threejs/adapters
 */

import * as THREE from 'three';
import type { MaterialProperties } from '@/core/geometry/types';

/**
 * Three.js 材质工厂
 *
 * 根据抽象材质属性创建对应的 Three.js 材质对象
 */
export class ThreeMaterialFactory {
  /**
   * 创建 Three.js 材质
   *
   * @param props - 抽象材质属性
   * @returns Three.js 材质对象
   */
  static create(props: MaterialProperties): THREE.Material {
    // 根据材质类型选择合适的 Three.js 材质
    switch (props.type) {
      case 'metal':
        return this.createMetalMaterial(props);

      case 'plastic':
        return this.createPlasticMaterial(props);

      case 'wood':
        return this.createWoodMaterial(props);

      case 'glass':
        return this.createGlassMaterial(props);

      case 'custom':
      default:
        return this.createStandardMaterial(props);
    }
  }

  /**
   * 创建金属材质
   *
   * @private
   */
  private static createMetalMaterial(
    props: MaterialProperties
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: props.color,
      metalness: props.metalness ?? 0.9,
      roughness: props.roughness ?? 0.3,
      opacity: props.opacity ?? 1.0,
      transparent: props.transparent ?? false,
      emissive: props.emissive ?? 0x000000,
      emissiveIntensity: props.emissiveIntensity ?? 0,
      aoMapIntensity: props.aoMapIntensity ?? 1.0,
    });
  }

  /**
   * 创建塑料材质
   *
   * @private
   */
  private static createPlasticMaterial(
    props: MaterialProperties
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: props.color,
      metalness: props.metalness ?? 0.0,
      roughness: props.roughness ?? 0.5,
      opacity: props.opacity ?? 1.0,
      transparent: props.transparent ?? false,
      emissive: props.emissive ?? 0x000000,
      emissiveIntensity: props.emissiveIntensity ?? 0,
    });
  }

  /**
   * 创建木材材质
   *
   * @private
   */
  private static createWoodMaterial(
    props: MaterialProperties
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: props.color,
      metalness: props.metalness ?? 0.0,
      roughness: props.roughness ?? 0.8,
      opacity: props.opacity ?? 1.0,
      transparent: props.transparent ?? false,
    });
  }

  /**
   * 创建玻璃材质
   *
   * @private
   */
  private static createGlassMaterial(
    props: MaterialProperties
  ): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: props.color,
      metalness: props.metalness ?? 0.0,
      roughness: props.roughness ?? 0.1,
      opacity: props.opacity ?? 0.5,
      transparent: props.transparent ?? true,
      transmission: 0.9, // 透光性
      thickness: 0.5,
    });
  }

  /**
   * 创建标准材质（默认）
   *
   * @private
   */
  private static createStandardMaterial(
    props: MaterialProperties
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: props.color,
      metalness: props.metalness ?? 0.5,
      roughness: props.roughness ?? 0.5,
      opacity: props.opacity ?? 1.0,
      transparent: props.transparent ?? false,
      emissive: props.emissive ?? 0x000000,
      emissiveIntensity: props.emissiveIntensity ?? 0,
      aoMapIntensity: props.aoMapIntensity ?? 1.0,
    });
  }

  /**
   * 更新材质属性
   *
   * @param material - Three.js 材质对象
   * @param props - 新的材质属性
   */
  static update(
    material: THREE.Material,
    props: Partial<MaterialProperties>
  ): void {
    if (
      !(material instanceof THREE.MeshStandardMaterial) &&
      !(material instanceof THREE.MeshPhysicalMaterial)
    ) {
      console.warn(
        'Only MeshStandardMaterial and MeshPhysicalMaterial can be updated'
      );
      return;
    }

    if (props.color !== undefined) {
      material.color.setHex(props.color);
    }

    if (props.metalness !== undefined && 'metalness' in material) {
      material.metalness = props.metalness;
    }

    if (props.roughness !== undefined && 'roughness' in material) {
      material.roughness = props.roughness;
    }

    if (props.opacity !== undefined) {
      material.opacity = props.opacity;
    }

    if (props.transparent !== undefined) {
      material.transparent = props.transparent;
    }

    if (props.emissive !== undefined && 'emissive' in material) {
      material.emissive.setHex(props.emissive);
    }

    if (
      props.emissiveIntensity !== undefined &&
      'emissiveIntensity' in material
    ) {
      material.emissiveIntensity = props.emissiveIntensity;
    }

    material.needsUpdate = true;
  }
}
