import * as THREE from 'three';
import type {
  IRenderer,
  WorkPlaneConfig,
} from '@/core/renderer/renderer-types';
import type { ObjectManager } from '@/core/object/ObjectManager';
import type { AnyAsset } from '@/core/asset/types/asset';
import type { SceneObjectCreateOptions } from '@/core/object/types/scene-object';
import { onCommand, offCommand, publishState } from '@/core/services/eventBus';
import type { SnappingService, SnapResult } from './SnappingSerice';
import type { AnchorService } from '@/core/anchor/AnchorService';
import type { ConstraintService } from '@/core/constraint/ConstraintService';
import {
  ConstraintType,
  ConstraintPriority,
  type PointToPointConstraint,
} from '@/core/constraint/types';
import { toast } from '@/components/Toast';

/**
 * 指针更新命令数据
 */
export interface PointerUpdateData {
  screen: { x: number; y: number };
  viewport: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  shiftKey?: boolean; // 是否按住 Shift 键（禁用吸附）
}

/**
 * 放置控制器（重构后 - 完全隔离 Three.js）
 *
 * 职责：
 * - 管理放置会话的生命周期
 * - 通过 IRenderer 抽象接口进行射线检测和预览管理
 * - 不依赖 Three.js，完全通过抽象层工作
 *
 * 命令接口：
 * - command:placement:start - 开始放置会话
 * - command:placement:updatePointer - 更新指针位置（由UI层发送）
 * - command:placement:confirm - 确认放置
 * - command:placement:cancel - 取消放置
 */
export class PlacementController {
  private renderer: IRenderer;
  private objectManager: ObjectManager;
  private snappingService: SnappingService | null;
  private anchorService: AnchorService | null;
  private constraintService: ConstraintService | null;

  // 会话状态
  private isActive = false;
  private currentAsset: AnyAsset | null = null;
  private previewHandle: string | null = null;
  private currentPosition: { x: number; y: number; z: number } | null = null;
  private currentSnapResult: SnapResult | null = null; // 吸附结果

  /** 工作平面距离百分比（相对于相机到焦点的距离，默认 0.5 = 50%） */
  private workPlaneDistanceRatio = 0.5;

  constructor(
    renderer: IRenderer,
    objectManager: ObjectManager,
    snappingService?: SnappingService,
    anchorService?: AnchorService,
    constraintService?: ConstraintService
  ) {
    this.renderer = renderer;
    this.objectManager = objectManager;
    this.snappingService = snappingService || null;
    this.anchorService = anchorService || null;
    this.constraintService = constraintService || null;

    // 注册命令监听
    this.setupCommandListeners();
  }

  /**
   * 注册命令监听器
   */
  private setupCommandListeners(): void {
    onCommand('command:placement:start', this.handleStartCommand);
    onCommand('command:placement:updatePointer', this.handlePointerUpdate);
    onCommand('command:placement:confirm', this.handleConfirmCommand);
    onCommand('command:placement:cancel', this.handleCancelCommand);
  }

  /**
   * 处理开始命令
   */
  private handleStartCommand = (data: { asset: AnyAsset }): void => {
    this.start(data.asset);
  };

  /**
   * 处理指针更新命令
   */
  private handlePointerUpdate = (data: PointerUpdateData): void => {
    if (!this.isActive || !this.previewHandle) {
      return;
    }

    // 检查是否按住 Shift 键（禁用吸附）
    const shiftPressed = data.shiftKey || false;

    // 动态计算工作平面
    const workPlane = this.calculateWorkPlane();

    // 执行射线检测
    const hits = this.renderer.raycastFromScreen(
      data.screen.x,
      data.screen.y,
      data.viewport,
      {
        ignoreHandles: [this.previewHandle],
        includeHelpers: false,
        includeWorkPlane: true,
        workPlane: workPlane,
      }
    );

    console.log('[PlacementController] Raycast hits:', hits.length, hits);

    if (hits.length > 0) {
      const hit = hits[0];
      let finalPosition = hit.point;

      // 🎯 吸附检测
      if (this.snappingService && this.anchorService && !shiftPressed) {
        // 获取预览对象的锚点（从当前资产）
        const previewAnchors = this.getPreviewAnchors();

        if (previewAnchors.length > 0) {
          const snapResult = this.snappingService.findSnap(
            hit.point,
            previewAnchors,
            {
              excludeObjects: [this.previewHandle],
              disabled: shiftPressed,
            }
          );

          if (snapResult) {
            console.log('[PlacementController] 🎯 吸附触发:', {
              distance: snapResult.distance,
              targetAnchor: snapResult.targetAnchorId,
              constraintType: snapResult.constraintType,
            });

            // 使用吸附位置
            finalPosition = snapResult.snapPosition;
            this.currentSnapResult = snapResult;

            // 发布吸附状态
            publishState('state:placement:snapStatus', {
              isSnapped: true,
              snapDistance: snapResult.distance,
              targetAnchorId: snapResult.targetAnchorId,
              targetObjectId: snapResult.targetObjectId,
            });
          } else {
            this.currentSnapResult = null;
            publishState('state:placement:snapStatus', {
              isSnapped: false,
              snapDistance: null,
            });
          }
        }
      } else {
        this.currentSnapResult = null;
        this.clearSnapHighlight();
      }

      this.currentPosition = finalPosition;

      console.log(
        '[PlacementController] Updated position:',
        this.currentPosition,
        this.currentSnapResult ? '(snapped)' : ''
      );

      // 更新预览位置
      this.renderer.updatePreviewTransform(this.previewHandle, {
        position: finalPosition,
      });
    } else {
      // 如果没有命中，保持上一个有效位置
      console.warn(
        '[PlacementController] No raycast hit, keeping last position. Current position:',
        this.currentPosition
      );
    }
  };

  /**
   * 渲染吸附高亮
   */
  private renderSnapHighlight(snapResult: SnapResult): void {
    // 目标锚点：绿色圆环 + 脉冲动画
    this.renderer.createHelperCircle(
      'snap-target-anchor',
      snapResult.targetAnchorPosition,
      15, // 半径 15mm
      0x00ff00, // 绿色
      {
        opacity: 0.8,
        animated: true,
      }
    );

    // 候选锚点：蓝色圆环
    this.renderer.createHelperCircle(
      'snap-candidate-anchor',
      snapResult.snapPosition,
      12, // 稍小半径
      0x0088ff, // 蓝色
      {
        opacity: 0.6,
      }
    );

    // 连接线：虚线
    this.renderer.createHelperLine(
      'snap-connection-line',
      snapResult.targetAnchorPosition,
      snapResult.snapPosition,
      0xffaa00, // 橙色
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
    this.renderer.removeHelper('snap-target-anchor');
    this.renderer.removeHelper('snap-candidate-anchor');
    this.renderer.removeHelper('snap-connection-line');
  }

  /**
   * 处理确认命令
   */
  private handleConfirmCommand = (): void => {
    this.confirmPlacement();
  };

  /**
   * 处理取消命令
   */
  private handleCancelCommand = (): void => {
    this.cancel();
  };

  /**
   * 计算当前工作平面
   * 工作平面垂直于相机视线，位于相机到焦点距离的固定百分比位置
   */
  private calculateWorkPlane(): WorkPlaneConfig {
    const camera = this.renderer.getNativeCamera() as THREE.Camera;
    const cameraPos = camera.position;

    // 获取 OrbitControls 的 target（焦点）
    const debugInfo = this.renderer.getDebugInfo();
    const target = debugInfo.camera.target;
    const targetPos = new THREE.Vector3(target.x, target.y, target.z);

    // 计算相机到焦点的距离
    const cameraToTargetDistance = cameraPos.distanceTo(targetPos);

    // 工作平面距离 = 相机到焦点距离 × 百分比
    const workPlaneDistance = cameraToTargetDistance * this.workPlaneDistanceRatio;

    // 获取相机朝向（前方向量）
    const cameraForward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.quaternion)
      .normalize();

    // 计算工作平面位置（相机前方 workPlaneDistance）
    const planePoint = cameraPos
      .clone()
      .add(cameraForward.multiplyScalar(workPlaneDistance));

    // 工作平面法线指向相机（与相机朝向相反）
    const planeNormal = cameraForward.clone().negate();

    return {
      normal: {
        x: planeNormal.x,
        y: planeNormal.y,
        z: planeNormal.z,
      },
      point: {
        x: planePoint.x,
        y: planePoint.y,
        z: planePoint.z,
      },
    };
  }

  /**
   * 开始放置会话
   * @param asset 要放置的素材
   */
  async start(asset: AnyAsset): Promise<void> {
    if (this.isActive) {
      console.warn(
        '[PlacementController] Already in placement mode, cancelling previous session'
      );
      this.cancel();
    }

    console.log(`[PlacementController] Starting placement for: ${asset.name}`);

    this.currentAsset = asset;
    this.isActive = true;

    // 生成预览句柄
    this.previewHandle = `preview_${Date.now()}`;

    // 创建预览对象 - 使用真实几何体
    const previewOptions: SceneObjectCreateOptions = {
      name: `preview_${asset.name}`,
      userParams: {}, // 使用默认参数
      machiningOps: [],
      transform: {
        position: { x: 0, y: 0, z: 0 },
      },
    };

    try {
      console.log('[PlacementController] 🚀 创建预览对象:', {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
      });

      // 使用 ObjectManager 的公共方法创建预览对象
      const tempObject = this.objectManager.createPreviewObject(
        asset.id,
        previewOptions
      );

      console.log('[PlacementController] 📦 预览对象创建结果:', {
        objectId: tempObject.id,
        hasMesh: !!tempObject.visual?.mesh,
        transform: tempObject.transform,
        userParams: tempObject.userParams,
      });

      const previewMesh = tempObject.visual?.mesh;

      // 🔍 记录预览对象尺寸
      if (previewMesh && typeof previewMesh === 'object' && 'geometry' in previewMesh) {
        const geometry = (previewMesh as any).geometry;
        if (geometry && geometry.computeBoundingBox) {
          geometry.computeBoundingBox();
          const bbox = geometry.boundingBox;
          if (bbox) {
            const size = {
              x: bbox.max.x - bbox.min.x,
              y: bbox.max.y - bbox.min.y,
              z: bbox.max.z - bbox.min.z,
            };
            console.log('[PlacementController] 📏 预览对象尺寸:', {
              'BoundingBox(米)': bbox,
              '尺寸(米)': size,
              '尺寸(毫米)': {
                x: size.x * 1000,
                y: size.y * 1000,
                z: size.z * 1000,
              },
            });
          }
        }
      }

      if (!previewMesh) {
        console.error(
          '[PlacementController] ❌ 预览对象没有mesh，使用后备立方体'
        );
        const fallbackMesh = this.createTemporaryPreviewMesh();
        this.renderer.addPreviewObject(this.previewHandle, fallbackMesh, {
          color: 0x00ff00,
          opacity: 0.5,
        });
      } else {
        console.log('[PlacementController] Adding preview mesh to renderer');
        // 使用真实的几何体作为预览
        this.renderer.addPreviewObject(this.previewHandle, previewMesh, {
          color: 0x00ff00,
          opacity: 0.5,
        });
      }
    } catch (error) {
      console.error('[PlacementController] Error creating preview:', error);
      // 如果失败，使用简单立方体
      const fallbackMesh = this.createTemporaryPreviewMesh();
      this.renderer.addPreviewObject(this.previewHandle, fallbackMesh, {
        color: 0x00ff00,
        opacity: 0.5,
      });
    }

    // 发布状态变更事件
    publishState('state:placement:started', { asset });

    console.log(
      '[PlacementController] Placement started, waiting for pointer updates via commands'
    );

    // TODO: 添加光标样式切换
    // TODO: 添加屏幕提示文字
  }

  /**
   * 确认放置
   */
  confirmPlacement(): void {
    console.log('[PlacementController] confirmPlacement called', {
      isActive: this.isActive,
      hasAsset: !!this.currentAsset,
      hasPosition: !!this.currentPosition,
      position: this.currentPosition,
      hasSnapResult: !!this.currentSnapResult,
    });

    if (!this.isActive || !this.currentAsset || !this.currentPosition) {
      console.warn(
        '[PlacementController] Cannot confirm: no active placement',
        {
          isActive: this.isActive,
          hasAsset: !!this.currentAsset,
          hasPosition: !!this.currentPosition,
        }
      );
      return;
    }

    console.log('[PlacementController] Confirming placement');

    // 构建创建选项
    const options: SceneObjectCreateOptions = {
      name: `${this.currentAsset.name}_${Date.now()}`,
      userParams: {}, // TODO: 从 UI 获取用户参数
      machiningOps: [],
      transform: {
        position: {
          x: this.currentPosition.x,
          y: this.currentPosition.y,
          z: this.currentPosition.z,
        },
      },
    };

    // 创建对象
    try {
      const sceneObject = this.objectManager.createObjectFromAsset(
        this.currentAsset.id,
        options
      );
      console.log('[PlacementController] Object created successfully:', sceneObject.id);

      // 🎯 如果有吸附信息，自动创建约束
      if (
        this.currentSnapResult &&
        this.anchorService &&
        this.constraintService
      ) {
        console.log('[PlacementController] 📌 创建自动约束...');

        // 等待锚点生成（已在 CoreServiceProvider 中自动生成）
        // 获取新创建对象的锚点
        const newObjectAnchors = this.anchorService.getAnchors(sceneObject.id);

        if (
          newObjectAnchors &&
          newObjectAnchors.length > this.currentSnapResult.candidateAnchorIndex
        ) {
          const newAnchor =
            newObjectAnchors[this.currentSnapResult.candidateAnchorIndex];

          try {
            // 创建约束
            const constraint: PointToPointConstraint = {
              id: `constraint-${Date.now()}`,
              type: ConstraintType.POINT_TO_POINT,
              priority: ConstraintPriority.NORMAL,
              objectIds: [
                this.currentSnapResult.targetObjectId,
                sceneObject.id,
              ],
              enabled: true,
              objectAId: this.currentSnapResult.targetObjectId,
              objectBId: sceneObject.id,
              anchorAId: this.currentSnapResult.targetAnchorId,
              anchorBId: newAnchor.id,
              metadata: {
                autoCreated: true,
                createdAt: new Date(),
              },
            };

            this.constraintService.addConstraint(constraint);
            console.log('[PlacementController] ✅ 约束已创建:', constraint.id);

            // 求解约束（传入新对象 ID 和其当前变换）
            const solveResult = this.constraintService.solveConstraints(
              sceneObject.id,
              {
                position: sceneObject.transform.position,
                rotation: sceneObject.transform.rotation,
              }
            );
            console.log('[PlacementController] 🔧 约束求解结果:', solveResult);

            if (solveResult.success) {
              console.log('[PlacementController] ✅ 约束求解成功，对象已自动对齐');

              // Toast 通知
              toast.success('已创建约束并自动对齐');

              // 发布装配事件
              publishState('state:assembly:constraintCreated', {
                constraintId: constraint.id,
                objectId: sceneObject.id,
              });
            } else {
              console.warn(
                '[PlacementController] ⚠️ 约束求解失败:',
                solveResult.conflicts
              );

              // Toast 警告
              toast.warning('约束求解失败，可能存在冲突');
            }
          } catch (error) {
            console.error('[PlacementController] ❌ 约束创建失败:', error);

            // Toast 错误
            toast.error('约束创建失败');
          }
        } else {
          console.warn(
            '[PlacementController] ⚠️ 无法找到对应的新锚点，跳过约束创建'
          );
        }
      }

      // 发布状态变更事件
      publishState('state:placement:completed', { modelId: sceneObject.id });
    } catch (error) {
      console.error('[PlacementController] Failed to create object:', error);
    }

    // 结束会话
    this.endSession();
  }

  /**
   * 取消放置
   */
  cancel = (): void => {
    if (!this.isActive) {
      return;
    }

    console.log('[PlacementController] Cancelling placement');

    // 清除吸附高亮
    this.clearSnapHighlight();

    // 发布状态变更事件
    publishState('state:placement:cancelled', undefined);

    this.endSession();
  };

  /**
   * 结束会话
   */
  private endSession(): void {
    // 清除吸附高亮
    this.clearSnapHighlight();

    // ✅ 通过 IRenderer 抽象接口移除预览对象
    if (this.previewHandle) {
      this.renderer.removePreviewObject(this.previewHandle);
      this.previewHandle = null;
    }

    // 重置状态
    this.isActive = false;
    this.currentAsset = null;
    this.currentPosition = null;
    this.currentSnapResult = null;

    // TODO: 恢复光标样式
  }

  /**
   * 获取预览对象的锚点（简化实现）
   *
   * TODO: 应该从资产定义中获取锚点模板
   * 当前简化为：假设型材有端点锚点
   */
  private getPreviewAnchors(): any[] {
    if (!this.currentAsset) return [];

    // 简化实现：根据资产类型返回默认锚点
    // 实际应该从 AssetService 获取锚点定义
    const assetType = this.currentAsset.type;

    if (assetType === 'profile') {
      // 型材：两个端点锚点
      return [
        {
          id: 'preview-anchor-front',
          type: 'endpoint',
          localPosition: { x: 0, y: 0, z: 0.75 }, // 假设长度1.5m，前端
          worldPosition: { x: 0, y: 0, z: 0 },
          objectId: 'preview',
        },
        {
          id: 'preview-anchor-back',
          type: 'endpoint',
          localPosition: { x: 0, y: 0, z: -0.75 }, // 后端
          worldPosition: { x: 0, y: 0, z: 0 },
          objectId: 'preview',
        },
      ];
    }

    return [];
  }

  /**
   * 获取是否处于激活状态
   */
  isPlacementActive(): boolean {
    return this.isActive;
  }

  /**
   * 临时方法：创建预览 Mesh
   * TODO: 应该通过 GeometryFactory 或 ObjectManager 创建
   */
  private createTemporaryPreviewMesh(): unknown {
    // 这里返回的是 Three.js 对象，但 PlacementController 不知道具体类型
    // 它只是传递给 IRenderer
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    return new THREE.Mesh(geometry, material);
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.cancel();

    // 移除命令监听
    offCommand('command:placement:start', this.handleStartCommand);
    offCommand('command:placement:updatePointer', this.handlePointerUpdate);
    offCommand('command:placement:confirm', this.handleConfirmCommand);
    offCommand('command:placement:cancel', this.handleCancelCommand);
  }
}
