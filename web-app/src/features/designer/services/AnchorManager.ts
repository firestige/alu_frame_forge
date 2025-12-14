/**
 * AnchorManager - Features 层锚点管理器
 *
 * 职责：
 * 1. 管理 Core 层的 AnchorService
 * 2. 设置回调并连接到 EventBus
 * 3. 提供 Features 层的锚点管理 API
 * 4. 协调锚点生成和场景对象的生命周期
 *
 * 设计模式：
 * - Facade 模式：简化 Core 层服务的使用
 * - Observer 模式：监听 Core 服务事件并发布到 EventBus
 *
 * @module features/designer/services
 */

import { AnchorService } from '@/core/anchor/AnchorService';
import type {
  AnchorPoint,
  AnchorQueryOptions,
  AnchorQueryResult,
} from '@/core/anchor/types';
import type { SceneObject } from '@/core/object/types/scene-object';
import type { EventBus } from '@/core/services/eventBus';
import type { Vector3 } from '@/types';

/**
 * 锚点管理器
 */
export class AnchorManager {
  private anchorService: AnchorService;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.anchorService = new AnchorService();
    this.setupCallbacks();
  }

  /**
   * 设置 Core 服务回调，连接到 EventBus
   *
   * @private
   */
  private setupCallbacks(): void {
    // 锚点更新回调 -> EventBus 事件
    this.anchorService.onAnchorsUpdated = (
      objectId: string,
      anchors: AnchorPoint[]
    ) => {
      this.eventBus.emit('state:anchor:updated', {
        objectId,
        anchorCount: anchors.length,
        timestamp: Date.now(),
      });
    };

    // 最近锚点查询回调 -> EventBus 事件
    this.anchorService.onNearestAnchorFound = (
      result: AnchorQueryResult | null
    ) => {
      if (result) {
        this.eventBus.emit('state:anchor:nearestFound', {
          anchor: result.anchor,
          distance: result.distance,
          timestamp: Date.now(),
        });
      }
    };
  }

  /**
   * 为场景对象生成锚点
   *
   * @param sceneObject - 场景对象
   * @returns 生成的锚点数组
   */
  generateAnchors(sceneObject: SceneObject): AnchorPoint[] {
    return this.anchorService.generateAnchors(sceneObject);
  }

  /**
   * 更新对象变换后的锚点
   *
   * @param objectId - 对象 ID
   * @param newTransform - 新的变换
   */
  updateAnchorsAfterTransform(
    objectId: string,
    newTransform: { position: Vector3; rotation?: any; scale?: Vector3 }
  ): void {
    this.anchorService.updateAnchorsAfterTransform(objectId, newTransform);
  }

  /**
   * 查找最近的锚点（用于吸附）
   *
   * @param worldPos - 世界坐标位置
   * @param options - 查询选项
   * @returns 最近的锚点及距离
   */
  findNearestAnchor(
    worldPos: Vector3,
    options?: AnchorQueryOptions
  ): AnchorQueryResult | null {
    return this.anchorService.findNearestAnchor(worldPos, options);
  }

  /**
   * 范围查询锚点
   *
   * @param worldPos - 世界坐标位置
   * @param radius - 搜索半径
   * @param options - 查询选项
   * @returns 范围内的锚点数组
   */
  findAnchorsInRadius(
    worldPos: Vector3,
    radius: number,
    options?: AnchorQueryOptions
  ): AnchorQueryResult[] {
    return this.anchorService.findAnchorsInRadius(worldPos, radius, options);
  }

  /**
   * 获取指定对象的锚点
   *
   * @param objectId - 对象 ID
   * @returns 锚点数组
   */
  getAnchors(objectId: string): AnchorPoint[] {
    return this.anchorService.getAnchors(objectId);
  }

  /**
   * 移除对象的锚点
   *
   * @param objectId - 对象 ID
   */
  removeAnchors(objectId: string): void {
    this.anchorService.removeAnchors(objectId);

    // 发布移除事件
    this.eventBus.emit('state:anchor:removed', {
      objectId,
      timestamp: Date.now(),
    });
  }

  /**
   * 清空所有锚点
   */
  clearAllAnchors(): void {
    this.anchorService.clearAllAnchors();

    // 发布清空事件
    this.eventBus.emit('state:anchor:cleared', {
      timestamp: Date.now(),
    });
  }

  /**
   * 启用锚点吸附
   *
   * 发送命令到 EventBus，由其他模块响应
   */
  enableSnapping(): void {
    this.eventBus.emit('command:snap:enable', {
      timestamp: Date.now(),
    });
  }

  /**
   * 禁用锚点吸附
   */
  disableSnapping(): void {
    this.eventBus.emit('command:snap:disable', {
      timestamp: Date.now(),
    });
  }

  /**
   * 高亮锚点（用于可视化）
   *
   * @param anchorId - 锚点 ID
   */
  highlightAnchor(anchorId: string): void {
    this.eventBus.emit('command:anchor:highlight', {
      anchorId,
      timestamp: Date.now(),
    });
  }

  /**
   * 取消高亮锚点
   *
   * @param anchorId - 锚点 ID
   */
  unhighlightAnchor(anchorId: string): void {
    this.eventBus.emit('command:anchor:unhighlight', {
      anchorId,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalAnchors: number;
    objectCount: number;
  } {
    return {
      totalAnchors: this.anchorService.getAnchorCount(),
      objectCount: 0, // TODO: 从 anchorService 获取对象数量
    };
  }

  /**
   * 获取底层 AnchorService（用于高级场景）
   */
  getAnchorService(): AnchorService {
    return this.anchorService;
  }
}
