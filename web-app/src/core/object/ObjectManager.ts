/**
 * 对象管理器（基于新架构）
 * 使用 SceneObject + Asset 的双模型架构
 *
 * 核心职责：
 * - 管理场景对象（SceneObject）的生命周期
 * - 提供对象的增删改查接口
 * - 发布对象变更事件供 UI 层订阅
 * - 协调 AssetRegistry、ModelFactory 等核心服务
 */

import type { IRenderer, Vector3, Euler } from '../renderer/renderer-types';
import type { SceneObject, Asset, Transform, InstanceOptions } from './types';
import type { AssetType } from './types/enums';
import mitt, { type Emitter } from 'mitt';
import { AssetRegistry } from './AssetRegistry.new';
import { ModelFactory } from './ModelFactory.new';

/**
 * 对象管理器事件
 */
export interface ObjectManagerEvents {
  'object:added': { object: SceneObject };
  'object:removed': { objectId: string };
  'object:updated': {
    objectId: string;
    object: SceneObject;
    updates: Partial<SceneObject>;
  };
  'object:transform-changed': { objectId: string; transform: Transform };
  'object:visibility-changed': { objectId: string; visible: boolean };
  'objects:cleared': undefined;
}

/**
 * 场景导出数据格式
 */
export interface SceneExportData {
  objects: Array<{
    id: string;
    name: string;
    assetId: string;
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    };
    userParams: Record<string, unknown>;
    isVisible: boolean;
  }>;
  exportedAt: string;
}

/**
 * 对象管理器
 */
export class ObjectManager {
  // 对象存储
  private objects = new Map<string, SceneObject>();
  private objectIdCounter = 0;

  // 事件总线
  private eventBus: Emitter<ObjectManagerEvents>;

  // 核心服务
  private assetRegistry: AssetRegistry;
  private modelFactory: ModelFactory;

  // 渲染器引用
  private renderer?: IRenderer;

  constructor(renderer?: IRenderer) {
    this.renderer = renderer;
    this.eventBus = mitt<ObjectManagerEvents>();
    this.assetRegistry = new AssetRegistry();
    this.modelFactory = new ModelFactory(this.assetRegistry);
  }

  // ==================== 事件管理 ====================

  /**
   * 订阅事件
   */
  public on<K extends keyof ObjectManagerEvents>(
    event: K,
    handler: (data: ObjectManagerEvents[K]) => void
  ): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 取消订阅
   */
  public off<K extends keyof ObjectManagerEvents>(
    event: K,
    handler: (data: ObjectManagerEvents[K]) => void
  ): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 发布事件
   */
  private emit<K extends keyof ObjectManagerEvents>(
    event: K,
    data: ObjectManagerEvents[K]
  ): void {
    this.eventBus.emit(event, data);
  }

  // ==================== 渲染器管理 ====================

  /**
   * 设置渲染器
   */
  public setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  // ==================== ID 生成 ====================

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `obj_${Date.now()}_${this.objectIdCounter++}`;
  }

  // ==================== 对象基础操作 ====================

  /**
   * 添加对象到场景
   */
  public addObject(object: SceneObject): void {
    this.objects.set(object.id, object);

    // 发布事件
    this.emit('object:added', { object });

    // 同步到渲染器
    if (this.renderer && object.visual && object.visual.mesh) {
      this.renderer.addObject(object.visual.mesh, {
        interactive: true,
        modelId: object.id,
        name: object.name,
      });
    }

    console.log(`Object ${object.name} (${object.id}) added`);
  }

  /**
   * 移除对象
   */
  public removeObject(objectId: string): boolean {
    const object = this.objects.get(objectId);
    if (!object) {
      console.warn(`Object ${objectId} not found`);
      return false;
    }

    // 从渲染器移除
    if (this.renderer && object.visual && object.visual.mesh) {
      this.renderer.removeObject(object.visual.mesh);
      this.renderer.disposeObject(object.visual.mesh);
    }

    // 从存储移除
    this.objects.delete(objectId);

    // 发布事件
    this.emit('object:removed', { objectId });

    console.log(`Object ${object.name} (${objectId}) removed`);
    return true;
  }

  /**
   * 根据 ID 获取对象
   */
  public getObject(objectId: string): SceneObject | undefined {
    return this.objects.get(objectId);
  }

  /**
   * 根据名称获取对象
   */
  public getObjectByName(name: string): SceneObject | undefined {
    return Array.from(this.objects.values()).find(obj => obj.name === name);
  }

  /**
   * 获取所有对象
   */
  public getAllObjects(): SceneObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * 根据资产类型获取对象列表
   */
  public getObjectsByAssetType(assetType: AssetType): SceneObject[] {
    return Array.from(this.objects.values()).filter(obj => {
      const asset = this.assetRegistry.get(obj.assetId);
      return asset?.type === assetType;
    });
  }

  /**
   * 更新对象
   */
  public updateObject(objectId: string, updates: Partial<SceneObject>): void {
    const object = this.objects.get(objectId);
    if (!object) {
      console.warn(`Object ${objectId} not found`);
      return;
    }

    // 更新对象
    const updatedObject = { ...object, ...updates };
    this.objects.set(objectId, updatedObject);

    // 发布事件
    this.emit('object:updated', { objectId, object: updatedObject, updates });

    // 同步到渲染器
    if (this.renderer && object.visual) {
      if (updates.transform) {
        this.renderer.updateObjectTransform(object.visual.mesh, {
          position: updates.transform.position,
          rotation: updates.transform.rotation,
          scale: updates.transform.scale,
        });
        this.emit('object:transform-changed', {
          objectId,
          transform: updates.transform,
        });
      }

      if (updates.visual && updates.visual.isVisible !== undefined) {
        this.renderer.setObjectVisibility(
          object.visual.mesh,
          updates.visual.isVisible
        );
        this.emit('object:visibility-changed', {
          objectId,
          visible: updates.visual.isVisible,
        });
      }
    }
  }

  /**
   * 设置对象可见性（便捷方法）
   */
  public setObjectVisibility(objectId: string, visible: boolean): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    this.updateObject(objectId, {
      visual: { ...object.visual, isVisible: visible },
    });
  }

  /**
   * 更新对象的 Transform
   */
  public updateTransform(
    objectId: string,
    transform: Partial<Transform>
  ): void {
    const object = this.objects.get(objectId);
    if (!object) {
      console.warn(`Object ${objectId} not found`);
      return;
    }

    const updatedTransform: Transform = {
      ...object.transform,
      ...transform,
    };

    this.updateObject(objectId, { transform: updatedTransform });
  }

  /**
   * 更新对象的位置
   */
  public updatePosition(objectId: string, position: Partial<Vector3>): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    this.updateTransform(objectId, {
      position: { ...object.transform.position, ...position },
    });
  }

  /**
   * 更新对象的旋转
   */
  public updateRotation(objectId: string, rotation: Partial<Euler>): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    this.updateTransform(objectId, {
      rotation: { ...object.transform.rotation, ...rotation },
    });
  }

  /**
   * 更新对象的缩放
   */
  public updateScale(objectId: string, scale: Partial<Vector3>): void {
    const object = this.objects.get(objectId);
    if (!object) return;

    this.updateTransform(objectId, {
      scale: { ...object.transform.scale, ...scale },
    });
  }

  /**
   * 更新对象的用户参数
   */
  public updateUserParams(
    objectId: string,
    params: Record<string, unknown>
  ): void {
    const object = this.objects.get(objectId);
    if (!object) {
      console.warn(`Object ${objectId} not found`);
      return;
    }

    const updatedParams = { ...object.userParams, ...params };
    this.updateObject(objectId, { userParams: updatedParams });
  }

  // ==================== 资产管理 ====================

  /**
   * 获取资产注册表
   */
  public getAssetRegistry(): AssetRegistry {
    return this.assetRegistry;
  }

  /**
   * 注册资产
   */
  public registerAsset(asset: Asset): void {
    this.assetRegistry.register(asset);
  }

  /**
   * 获取所有资产
   */
  public getAllAssets(): Asset[] {
    return this.assetRegistry.getAll();
  }

  /**
   * 根据类型获取资产
   */
  public getAssetsByType(type: AssetType): Asset[] {
    return this.assetRegistry.getByType(type);
  }

  /**
   * 根据 ID 获取资产
   */
  public getAsset(assetId: string): Asset | undefined {
    return this.assetRegistry.get(assetId);
  }

  // ==================== 对象创建 ====================

  /**
   * 从资产创建对象
   */
  public createObjectFromAsset(
    assetId: string,
    options?: Partial<InstanceOptions>
  ): SceneObject {
    const object = this.modelFactory.createFromAsset(assetId, {
      name: options?.name,
      transform: options?.transform,
      userParams: options?.userParams || {},
    });

    this.addObject(object);
    return object;
  }

  // ==================== 场景 I/O ====================

  /**
   * 导出场景数据
   */
  public exportScene(): SceneExportData {
    const objects = Array.from(this.objects.values()).map(obj => ({
      id: obj.id,
      name: obj.name,
      assetId: obj.assetId,
      transform: {
        position: [
          obj.transform.position.x,
          obj.transform.position.y,
          obj.transform.position.z,
        ] as [number, number, number],
        rotation: [
          obj.transform.rotation.x,
          obj.transform.rotation.y,
          obj.transform.rotation.z,
        ] as [number, number, number],
        scale: [
          obj.transform.scale.x,
          obj.transform.scale.y,
          obj.transform.scale.z,
        ] as [number, number, number],
      },
      userParams: obj.userParams,
      isVisible: obj.visual?.isVisible ?? true,
    }));

    return {
      objects,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * 导入场景数据
   */
  public importScene(data: SceneExportData): void {
    this.clear();

    data.objects.forEach(objData => {
      // 通过工厂重新创建对象
      const recreated = this.modelFactory.createFromAsset(objData.assetId, {
        name: objData.name,
        transform: {
          position: {
            x: objData.transform.position[0],
            y: objData.transform.position[1],
            z: objData.transform.position[2],
          },
          rotation: {
            x: objData.transform.rotation[0],
            y: objData.transform.rotation[1],
            z: objData.transform.rotation[2],
            order: 'XYZ',
          },
          scale: {
            x: objData.transform.scale[0],
            y: objData.transform.scale[1],
            z: objData.transform.scale[2],
          },
        },
        userParams: objData.userParams,
      });

      // 恢复原始 ID 和可见性
      recreated.id = objData.id;
      if (recreated.visual) {
        recreated.visual.isVisible = objData.isVisible;
      }

      this.addObject(recreated);
    });

    console.log('Scene imported', data);
  }

  // ==================== 辅助方法 ====================

  /**
   * 清空所有对象
   */
  public clear(): void {
    // 清理渲染对象
    this.objects.forEach(object => {
      if (this.renderer && object.visual && object.visual.mesh) {
        this.renderer.removeObject(object.visual.mesh);
        this.renderer.disposeObject(object.visual.mesh);
      }
    });

    this.objects.clear();

    // 发布事件
    this.emit('objects:cleared', undefined);

    console.log('All objects cleared');
  }

  /**
   * 获取对象数量
   */
  public getObjectCount(): number {
    return this.objects.size;
  }
}
