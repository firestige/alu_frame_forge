import type { ObjectManager } from '@/core/object';
import type { ObjectManagerEvents } from '@/core/object/ObjectManager';
import type { IRenderer } from '@/core/renderer/renderer-types';
import { eventBus } from '@/core/services/EventBus';

/**
 * 渲染同步服务
 * 负责监听 ObjectManager 事件并同步到渲染器
 * 实现 ObjectManager 与 Renderer 的解耦
 */
export class RenderSyncService {
  private objectManager: ObjectManager;
  private renderer: IRenderer;

  // 对象ID到渲染对象的映射
  private objectRenderMap: Map<string, unknown> = new Map();

  constructor(objectManager: ObjectManager, renderer: IRenderer) {
    this.objectManager = objectManager;
    this.renderer = renderer;

    // 订阅 ObjectManager 事件
    this.setupEventListeners();

    // 同步已存在的对象
    this.syncExistingObjects();
  }

  /**
   * 同步已存在的对象到渲染器
   * 用于初始化时将 ObjectManager 中的所有对象添加到新的渲染场景
   */
  private syncExistingObjects(): void {
    const allObjects = this.objectManager.getAllObjects();

    allObjects.forEach(object => {
      if (!object.visual?.mesh) {
        return;
      }

      // 添加到渲染器
      this.renderer.addObject(object.visual.mesh, {
        interactive: true,
        modelId: object.id,
        name: object.name,
      });

      // 设置变换
      this.renderer.updateObjectTransform(object.visual.mesh, {
        position: object.transform.position,
        rotation: object.transform.rotation,
        scale: object.transform.scale,
      });

      // 设置可见性
      this.renderer.setObjectVisibility(
        object.visual.mesh,
        object.visual.isVisible
      );

      // 记录映射
      this.objectRenderMap.set(object.id, object.visual.mesh);
    });

    console.log(
      `[RenderSyncService] 已同步 ${allObjects.length} 个现有对象到渲染器`
    );
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    eventBus.on('object:added', this.handleObjectAdded.bind(this));
    eventBus.on('object:updated', this.handleObjectUpdated.bind(this));
    eventBus.on('object:removed', this.handleObjectRemoved.bind(this));
    eventBus.on('objects:cleared', this.handleObjectsCleared.bind(this));
  }

  /**
   * 处理对象添加事件
   */
  private handleObjectAdded(
    payload: ObjectManagerEvents['object:added']
  ): void {
    const { object } = payload;

    if (!object.visual?.mesh) {
      return;
    }

    // 添加到渲染器
    this.renderer.addObject(object.visual.mesh, {
      interactive: true,
      modelId: object.id,
      name: object.name,
    });

    // 设置变换
    this.renderer.updateObjectTransform(object.visual.mesh, {
      position: object.transform.position,
      rotation: object.transform.rotation,
      scale: object.transform.scale,
    });

    // 设置可见性
    this.renderer.setObjectVisibility(
      object.visual.mesh,
      object.visual.isVisible
    );

    // 记录映射
    this.objectRenderMap.set(object.id, object.visual.mesh);
  }

  /**
   * 处理对象更新事件
   */
  private handleObjectUpdated(
    payload: ObjectManagerEvents['object:updated']
  ): void {
    const { objectId, object, updates } = payload;

    const renderObject = this.objectRenderMap.get(objectId);
    if (!renderObject) {
      return;
    }

    // 更新变换
    if (updates.transform) {
      this.renderer.updateObjectTransform(renderObject, {
        position: updates.transform.position,
        rotation: updates.transform.rotation,
        scale: updates.transform.scale,
      });
    }

    // 更新可见性
    if (updates.visual?.isVisible !== undefined) {
      this.renderer.setObjectVisibility(renderObject, updates.visual.isVisible);
    }

    // 如果 visual.mesh 发生变化（参数化调整导致的重新生成）
    if (
      updates.visual?.mesh &&
      updates.visual.mesh !== renderObject &&
      object.visual?.mesh
    ) {
      // 移除旧对象
      this.renderer.removeObject(renderObject);
      this.renderer.disposeObject(renderObject);

      // 添加新对象
      this.renderer.addObject(object.visual.mesh, {
        interactive: true,
        modelId: object.id,
        name: object.name,
      });

      // 恢复变换
      this.renderer.updateObjectTransform(object.visual.mesh, {
        position: object.transform.position,
        rotation: object.transform.rotation,
        scale: object.transform.scale,
      });

      this.renderer.setObjectVisibility(
        object.visual.mesh,
        object.visual.isVisible
      );

      // 更新映射
      this.objectRenderMap.set(object.id, object.visual.mesh);
    }
  }

  /**
   * 处理对象删除事件
   */
  private handleObjectRemoved(
    payload: ObjectManagerEvents['object:removed']
  ): void {
    const { objectId } = payload;

    const renderObject = this.objectRenderMap.get(objectId);
    if (!renderObject) {
      return;
    }

    // 从渲染器移除
    this.renderer.removeObject(renderObject);
    this.renderer.disposeObject(renderObject);

    // 清除映射
    this.objectRenderMap.delete(objectId);
  }

  /**
   * 处理清空所有对象事件
   */
  private handleObjectsCleared(): void {
    // 清理所有渲染对象
    for (const renderObject of this.objectRenderMap.values()) {
      this.renderer.removeObject(renderObject);
      this.renderer.disposeObject(renderObject);
    }

    // 清空映射
    this.objectRenderMap.clear();
  }

  /**
   * 获取对象的渲染对象
   * @param objectId 对象ID
   * @returns 渲染对象，如果不存在则返回 undefined
   */
  public getRenderObject(objectId: string): unknown | undefined {
    return this.objectRenderMap.get(objectId);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    // 取消事件监听
    eventBus.off('object:added', this.handleObjectAdded.bind(this));
    eventBus.off('object:updated', this.handleObjectUpdated.bind(this));
    eventBus.off('object:removed', this.handleObjectRemoved.bind(this));
    eventBus.off('objects:cleared', this.handleObjectsCleared.bind(this));

    // 清空映射
    this.objectRenderMap.clear();
  }
}
