/**
 * AlignmentGuides - 智能对齐辅助线
 *
 * 职责：
 * 1. 在拖拽时显示对齐参考线（虚线）
 * 2. 指示对象与其他锚点的对齐关系
 * 3. 显示距离标注
 *
 * 设计原则：
 * - 轻量级渲染（使用 LineSegments）
 * - 动态生成（基于当前拖拽对象的位置）
 * - 视觉清晰但不干扰主体
 *
 * @module core/renderer/gizmos
 */

import * as THREE from 'three';
import type { Vector3 } from '@/types';

/**
 * 对齐类型
 */
export type AlignmentType = 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz';

/**
 * 对齐参考线
 */
export interface AlignmentGuide {
  /** 对齐类型 */
  type: AlignmentType;

  /** 起点 */
  start: Vector3;

  /** 终点 */
  end: Vector3;

  /** 参考对象 ID */
  referenceObjectId?: string;

  /** 距离（可选） */
  distance?: number;
}

/**
 * AlignmentGuides 配置
 */
export interface AlignmentGuidesConfig {
  /** 是否启用 */
  enabled: boolean;

  /** 线条颜色 */
  lineColor: number;

  /** 线条透明度 */
  lineOpacity: number;

  /** 虚线段长度 */
  dashSize: number;

  /** 虚线间隙 */
  gapSize: number;

  /** 最大显示距离 */
  maxDistance: number;
}

/**
 * 智能对齐辅助线
 */
export class AlignmentGuides {
  private scene: THREE.Scene;
  private config: AlignmentGuidesConfig;

  /** 辅助线组 */
  private guidesGroup: THREE.Group;

  /** 当前活动的参考线 */
  private activeGuides: THREE.LineSegments[] = [];

  /** 虚线材质 */
  private lineMaterial: THREE.LineDashedMaterial;

  constructor(scene: THREE.Scene, config?: Partial<AlignmentGuidesConfig>) {
    this.scene = scene;
    this.config = {
      enabled: true,
      lineColor: 0x00ff00,
      lineOpacity: 0.7,
      dashSize: 0.5,
      gapSize: 0.3,
      maxDistance: 100,
      ...config,
    };

    this.guidesGroup = new THREE.Group();
    this.guidesGroup.name = 'AlignmentGuides';
    this.scene.add(this.guidesGroup);

    this.lineMaterial = new THREE.LineDashedMaterial({
      color: this.config.lineColor,
      transparent: true,
      opacity: this.config.lineOpacity,
      dashSize: this.config.dashSize,
      gapSize: this.config.gapSize,
      depthTest: false, // 始终显示在最上层
    });
  }

  /**
   * 设置对齐参考线
   *
   * @param guides - 参考线数组
   */
  setGuides(guides: AlignmentGuide[]): void {
    if (!this.config.enabled) {
      return;
    }

    // 清除旧的参考线
    this.clearGuides();

    // 创建新的参考线
    for (const guide of guides) {
      const line = this.createGuideLine(guide);
      if (line) {
        this.activeGuides.push(line);
        this.guidesGroup.add(line);
      }
    }
  }

  /**
   * 创建单条参考线
   *
   * @param guide - 对齐参考线
   * @private
   */
  private createGuideLine(guide: AlignmentGuide): THREE.LineSegments | null {
    const points = [
      new THREE.Vector3(guide.start.x, guide.start.y, guide.start.z),
      new THREE.Vector3(guide.end.x, guide.end.y, guide.end.z),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineSegments(geometry, this.lineMaterial);
    line.computeLineDistances(); // 必须调用才能显示虚线

    return line;
  }

  /**
   * 更新参考线（高性能版本）
   *
   * 适用于拖拽时的高频更新
   *
   * @param guides - 参考线数组
   */
  updateGuides(guides: AlignmentGuide[]): void {
    if (!this.config.enabled) {
      return;
    }

    // 如果数量不匹配，重新创建
    if (guides.length !== this.activeGuides.length) {
      this.setGuides(guides);
      return;
    }

    // 更新现有参考线的位置
    for (let i = 0; i < guides.length; i++) {
      const guide = guides[i];
      const line = this.activeGuides[i];

      const positions = line.geometry.attributes.position;
      positions.setXYZ(0, guide.start.x, guide.start.y, guide.start.z);
      positions.setXYZ(1, guide.end.x, guide.end.y, guide.end.z);
      positions.needsUpdate = true;

      line.computeLineDistances();
    }
  }

  /**
   * 根据对齐关系自动生成参考线
   *
   * @param currentPosition - 当前位置
   * @param alignedPosition - 对齐后的位置
   * @param referencePosition - 参考位置
   * @param alignmentType - 对齐类型
   */
  showAlignmentToReference(
    currentPosition: Vector3,
    alignedPosition: Vector3,
    referencePosition: Vector3,
    alignmentType: AlignmentType
  ): void {
    const guides: AlignmentGuide[] = [];

    switch (alignmentType) {
      case 'x':
        // X 轴对齐：显示竖直参考线
        guides.push({
          type: 'x',
          start: {
            x: alignedPosition.x,
            y: referencePosition.y - 5,
            z: alignedPosition.z,
          },
          end: {
            x: alignedPosition.x,
            y: referencePosition.y + 5,
            z: alignedPosition.z,
          },
        });
        break;

      case 'y':
        // Y 轴对齐：显示水平参考线
        guides.push({
          type: 'y',
          start: {
            x: referencePosition.x - 5,
            y: alignedPosition.y,
            z: alignedPosition.z,
          },
          end: {
            x: referencePosition.x + 5,
            y: alignedPosition.y,
            z: alignedPosition.z,
          },
        });
        break;

      case 'z':
        // Z 轴对齐：显示深度参考线
        guides.push({
          type: 'z',
          start: {
            x: alignedPosition.x,
            y: alignedPosition.y,
            z: referencePosition.z - 5,
          },
          end: {
            x: alignedPosition.x,
            y: alignedPosition.y,
            z: referencePosition.z + 5,
          },
        });
        break;

      case 'xy':
        // XY 平面对齐：显示两条参考线
        guides.push(
          {
            type: 'x',
            start: {
              x: alignedPosition.x,
              y: referencePosition.y - 5,
              z: alignedPosition.z,
            },
            end: {
              x: alignedPosition.x,
              y: referencePosition.y + 5,
              z: alignedPosition.z,
            },
          },
          {
            type: 'y',
            start: {
              x: referencePosition.x - 5,
              y: alignedPosition.y,
              z: alignedPosition.z,
            },
            end: {
              x: referencePosition.x + 5,
              y: alignedPosition.y,
              z: alignedPosition.z,
            },
          }
        );
        break;

      // 可扩展其他对齐类型
    }

    this.setGuides(guides);
  }

  /**
   * 清除所有参考线
   */
  clearGuides(): void {
    for (const line of this.activeGuides) {
      this.guidesGroup.remove(line);
      line.geometry.dispose();
    }
    this.activeGuides = [];
  }

  /**
   * 设置可见性
   *
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void {
    this.guidesGroup.visible = visible;
  }

  /**
   * 更新配置
   *
   * @param config - 新配置
   */
  updateConfig(config: Partial<AlignmentGuidesConfig>): void {
    this.config = { ...this.config, ...config };

    // 更新材质
    this.lineMaterial.color.setHex(this.config.lineColor);
    this.lineMaterial.opacity = this.config.lineOpacity;
    this.lineMaterial.dashSize = this.config.dashSize;
    this.lineMaterial.gapSize = this.config.gapSize;
    this.lineMaterial.needsUpdate = true;
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.clearGuides();
    this.scene.remove(this.guidesGroup);
    this.lineMaterial.dispose();
  }
}
