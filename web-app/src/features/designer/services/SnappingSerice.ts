/**
 * SnappingService - 智能吸附服务
 *
 * 职责：
 * - 给定候选位置和待放置对象的锚点，查找场景中最佳的吸附目标
 * - 计算吸附位置和约束类型
 * - 支持多种吸附策略（端对端、T-slot、面对面等）
 *
 * 设计原则：
 * - 通过 AnchorService 查询锚点，不直接访问 SceneObject.compute
 * - 遵守 Features 层职责，不依赖 Renderer
 */

import type { AnchorService } from '@/core/anchor/AnchorService';
import type { AnchorPoint } from '@/core/anchor/types';
import { AnchorType } from '@/core/anchor/types';

// 使用简单的 Vector3 类型定义
type Vector3 = { x: number; y: number; z: number };

/**
 * 吸附配置
 */
export interface SnapConfig {
  /** 搜索半径（mm） */
  searchRadius: number;

  /** 吸附阈值（mm） */
  snapThreshold: number;

  /** 是否启用吸附 */
  enabled: boolean;

  /** 吸附优先级 */
  priority: SnapPriority[];
}

/**
 * 吸附优先级枚举
 */
export type SnapPriority = 'endpoint' | 't-slot' | 'face' | 'edge';

/**
 * 吸附结果
 */
export interface SnapResult {
  /** 吸附位置（世界坐标） */
  snapPosition: Vector3;

  /** 目标锚点 ID */
  targetAnchorId: string;

  /** 目标对象 ID */
  targetObjectId: string;

  /** 候选锚点索引（在传入的 candidateAnchors 中的位置） */
  candidateAnchorIndex: number;

  /** 约束类型 */
  constraintType: 'point-to-point' | 'axis-align' | 'face-to-face';

  /** 距离 */
  distance: number;

  /** 匹配分数（用于多锚点优化） */
  score: number;

  /** 视觉提示 */
  visualHints: {
    highlightAnchors: string[];
    showDistanceLabel: boolean;
    showAlignmentAxis?: boolean;
  };
}

/**
 * 吸附选项
 */
export interface SnapOptions {
  /** 排除的对象 ID 列表 */
  excludeObjects?: string[];

  /** 是否禁用吸附（如按住 Shift） */
  disabled?: boolean;
}

/**
 * 锚点匹配信息
 */
interface AnchorMatch {
  targetAnchor: AnchorPoint;
  candidateAnchor: AnchorPoint;
  candidateIndex: number;
  distance: number;
  score: number;
}

/**
 * SnappingService - 吸附服务
 */
export class SnappingService {
  private anchorService: AnchorService;
  private config: SnapConfig;

  constructor(
    anchorService: AnchorService,
    config: Partial<SnapConfig> = {}
  ) {
    this.anchorService = anchorService;
    this.config = {
      searchRadius: config.searchRadius || 500, // 500mm
      snapThreshold: config.snapThreshold || 100, // 100mm
      enabled: config.enabled !== undefined ? config.enabled : true,
      priority: config.priority || ['endpoint', 't-slot', 'face'],
    };
  }

  /**
   * 查找吸附目标
   *
   * @param candidatePosition - 候选位置（预览对象中心，世界坐标）
   * @param candidateAnchors - 预览对象的锚点（局部坐标）
   * @param options - 吸附选项
   * @returns 吸附结果或 null
   */
  findSnap(
    candidatePosition: Vector3,
    candidateAnchors: AnchorPoint[],
    options?: SnapOptions
  ): SnapResult | null {
    // 检查是否禁用
    if (!this.config.enabled || options?.disabled) {
      return null;
    }

    if (candidateAnchors.length === 0) {
      return null;
    }

    // 1. 获取候选位置附近的所有对象锚点
    const nearbyAnchors = this.anchorService.findAnchorsInRadius(
      candidatePosition,
      this.config.searchRadius
    );

    if (nearbyAnchors.length === 0) {
      return null;
    }

    // 2. 过滤排除的对象
    const filteredAnchors = options?.excludeObjects
      ? nearbyAnchors.filter(
          result => !options.excludeObjects!.includes(result.anchor.objectId)
        )
      : nearbyAnchors;

    if (filteredAnchors.length === 0) {
      return null;
    }

    // 3. 计算所有可能的匹配
    const matches: AnchorMatch[] = [];
    let minDistance = this.config.snapThreshold;

    for (const { anchor: targetAnchor } of filteredAnchors) {
      for (let i = 0; i < candidateAnchors.length; i++) {
        const candidateAnchor = candidateAnchors[i];

        // 将候选锚点从局部坐标转换到世界坐标
        const candidateWorldPos = this.transformAnchorToWorld(
          candidateAnchor,
          candidatePosition
        );

        const distance = this.calculateDistance(
          candidateWorldPos,
          targetAnchor.position // 使用 position 而不是 worldPosition
        );

        if (distance <= minDistance) {
          const score = this.calculateMatchScore(
            targetAnchor,
            candidateAnchor,
            distance
          );

          matches.push({
            targetAnchor,
            candidateAnchor,
            candidateIndex: i,
            distance,
            score,
          });
        }
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // 4. 选择最佳匹配（优先：高分数 → 近距离）
    const bestMatch = matches.reduce((best, current) => {
      if (current.score > best.score) return current;
      if (current.score === best.score && current.distance < best.distance)
        return current;
      return best;
    });

    // 5. 生成吸附结果
    return {
      snapPosition: bestMatch.targetAnchor.position, // 使用 position
      targetAnchorId: bestMatch.targetAnchor.id,
      targetObjectId: bestMatch.targetAnchor.objectId,
      candidateAnchorIndex: bestMatch.candidateIndex,
      constraintType: this.determineConstraintType(
        bestMatch.targetAnchor,
        bestMatch.candidateAnchor
      ),
      distance: bestMatch.distance,
      score: bestMatch.score,
      visualHints: {
        highlightAnchors: [bestMatch.targetAnchor.id],
        showDistanceLabel: true,
        showAlignmentAxis: bestMatch.targetAnchor.type === AnchorType.T_SLOT,
      },
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SnapConfig {
    return { ...this.config };
  }

  /**
   * 将锚点从局部坐标转换到世界坐标
   *
   * 注意：传入的 anchor 是预览对象的模板锚点，position 表示相对位置
   */
  private transformAnchorToWorld(
    anchor: AnchorPoint,
    objectPosition: Vector3
  ): Vector3 {
    // 简化实现：假设锚点的 position 已经相对于对象中心
    // 实际应用变换矩阵（旋转 + 缩放）
    return {
      x: objectPosition.x + anchor.position.x,
      y: objectPosition.y + anchor.position.y,
      z: objectPosition.z + anchor.position.z,
    };
  }

  /**
   * 计算两点之间的距离
   */
  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 计算匹配分数（用于多锚点优化）
   *
   * 策略：
   * - 端点对端点：10分
   * - 端点对 T-slot：8分
   * - T-slot 对 T-slot：6分
   * - 其他：4分
   *
   * 距离越近，分数加成越高
   */
  private calculateMatchScore(
    targetAnchor: AnchorPoint,
    candidateAnchor: AnchorPoint,
    distance: number
  ): number {
    let baseScore = 4;

    // 类型匹配加分
    if (
      targetAnchor.type === AnchorType.PROFILE_END &&
      candidateAnchor.type === AnchorType.PROFILE_END
    ) {
      baseScore = 10; // 端对端最高优先级
    } else if (
      (targetAnchor.type === AnchorType.PROFILE_END &&
        candidateAnchor.type === AnchorType.T_SLOT) ||
      (targetAnchor.type === AnchorType.T_SLOT &&
        candidateAnchor.type === AnchorType.PROFILE_END)
    ) {
      baseScore = 8; // T 型连接
    } else if (
      targetAnchor.type === AnchorType.T_SLOT &&
      candidateAnchor.type === AnchorType.T_SLOT
    ) {
      baseScore = 6; // 滑动连接
    } else if (
      targetAnchor.type === AnchorType.CONNECTOR_FACE &&
      candidateAnchor.type === AnchorType.CONNECTOR_FACE
    ) {
      baseScore = 7; // 面对面
    }

    // 距离加成（距离越近，加成越高）
    const distanceFactor = 1 - distance / this.config.snapThreshold;
    const distanceBonus = distanceFactor * 5; // 最多加5分

    return baseScore + distanceBonus;
  }

  /**
   * 确定约束类型
   */
  private determineConstraintType(
    targetAnchor: AnchorPoint,
    candidateAnchor: AnchorPoint
  ): 'point-to-point' | 'axis-align' | 'face-to-face' {
    // 端点对端点 → 点对点约束
    if (
      targetAnchor.type === AnchorType.PROFILE_END &&
      candidateAnchor.type === AnchorType.PROFILE_END
    ) {
      return 'point-to-point';
    }

    // T-slot 参与 → 轴对齐约束
    if (
      targetAnchor.type === AnchorType.T_SLOT ||
      candidateAnchor.type === AnchorType.T_SLOT
    ) {
      return 'axis-align';
    }

    // 面对面 → 面对面约束
    if (
      targetAnchor.type === AnchorType.CONNECTOR_FACE &&
      candidateAnchor.type === AnchorType.CONNECTOR_FACE
    ) {
      return 'face-to-face';
    }

    // 默认：点对点
    return 'point-to-point';
  }
}

