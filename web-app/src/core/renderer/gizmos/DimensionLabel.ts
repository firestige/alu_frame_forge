/**
 * DimensionLabel - 尺寸标注组件
 *
 * 职责：
 * 1. 在 3D 场景中显示距离标注
 * 2. 在 3D 场景中显示角度标注
 * 3. 自动朝向相机（Billboard 效果）
 *
 * 设计原则：
 * - 使用 Canvas 纹理生成文本
 * - Sprite 实现 Billboard 效果
 * - 动态更新标注内容和位置
 *
 * @module core/renderer/gizmos
 */

import * as THREE from 'three';
import type { Vector3 } from '@/types';

/**
 * 标注类型
 */
export type DimensionType = 'distance' | 'angle';

/**
 * 标注样式配置
 */
export interface DimensionStyle {
  /** 字体大小（像素） */
  fontSize: number;

  /** 字体颜色 */
  fontColor: string;

  /** 背景颜色 */
  backgroundColor: string;

  /** 背景不透明度 */
  backgroundOpacity: number;

  /** 内边距（像素） */
  padding: number;

  /** 边框半径（像素） */
  borderRadius: number;

  /** 字体样式 */
  fontFamily: string;

  /** 是否加粗 */
  fontWeight: 'normal' | 'bold';
}

/**
 * DimensionLabel 配置
 */
export interface DimensionLabelConfig {
  /** 是否启用 */
  enabled: boolean;

  /** 标注样式 */
  style: DimensionStyle;

  /** 距离单位 */
  distanceUnit: 'mm' | 'cm' | 'm';

  /** 角度单位 */
  angleUnit: 'deg' | 'rad';

  /** 距离精度（小数位数） */
  distancePrecision: number;

  /** 角度精度（小数位数） */
  anglePrecision: number;
}

/**
 * 标注数据
 */
export interface DimensionData {
  /** 标注 ID */
  id: string;

  /** 标注类型 */
  type: DimensionType;

  /** 标注值 */
  value: number;

  /** 标注位置 */
  position: Vector3;

  /** 可见性 */
  visible: boolean;
}

/**
 * 尺寸标注组件
 */
export class DimensionLabel {
  private scene: THREE.Scene;
  private config: DimensionLabelConfig;

  /** 标注组 */
  private labelsGroup: THREE.Group;

  /** 标注映射 */
  private labels: Map<string, THREE.Sprite> = new Map();

  /** Canvas 上下文（复用） */
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(scene: THREE.Scene, config?: Partial<DimensionLabelConfig>) {
    this.scene = scene;
    this.config = {
      enabled: true,
      style: {
        fontSize: 16,
        fontColor: '#ffffff',
        backgroundColor: '#000000',
        backgroundOpacity: 0.7,
        padding: 8,
        borderRadius: 4,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
      },
      distanceUnit: 'mm',
      angleUnit: 'deg',
      distancePrecision: 2,
      anglePrecision: 1,
      ...config,
    };

    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'DimensionLabels';
    this.scene.add(this.labelsGroup);

    // 创建 Canvas（复用）
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.context = ctx;
  }

  /**
   * 添加距离标注
   *
   * @param id - 标注 ID
   * @param distance - 距离值（单位：mm）
   * @param position - 标注位置
   */
  addDistanceLabel(id: string, distance: number, position: Vector3): void {
    if (!this.config.enabled) {
      return;
    }

    // 转换单位
    const value = this.convertDistance(distance);
    const text = `${value.toFixed(this.config.distancePrecision)} ${this.config.distanceUnit}`;

    this.createLabel(id, 'distance', text, position);
  }

  /**
   * 添加角度标注
   *
   * @param id - 标注 ID
   * @param angle - 角度值（单位：度）
   * @param position - 标注位置
   */
  addAngleLabel(id: string, angle: number, position: Vector3): void {
    if (!this.config.enabled) {
      return;
    }

    // 转换单位
    const value = this.convertAngle(angle);
    const text = `${value.toFixed(this.config.anglePrecision)}°`;

    this.createLabel(id, 'angle', text, position);
  }

  /**
   * 创建标注 Sprite
   *
   * @private
   */
  private createLabel(
    id: string,
    type: DimensionType,
    text: string,
    position: Vector3
  ): void {
    // 如果已存在，先移除
    if (this.labels.has(id)) {
      this.removeLabel(id);
    }

    // 生成文本纹理
    const texture = this.createTextTexture(text);

    // 创建 Sprite 材质
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: false,
    });

    // 创建 Sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.set(position.x, position.y, position.z);

    // 缩放 Sprite（屏幕空间大小）
    const scale = this.calculateSpriteScale(text);
    sprite.scale.set(scale.x, scale.y, 1);

    sprite.name = `DimensionLabel-${id}`;
    sprite.userData = { id, type };

    this.labelsGroup.add(sprite);
    this.labels.set(id, sprite);
  }

  /**
   * 创建文本纹理
   *
   * @private
   */
  private createTextTexture(text: string): THREE.Texture {
    const {
      fontSize,
      fontColor,
      backgroundColor,
      backgroundOpacity,
      padding,
      borderRadius,
      fontFamily,
      fontWeight,
    } = this.config.style;

    // 设置字体
    this.context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // 测量文本宽度
    const metrics = this.context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // 计算 Canvas 尺寸（包含 padding）
    const canvasWidth = Math.ceil(textWidth + padding * 2);
    const canvasHeight = Math.ceil(textHeight + padding * 2);

    // 调整 Canvas 大小
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    // 重新设置字体（Canvas 尺寸改变后需要重新设置）
    this.context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // 绘制背景
    this.context.fillStyle = backgroundColor;
    this.context.globalAlpha = backgroundOpacity;
    this.roundRect(0, 0, canvasWidth, canvasHeight, borderRadius);
    this.context.fill();

    // 绘制文本
    this.context.globalAlpha = 1.0;
    this.context.fillStyle = fontColor;
    this.context.fillText(text, canvasWidth / 2, canvasHeight / 2);

    // 创建纹理
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 绘制圆角矩形（Canvas 辅助方法）
   *
   * @private
   */
  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    this.context.beginPath();
    this.context.moveTo(x + radius, y);
    this.context.lineTo(x + width - radius, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.context.lineTo(x + width, y + height - radius);
    this.context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height
    );
    this.context.lineTo(x + radius, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.context.lineTo(x, y + radius);
    this.context.quadraticCurveTo(x, y, x + radius, y);
    this.context.closePath();
  }

  /**
   * 计算 Sprite 缩放（屏幕空间）
   *
   * @private
   */
  private calculateSpriteScale(text: string): { x: number; y: number } {
    const { fontSize, padding } = this.config.style;

    // 测量文本宽度
    this.context.font = `${this.config.style.fontWeight} ${fontSize}px ${this.config.style.fontFamily}`;
    const metrics = this.context.measureText(text);
    const textWidth = metrics.width;

    // Sprite 缩放（屏幕空间像素 → 世界空间单位）
    const scale = 0.01; // 1px = 0.01 单位
    const width = (textWidth + padding * 2) * scale;
    const height = (fontSize + padding * 2) * scale;

    return { x: width, y: height };
  }

  /**
   * 更新标注位置
   *
   * @param id - 标注 ID
   * @param position - 新位置
   */
  updateLabelPosition(id: string, position: Vector3): void {
    const sprite = this.labels.get(id);
    if (sprite) {
      sprite.position.set(position.x, position.y, position.z);
    }
  }

  /**
   * 更新标注内容
   *
   * @param id - 标注 ID
   * @param value - 新值
   * @param position - 新位置（可选）
   */
  updateLabel(id: string, value: number, position?: Vector3): void {
    const sprite = this.labels.get(id);
    if (sprite) {
      const type = sprite.userData.type as DimensionType;

      // 生成新文本
      let text: string;
      if (type === 'distance') {
        const convertedValue = this.convertDistance(value);
        text = `${convertedValue.toFixed(this.config.distancePrecision)} ${this.config.distanceUnit}`;
      } else {
        const convertedValue = this.convertAngle(value);
        text = `${convertedValue.toFixed(this.config.anglePrecision)}°`;
      }

      // 更新纹理
      const texture = this.createTextTexture(text);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.SpriteMaterial).map = texture;

      // 更新缩放
      const scale = this.calculateSpriteScale(text);
      sprite.scale.set(scale.x, scale.y, 1);

      // 更新位置
      if (position) {
        sprite.position.set(position.x, position.y, position.z);
      }
    }
  }

  /**
   * 移除标注
   *
   * @param id - 标注 ID
   */
  removeLabel(id: string): void {
    const sprite = this.labels.get(id);
    if (sprite) {
      this.labelsGroup.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      sprite.material.dispose();
      this.labels.delete(id);
    }
  }

  /**
   * 清空所有标注
   */
  clearLabels(): void {
    for (const sprite of this.labels.values()) {
      this.labelsGroup.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      sprite.material.dispose();
    }
    this.labels.clear();
  }

  /**
   * 设置标注可见性
   *
   * @param id - 标注 ID
   * @param visible - 是否可见
   */
  setLabelVisible(id: string, visible: boolean): void {
    const sprite = this.labels.get(id);
    if (sprite) {
      sprite.visible = visible;
    }
  }

  /**
   * 设置所有标注可见性
   *
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }

  /**
   * 转换距离单位
   *
   * @private
   */
  private convertDistance(distanceInMm: number): number {
    switch (this.config.distanceUnit) {
      case 'mm':
        return distanceInMm;
      case 'cm':
        return distanceInMm / 10;
      case 'm':
        return distanceInMm / 1000;
      default:
        return distanceInMm;
    }
  }

  /**
   * 转换角度单位
   *
   * @private
   */
  private convertAngle(angleInDeg: number): number {
    switch (this.config.angleUnit) {
      case 'deg':
        return angleInDeg;
      case 'rad':
        return (angleInDeg * Math.PI) / 180;
      default:
        return angleInDeg;
    }
  }

  /**
   * 更新配置
   *
   * @param config - 新配置
   */
  updateConfig(config: Partial<DimensionLabelConfig>): void {
    this.config = { ...this.config, ...config };

    // 重新生成所有标注
    const labelData: Array<{
      id: string;
      type: DimensionType;
      value: number;
      position: Vector3;
    }> = [];
    for (const [id, sprite] of this.labels.entries()) {
      const type = sprite.userData.type as DimensionType;
      const position = {
        x: sprite.position.x,
        y: sprite.position.y,
        z: sprite.position.z,
      };
      labelData.push({ id, type, value: 0, position }); // value 未保存，需要外部重新设置
    }

    this.clearLabels();

    // TODO: 重新创建标注（需要外部提供 value）
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.clearLabels();
    this.scene.remove(this.labelsGroup);
  }
}
