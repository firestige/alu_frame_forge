/**
 * AnchorService - 锚点管理服务
 *
 * 职责：
 * 1. 生成并维护场景对象的锚点集合
 * 2. 提供高效的锚点查询（最近锚点、范围查询）
 * 3. 响应对象变换时更新锚点位置
 *
 * 设计要点：
 * - 锚点数据存储在 AnchorService 的 Map 中（不再使用 mesh.userData）
 * - 锚点从 SceneObject.compute 模型生成（不依赖 Three.js）
 * - 提供回调机制向上报告状态（符合单向依赖）
 *
 * @module core/anchor
 */

import type {
  AnchorPoint,
  AnchorType,
  AnchorQueryOptions,
  AnchorQueryResult,
} from './types';
import { AnchorType as AnchorTypeEnum } from './types';
import type { SceneObject } from '@/core/object/types/scene-object';
import type { ConnectorComputeData } from '@/core/object/types/scene-object';
import type { Vector3 } from '@/types';

/**
 * 锚点服务
 */
export class AnchorService {
  /** 锚点缓存：objectId -> AnchorPoint[] */
  private anchorCache = new Map<string, AnchorPoint[]>();

  /** 回调：锚点更新通知 */
  public onAnchorsUpdated?: (objectId: string, anchors: AnchorPoint[]) => void;

  /** 回调：最近锚点查询结果 */
  public onNearestAnchorFound?: (result: AnchorQueryResult | null) => void;

  /**
   * 为场景对象生成锚点
   *
   * @param sceneObject - 场景对象
   * @returns 生成的锚点数组
   */
  generateAnchors(sceneObject: SceneObject): AnchorPoint[] {
    const anchors: AnchorPoint[] = [];

    // 根据资产类型生成不同的锚点
    switch (sceneObject.assetType) {
      case 'profile':
        anchors.push(...this.generateProfileAnchors(sceneObject));
        break;

      case 'connector':
        anchors.push(...this.generateConnectorAnchors(sceneObject));
        break;

      case 'fastener':
        // 紧固件通常不需要锚点
        break;

      default:
        console.warn(`Unknown asset type: ${sceneObject.assetType}`);
    }

    // 缓存锚点
    this.anchorCache.set(sceneObject.id, anchors);

    // 触发回调
    if (this.onAnchorsUpdated) {
      this.onAnchorsUpdated(sceneObject.id, anchors);
    }

    return anchors;
  }

  /**
   * 生成型材锚点
   *
   * @private
   */
  private generateProfileAnchors(sceneObject: SceneObject): AnchorPoint[] {
    const anchors: AnchorPoint[] = [];
    const { transform, userParams } = sceneObject;
    const length = (userParams.length as number) || 1000;

    // 1. 端点锚点（两端）
    // 前端面中心
    anchors.push({
      id: `${sceneObject.id}-end-front`,
      objectId: sceneObject.id,
      type: AnchorTypeEnum.PROFILE_END,
      position: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z,
      },
      axis: { x: 0, y: 0, z: 1 }, // 朝向 Z 轴正方向
      metadata: { face: 'front' },
    });

    // 后端面中心
    anchors.push({
      id: `${sceneObject.id}-end-back`,
      objectId: sceneObject.id,
      type: AnchorTypeEnum.PROFILE_END,
      position: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z + length,
      },
      axis: { x: 0, y: 0, z: -1 }, // 朝向 Z 轴负方向
      metadata: { face: 'back' },
    });

    // 2. 截面角点（简化：假设矩形截面）
    // TODO: 从 CrossSectionData 提取实际形状
    const cornerOffsets = [
      { x: -10, y: -10, face: 'corner-bl' },
      { x: 10, y: -10, face: 'corner-br' },
      { x: 10, y: 10, face: 'corner-tr' },
      { x: -10, y: 10, face: 'corner-tl' },
    ];

    cornerOffsets.forEach(offset => {
      // 前端角点
      anchors.push({
        id: `${sceneObject.id}-${offset.face}-front`,
        objectId: sceneObject.id,
        type: AnchorTypeEnum.PROFILE_CORNER,
        position: {
          x: transform.position.x + offset.x,
          y: transform.position.y + offset.y,
          z: transform.position.z,
        },
        axis: { x: 0, y: 0, z: 1 },
        metadata: { face: offset.face },
      });

      // 后端角点
      anchors.push({
        id: `${sceneObject.id}-${offset.face}-back`,
        objectId: sceneObject.id,
        type: AnchorTypeEnum.PROFILE_CORNER,
        position: {
          x: transform.position.x + offset.x,
          y: transform.position.y + offset.y,
          z: transform.position.z + length,
        },
        axis: { x: 0, y: 0, z: -1 },
        metadata: { face: offset.face },
      });
    });

    // 3. 侧面吸附点（沿长度方向均匀分布）
    const snapInterval = 100; // 每 100mm 一个吸附点
    const snapCount = Math.floor(length / snapInterval);

    const faces = ['top', 'bottom', 'left', 'right'];
    const faceNormals = [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];

    faces.forEach((face, faceIdx) => {
      for (let i = 1; i <= snapCount; i++) {
        const zPos = i * snapInterval;
        anchors.push({
          id: `${sceneObject.id}-snap-${face}-${i}`,
          objectId: sceneObject.id,
          type: AnchorTypeEnum.PROFILE_SNAP,
          position: {
            x: transform.position.x,
            y: transform.position.y,
            z: transform.position.z + zPos,
          },
          axis: faceNormals[faceIdx],
          metadata: { face, axialPosition: zPos },
        });
      }
    });

    return anchors;
  }

  /**
   * 生成连接件锚点
   *
   * @private
   */
  private generateConnectorAnchors(sceneObject: SceneObject): AnchorPoint[] {
    const anchors: AnchorPoint[] = [];
    const { transform, compute } = sceneObject;

    // 检查是否有连接件计算数据
    if (
      !compute?.geometry ||
      compute.geometry.type !== 'connector' ||
      !('connectorData' in compute.geometry)
    ) {
      console.warn(
        `SceneObject ${sceneObject.id} is marked as connector but lacks connectorData`
      );
      return anchors;
    }

    const connectorData =
      compute.geometry.connectorData as unknown as ConnectorComputeData;

    // 1. 生成孔锚点
    connectorData.holes?.forEach(hole => {
      const worldPos = this.transformLocalToWorld(
        hole.localPosition,
        transform
      );
      const worldAxis = this.transformAxisToWorld(hole.axis, transform);

      anchors.push({
        id: `${sceneObject.id}-hole-${hole.id}`,
        objectId: sceneObject.id,
        type: AnchorTypeEnum.CONNECTOR_HOLE,
        position: worldPos,
        axis: worldAxis,
        metadata: {
          holeSpec: {
            diameter: hole.diameter,
            depth: hole.depth,
            threadSpec: hole.threadSpec
              ? `${hole.threadSpec.designation}`
              : undefined,
          },
          holeRole: hole.role as
            | 'threaded'
            | 'fastener-pass-through'
            | 'profile-attachment',
        },
      });
    });

    // 2. 生成接触面锚点
    connectorData.contactFaces?.forEach(face => {
      const worldPos = this.transformLocalToWorld(face.origin, transform);
      const worldNormal = this.transformAxisToWorld(face.normal, transform);

      anchors.push({
        id: `${sceneObject.id}-face-${face.id}`,
        objectId: sceneObject.id,
        type: AnchorTypeEnum.CONNECTOR_FACE,
        position: worldPos,
        axis: worldNormal,
        metadata: {
          faceSize: {
            width: face.width,
            height: face.height,
          },
          matingRule: face.matingRule,
        },
      });
    });

    return anchors;
  }

  /**
   * 局部坐标转世界坐标（简化版：仅平移）
   * TODO: 实现完整的矩阵变换（含旋转）
   */
  private transformLocalToWorld(
    localPos: Vector3,
    transform: { position: Vector3; rotation?: any; scale?: Vector3 }
  ): Vector3 {
    return {
      x: transform.position.x + localPos.x,
      y: transform.position.y + localPos.y,
      z: transform.position.z + localPos.z,
    };
  }

  /**
   * 局部轴向转世界轴向（简化版：暂不支持旋转）
   * TODO: 实现完整的旋转矩阵变换
   */
  private transformAxisToWorld(
    localAxis: Vector3,
    transform: { position: Vector3; rotation?: any; scale?: Vector3 }
  ): Vector3 {
    // 当前简化：假设无旋转，直接返回局部轴向
    return { ...localAxis };
  }

  /**
   * 更新对象变换后的锚点位置
   *
   * @param objectId - 对象 ID
   * @param newTransform - 新的变换
   */
  updateAnchorsAfterTransform(
    objectId: string,
    newTransform: { position: Vector3; rotation?: any; scale?: Vector3 }
  ): void {
    const anchors = this.anchorCache.get(objectId);
    if (!anchors) {
      console.warn(`No anchors found for object: ${objectId}`);
      return;
    }

    // TODO: 应用完整的变换矩阵（旋转+平移+缩放）
    // 当前简化：只更新位置偏移
    const deltaX = newTransform.position.x;
    const deltaY = newTransform.position.y;
    const deltaZ = newTransform.position.z;

    anchors.forEach(anchor => {
      // 简化：假设锚点相对位置不变，只更新基准点
      // TODO: 实现完整的矩阵变换
      anchor.position.x += deltaX;
      anchor.position.y += deltaY;
      anchor.position.z += deltaZ;
    });

    // 触发回调
    if (this.onAnchorsUpdated) {
      this.onAnchorsUpdated(objectId, anchors);
    }
  }

  /**
   * 查找最近的锚点
   *
   * @param worldPos - 世界坐标位置
   * @param options - 查询选项
   * @returns 最近的锚点及距离，如果无匹配则返回 null
   */
  findNearestAnchor(
    worldPos: Vector3,
    options?: AnchorQueryOptions
  ): AnchorQueryResult | null {
    const threshold = options?.threshold ?? 50; // 默认 50mm
    let nearestAnchor: AnchorPoint | null = null;
    let minDistance = threshold;

    // 遍历所有缓存的锚点
    for (const [objectId, anchors] of this.anchorCache.entries()) {
      // 过滤对象
      if (options?.objectIds && !options.objectIds.includes(objectId)) {
        continue;
      }

      for (const anchor of anchors) {
        // 过滤类型
        if (options?.types && !options.types.includes(anchor.type)) {
          continue;
        }

        // 排除特定锚点
        if (options?.excludeIds?.includes(anchor.id)) {
          continue;
        }

        // 计算距离
        const dx = anchor.position.x - worldPos.x;
        const dy = anchor.position.y - worldPos.y;
        const dz = anchor.position.z - worldPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minDistance) {
          minDistance = distance;
          nearestAnchor = anchor;
        }
      }
    }

    const result = nearestAnchor
      ? { anchor: nearestAnchor, distance: minDistance }
      : null;

    // 触发回调
    if (this.onNearestAnchorFound) {
      this.onNearestAnchorFound(result);
    }

    return result;
  }

  /**
   * 范围查询：获取指定半径内的所有锚点
   *
   * @param worldPos - 世界坐标位置
   * @param radius - 搜索半径
   * @param options - 查询选项
   * @returns 范围内的锚点数组（按距离排序）
   */
  findAnchorsInRadius(
    worldPos: Vector3,
    radius: number,
    options?: AnchorQueryOptions
  ): AnchorQueryResult[] {
    const results: AnchorQueryResult[] = [];

    for (const [objectId, anchors] of this.anchorCache.entries()) {
      if (options?.objectIds && !options.objectIds.includes(objectId)) {
        continue;
      }

      for (const anchor of anchors) {
        if (options?.types && !options.types.includes(anchor.type)) {
          continue;
        }

        if (options?.excludeIds?.includes(anchor.id)) {
          continue;
        }

        const dx = anchor.position.x - worldPos.x;
        const dy = anchor.position.y - worldPos.y;
        const dz = anchor.position.z - worldPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance <= radius) {
          results.push({ anchor, distance });
        }
      }
    }

    // 按距离排序
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * 获取指定对象的所有锚点
   *
   * @param objectId - 对象 ID
   * @returns 锚点数组，如果不存在则返回空数组
   */
  getAnchors(objectId: string): AnchorPoint[] {
    return this.anchorCache.get(objectId) || [];
  }

  /**
   * 移除对象的锚点
   *
   * @param objectId - 对象 ID
   */
  removeAnchors(objectId: string): void {
    this.anchorCache.delete(objectId);
  }

  /**
   * 清空所有锚点
   */
  clearAllAnchors(): void {
    this.anchorCache.clear();
  }

  /**
   * 获取当前缓存的锚点数量（调试用）
   */
  getAnchorCount(): number {
    let count = 0;
    for (const anchors of this.anchorCache.values()) {
      count += anchors.length;
    }
    return count;
  }
}
