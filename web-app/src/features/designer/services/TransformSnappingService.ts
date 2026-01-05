/**
 * TransformSnappingService - 拖拽吸附服务
 *
 * 职责：
 * - 监听 TransformController 的变换事件
 * - 调用 SnappingService 检测吸附
 * - 应用吸附位置并渲染高亮
 * - 拖拽完成时自动创建约束
 *
 * 设计原则：
 * - 遵守分层架构：Features 层服务
 * - 通过 AnchorManager 查询锚点
 * - 通过 IRenderer 渲染高亮
 */

import type { IRenderer, TransformData } from '@/core/renderer/renderer-types';
import type { SnappingService, SnapResult } from './SnappingSerice';
import type { AnchorService } from '@/core/anchor/AnchorService';
import type { ConstraintService } from '@/core/constraint/ConstraintService';
import type { ObjectManager } from '@/core/object/ObjectManager';
import {
  ConstraintType,
  ConstraintPriority,
  type PointToPointConstraint,
} from '@/core/constraint/types';
import { toast } from '@/components/Toast';

export class TransformSnappingService {
  private renderer: IRenderer;
  private snappingService: SnappingService;
  private anchorService: AnchorService;
  private constraintService: ConstraintService;
  private objectManager: ObjectManager;

  private currentSnapResult: SnapResult | null = null;
  private isDragging = false;
  private draggedObjectId: string | null = null;

  // 节流控制（避免过于频繁的吸附检测）
  private lastSnapCheckTime = 0;
  private snapCheckInterval = 50; // 50ms

  constructor(
    renderer: IRenderer,
    snappingService: SnappingService,
    anchorService: AnchorService,
    constraintService: ConstraintService,
    objectManager: ObjectManager
  ) {
    this.renderer = renderer;
    this.snappingService = snappingService;
    this.anchorService = anchorService;
    this.constraintService = constraintService;
    this.objectManager = objectManager;
  }

  /**
   * 开始拖拽
   */
  startDragging(objectId: string): void {
    this.isDragging = true;
    this.draggedObjectId = objectId;
    this.currentSnapResult = null;
    console.log('[TransformSnappingService] Started dragging:', objectId);
  }

  /**
   * 处理拖拽中的变换（实时吸附检测）
   */
  handleTransformChanging(
    data: TransformData,
    shiftPressed: boolean = false
  ): void {
    if (!this.isDragging || !this.draggedObjectId) return;

    // Shift 键禁用吸附
    if (shiftPressed) {
      this.clearSnapHighlight();
      this.currentSnapResult = null;
      return;
    }

    // 节流控制
    const now = Date.now();
    if (now - this.lastSnapCheckTime < this.snapCheckInterval) {
      return;
    }
    this.lastSnapCheckTime = now;

    // 获取被拖拽对象的锚点
    const draggedAnchors = this.anchorService.getAnchors(this.draggedObjectId);

    if (!draggedAnchors || draggedAnchors.length === 0) {
      return;
    }

    // 直接传递局部锚点，findSnap 内部会用 candidatePosition 进行变换
    // 避免双重平移（之前预先加了 position，findSnap 内部又加一次）
    const localAnchors = draggedAnchors;

    // 查找吸附目标
    const snapResult = this.snappingService.findSnap(
      data.transform.position,
      localAnchors
    );

    if (snapResult) {
      // 找到吸附目标
      this.currentSnapResult = snapResult;

      // 应用吸附位置到渲染对象（直接访问内部 THREE.js 对象）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nativeObject = (this.renderer as any)['sceneManager']?.[
        'objects'
      ]?.get(this.draggedObjectId);
      if (
        nativeObject &&
        typeof nativeObject === 'object' &&
        'position' in nativeObject
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const position = nativeObject.position as any;
        position.x = snapResult.snapPosition.x;
        position.y = snapResult.snapPosition.y;
        position.z = snapResult.snapPosition.z;
      }

      // 渲染高亮
      this.renderSnapHighlight(snapResult);
    } else {
      // 未找到吸附
      this.currentSnapResult = null;
      this.clearSnapHighlight();
    }
  }

  /**
   * 处理拖拽完成
   */
  async handleTransformCompleted(_data: TransformData): Promise<void> {
    if (!this.isDragging || !this.draggedObjectId) return;

    console.log('[TransformSnappingService] Transform completed:', {
      objectId: this.draggedObjectId,
      hasSnap: !!this.currentSnapResult,
    });

    // 如果有吸附结果，创建约束
    if (this.currentSnapResult) {
      try {
        await this.createConstraintFromSnap(
          this.draggedObjectId,
          this.currentSnapResult
        );
      } catch (error) {
        console.error(
          '[TransformSnappingService] Failed to create constraint:',
          error
        );
        toast.error('约束创建失败');
      }
    }

    // 结束拖拽
    this.endDragging();
  }

  /**
   * 结束拖拽
   */
  endDragging(): void {
    this.isDragging = false;
    this.draggedObjectId = null;
    this.currentSnapResult = null;
    this.clearSnapHighlight();
  }

  /**
   * 从吸附结果创建约束
   */
  private async createConstraintFromSnap(
    objectId: string,
    snapResult: SnapResult
  ): Promise<void> {
    // 获取对象的锚点
    const objectAnchors = this.anchorService.getAnchors(objectId);
    if (!objectAnchors || objectAnchors.length === 0) {
      console.warn(
        '[TransformSnappingService] No anchors found for object:',
        objectId
      );
      return;
    }

    // 找到与候选锚点索引匹配的锚点
    const candidateAnchor = objectAnchors[snapResult.candidateAnchorIndex];
    if (!candidateAnchor) {
      console.warn(
        '[TransformSnappingService] Candidate anchor not found at index:',
        snapResult.candidateAnchorIndex
      );
      return;
    }

    // 创建点对点约束
    const constraint: PointToPointConstraint = {
      id: `constraint-drag-${Date.now()}`,
      type: ConstraintType.POINT_TO_POINT,
      priority: ConstraintPriority.NORMAL,
      objectIds: [snapResult.targetObjectId, objectId],
      enabled: true,
      objectAId: snapResult.targetObjectId,
      objectBId: objectId,
      anchorAId: snapResult.targetAnchorId,
      anchorBId: candidateAnchor.id,
      metadata: {
        autoCreated: true,
        createdFromDrag: true,
        createdAt: new Date(),
      },
    };

    this.constraintService.addConstraint(constraint);
    console.log('[TransformSnappingService] ✅ 约束已创建:', constraint.id);

    // 求解约束
    const sceneObject = this.objectManager.getObject(objectId);
    if (sceneObject) {
      const solveResult = this.constraintService.solveConstraints(objectId, {
        position: sceneObject.transform.position,
        rotation: sceneObject.transform.rotation,
      });

      if (solveResult.success) {
        console.log('[TransformSnappingService] ✅ 约束求解成功');
        toast.success('已创建约束并自动对齐');
      } else {
        console.warn('[TransformSnappingService] ⚠️ 约束求解失败');
        toast.warning('约束求解失败，可能存在冲突');
      }
    }
  }

  /**
   * 渲染吸附高亮
   */
  private renderSnapHighlight(snapResult: SnapResult): void {
    // 目标锚点：绿色圆环 + 脉冲动画
    this.renderer.createHelperCircle(
      'drag-snap-target-anchor',
      snapResult.targetAnchorPosition,
      15,
      0x00ff00,
      {
        opacity: 0.8,
        animated: true,
      }
    );

    // 候选锚点：蓝色圆环
    this.renderer.createHelperCircle(
      'drag-snap-candidate-anchor',
      snapResult.snapPosition,
      12,
      0x0088ff,
      {
        opacity: 0.6,
      }
    );

    // 连接线：虚线
    this.renderer.createHelperLine(
      'drag-snap-connection-line',
      snapResult.targetAnchorPosition,
      snapResult.snapPosition,
      0xffaa00,
      {
        dashed: true,
        opacity: 0.6,
      }
    );
  }

  /**
   * 清除吸附高亮
   */
  private clearSnapHighlight(): void {
    this.renderer.removeHelper('drag-snap-target-anchor');
    this.renderer.removeHelper('drag-snap-candidate-anchor');
    this.renderer.removeHelper('drag-snap-connection-line');
  }
}
