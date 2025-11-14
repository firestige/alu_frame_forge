import type { ObjectManager } from '../object';
import type { ProjectFileFormat } from '../object/SceneIO';
import {
  saveProjectToLocalStorage,
  saveProjectToNetwork,
} from './queryService';
import mitt, { type Emitter } from 'mitt';

/**
 * 自动保存事件类型
 */
export type AutoSaveEvents = {
  'autosave:pending': undefined;
  'autosave:saving': undefined;
  'autosave:saved': { timestamp: Date };
  'autosave:error': { error: Error };
};

/**
 * 自动保存状态
 */
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * 自动保存服务配置
 */
export interface AutoSaveConfig {
  /**
   * 防抖延迟（毫秒）
   * @default 3000 (3秒)
   */
  saveDelay?: number;

  /**
   * 最小保存间隔（毫秒）
   * 避免过于频繁保存
   * @default 30000 (30秒)
   */
  minSaveInterval?: number;

  /**
   * 是否启用云端保存
   * @default false
   */
  enableCloudSave?: boolean;
}

/**
 * AutoSaveService - 自动保存服务
 *
 * 职责：
 * 1. 监听 ObjectManager 的变更事件
 * 2. 防抖延迟后自动保存到 localStorage
 * 3. 可选：异步上传到云端（非阻塞）
 * 4. 提供保存状态和事件通知
 *
 * 保存策略：
 * - 防抖延迟：用户操作后 3 秒触发保存
 * - 最小间隔：连续操作时，最少间隔 30 秒保存一次
 * - 三层保存：内存（实时）→ localStorage（防抖）→ 云端（异步）
 *
 * 使用场景：
 * - 在 CoreServiceProvider 中初始化
 * - UI 组件订阅事件显示保存状态
 * - 用户点击"保存"按钮触发立即保存
 *
 * @example
 * ```typescript
 * // 初始化
 * const autoSave = new AutoSaveService(objectManager, projectStore);
 *
 * // 订阅事件
 * autoSave.on('autosave:saved', ({ timestamp }) => {
 *   console.log('已保存:', timestamp);
 * });
 *
 * // 手动触发保存
 * await autoSave.saveNow();
 *
 * // 获取状态
 * const { status, isDirty, lastSaveTime } = autoSave.getStatus();
 * ```
 */
export class AutoSaveService {
  private objectManager: ObjectManager;
  private getProjectId: () => string | undefined;

  private isDirty = false;
  private saveTimer: number | null = null;
  private lastSaveTime: Date | null = null;

  // 配置
  private readonly saveDelay: number;
  private readonly minSaveInterval: number;
  private readonly enableCloudSave: boolean;

  // 状态
  private status: AutoSaveStatus = 'idle';
  private eventEmitter: Emitter<AutoSaveEvents>;

  /**
   * 创建自动保存服务
   *
   * @param objectManager ObjectManager 实例
   * @param getProjectId 获取当前项目 ID 的函数
   * @param config 配置选项
   */
  constructor(
    objectManager: ObjectManager,
    getProjectId: () => string | undefined,
    config: AutoSaveConfig = {}
  ) {
    this.objectManager = objectManager;
    this.getProjectId = getProjectId;
    this.eventEmitter = mitt<AutoSaveEvents>();

    // 应用配置
    this.saveDelay = config.saveDelay ?? 3000;
    this.minSaveInterval = config.minSaveInterval ?? 30000;
    this.enableCloudSave = config.enableCloudSave ?? false;

    this.setupListeners();

    console.log('[AutoSaveService] 自动保存服务已初始化', {
      saveDelay: this.saveDelay,
      minSaveInterval: this.minSaveInterval,
      enableCloudSave: this.enableCloudSave,
    });
  }

  /**
   * 监听 ObjectManager 的所有变更事件
   */
  private setupListeners() {
    // 对象增删改都会触发自动保存
    this.objectManager.on('object:added', this.markDirty);
    this.objectManager.on('object:removed', this.markDirty);
    this.objectManager.on('object:updated', this.markDirty);
    this.objectManager.on('object:transform-changed', this.markDirty);

    console.log('[AutoSaveService] 已监听 ObjectManager 变更事件');
  }

  /**
   * 标记为"脏数据"，触发防抖保存
   */
  private markDirty = () => {
    this.isDirty = true;
    this.status = 'pending';
    this.eventEmitter.emit('autosave:pending', undefined);

    // 清除旧的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 设置新的定时器（防抖）
    this.saveTimer = setTimeout(() => {
      this.performSave();
    }, this.saveDelay);

    console.log(
      `[AutoSaveService] 数据已标记为脏，将在 ${this.saveDelay / 1000} 秒后保存`
    );
  };

  /**
   * 执行保存操作
   */
  private async performSave() {
    // 检查最小保存间隔（避免过于频繁）
    if (this.lastSaveTime) {
      const elapsed = Date.now() - this.lastSaveTime.getTime();
      if (elapsed < this.minSaveInterval) {
        const remaining = this.minSaveInterval - elapsed;
        console.log(
          `[AutoSaveService] 距离上次保存不足 ${this.minSaveInterval / 1000} 秒，` +
            `将在 ${Math.ceil(remaining / 1000)} 秒后重试`
        );

        // 重新设置定时器
        this.saveTimer = setTimeout(() => {
          this.performSave();
        }, remaining);
        return;
      }
    }

    if (!this.isDirty) {
      console.log('[AutoSaveService] 无变更，跳过保存');
      return;
    }

    const projectId = this.getProjectId();
    if (!projectId) {
      console.warn('[AutoSaveService] 项目 ID 不存在，无法保存');
      this.status = 'error';
      this.eventEmitter.emit('autosave:error', {
        error: new Error('项目 ID 不存在'),
      });
      return;
    }

    try {
      this.status = 'saving';
      this.eventEmitter.emit('autosave:saving', undefined);

      console.log('[AutoSaveService] 开始保存项目:', projectId);

      // 1. 序列化场景数据
      const sceneData = this.objectManager.exportScene({
        name: projectId,
        description: 'Auto-saved project',
      });

      // 2. 保存到 localStorage（同步，即时）
      saveProjectToLocalStorage(projectId, sceneData);
      console.log('[AutoSaveService] 本地保存成功');

      // 3. 异步上传到云端（非阻塞，可选）
      if (this.enableCloudSave) {
        this.saveToCloudAsync(projectId, sceneData);
      }

      // 4. 更新状态
      this.isDirty = false;
      this.lastSaveTime = new Date();
      this.status = 'saved';

      this.eventEmitter.emit('autosave:saved', {
        timestamp: this.lastSaveTime,
      });

      console.log(
        '[AutoSaveService] 保存成功:',
        this.lastSaveTime.toLocaleTimeString()
      );
    } catch (error) {
      this.status = 'error';
      this.eventEmitter.emit('autosave:error', { error: error as Error });
      console.error('[AutoSaveService] 保存失败:', error);
    }
  }

  /**
   * 异步保存到云端（非阻塞）
   */
  private async saveToCloudAsync(
    projectId: string,
    data: ProjectFileFormat
  ): Promise<void> {
    try {
      await saveProjectToNetwork(projectId, data);
      console.log('[AutoSaveService] 云端保存成功');
    } catch (error) {
      // 云端保存失败不影响本地保存
      console.warn('[AutoSaveService] 云端保存失败（不影响本地）:', error);
    }
  }

  /**
   * 手动触发保存（用户点击"保存"按钮）
   *
   * 立即执行保存，不受防抖和最小间隔限制
   */
  public async saveNow(): Promise<void> {
    console.log('[AutoSaveService] 手动触发保存');

    // 清除防抖定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // 临时移除最小间隔限制
    const originalLastSaveTime = this.lastSaveTime;
    this.lastSaveTime = null;

    try {
      await this.performSave();
    } finally {
      // 如果保存失败，恢复原来的时间戳
      if (this.status === 'error' && originalLastSaveTime) {
        this.lastSaveTime = originalLastSaveTime;
      }
    }
  }

  /**
   * 获取保存状态
   */
  public getStatus() {
    return {
      status: this.status,
      isDirty: this.isDirty,
      lastSaveTime: this.lastSaveTime,
    };
  }

  /**
   * 订阅保存事件
   *
   * @param event 事件名称
   * @param handler 事件处理函数
   *
   * @example
   * ```typescript
   * autoSave.on('autosave:saved', ({ timestamp }) => {
   *   console.log('已保存:', timestamp);
   * });
   * ```
   */
  public on<K extends keyof AutoSaveEvents>(
    event: K,
    handler: (data: AutoSaveEvents[K]) => void
  ): void {
    this.eventEmitter.on(event, handler as any);
  }

  /**
   * 取消订阅保存事件
   */
  public off<K extends keyof AutoSaveEvents>(
    event: K,
    handler: (data: AutoSaveEvents[K]) => void
  ): void {
    this.eventEmitter.off(event, handler as any);
  }

  /**
   * 强制立即保存（手动保存）
   * 忽略防抖和最小间隔限制
   */
  public forceSave(): void {
    console.log('[AutoSaveService] 手动触发保存');
    this.isDirty = true;
    this.lastSaveTime = null; // 重置最后保存时间，绕过最小间隔检查
    this.performSave();
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 清除定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    // 移除监听器
    this.objectManager.off('object:added', this.markDirty);
    this.objectManager.off('object:removed', this.markDirty);
    this.objectManager.off('object:updated', this.markDirty);
    this.objectManager.off('object:transform-changed', this.markDirty);

    // 清空事件
    this.eventEmitter.all.clear();

    console.log('[AutoSaveService] 已清理');
  }
}
