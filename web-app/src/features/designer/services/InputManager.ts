import * as THREE from 'three';

/**
 * 指针事件数据
 */
export interface PointerEventData {
  /** 屏幕坐标 */
  screen: { x: number; y: number };
  /** NDC 坐标 (-1 到 +1) */
  ndc: THREE.Vector2;
  /** 原始事件 */
  originalEvent: PointerEvent;
}

/**
 * 输入管理器
 *
 * 职责：
 * - 统一处理 pointermove/pointerdown/pointerup 事件
 * - NDC 转换
 * - 防抖/节流
 * - 提供订阅接口
 */
export class InputManager {
  private container: HTMLElement;
  private listeners: {
    move?: (data: PointerEventData) => void;
    down?: (data: PointerEventData) => void;
    up?: (data: PointerEventData) => void;
    cancel?: () => void;
  } = {};

  /** 节流间隔（毫秒） */
  private throttleInterval = 16; // ~60fps

  /** 上次触发时间 */
  private lastTriggerTime = 0;

  /** 是否启用 */
  private enabled = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 启用输入监听
   */
  enable(): void {
    if (this.enabled) {
      return;
    }

    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('pointerdown', this.handlePointerDown);
    this.container.addEventListener('pointerup', this.handlePointerUp);
    document.addEventListener('keydown', this.handleKeyDown);

    this.enabled = true;
    console.log('[InputManager] Enabled');
  }

  /**
   * 禁用输入监听
   */
  disable(): void {
    if (!this.enabled) {
      return;
    }

    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
    this.container.removeEventListener('pointerup', this.handlePointerUp);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.enabled = false;
    console.log('[InputManager] Disabled');
  }

  /**
   * 注册事件监听器
   */
  on(
    event: 'move' | 'down' | 'up' | 'cancel',
    callback: ((data: PointerEventData) => void) | (() => void)
  ): void {
    switch (event) {
      case 'move':
        this.listeners.move = callback as (data: PointerEventData) => void;
        break;
      case 'down':
        this.listeners.down = callback as (data: PointerEventData) => void;
        break;
      case 'up':
        this.listeners.up = callback as (data: PointerEventData) => void;
        break;
      case 'cancel':
        this.listeners.cancel = callback as () => void;
        break;
    }
  }

  /**
   * 移除事件监听器
   */
  off(event: 'move' | 'down' | 'up' | 'cancel'): void {
    delete this.listeners[event];
  }

  /**
   * 设置节流间隔
   * @param interval 间隔（毫秒）
   */
  setThrottleInterval(interval: number): void {
    this.throttleInterval = Math.max(0, interval);
  }

  /**
   * 处理指针移动
   */
  private handlePointerMove = (event: PointerEvent): void => {
    // 节流
    const now = Date.now();
    if (now - this.lastTriggerTime < this.throttleInterval) {
      return;
    }
    this.lastTriggerTime = now;

    const data = this.createPointerData(event);
    this.listeners.move?.(data);
  };

  /**
   * 处理指针按下
   */
  private handlePointerDown = (event: PointerEvent): void => {
    const data = this.createPointerData(event);
    this.listeners.down?.(data);
  };

  /**
   * 处理指针抬起
   */
  private handlePointerUp = (event: PointerEvent): void => {
    const data = this.createPointerData(event);
    this.listeners.up?.(data);
  };

  /**
   * 处理键盘事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // ESC 键取消
    if (event.key === 'Escape') {
      this.listeners.cancel?.();
    }
  };

  /**
   * 创建指针事件数据
   */
  private createPointerData(event: PointerEvent): PointerEventData {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 转换为 NDC
    const ndcX = (x / rect.width) * 2 - 1;
    const ndcY = -(y / rect.height) * 2 + 1;

    return {
      screen: { x, y },
      ndc: new THREE.Vector2(ndcX, ndcY),
      originalEvent: event,
    };
  }

  /**
   * 获取是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.disable();
    this.listeners = {};
  }
}

