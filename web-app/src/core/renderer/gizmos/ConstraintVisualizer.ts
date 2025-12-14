/**
 * ConstraintVisualizer - 约束关系可视化
 *
 * 职责：
 * 1. 渲染约束关系的 3D 符号（平行线、弹簧、锁等）
 * 2. 可视化约束冲突（红色高亮）
 * 3. 显示约束参数（距离、角度）
 *
 * 设计原则：
 * - 使用简单几何体表示约束
 * - 颜色编码：绿色=正常，红色=冲突，黄色=警告
 * - 可交互（点击约束显示详情）
 *
 * @module core/renderer/gizmos
 */

import * as THREE from 'three';
import type { Constraint, ConstraintType } from '@/core/constraint/types';
import type { Vector3 } from '@/types';

/**
 * 约束样式配置
 */
export interface ConstraintStyle {
  /** 正常颜色 */
  normalColor: number;

  /** 冲突颜色 */
  conflictColor: number;

  /** 警告颜色 */
  warningColor: number;

  /** 线条宽度 */
  lineWidth: number;

  /** 符号大小 */
  symbolSize: number;

  /** 不透明度 */
  opacity: number;
}

/**
 * ConstraintVisualizer 配置
 */
export interface ConstraintVisualizerConfig {
  /** 是否启用 */
  enabled: boolean;

  /** 约束样式 */
  style: ConstraintStyle;

  /** 是否显示约束参数标签 */
  showLabels: boolean;
}

/**
 * 约束可视化信息
 */
interface ConstraintVisualization {
  constraint: Constraint;
  group: THREE.Group;
  isConflict: boolean;
}

/**
 * 约束可视化器
 */
export class ConstraintVisualizer {
  private scene: THREE.Scene;
  private config: ConstraintVisualizerConfig;

  /** 约束可视化组 */
  private constraintsGroup: THREE.Group;

  /** 约束可视化映射 */
  private visualizations: Map<string, ConstraintVisualization> = new Map();

  /** 材质缓存 */
  private materials: {
    normal: THREE.LineBasicMaterial;
    conflict: THREE.LineBasicMaterial;
    warning: THREE.LineBasicMaterial;
  };

  constructor(
    scene: THREE.Scene,
    config?: Partial<ConstraintVisualizerConfig>
  ) {
    this.scene = scene;
    this.config = {
      enabled: true,
      style: {
        normalColor: 0x00ff00,
        conflictColor: 0xff0000,
        warningColor: 0xffff00,
        lineWidth: 2,
        symbolSize: 0.5,
        opacity: 0.8,
      },
      showLabels: true,
      ...config,
    };

    this.constraintsGroup = new THREE.Group();
    this.constraintsGroup.name = 'ConstraintVisualizations';
    this.scene.add(this.constraintsGroup);

    // 初始化材质
    this.materials = {
      normal: new THREE.LineBasicMaterial({
        color: this.config.style.normalColor,
        transparent: true,
        opacity: this.config.style.opacity,
        depthTest: false,
      }),
      conflict: new THREE.LineBasicMaterial({
        color: this.config.style.conflictColor,
        transparent: true,
        opacity: this.config.style.opacity,
        depthTest: false,
      }),
      warning: new THREE.LineBasicMaterial({
        color: this.config.style.warningColor,
        transparent: true,
        opacity: this.config.style.opacity,
        depthTest: false,
      }),
    };
  }

  /**
   * 添加约束可视化
   *
   * @param constraint - 约束对象
   * @param objectPositions - 对象位置映射
   */
  addConstraint(
    constraint: Constraint,
    objectPositions: Map<string, Vector3>
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // 如果已存在，先移除
    if (this.visualizations.has(constraint.id)) {
      this.removeConstraint(constraint.id);
    }

    // 创建约束可视化
    const group = this.createConstraintVisualization(
      constraint,
      objectPositions
    );
    if (group) {
      this.constraintsGroup.add(group);
      this.visualizations.set(constraint.id, {
        constraint,
        group,
        isConflict: false,
      });
    }
  }

  /**
   * 创建约束可视化
   *
   * @param constraint - 约束对象
   * @param objectPositions - 对象位置映射
   * @private
   */
  private createConstraintVisualization(
    constraint: Constraint,
    objectPositions: Map<string, Vector3>
  ): THREE.Group | null {
    const group = new THREE.Group();
    group.name = `Constraint-${constraint.id}`;

    // 获取对象位置
    const positions = constraint.objectIds
      .map(id => objectPositions.get(id))
      .filter((pos): pos is Vector3 => pos !== undefined);

    if (positions.length < 2) {
      return null; // 需要至少两个对象
    }

    const pos1 = new THREE.Vector3(
      positions[0].x,
      positions[0].y,
      positions[0].z
    );
    const pos2 = new THREE.Vector3(
      positions[1].x,
      positions[1].y,
      positions[1].z
    );

    // 根据约束类型创建不同的符号
    switch (constraint.type) {
      case 'fixed-joint':
        this.createFixedJointSymbol(group, pos1, pos2);
        break;

      case 'point-to-point':
        this.createPointToPointSymbol(group, pos1, pos2);
        break;

      case 'axis-align':
        this.createAxisAlignSymbol(group, pos1, pos2, constraint.parameters);
        break;

      case 'sliding-joint':
        this.createSlidingJointSymbol(group, pos1, pos2);
        break;

      case 'distance':
        this.createDistanceSymbol(group, pos1, pos2, constraint.parameters);
        break;

      case 'angle':
        this.createAngleSymbol(group, pos1, pos2, constraint.parameters);
        break;

      default:
        // 默认显示连接线
        this.createConnectionLine(group, pos1, pos2);
    }

    return group;
  }

  /**
   * 创建固定连接符号（锁）
   *
   * @private
   */
  private createFixedJointSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3
  ): void {
    // 连接线
    this.createConnectionLine(group, pos1, pos2);

    // 中点位置添加锁符号（简化为小方块）
    const midpoint = pos1.clone().add(pos2).multiplyScalar(0.5);
    const lockGeometry = new THREE.BoxGeometry(
      this.config.style.symbolSize,
      this.config.style.symbolSize,
      this.config.style.symbolSize
    );
    const lockMesh = new THREE.Mesh(lockGeometry, this.materials.normal);
    lockMesh.position.copy(midpoint);
    group.add(lockMesh);
  }

  /**
   * 创建点对点符号（两个点 + 连线）
   *
   * @private
   */
  private createPointToPointSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3
  ): void {
    // 连接线
    this.createConnectionLine(group, pos1, pos2);

    // 两个端点球体
    const sphereGeometry = new THREE.SphereGeometry(
      this.config.style.symbolSize * 0.3,
      16,
      12
    );
    const sphere1 = new THREE.Mesh(sphereGeometry, this.materials.normal);
    sphere1.position.copy(pos1);
    group.add(sphere1);

    const sphere2 = new THREE.Mesh(sphereGeometry, this.materials.normal);
    sphere2.position.copy(pos2);
    group.add(sphere2);
  }

  /**
   * 创建轴对齐符号（平行线）
   *
   * @private
   */
  private createAxisAlignSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3,
    parameters: any
  ): void {
    // 主连接线
    this.createConnectionLine(group, pos1, pos2);

    // 平行线（偏移显示）
    const direction = pos2.clone().sub(pos1).normalize();
    const perpendicular = new THREE.Vector3(
      -direction.y,
      direction.x,
      0
    ).normalize();
    const offset = perpendicular.multiplyScalar(
      this.config.style.symbolSize * 0.5
    );

    const parallelPos1 = pos1.clone().add(offset);
    const parallelPos2 = pos2.clone().add(offset);
    this.createConnectionLine(group, parallelPos1, parallelPos2);
  }

  /**
   * 创建滑动连接符号（带箭头的线）
   *
   * @private
   */
  private createSlidingJointSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3
  ): void {
    // 主连接线
    this.createConnectionLine(group, pos1, pos2);

    // 箭头（简化为圆锥）
    const direction = pos2.clone().sub(pos1).normalize();
    const arrowGeometry = new THREE.ConeGeometry(
      this.config.style.symbolSize * 0.3,
      this.config.style.symbolSize,
      8
    );
    const arrow = new THREE.Mesh(arrowGeometry, this.materials.normal);

    const midpoint = pos1.clone().add(pos2).multiplyScalar(0.5);
    arrow.position.copy(midpoint);

    // 旋转箭头朝向
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(arrow);
  }

  /**
   * 创建距离约束符号（标注线）
   *
   * @private
   */
  private createDistanceSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3,
    parameters: any
  ): void {
    // 虚线
    const points = [pos1, pos2];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: this.config.style.normalColor,
      transparent: true,
      opacity: this.config.style.opacity,
      dashSize: 0.2,
      gapSize: 0.1,
      depthTest: false,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);

    // TODO: 添加距离标签
  }

  /**
   * 创建角度约束符号（圆弧）
   *
   * @private
   */
  private createAngleSymbol(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3,
    parameters: any
  ): void {
    // 连接线
    this.createConnectionLine(group, pos1, pos2);

    // TODO: 添加圆弧和角度标签
  }

  /**
   * 创建基本连接线
   *
   * @private
   */
  private createConnectionLine(
    group: THREE.Group,
    pos1: THREE.Vector3,
    pos2: THREE.Vector3
  ): void {
    const points = [pos1, pos2];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, this.materials.normal);
    group.add(line);
  }

  /**
   * 移除约束可视化
   *
   * @param constraintId - 约束 ID
   */
  removeConstraint(constraintId: string): void {
    const viz = this.visualizations.get(constraintId);
    if (viz) {
      this.constraintsGroup.remove(viz.group);
      this.disposeGroup(viz.group);
      this.visualizations.delete(constraintId);
    }
  }

  /**
   * 更新约束状态（正常/冲突）
   *
   * @param constraintId - 约束 ID
   * @param isConflict - 是否冲突
   */
  updateConstraintStatus(constraintId: string, isConflict: boolean): void {
    const viz = this.visualizations.get(constraintId);
    if (viz) {
      viz.isConflict = isConflict;

      // 更新材质
      const material = isConflict
        ? this.materials.conflict
        : this.materials.normal;
      viz.group.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.material = material;
        }
      });
    }
  }

  /**
   * 高亮约束
   *
   * @param constraintId - 约束 ID
   */
  highlightConstraint(constraintId: string | null): void {
    // 重置所有约束
    for (const [id, viz] of this.visualizations.entries()) {
      const material = viz.isConflict
        ? this.materials.conflict
        : this.materials.normal;
      viz.group.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.material = material;
        }
      });
    }

    // 高亮指定约束
    if (constraintId) {
      const viz = this.visualizations.get(constraintId);
      if (viz) {
        viz.group.traverse(child => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.material = this.materials.warning;
          }
        });
      }
    }
  }

  /**
   * 清空所有约束
   */
  clearConstraints(): void {
    for (const viz of this.visualizations.values()) {
      this.constraintsGroup.remove(viz.group);
      this.disposeGroup(viz.group);
    }
    this.visualizations.clear();
  }

  /**
   * 设置可见性
   *
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void {
    this.constraintsGroup.visible = visible;
  }

  /**
   * 更新配置
   *
   * @param config - 新配置
   */
  updateConfig(config: Partial<ConstraintVisualizerConfig>): void {
    this.config = { ...this.config, ...config };

    // 更新材质
    if (config.style) {
      this.materials.normal.color.setHex(this.config.style.normalColor);
      this.materials.conflict.color.setHex(this.config.style.conflictColor);
      this.materials.warning.color.setHex(this.config.style.warningColor);
      this.materials.normal.opacity = this.config.style.opacity;
      this.materials.conflict.opacity = this.config.style.opacity;
      this.materials.warning.opacity = this.config.style.opacity;
    }
  }

  /**
   * 释放 Group 资源
   *
   * @private
   */
  private disposeGroup(group: THREE.Group): void {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
      }
    });
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.clearConstraints();
    this.scene.remove(this.constraintsGroup);

    // 释放材质
    this.materials.normal.dispose();
    this.materials.conflict.dispose();
    this.materials.warning.dispose();
  }
}
