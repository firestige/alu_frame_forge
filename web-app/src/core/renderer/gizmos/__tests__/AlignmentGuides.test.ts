/**
 * AlignmentGuides Tests
 *
 * @group unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { AlignmentGuides } from '../AlignmentGuides';
import type { AlignmentGuide } from '../AlignmentGuides';

describe('AlignmentGuides', () => {
  let scene: THREE.Scene;
  let guides: AlignmentGuides;

  beforeEach(() => {
    scene = new THREE.Scene();
    guides = new AlignmentGuides(scene);
  });

  afterEach(() => {
    guides.dispose();
  });

  describe('Initialization', () => {
    it('should create guides group in scene', () => {
      const guidesGroup = scene.getObjectByName('AlignmentGuides');
      expect(guidesGroup).toBeDefined();
      expect(guidesGroup).toBeInstanceOf(THREE.Group);
    });

    it('should initialize with default config', () => {
      expect(guides).toBeDefined();
    });

    it('should accept custom config', () => {
      const customGuides = new AlignmentGuides(scene, {
        enabled: false,
        lineColor: 0xff0000,
      });

      expect(customGuides).toBeDefined();
      customGuides.dispose();
    });
  });

  describe('setGuides()', () => {
    it('should create guide lines', () => {
      const guideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ];

      guides.setGuides(guideList);

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(1);
    });

    it('should create multiple guide lines', () => {
      const guideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
        {
          type: 'y',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
        },
        {
          type: 'z',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 0, z: 10 },
        },
      ];

      guides.setGuides(guideList);

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(3);
    });

    it('should clear previous guides before setting new ones', () => {
      const guideList1: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ];

      const guideList2: AlignmentGuide[] = [
        {
          type: 'y',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
        },
        {
          type: 'z',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 0, z: 10 },
        },
      ];

      guides.setGuides(guideList1);
      const guidesGroup1 = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup1.children.length).toBe(1);

      guides.setGuides(guideList2);
      const guidesGroup2 = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup2.children.length).toBe(2);
    });
  });

  describe('updateGuides()', () => {
    it('should update existing guides', () => {
      const guideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ];

      guides.setGuides(guideList);

      const updatedGuideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 5, y: 0, z: 0 },
          end: { x: 15, y: 0, z: 0 },
        },
      ];

      guides.updateGuides(updatedGuideList);

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(1);
    });

    it('should recreate guides if count changes', () => {
      const guideList1: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ];

      guides.setGuides(guideList1);

      const guideList2: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
        {
          type: 'y',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
        },
      ];

      guides.updateGuides(guideList2);

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(2);
    });
  });

  describe('showAlignmentToReference()', () => {
    it('should show X-axis alignment', () => {
      guides.showAlignmentToReference(
        { x: 5, y: 3, z: 2 },
        { x: 10, y: 3, z: 2 },
        { x: 10, y: 0, z: 0 },
        'x'
      );

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBeGreaterThan(0);
    });

    it('should show Y-axis alignment', () => {
      guides.showAlignmentToReference(
        { x: 3, y: 5, z: 2 },
        { x: 3, y: 10, z: 2 },
        { x: 0, y: 10, z: 0 },
        'y'
      );

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBeGreaterThan(0);
    });

    it('should show Z-axis alignment', () => {
      guides.showAlignmentToReference(
        { x: 3, y: 2, z: 5 },
        { x: 3, y: 2, z: 10 },
        { x: 0, y: 0, z: 10 },
        'z'
      );

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBeGreaterThan(0);
    });

    it('should show XY-plane alignment (two lines)', () => {
      guides.showAlignmentToReference(
        { x: 5, y: 5, z: 2 },
        { x: 10, y: 10, z: 2 },
        { x: 10, y: 10, z: 0 },
        'xy'
      );

      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(2);
    });
  });

  describe('clearGuides()', () => {
    it('should remove all guide lines', () => {
      const guideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
        {
          type: 'y',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 0, y: 10, z: 0 },
        },
      ];

      guides.setGuides(guideList);
      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;
      expect(guidesGroup.children.length).toBe(2);

      guides.clearGuides();
      expect(guidesGroup.children.length).toBe(0);
    });
  });

  describe('setVisible()', () => {
    it('should set guides visibility', () => {
      const guidesGroup = scene.getObjectByName(
        'AlignmentGuides'
      ) as THREE.Group;

      guides.setVisible(false);
      expect(guidesGroup.visible).toBe(false);

      guides.setVisible(true);
      expect(guidesGroup.visible).toBe(true);
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      guides.updateConfig({
        lineColor: 0xff0000,
        lineOpacity: 0.5,
      });

      // Should update without error
      expect(true).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('should clean up resources', () => {
      const guideList: AlignmentGuide[] = [
        {
          type: 'x',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
        },
      ];

      guides.setGuides(guideList);

      const guidesGroupBefore = scene.getObjectByName('AlignmentGuides');
      expect(guidesGroupBefore).toBeDefined();

      guides.dispose();

      const guidesGroupAfter = scene.getObjectByName('AlignmentGuides');
      expect(guidesGroupAfter).toBeUndefined();
    });
  });
});
