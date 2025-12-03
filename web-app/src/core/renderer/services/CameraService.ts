/**
 * CameraService - 相机控制服务
 *
 * 职责：
 * 1. 视角预设管理（26个标准位置）
 * 2. 视角切换逻辑（预设 + 自由向量）
 * 3. 状态持久化
 * 4. 通过事件总线发布状态变更
 *
 * 通信方式：
 * - 接收命令：由 CameraCommandHandler 调用
 * - 发送通知：通过 eventBus
 */

import { eventBus } from '@/core/services/eventBus';
import {
  CameraPreset,
  type ViewDescriptor,
  type Vector3,
} from '../renderer-types';
import type { CameraController } from '../threejs/CameraController';

export class CameraService {
  private currentView: ViewDescriptor;
  private viewHistory: ViewDescriptor[] = [];
  private readonly maxHistorySize = 10;
  private readonly presetConfigs = new Map<CameraPreset, ViewDescriptor>();
  private cameraController: CameraController;
  private defaultDistance: number;

  constructor(cameraController: CameraController, defaultDistance = 10) {
    this.cameraController = cameraController;
    this.defaultDistance = defaultDistance;
    this.initializePresets();
    this.currentView = this.getPresetView(CameraPreset.ISOMETRIC);
  }

  // ==================== 初始化 ====================

  private initializePresets(): void {
    const d = this.defaultDistance;
    const sqrt2 = Math.sqrt(2);
    const sqrt3 = Math.sqrt(3);

    // === 6 个面视图 ===
    this.presetConfigs.set(CameraPreset.FRONT, {
      position: { x: 0, y: 0, z: d },
      target: { x: 0, y: 0, z: 0 },
      name: '正视图',
      preset: CameraPreset.FRONT,
    });

    this.presetConfigs.set(CameraPreset.BACK, {
      position: { x: 0, y: 0, z: -d },
      target: { x: 0, y: 0, z: 0 },
      name: '后视图',
      preset: CameraPreset.BACK,
    });

    this.presetConfigs.set(CameraPreset.LEFT, {
      position: { x: -d, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '左视图',
      preset: CameraPreset.LEFT,
    });

    this.presetConfigs.set(CameraPreset.RIGHT, {
      position: { x: d, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '右视图',
      preset: CameraPreset.RIGHT,
    });

    this.presetConfigs.set(CameraPreset.TOP, {
      position: { x: 0, y: d, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: -1 }, // 顶视图需要特殊的上方向
      name: '俯视图',
      preset: CameraPreset.TOP,
    });

    this.presetConfigs.set(CameraPreset.BOTTOM, {
      position: { x: 0, y: -d, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      name: '仰视图',
      preset: CameraPreset.BOTTOM,
    });

    // === 等轴测视图 ===
    const isoX = d / sqrt3;
    const isoY = d / sqrt3;
    const isoZ = d / sqrt3;

    this.presetConfigs.set(CameraPreset.ISOMETRIC, {
      position: { x: isoX, y: isoY, z: isoZ },
      target: { x: 0, y: 0, z: 0 },
      name: '等轴测',
      preset: CameraPreset.ISOMETRIC,
    });

    // === 12 个棱视图（MVP 阶段不暴露在 UI，但预留实现）===
    const edgeD = d / sqrt2;

    this.presetConfigs.set(CameraPreset.FRONT_TOP, {
      position: { x: 0, y: edgeD, z: edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '前上视图',
      preset: CameraPreset.FRONT_TOP,
    });

    this.presetConfigs.set(CameraPreset.FRONT_BOTTOM, {
      position: { x: 0, y: -edgeD, z: edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '前下视图',
      preset: CameraPreset.FRONT_BOTTOM,
    });

    this.presetConfigs.set(CameraPreset.FRONT_LEFT, {
      position: { x: -edgeD, y: 0, z: edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '前左视图',
      preset: CameraPreset.FRONT_LEFT,
    });

    this.presetConfigs.set(CameraPreset.FRONT_RIGHT, {
      position: { x: edgeD, y: 0, z: edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '前右视图',
      preset: CameraPreset.FRONT_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.BACK_TOP, {
      position: { x: 0, y: edgeD, z: -edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '后上视图',
      preset: CameraPreset.BACK_TOP,
    });

    this.presetConfigs.set(CameraPreset.BACK_BOTTOM, {
      position: { x: 0, y: -edgeD, z: -edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '后下视图',
      preset: CameraPreset.BACK_BOTTOM,
    });

    this.presetConfigs.set(CameraPreset.BACK_LEFT, {
      position: { x: -edgeD, y: 0, z: -edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '后左视图',
      preset: CameraPreset.BACK_LEFT,
    });

    this.presetConfigs.set(CameraPreset.BACK_RIGHT, {
      position: { x: edgeD, y: 0, z: -edgeD },
      target: { x: 0, y: 0, z: 0 },
      name: '后右视图',
      preset: CameraPreset.BACK_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.TOP_LEFT, {
      position: { x: -edgeD, y: edgeD, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '上左视图',
      preset: CameraPreset.TOP_LEFT,
    });

    this.presetConfigs.set(CameraPreset.TOP_RIGHT, {
      position: { x: edgeD, y: edgeD, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '上右视图',
      preset: CameraPreset.TOP_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.BOTTOM_LEFT, {
      position: { x: -edgeD, y: -edgeD, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '下左视图',
      preset: CameraPreset.BOTTOM_LEFT,
    });

    this.presetConfigs.set(CameraPreset.BOTTOM_RIGHT, {
      position: { x: edgeD, y: -edgeD, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      name: '下右视图',
      preset: CameraPreset.BOTTOM_RIGHT,
    });

    // === 8 个角视图（MVP 阶段不暴露）===
    const cornerD = d / sqrt3;

    this.presetConfigs.set(CameraPreset.FRONT_TOP_LEFT, {
      position: { x: -cornerD, y: cornerD, z: cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '前上左视图',
      preset: CameraPreset.FRONT_TOP_LEFT,
    });

    this.presetConfigs.set(CameraPreset.FRONT_TOP_RIGHT, {
      position: { x: cornerD, y: cornerD, z: cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '前上右视图',
      preset: CameraPreset.FRONT_TOP_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.FRONT_BOTTOM_LEFT, {
      position: { x: -cornerD, y: -cornerD, z: cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '前下左视图',
      preset: CameraPreset.FRONT_BOTTOM_LEFT,
    });

    this.presetConfigs.set(CameraPreset.FRONT_BOTTOM_RIGHT, {
      position: { x: cornerD, y: -cornerD, z: cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '前下右视图',
      preset: CameraPreset.FRONT_BOTTOM_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.BACK_TOP_LEFT, {
      position: { x: -cornerD, y: cornerD, z: -cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '后上左视图',
      preset: CameraPreset.BACK_TOP_LEFT,
    });

    this.presetConfigs.set(CameraPreset.BACK_TOP_RIGHT, {
      position: { x: cornerD, y: cornerD, z: -cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '后上右视图',
      preset: CameraPreset.BACK_TOP_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.BACK_BOTTOM_LEFT, {
      position: { x: -cornerD, y: -cornerD, z: -cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '后下左视图',
      preset: CameraPreset.BACK_BOTTOM_LEFT,
    });

    this.presetConfigs.set(CameraPreset.BACK_BOTTOM_RIGHT, {
      position: { x: cornerD, y: -cornerD, z: -cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '后下右视图',
      preset: CameraPreset.BACK_BOTTOM_RIGHT,
    });

    this.presetConfigs.set(CameraPreset.ISOMETRIC_ALT, {
      position: { x: -cornerD, y: cornerD, z: -cornerD },
      target: { x: 0, y: 0, z: 0 },
      name: '等轴测（备选）',
      preset: CameraPreset.ISOMETRIC_ALT,
    });
  }

  // ==================== 核心 API（供 CommandHandler 调用）====================

  /**
   * 切换到预设视角
   */
  async setViewPreset(preset: CameraPreset, animated = true): Promise<void> {
    const view = this.getPresetView(preset);
    await this.setView(view, animated);
  }

  /**
   * 通过方向向量设置视角（用于 ViewCube 拖拽）
   */
  async setViewByDirection(
    direction: Vector3,
    up?: Vector3,
    animated = true
  ): Promise<void> {
    // 归一化方向向量
    const length = Math.sqrt(
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2
    );

    if (length === 0) {
      console.warn('Invalid direction vector (zero length)');
      return;
    }

    const normalized = {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length,
    };

    // 计算相机位置（保持默认距离）
    const target = { x: 0, y: 0, z: 0 }; // 假设观察原点
    const position = {
      x: target.x + normalized.x * this.defaultDistance,
      y: target.y + normalized.y * this.defaultDistance,
      z: target.z + normalized.z * this.defaultDistance,
    };

    const view: ViewDescriptor = {
      position,
      target,
      up,
      name: '自由视角',
    };

    await this.setView(view, animated);
  }

  /**
   * 聚焦到对象（计算包围盒并调整相机）
   */
  async focusOnObject(objectId: string, padding = 1.5): Promise<void> {
    const boundingBox = this.cameraController.getObjectBoundingBox?.(objectId);
    if (!boundingBox) {
      console.warn(`Object ${objectId} not found or no bounding box`);
      return;
    }

    await this.cameraController.focusOnBoundingBox(boundingBox, padding);

    // 聚焦不改变预设状态，但要通知 UI
    this.notifyViewChanged();
  }

  /**
   * 重置到初始视角（等轴测）
   */
  async reset(animated = true): Promise<void> {
    await this.setViewPreset(CameraPreset.ISOMETRIC, animated);
  }

  // ==================== 内部逻辑 ====================

  private async setView(
    view: ViewDescriptor,
    animated: boolean
  ): Promise<void> {
    this.currentView = view;
    this.addToHistory(view);

    await this.cameraController.animateToPosition(
      view.position,
      view.target,
      view.up,
      animated ? 600 : 0
    );

    this.notifyViewChanged();
    this.saveCurrentView();
  }

  private notifyViewChanged(): void {
    // 通过事件总线通知 UI
    eventBus.emit('camera:viewChanged', {
      preset: this.currentView.preset || null,
      position: this.currentView.position,
      target: this.currentView.target,
    });
  }

  // ==================== 历史管理 ====================

  private addToHistory(view: ViewDescriptor): void {
    this.viewHistory.push(view);
    if (this.viewHistory.length > this.maxHistorySize) {
      this.viewHistory.shift();
    }
  }

  /**
   * 回到上一个视角
   */
  async goBack(animated = true): Promise<void> {
    if (this.viewHistory.length < 2) return;

    this.viewHistory.pop(); // 移除当前
    const previous = this.viewHistory[this.viewHistory.length - 1];
    await this.setView(previous, animated);
  }

  // ==================== 状态管理 ====================

  /**
   * 获取当前视角描述符
   */
  getCurrentView(): ViewDescriptor {
    return { ...this.currentView };
  }

  /**
   * 判断当前是否为某个预设视角
   */
  isPresetActive(preset: CameraPreset): boolean {
    return this.currentView.preset === preset;
  }

  private saveCurrentView(): void {
    try {
      localStorage.setItem(
        'designer.currentView',
        JSON.stringify(this.currentView)
      );
    } catch (e) {
      console.warn('Failed to save camera view:', e);
    }
  }

  loadSavedView(): void {
    const saved = localStorage.getItem('designer.currentView');
    if (!saved) return;

    try {
      const view: ViewDescriptor = JSON.parse(saved);
      this.setView(view, false); // 加载时不需要动画
    } catch (e) {
      console.warn('Failed to load saved view:', e);
    }
  }

  // ==================== 辅助方法 ====================

  private getPresetView(preset: CameraPreset): ViewDescriptor {
    const view = this.presetConfigs.get(preset);
    if (!view) {
      throw new Error(`Unknown preset: ${preset}`);
    }
    return { ...view };
  }

  /**
   * 获取所有可用的预设列表（用于 UI 生成）
   */
  getAllPresets(): Array<{ preset: CameraPreset; name: string }> {
    return Array.from(this.presetConfigs.entries()).map(([preset, view]) => ({
      preset,
      name: view.name || preset,
    }));
  }
}
