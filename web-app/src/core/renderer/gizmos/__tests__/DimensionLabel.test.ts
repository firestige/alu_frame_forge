/**
 * DimensionLabel 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { DimensionLabel } from '../DimensionLabel';
import type { Vector3 } from '@/types';

// Mock Canvas API
const mockContext = {
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  fillStyle: '',
  globalAlpha: 1,
  measureText: vi.fn(() => ({ width: 50 })),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
};

// Override document.createElement for canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    const canvas = originalCreateElement('canvas');
    canvas.getContext = vi.fn(() => mockContext as any);
    return canvas;
  }
  return originalCreateElement(tagName);
}) as any;

describe('DimensionLabel', () => {
  let scene: THREE.Scene;
  let label: DimensionLabel;

  beforeEach(() => {
    scene = new THREE.Scene();
    label = new DimensionLabel(scene);
  });

  afterEach(() => {
    label.dispose();
  });

  describe('初始化', () => {
    it('should create label with default config', () => {
      expect(label).toBeDefined();
      expect(scene.children).toHaveLength(1); // LabelsGroup
    });

    it('should create label with custom config', () => {
      const customLabel = new DimensionLabel(scene, {
        enabled: false,
        distanceUnit: 'cm',
        angleUnit: 'rad',
        distancePrecision: 3,
        anglePrecision: 2,
      });

      expect(customLabel).toBeDefined();
      customLabel.dispose();
    });
  });

  describe('距离标注', () => {
    it('should add distance label in mm', () => {
      const position: Vector3 = { x: 1, y: 2, z: 3 };
      label.addDistanceLabel('d1', 100, position);

      const sprite = scene.getObjectByName('DimensionLabel-d1');
      expect(sprite).toBeDefined();
      expect(sprite).toBeInstanceOf(THREE.Sprite);
    });

    it('should add distance label in cm', () => {
      const customLabel = new DimensionLabel(scene, { distanceUnit: 'cm' });
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      customLabel.addDistanceLabel('d2', 100, position);

      const sprite = scene.getObjectByName('DimensionLabel-d2');
      expect(sprite).toBeDefined();
      customLabel.dispose();
    });

    it('should add distance label in m', () => {
      const customLabel = new DimensionLabel(scene, { distanceUnit: 'm' });
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      customLabel.addDistanceLabel('d3', 1000, position);

      const sprite = scene.getObjectByName('DimensionLabel-d3');
      expect(sprite).toBeDefined();
      customLabel.dispose();
    });

    it('should respect distance precision', () => {
      const customLabel = new DimensionLabel(scene, { distancePrecision: 3 });
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      customLabel.addDistanceLabel('d4', 123.456, position);

      const sprite = scene.getObjectByName('DimensionLabel-d4');
      expect(sprite).toBeDefined();
      customLabel.dispose();
    });
  });

  describe('角度标注', () => {
    it('should add angle label in degrees', () => {
      const position: Vector3 = { x: 1, y: 2, z: 3 };
      label.addAngleLabel('a1', 45, position);

      const sprite = scene.getObjectByName('DimensionLabel-a1');
      expect(sprite).toBeDefined();
      expect(sprite).toBeInstanceOf(THREE.Sprite);
    });

    it('should add angle label in radians', () => {
      const customLabel = new DimensionLabel(scene, { angleUnit: 'rad' });
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      customLabel.addAngleLabel('a2', 90, position);

      const sprite = scene.getObjectByName('DimensionLabel-a2');
      expect(sprite).toBeDefined();
      customLabel.dispose();
    });

    it('should respect angle precision', () => {
      const customLabel = new DimensionLabel(scene, { anglePrecision: 2 });
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      customLabel.addAngleLabel('a3', 45.678, position);

      const sprite = scene.getObjectByName('DimensionLabel-a3');
      expect(sprite).toBeDefined();
      customLabel.dispose();
    });
  });

  describe('更新标注', () => {
    it('should update label position', () => {
      const position1: Vector3 = { x: 0, y: 0, z: 0 };
      const position2: Vector3 = { x: 1, y: 1, z: 1 };

      label.addDistanceLabel('d1', 100, position1);

      const sprite = scene.getObjectByName('DimensionLabel-d1') as THREE.Sprite;
      expect(sprite.position.x).toBe(0);
      expect(sprite.position.y).toBe(0);
      expect(sprite.position.z).toBe(0);

      label.updateLabelPosition('d1', position2);
      expect(sprite.position.x).toBe(1);
      expect(sprite.position.y).toBe(1);
      expect(sprite.position.z).toBe(1);
    });

    it('should update label value', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);

      const sprite = scene.getObjectByName('DimensionLabel-d1') as THREE.Sprite;
      expect(sprite).toBeDefined();

      label.updateLabel('d1', 200);

      // 验证 Sprite 仍然存在
      const updatedSprite = scene.getObjectByName('DimensionLabel-d1');
      expect(updatedSprite).toBeDefined();
    });

    it('should update label value and position', () => {
      const position1: Vector3 = { x: 0, y: 0, z: 0 };
      const position2: Vector3 = { x: 1, y: 1, z: 1 };

      label.addDistanceLabel('d1', 100, position1);
      label.updateLabel('d1', 200, position2);

      const sprite = scene.getObjectByName('DimensionLabel-d1') as THREE.Sprite;
      expect(sprite.position.x).toBe(1);
      expect(sprite.position.y).toBe(1);
      expect(sprite.position.z).toBe(1);
    });

    it('should update angle label', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addAngleLabel('a1', 45, position);

      const sprite = scene.getObjectByName('DimensionLabel-a1');
      expect(sprite).toBeDefined();

      label.updateLabel('a1', 90);

      const updatedSprite = scene.getObjectByName('DimensionLabel-a1');
      expect(updatedSprite).toBeDefined();
    });
  });

  describe('移除标注', () => {
    it('should remove label', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);

      expect(scene.getObjectByName('DimensionLabel-d1')).toBeDefined();

      label.removeLabel('d1');
      expect(scene.getObjectByName('DimensionLabel-d1')).toBeUndefined();
    });

    it('should handle removing non-existent label', () => {
      expect(() => label.removeLabel('non-existent')).not.toThrow();
    });
  });

  describe('清空标注', () => {
    it('should clear all labels', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };

      label.addDistanceLabel('d1', 100, position);
      label.addDistanceLabel('d2', 200, position);
      label.addAngleLabel('a1', 45, position);

      expect(scene.getObjectByName('DimensionLabel-d1')).toBeDefined();
      expect(scene.getObjectByName('DimensionLabel-d2')).toBeDefined();
      expect(scene.getObjectByName('DimensionLabel-a1')).toBeDefined();

      label.clearLabels();

      expect(scene.getObjectByName('DimensionLabel-d1')).toBeUndefined();
      expect(scene.getObjectByName('DimensionLabel-d2')).toBeUndefined();
      expect(scene.getObjectByName('DimensionLabel-a1')).toBeUndefined();
    });
  });

  describe('可见性', () => {
    it('should set label visibility', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);

      const sprite = scene.getObjectByName('DimensionLabel-d1') as THREE.Sprite;
      expect(sprite.visible).toBe(true);

      label.setLabelVisible('d1', false);
      expect(sprite.visible).toBe(false);

      label.setLabelVisible('d1', true);
      expect(sprite.visible).toBe(true);
    });

    it('should set all labels visibility', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);
      label.addDistanceLabel('d2', 200, position);

      label.setVisible(false);

      const group = scene.getObjectByName('DimensionLabels');
      expect(group).toBeDefined();
      expect(group!.visible).toBe(false);

      label.setVisible(true);
      expect(group!.visible).toBe(true);
    });
  });

  describe('替换标注', () => {
    it('should replace existing label', () => {
      const position1: Vector3 = { x: 0, y: 0, z: 0 };
      const position2: Vector3 = { x: 1, y: 1, z: 1 };

      label.addDistanceLabel('d1', 100, position1);
      const sprite1 = scene.getObjectByName(
        'DimensionLabel-d1'
      ) as THREE.Sprite;

      label.addDistanceLabel('d1', 200, position2);
      const sprite2 = scene.getObjectByName(
        'DimensionLabel-d1'
      ) as THREE.Sprite;

      // 应该是不同的 Sprite
      expect(sprite2).not.toBe(sprite1);
      expect(sprite2.position.x).toBe(1);
      expect(sprite2.position.y).toBe(1);
      expect(sprite2.position.z).toBe(1);
    });
  });

  describe('配置更新', () => {
    it('should update config', () => {
      label.updateConfig({
        distanceUnit: 'cm',
        anglePrecision: 3,
      });

      // 验证配置已更新（通过添加新标注测试）
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);

      const sprite = scene.getObjectByName('DimensionLabel-d1');
      expect(sprite).toBeDefined();
    });
  });

  describe('销毁', () => {
    it('should dispose resources', () => {
      const position: Vector3 = { x: 0, y: 0, z: 0 };
      label.addDistanceLabel('d1', 100, position);
      label.addAngleLabel('a1', 45, position);

      expect(scene.children.length).toBeGreaterThan(0);

      label.dispose();
      expect(scene.getObjectByName('DimensionLabels')).toBeUndefined();
    });
  });

  describe('禁用状态', () => {
    it('should not add labels when disabled', () => {
      const disabledLabel = new DimensionLabel(scene, { enabled: false });
      const position: Vector3 = { x: 0, y: 0, z: 0 };

      disabledLabel.addDistanceLabel('d1', 100, position);
      disabledLabel.addAngleLabel('a1', 45, position);

      expect(scene.getObjectByName('DimensionLabel-d1')).toBeUndefined();
      expect(scene.getObjectByName('DimensionLabel-a1')).toBeUndefined();

      disabledLabel.dispose();
    });
  });
});
