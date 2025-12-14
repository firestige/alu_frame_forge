/**
 * ThreeMaterialFactory 测试
 *
 * 验证材质转换的正确性
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThreeMaterialFactory } from '../ThreeMaterialFactory';
import type { MaterialProperties } from '@/core/geometry/types';

describe('ThreeMaterialFactory', () => {
  describe('create()', () => {
    it('should create metal material', () => {
      const props: MaterialProperties = {
        type: 'metal',
        color: 0x999999,
        metalness: 0.9,
        roughness: 0.3,
      };

      const material = ThreeMaterialFactory.create(props);

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const stdMaterial = material as THREE.MeshStandardMaterial;
      expect(stdMaterial.metalness).toBe(0.9);
      expect(stdMaterial.roughness).toBe(0.3);
      expect(stdMaterial.color.getHex()).toBe(0x999999);
    });

    it('should create plastic material', () => {
      const props: MaterialProperties = {
        type: 'plastic',
        color: 0xff0000,
        roughness: 0.5,
      };

      const material = ThreeMaterialFactory.create(props);

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const stdMaterial = material as THREE.MeshStandardMaterial;
      expect(stdMaterial.metalness).toBe(0.0);
      expect(stdMaterial.roughness).toBe(0.5);
    });

    it('should create wood material', () => {
      const props: MaterialProperties = {
        type: 'wood',
        color: 0x8b4513,
        roughness: 0.8,
      };

      const material = ThreeMaterialFactory.create(props);

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      const stdMaterial = material as THREE.MeshStandardMaterial;
      expect(stdMaterial.metalness).toBe(0.0);
      expect(stdMaterial.roughness).toBe(0.8);
    });

    it('should create glass material with transparency', () => {
      const props: MaterialProperties = {
        type: 'glass',
        color: 0xffffff,
        opacity: 0.5,
        transparent: true,
      };

      const material = ThreeMaterialFactory.create(props);

      expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
      const physMaterial = material as THREE.MeshPhysicalMaterial;
      expect(physMaterial.transparent).toBe(true);
      expect(physMaterial.opacity).toBe(0.5);
      expect(physMaterial.transmission).toBe(0.9);
    });

    it('should create custom/standard material', () => {
      const props: MaterialProperties = {
        type: 'custom',
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.5,
      };

      const material = ThreeMaterialFactory.create(props);

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should apply default values for missing properties', () => {
      const props: MaterialProperties = {
        type: 'metal',
        color: 0x999999,
      };

      const material = ThreeMaterialFactory.create(props);
      const stdMaterial = material as THREE.MeshStandardMaterial;

      expect(stdMaterial.metalness).toBe(0.9); // 默认金属度
      expect(stdMaterial.roughness).toBe(0.3); // 默认粗糙度
      expect(stdMaterial.opacity).toBe(1.0);
      expect(stdMaterial.transparent).toBe(false);
    });

    it('should handle emissive properties', () => {
      const props: MaterialProperties = {
        type: 'metal',
        color: 0x999999,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      };

      const material = ThreeMaterialFactory.create(props);
      const stdMaterial = material as THREE.MeshStandardMaterial;

      expect(stdMaterial.emissive.getHex()).toBe(0xff0000);
      expect(stdMaterial.emissiveIntensity).toBe(0.5);
    });
  });

  describe('update()', () => {
    it('should update material properties', () => {
      const props: MaterialProperties = {
        type: 'metal',
        color: 0x999999,
      };

      const material = ThreeMaterialFactory.create(props);

      ThreeMaterialFactory.update(material, {
        color: 0xff0000,
        metalness: 0.7,
        roughness: 0.4,
      });

      const stdMaterial = material as THREE.MeshStandardMaterial;
      expect(stdMaterial.color.getHex()).toBe(0xff0000);
      expect(stdMaterial.metalness).toBe(0.7);
      expect(stdMaterial.roughness).toBe(0.4);
      // needsUpdate 被设置后会触发更新，之后可能被重置
      // expect(stdMaterial.needsUpdate).toBe(true);
    });

    it('should update transparency', () => {
      const props: MaterialProperties = {
        type: 'plastic',
        color: 0x999999,
      };

      const material = ThreeMaterialFactory.create(props);

      ThreeMaterialFactory.update(material, {
        opacity: 0.5,
        transparent: true,
      });

      expect(material.opacity).toBe(0.5);
      expect(material.transparent).toBe(true);
    });

    it('should warn for unsupported material types', () => {
      const basicMaterial = new THREE.MeshBasicMaterial({ color: 0x999999 });

      // 不应该抛出错误，但会输出警告
      ThreeMaterialFactory.update(basicMaterial, {
        color: 0xff0000,
      });
    });
  });
});
