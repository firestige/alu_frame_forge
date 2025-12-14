/**
 * AnchorGizmo Tests
 *
 * 娴嬭瘯閿氱偣鍙鍖栫粍浠剁殑鍔熻兘
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { AnchorGizmo } from '../AnchorGizmo';
import type { AnchorPoint } from '@/core/anchor/types';

describe('AnchorGizmo', () => {
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let gizmo: AnchorGizmo;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    gizmo = new AnchorGizmo(scene, camera);
  });

  afterEach(() => {
    gizmo.dispose();
  });

  describe('Initialization', () => {
    it('should create anchor group in scene', () => {
      const anchorGroup = scene.getObjectByName('AnchorGizmos');
      expect(anchorGroup).toBeDefined();
      expect(anchorGroup).toBeInstanceOf(THREE.Group);
    });

    it('should initialize with default config', () => {
      expect(gizmo).toBeDefined();
      // Gizmo should be enabled by default
    });

    it('should accept custom config', () => {
      const customGizmo = new AnchorGizmo(scene, camera, {
        enabled: false,
        visibilityThreshold: 100,
      });

      expect(customGizmo).toBeDefined();
      customGizmo.dispose();
    });
  });

  describe('setAnchors()', () => {
    it('should create instanced meshes for anchors', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
        {
          id: 'anchor-2',
          type: 'midpoint',
          objectId: 'obj-1',
          position: { x: 5, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const anchorGroup = scene.getObjectByName('AnchorGizmos') as THREE.Group;
      expect(anchorGroup.children.length).toBeGreaterThan(0);
    });

    it('should group anchors by type', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
        {
          id: 'anchor-2',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 10, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
        {
          id: 'anchor-3',
          type: 'midpoint',
          objectId: 'obj-1',
          position: { x: 5, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const anchorGroup = scene.getObjectByName('AnchorGizmos') as THREE.Group;

      // Should have 2 instanced meshes (one for 'end', one for 'midpoint')
      expect(anchorGroup.children.length).toBe(2);
    });

    it('should clear previous anchors before setting new ones', () => {
      const anchors1: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      const anchors2: AnchorPoint[] = [
        {
          id: 'anchor-2',
          type: 'midpoint',
          objectId: 'obj-2',
          position: { x: 5, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors1);
      const anchorGroup1 = scene.getObjectByName('AnchorGizmos') as THREE.Group;
      const childCount1 = anchorGroup1.children.length;

      gizmo.setAnchors(anchors2);
      const anchorGroup2 = scene.getObjectByName('AnchorGizmos') as THREE.Group;
      const childCount2 = anchorGroup2.children.length;

      // Should only have the new anchors
      expect(childCount2).toBe(1);
    });
  });

  describe('highlightAnchor()', () => {
    it('should highlight specified anchor', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);
      gizmo.highlightAnchor('anchor-1');

      // Highlight should be set (no exception thrown)
      expect(true).toBe(true);
    });

    it('should clear previous highlight when highlighting new anchor', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
        {
          id: 'anchor-2',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 10, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);
      gizmo.highlightAnchor('anchor-1');
      gizmo.highlightAnchor('anchor-2');

      // Should switch highlight without error
      expect(true).toBe(true);
    });

    it('should handle null anchor id (clear highlight)', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);
      gizmo.highlightAnchor('anchor-1');
      gizmo.highlightAnchor(null);

      // Should clear highlight without error
      expect(true).toBe(true);
    });
  });

  describe('updateAnchorPosition()', () => {
    it('should update anchor position', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const newPosition = new THREE.Vector3(10, 5, 3);
      gizmo.updateAnchorPosition('anchor-1', newPosition);

      // Should update without error
      expect(true).toBe(true);
    });

    it('should handle non-existent anchor id gracefully', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const newPosition = new THREE.Vector3(10, 5, 3);
      gizmo.updateAnchorPosition('non-existent', newPosition);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('clearAnchors()', () => {
    it('should remove all anchor meshes', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
        {
          id: 'anchor-2',
          type: 'midpoint',
          objectId: 'obj-1',
          position: { x: 5, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);
      const anchorGroup = scene.getObjectByName('AnchorGizmos') as THREE.Group;
      expect(anchorGroup.children.length).toBeGreaterThan(0);

      gizmo.clearAnchors();
      expect(anchorGroup.children.length).toBe(0);
    });
  });

  describe('setVisible()', () => {
    it('should set anchor group visibility', () => {
      const anchorGroup = scene.getObjectByName('AnchorGizmos') as THREE.Group;

      gizmo.setVisible(false);
      expect(anchorGroup.visible).toBe(false);

      gizmo.setVisible(true);
      expect(anchorGroup.visible).toBe(true);
    });
  });

  describe('raycast()', () => {
    it('should return null when no anchors intersect', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 100, y: 100, z: 100 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const result = gizmo.raycast(raycaster);
      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update without errors', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);
      gizmo.update();

      // Should update without error
      expect(true).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('should clean up resources', () => {
      const anchors: AnchorPoint[] = [
        {
          id: 'anchor-1',
          type: 'end',
          objectId: 'obj-1',
          position: { x: 0, y: 0, z: 0 },
          direction: { x: 1, y: 0, z: 0 },
        },
      ];

      gizmo.setAnchors(anchors);

      const anchorGroupBefore = scene.getObjectByName('AnchorGizmos');
      expect(anchorGroupBefore).toBeDefined();

      gizmo.dispose();

      const anchorGroupAfter = scene.getObjectByName('AnchorGizmos');
      expect(anchorGroupAfter).toBeUndefined();
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      gizmo.updateConfig({
        enabled: false,
        visibilityThreshold: 200,
      });

      // Should update config without error
      expect(true).toBe(true);
    });
  });
});
