/**
 * AnchorService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnchorService } from '../AnchorService';
import { AnchorType } from '../types';
import type { SceneObject } from '@/core/object/types/scene-object';

describe('AnchorService', () => {
  let service: AnchorService;

  beforeEach(() => {
    service = new AnchorService();
  });

  describe('generateAnchors()', () => {
    it('should generate profile anchors', () => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: {
          length: 1000,
        },
        machiningOps: [],
        visual: {
          mesh: null,
          isVisible: true,
        },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: 'M 0 0 L 20 0 L 20 20 L 0 20 Z',
            length: 1000,
            machiningOps: [],
            material: {
              type: 'metal',
              density: 2700,
              youngsModulus: 69000,
              poissonsRatio: 0.33,
            },
          },
          material: {
            type: 'metal',
            density: 2700,
            youngsModulus: 69000,
            poissonsRatio: 0.33,
          },
          connections: [],
          mass: 1.08,
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const anchors = service.generateAnchors(sceneObject);

      // 应该生成：2个端点 + 8个角点 + N个侧面吸附点
      expect(anchors.length).toBeGreaterThan(10);

      // 检查端点锚点
      const endAnchors = anchors.filter((a) => a.type === AnchorType.PROFILE_END);
      expect(endAnchors).toHaveLength(2);
      expect(endAnchors[0].id).toBe('profile-1-end-front');
      expect(endAnchors[1].id).toBe('profile-1-end-back');

      // 检查角点锚点
      const cornerAnchors = anchors.filter(
        (a) => a.type === AnchorType.PROFILE_CORNER
      );
      expect(cornerAnchors).toHaveLength(8); // 4个角 × 2端

      // 检查吸附点
      const snapAnchors = anchors.filter((a) => a.type === AnchorType.PROFILE_SNAP);
      expect(snapAnchors.length).toBeGreaterThan(0);
    });

    it('should cache generated anchors', () => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);

      const cachedAnchors = service.getAnchors('profile-1');
      expect(cachedAnchors.length).toBeGreaterThan(0);
    });

    it('should trigger onAnchorsUpdated callback', () => {
      const callback = vi.fn();
      service.onAnchorsUpdated = callback;

      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);

      expect(callback).toHaveBeenCalledWith('profile-1', expect.any(Array));
    });
  });

  describe('findNearestAnchor()', () => {
    beforeEach(() => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);
    });

    it('should find nearest anchor within threshold', () => {
      const result = service.findNearestAnchor(
        { x: 5, y: 5, z: 5 },
        { threshold: 100 }
      );

      expect(result).not.toBeNull();
      expect(result?.distance).toBeLessThan(100);
    });

    it('should return null if no anchor within threshold', () => {
      const result = service.findNearestAnchor(
        { x: 1000, y: 1000, z: 1000 },
        { threshold: 10 }
      );

      expect(result).toBeNull();
    });

    it('should filter by anchor type', () => {
      const result = service.findNearestAnchor(
        { x: 0, y: 0, z: 0 },
        { types: [AnchorType.PROFILE_END], threshold: 100 }
      );

      expect(result).not.toBeNull();
      expect(result?.anchor.type).toBe(AnchorType.PROFILE_END);
    });

    it('should exclude specified anchors', () => {
      const allAnchors = service.getAnchors('profile-1');
      const excludeId = allAnchors[0].id;

      const result = service.findNearestAnchor(
        { x: 0, y: 0, z: 0 },
        { excludeIds: [excludeId], threshold: 100 }
      );

      expect(result?.anchor.id).not.toBe(excludeId);
    });
  });

  describe('findAnchorsInRadius()', () => {
    beforeEach(() => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);
    });

    it('should find all anchors within radius', () => {
      const results = service.findAnchorsInRadius({ x: 0, y: 0, z: 0 }, 50);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.distance).toBeLessThanOrEqual(50);
      });
    });

    it('should sort results by distance', () => {
      const results = service.findAnchorsInRadius({ x: 0, y: 0, z: 0 }, 100);

      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
      }
    });
  });

  describe('removeAnchors()', () => {
    it('should remove anchors for specified object', () => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);
      expect(service.getAnchors('profile-1').length).toBeGreaterThan(0);

      service.removeAnchors('profile-1');
      expect(service.getAnchors('profile-1')).toHaveLength(0);
    });
  });

  describe('clearAllAnchors()', () => {
    it('should clear all cached anchors', () => {
      const sceneObject: SceneObject = {
        id: 'profile-1',
        name: 'Profile 1',
        assetId: 'asset-1',
        assetSource: 'local',
        assetType: 'profile',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
          scale: { x: 1, y: 1, z: 1 },
        },
        userParams: { length: 1000 },
        machiningOps: [],
        visual: { mesh: null, isVisible: true },
        compute: {
          geometry: {
            type: 'extruded_profile',
            crossSection: '',
            length: 1000,
            machiningOps: [],
            material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          },
          material: { type: 'metal', density: 2700, youngsModulus: 69000, poissonsRatio: 0.33 },
          connections: [],
          mass: 1,
        },
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      };

      service.generateAnchors(sceneObject);
      expect(service.getAnchorCount()).toBeGreaterThan(0);

      service.clearAllAnchors();
      expect(service.getAnchorCount()).toBe(0);
    });
  });
});
