/**
 * BoxSelectController - 框选控制器
 *
 * 职责：
 * - 监听框选命令事件（command:boxselect:*）
 * - 管理框选状态（激活中、已完成、已取消）
 * - 计算框选区域内的对象
 * - 协调 SelectionService 更新选中状态
 * - 协调 OrbitControls 禁用/恢复
 *
 * 架构：
 * - UI 层通过 useBoxSelect Hook 发送框选命令
 * - BoxSelectController 监听命令并处理业务逻辑
 * - 通过 SelectionService 更新选中对象
 * - 发布状态事件通知 UI 层更新
 */

import type { IRenderer } from '@/core/renderer/renderer-types';
import type { ObjectManager } from '@/core/object';
import {
  designerEventBus,
  onCommand,
  offCommand,
  publishState,
} from '@/core/services/eventBus';
import * as THREE from 'three';

/**
 * 框选矩形区域（屏幕坐标）
 */
export interface BoxSelectRegion {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * 框选模式
 */
export const BoxSelectMode = {
  /** 替换选择（默认） */
  REPLACE: 'replace',
  /** 添加选择（Shift） */
  ADD: 'add',
  /** 切换选择（Ctrl） */
  TOGGLE: 'toggle',
} as const;

export type BoxSelectMode = (typeof BoxSelectMode)[keyof typeof BoxSelectMode];

/**
 * BoxSelectController
 */
export class BoxSelectController {
  private renderer: IRenderer;
  private objectManager: ObjectManager;

  // 框选状态
  private isActive = false;
  private startPoint: { x: number; y: number } | null = null;
  private currentPoint: { x: number; y: number } | null = null;
  private selectMode: BoxSelectMode = BoxSelectMode.REPLACE;

  constructor(renderer: IRenderer, objectManager: ObjectManager) {
    this.renderer = renderer;
    this.objectManager = objectManager;
    this.setupCommandListeners();
  }

  /**
   * 设置命令监听器
   */
  private setupCommandListeners(): void {
    onCommand('command:boxselect:start', this.handleStart);
    onCommand('command:boxselect:update', this.handleUpdate);
    onCommand('command:boxselect:end', this.handleEnd);
    onCommand('command:boxselect:cancel', this.handleCancel);
  }

  /**
   * 处理开始框选命令
   */
  private handleStart = (payload: { x: number; y: number }): void => {
    if (this.isActive) {
      console.warn(
        '[BoxSelectController] Already active, ignoring start command'
      );
      return;
    }

    this.isActive = true;
    this.startPoint = { x: payload.x, y: payload.y };
    this.currentPoint = { x: payload.x, y: payload.y };

    // 发布状态事件
    publishState('state:boxselect:started', undefined);

    console.log(
      '[BoxSelectController] Box selection started at:',
      this.startPoint
    );
  };

  /**
   * 处理更新框选区域命令
   */
  private handleUpdate = (payload: { x: number; y: number }): void => {
    if (!this.isActive || !this.startPoint) {
      return;
    }

    this.currentPoint = { x: payload.x, y: payload.y };

    // 计算框选矩形
    const region = this.getBoxRegion();

    // 发布状态事件（UI 层会更新矩形显示）
    publishState('state:boxselect:active', {
      startX: region.startX,
      startY: region.startY,
      endX: region.endX,
      endY: region.endY,
    });
  };

  /**
   * 处理结束框选命令
   */
  private handleEnd = (): void => {
    if (!this.isActive || !this.startPoint || !this.currentPoint) {
      return;
    }

    const region = this.getBoxRegion();

    // 计算框选区域内的对象
    const selectedIds = this.getObjectsInBox(region);

    console.log('[BoxSelectController] Box selection completed:', {
      region,
      selectedCount: selectedIds.length,
      ids: selectedIds,
    });

    // 根据选择模式发送选择命令
    this.applySelection(selectedIds);

    // 发布完成事件
    publishState('state:boxselect:completed', { selectedIds });

    // 重置状态
    this.reset();
  };

  /**
   * 处理取消框选命令
   */
  private handleCancel = (): void => {
    if (!this.isActive) {
      return;
    }

    console.log('[BoxSelectController] Box selection cancelled');

    // 发布取消事件
    publishState('state:boxselect:cancelled', undefined);

    // 重置状态
    this.reset();
  };

  /**
   * 获取框选矩形区域（标准化坐标，左上角为起点）
   */
  private getBoxRegion(): BoxSelectRegion {
    if (!this.startPoint || !this.currentPoint) {
      return { startX: 0, startY: 0, endX: 0, endY: 0 };
    }

    return {
      startX: Math.min(this.startPoint.x, this.currentPoint.x),
      startY: Math.min(this.startPoint.y, this.currentPoint.y),
      endX: Math.max(this.startPoint.x, this.currentPoint.x),
      endY: Math.max(this.startPoint.y, this.currentPoint.y),
    };
  }

  /**
   * 获取框选区域内的对象
   * 使用边界框投影算法检测对象是否在矩形内
   */
  private getObjectsInBox(region: BoxSelectRegion): string[] {
    const selectedIds: string[] = [];
    const allObjects = this.objectManager.getAllObjects();

    // 获取视口尺寸（假设渲染器占满容器）
    const canvas = (this.renderer as any).getInternalRenderer?.()?.domElement;
    if (!canvas) {
      console.warn(
        '[BoxSelectController] Cannot get canvas, skipping selection'
      );
      return [];
    }

    // 获取 canvas 相对于页面的偏移
    const canvasRect = canvas.getBoundingClientRect();

    console.log('[BoxSelectController] 框选检测:', {
      region,
      canvasRect: {
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height,
      },
      objectCount: allObjects.length,
    });

    // 遍历所有对象，检测是否在框选范围内
    for (const object of allObjects) {
      if (!object.visual?.mesh) {
        continue;
      }

      // 检测对象是否在框选矩形内
      const isInBox = this.isObjectInBox(
        object.visual.mesh,
        region,
        canvasRect
      );

      if (isInBox) {
        selectedIds.push(object.id);
        console.log('[BoxSelectController] 对象在框选内:', object.id);
      }
    }

    console.log('[BoxSelectController] 框选完成，选中:', selectedIds);
    return selectedIds;
  }

  /**
   * 检测对象是否在框选矩形内
   * 算法：将对象中心点投影到屏幕坐标，检测是否在矩形内
   */
  private isObjectInBox(
    mesh: unknown,
    region: BoxSelectRegion,
    canvasRect: DOMRect
  ): boolean {
    const obj = mesh as THREE.Object3D;

    // 获取对象的世界坐标
    const worldPosition = new THREE.Vector3();
    obj.getWorldPosition(worldPosition);

    // 投影到屏幕坐标
    const camera = (this.renderer as any).getInternalCamera?.();
    if (!camera) {
      return false;
    }

    const screenPosition = worldPosition.clone().project(camera);

    // 转换为页面像素坐标（NDC: -1 到 1 → 页面坐标）
    const screenX =
      canvasRect.left + ((screenPosition.x + 1) / 2) * canvasRect.width;
    const screenY =
      canvasRect.top + ((-screenPosition.y + 1) / 2) * canvasRect.height;

    // 检测是否在矩形内
    const isInBox =
      screenX >= region.startX &&
      screenX <= region.endX &&
      screenY >= region.startY &&
      screenY <= region.endY;

    // 详细日志：打印所有对象的投影位置
    console.log('[BoxSelectController] 对象投影检测:', {
      worldPosition: {
        x: worldPosition.x.toFixed(2),
        y: worldPosition.y.toFixed(2),
        z: worldPosition.z.toFixed(2),
      },
      screenNDC: {
        x: screenPosition.x.toFixed(2),
        y: screenPosition.y.toFixed(2),
      },
      screenPixel: {
        x: screenX.toFixed(0),
        y: screenY.toFixed(0),
      },
      region: {
        startX: region.startX.toFixed(0),
        startY: region.startY.toFixed(0),
        endX: region.endX.toFixed(0),
        endY: region.endY.toFixed(0),
      },
      isInBox,
    });

    return isInBox;
  }

  /**
   * 应用选择（根据选择模式）
   */
  private applySelection(selectedIds: string[]): void {
    switch (this.selectMode) {
      case BoxSelectMode.REPLACE:
        // 清空现有选择，选中新对象
        if (selectedIds.length === 0) {
          designerEventBus.emit('command:selection:clear', undefined);
        } else if (selectedIds.length === 1) {
          designerEventBus.emit('command:selection:set', selectedIds[0]);
        } else {
          // 多选：先清空，再逐个添加
          designerEventBus.emit('command:selection:clear', undefined);
          selectedIds.forEach(id => {
            designerEventBus.emit('command:selection:add', id);
          });
        }
        break;

      case BoxSelectMode.ADD:
        // 添加到现有选择
        selectedIds.forEach(id => {
          designerEventBus.emit('command:selection:add', id);
        });
        break;

      case BoxSelectMode.TOGGLE:
        // 切换选择状态
        selectedIds.forEach(id => {
          designerEventBus.emit('command:selection:toggle', id);
        });
        break;
    }
  }

  /**
   * 设置选择模式（由 UI 层调用）
   */
  setSelectMode(mode: BoxSelectMode): void {
    this.selectMode = mode;
  }

  /**
   * 获取当前是否激活
   */
  isBoxSelectActive(): boolean {
    return this.isActive;
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.isActive = false;
    this.startPoint = null;
    this.currentPoint = null;
    this.selectMode = BoxSelectMode.REPLACE;
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    offCommand('command:boxselect:start', this.handleStart);
    offCommand('command:boxselect:update', this.handleUpdate);
    offCommand('command:boxselect:end', this.handleEnd);
    offCommand('command:boxselect:cancel', this.handleCancel);

    this.reset();
  }
}
