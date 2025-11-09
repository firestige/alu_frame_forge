import type { SceneObjectCreateOptions } from '@/core/object/types/scene-object';
import type { AnyAsset } from '@/core/asset/types/asset';

/**
 * 占位符状态
 * 表示用户正在放置但尚未确认的对象
 */
export interface Placeholder {
  /** 占位符 ID */
  id: string;
  /** 关联的素材 ID */
  assetId: string;
  /** 关联的素材对象 */
  asset: AnyAsset;
  /** 当前状态 */
  status: 'pending' | 'configuring' | 'ready';
  /** 临时位置 */
  position?: { x: number; y: number; z: number };
  /** 用户已设置的参数 */
  userParams: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 放置服务
 * 管理素材放置的生命周期：从拖拽开始到确认创建
 *
 * 工作流程：
 * 1. start(): 用户从素材库选择素材，开始放置会话
 * 2. updatePosition(): 鼠标移动时更新占位符位置
 * 3. showParameterPanel(): 显示参数配置面板
 * 4. updateParameters(): 用户修改参数
 * 5. confirm(): 确认创建，返回完整的创建选项
 * 6. cancel(): 取消放置
 */
export class PlacementService {
  /** 当前激活的占位符 */
  private activePlaceholder: Placeholder | null = null;

  /** 占位符历史（用于撤销） */
  private placeholderHistory: Placeholder[] = [];

  /** 事件回调 */
  private callbacks: {
    onPlaceholderCreated?: (placeholder: Placeholder) => void;
    onPlaceholderUpdated?: (placeholder: Placeholder) => void;
    onPlacementConfirmed?: (options: SceneObjectCreateOptions) => void;
    onPlacementCancelled?: () => void;
  } = {};

  // ==================== 生命周期管理 ====================

  /**
   * 开始放置会话
   * @param asset 要放置的素材
   * @returns 占位符对象
   */
  start(asset: AnyAsset): Placeholder {
    // 如果已有激活的占位符，先取消
    if (this.activePlaceholder) {
      this.cancel();
    }

    // 创建新占位符
    const placeholder: Placeholder = {
      id: this.generatePlaceholderId(),
      assetId: asset.id,
      asset,
      status: 'pending',
      userParams: {},
      createdAt: new Date(),
    };

    this.activePlaceholder = placeholder;
    this.placeholderHistory.push(placeholder);

    // 触发回调
    this.callbacks.onPlaceholderCreated?.(placeholder);

    console.log(
      `[PlacementService] Started placement for asset: ${asset.name}`
    );

    return placeholder;
  }

  /**
   * 更新占位符位置
   * 通常在鼠标移动时调用
   */
  updatePosition(position: { x: number; y: number; z: number }): void {
    if (!this.activePlaceholder) {
      console.warn('[PlacementService] No active placeholder to update');
      return;
    }

    this.activePlaceholder.position = position;
    this.callbacks.onPlaceholderUpdated?.(this.activePlaceholder);
  }

  /**
   * 更新用户参数
   * 当参数面板中的值改变时调用
   */
  updateParameters(params: Record<string, unknown>): void {
    if (!this.activePlaceholder) {
      console.warn('[PlacementService] No active placeholder to update');
      return;
    }

    // 合并参数
    this.activePlaceholder.userParams = {
      ...this.activePlaceholder.userParams,
      ...params,
    };

    // 检查是否所有必需参数都已设置
    if (this.validateParameters(this.activePlaceholder)) {
      this.activePlaceholder.status = 'ready';
    } else {
      this.activePlaceholder.status = 'configuring';
    }

    this.callbacks.onPlaceholderUpdated?.(this.activePlaceholder);

    console.log('[PlacementService] Parameters updated:', params);
  }

  /**
   * 确认放置
   * 返回完整的创建选项，供 ModelFactory 使用
   */
  confirm(): SceneObjectCreateOptions | null {
    if (!this.activePlaceholder) {
      console.warn('[PlacementService] No active placeholder to confirm');
      return null;
    }

    if (this.activePlaceholder.status !== 'ready') {
      console.warn(
        '[PlacementService] Placeholder not ready, missing parameters'
      );
      return null;
    }

    // 构建创建选项
    const options: SceneObjectCreateOptions = {
      name: `${this.activePlaceholder.asset.name}_${Date.now()}`,
      userParams: this.activePlaceholder.userParams,
      machiningOps: [],
      transform: {
        position: this.activePlaceholder.position || { x: 0, y: 0, z: 0 },
      },
    };

    // 触发回调
    this.callbacks.onPlacementConfirmed?.(options);

    console.log(
      `[PlacementService] Placement confirmed for: ${this.activePlaceholder.asset.name}`
    );

    // 清空激活状态
    this.activePlaceholder = null;

    return options;
  }

  /**
   * 取消放置
   */
  cancel(): void {
    if (!this.activePlaceholder) {
      return;
    }

    console.log(
      `[PlacementService] Placement cancelled for: ${this.activePlaceholder.asset.name}`
    );

    this.activePlaceholder = null;
    this.callbacks.onPlacementCancelled?.();
  }

  // ==================== 状态查询 ====================

  /**
   * 获取当前激活的占位符
   */
  getActivePlaceholder(): Placeholder | null {
    return this.activePlaceholder;
  }

  /**
   * 是否有激活的占位符
   */
  hasActivePlaceholder(): boolean {
    return this.activePlaceholder !== null;
  }

  /**
   * 获取放置历史
   */
  getHistory(): Placeholder[] {
    return [...this.placeholderHistory];
  }

  // ==================== 事件注册 ====================

  /**
   * 注册事件回调
   */
  on(
    event:
      | 'placeholderCreated'
      | 'placeholderUpdated'
      | 'confirmed'
      | 'cancelled',
    callback: (data?: unknown) => void
  ): void {
    switch (event) {
      case 'placeholderCreated':
        this.callbacks.onPlaceholderCreated = callback as (
          placeholder: Placeholder
        ) => void;
        break;
      case 'placeholderUpdated':
        this.callbacks.onPlaceholderUpdated = callback as (
          placeholder: Placeholder
        ) => void;
        break;
      case 'confirmed':
        this.callbacks.onPlacementConfirmed = callback as (
          options: SceneObjectCreateOptions
        ) => void;
        break;
      case 'cancelled':
        this.callbacks.onPlacementCancelled = callback as () => void;
        break;
    }
  }

  // ==================== 内部辅助方法 ====================

  /**
   * 验证参数完整性
   * 检查必需参数是否都已设置
   */
  private validateParameters(placeholder: Placeholder): boolean {
    // 简化实现：假设所有素材都需要至少一个参数
    // 实际项目中应该根据 asset.parameters 检查必需字段
    return Object.keys(placeholder.userParams).length > 0;
  }

  /**
   * 生成占位符 ID
   */
  private generatePlaceholderId(): string {
    return `placeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.placeholderHistory = [];
    console.log('[PlacementService] History cleared');
  }
}
