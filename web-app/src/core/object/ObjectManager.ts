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
import type { SceneObject, Transform, SceneObjectCreateOptions } from './types';
import type { AnyAsset } from '../asset/types/asset';
import type { AssetType } from '../asset/types/enums';
import mitt, { type Emitter } from 'mitt';
import { AssetService } from '../asset';
import { ModelFactory } from './ModelFactory';
import { ProjectSerializer } from './SceneIO';
import type { ProjectFileFormat } from './SceneIO';
import { ProfileInstanceStrategy } from './strategies/ProfileInstanceStrategy';
import { ConnectorInstanceStrategy } from './strategies/ConnectorInstanceStrategy';
import { FastenerInstanceStrategy } from './strategies/FastenerInstanceStrategy';
import { AssetType as AssetTypeEnum } from '../asset/types/enums';
import { eventBus } from '../services/eventBus';

/**
 * 对象管理器事件类型
 */
export type ObjectManagerEvents = {
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
};

/**
 * 对象管理器
 */
export class ObjectManager {
  // 对象存储
  private objects = new Map<string, SceneObject>();

  // 事件总线
  private eventBus: Emitter<ObjectManagerEvents>;

  // 核心服务
  private assetService: AssetService;
  private modelFactory: ModelFactory;
  private serializer: ProjectSerializer;

  // 渲染器引用
  private renderer?: IRenderer;

  constructor(renderer?: IRenderer, assetService?: AssetService) {
    this.renderer = renderer;
    this.eventBus = mitt<ObjectManagerEvents>();

    // 使用传入的 AssetService 或创建新实例
    this.assetService = assetService || new AssetService();
    if (!assetService) {
      this.assetService.initialize();
    }

    this.modelFactory = new ModelFactory(this.assetService.getRegistry());

    // 注册策略（如果 renderer 可用）
    // 如果 renderer 不可用，可以后期通过 setRenderer() 设置
    this.registerStubStrategies();

    this.serializer = new ProjectSerializer();
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
   * 设置渲染器并重新注册策略
   * 在 renderer 就绪后调用，用于注册需要 renderer 的策略
   */
  public setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
    console.log('[ObjectManager] Renderer set, re-registering strategies');
    this.registerStubStrategies();
  }

  // ==================== 对象基础操作 ====================

  /**
   * 添加对象到场景
   */
  public addObject(object: SceneObject): void {
    this.objects.set(object.id, object);

    // 发布事件（实例 EventEmitter）
    this.emit('object:added', { object });
    
    // 同时发射到全局 eventBus（架构统一）
    eventBus.emit('object:added', { object });

    // 同步到渲染器
    if (this.renderer && object.visual && object.visual.mesh) {
      this.renderer.addObject(object.visual.mesh, {
        interactive: true,
        modelId: object.id,
        name: object.name,
      });
    }

    console.log(`[ObjectManager] ✅ Object added: ${object.name} (${object.id})`);
    console.log('[ObjectManager] 📢 Emitting object:added to global eventBus');
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

    // 发布事件（实例 EventEmitter）
    this.emit('object:removed', { objectId });
    
    // 同时发射到全局 eventBus（架构统一）
    eventBus.emit('object:removed', { objectId });

    console.log(`[ObjectManager] ✅ Object removed: ${object.name} (${objectId})`);
    console.log('[ObjectManager] 📢 Emitting object:removed to global eventBus');
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
      const asset = this.assetService.getAssetById(obj.assetId);
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

    // 如果 userParams 改变，需要重新生成几何体
    if (updates.userParams) {
      console.log(
        `[ObjectManager] UserParams updated for ${objectId}, regenerating geometry`,
        {
          oldParams: object.userParams,
          newParams: updates.userParams,
          mergedParams: updatedObject.userParams,
        }
      );

      // 保存旧 mesh 的引用
      const oldMesh = object.visual?.mesh;

      // 重新生成几何体（会创建新 mesh 并赋值给 updatedObject.visual.mesh）
      this.modelFactory.updateGeometry(updatedObject);

      console.log('[ObjectManager] 🔄 准备更新渲染器中的网格');

      // 从渲染器移除旧网格（使用保存的引用）
      if (this.renderer && oldMesh) {
        console.log('[ObjectManager] 📤 移除旧网格:', {
          meshId: oldMesh,
          meshType: oldMesh?.constructor?.name,
        });
        this.renderer.removeObject(oldMesh);
        this.renderer.disposeObject(oldMesh);
      }

      // 添加新网格
      if (this.renderer && updatedObject.visual?.mesh) {
        console.log('[ObjectManager] 📥 添加新网格:', {
          meshId: updatedObject.visual.mesh,
          meshType: updatedObject.visual.mesh?.constructor?.name,
        });
        this.renderer.addObject(updatedObject.visual.mesh, {
          interactive: true,
          modelId: updatedObject.id,
          name: updatedObject.name,
        });
      }

      // 重新保存更新后的对象（包含新的 mesh）
      this.objects.set(objectId, updatedObject);

      console.log('[ObjectManager] ✅ 几何体更新完成');
    } else {
      // 没有 userParams 变化，直接保存
      this.objects.set(objectId, updatedObject);
    }

    // 发布事件（实例 EventEmitter）
    this.emit('object:updated', { objectId, object: updatedObject, updates });
    
    // 同时发射到全局 eventBus（架构统一）
    eventBus.emit('object:updated', { objectId, object: updatedObject, updates });

    // 同步到渲染器
    if (this.renderer && object.visual) {
      if (updates.transform) {
        this.renderer.updateObjectTransform(object.visual.mesh, {
          position: updates.transform.position,
          rotation: updates.transform.rotation,
          scale: updates.transform.scale,
        });
        // 发布事件（实例 EventEmitter）
        this.emit('object:transform-changed', {
          objectId,
          transform: updates.transform,
        });
        
        // 同时发射到全局 eventBus（架构统一）
        eventBus.emit('object:transform-changed', {
          objectId,
          transform: updates.transform,
        });
      }

      if (updates.visual && updates.visual.isVisible !== undefined) {
        this.renderer.setObjectVisibility(
          object.visual.mesh,
          updates.visual.isVisible
        );
        // 发布事件（实例 EventEmitter）
        this.emit('object:visibility-changed', {
          objectId,
          visible: updates.visual.isVisible,
        });
        
        // 同时发射到全局 eventBus（架构统一）
        eventBus.emit('object:visibility-changed', {
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
   * 获取资产服务
   */
  public getAssetService(): AssetService {
    return this.assetService;
  }

  /**
   * 注册资产（委托给 AssetService）
   */
  public registerAsset(asset: AnyAsset): void {
    this.assetService.getRegistry().register(asset);
  }

  /**
   * 获取所有资产
   */
  public getAllAssets(): AnyAsset[] {
    return this.assetService.getRegistry().getAll();
  }

  /**
   * 根据类型获取资产
   */
  public getAssetsByType(type: AssetType): AnyAsset[] {
    return this.assetService.getRegistry().getByType(type);
  }

  /**
   * 根据 ID 获取资产
   */
  public getAsset(assetId: string): AnyAsset | undefined {
    return this.assetService.getAssetById(assetId);
  }

  // ==================== 对象创建 ====================

  /**
   * 从资产创建对象
   */
  public createObjectFromAsset(
    assetId: string,
    options?: Partial<SceneObjectCreateOptions>
  ): SceneObject {
    const object = this.modelFactory.createFromAsset(assetId, {
      name: options?.name,
      transform: options?.transform,
      userParams: options?.userParams || {},
    });

    this.addObject(object);
    return object;
  }

  /**
   * 创建预览对象（不添加到场景）
   * 用于在放置前预览对象
   */
  public createPreviewObject(
    assetId: string,
    options?: Partial<SceneObjectCreateOptions>
  ): SceneObject {
    console.log('[ObjectManager] Creating preview object for asset:', assetId);

    const object = this.modelFactory.createFromAsset(assetId, {
      name: options?.name || `preview_${assetId}`,
      transform: options?.transform,
      userParams: options?.userParams || {},
    });

    console.log('[ObjectManager] Preview object created:', object);
    return object;
  }

  // ==================== 场景 I/O ====================

  /**
   * 导出场景数据为工程文件格式
   */
  public exportScene(metadata: {
    name: string;
    description?: string;
    author?: string;
  }): ProjectFileFormat {
    const objects = Array.from(this.objects.values());
    return this.serializer.serialize(objects, metadata);
  }

  /**
   * 从工程文件导入场景
   */
  public importScene(data: ProjectFileFormat): void {
    this.clear();

    const objectDataList = this.serializer.deserialize(data);

    objectDataList.forEach(({ assetId, options }) => {
      const recreated = this.modelFactory.createFromAsset(assetId, {
        name: options.name,
        transform: {
          position: options.transform.position,
          rotation: {
            ...options.transform.rotation,
            order: options.transform.rotation.order as
              | 'XYZ'
              | 'YXZ'
              | 'ZXY'
              | 'ZYX'
              | 'YZX'
              | 'XZY',
          },
          scale: options.transform.scale,
        },
        userParams: options.userParams,
      });

      this.addObject(recreated);
    });

    console.log('Scene imported from project file', data.metadata.name);
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

    // 发布事件（实例 EventEmitter）
    this.emit('objects:cleared', undefined);
    
    // 同时发射到全局 eventBus（架构统一）
    eventBus.emit('objects:cleared', undefined);

    console.log('All objects cleared');
  }

  /**
   * 获取对象数量
   */
  public getObjectCount(): number {
    return this.objects.size;
  }

  /**
   * 注册实例化策略
   * 使用真实的 ProfileInstanceStrategy 进行型材生成
   */
  private registerStubStrategies(): void {
    console.log('[ObjectManager] Registering instance strategies...');

    // 注册 Profile 策略（真实的截面拉伸）
    if (this.renderer) {
      this.modelFactory.registerStrategy(
        AssetTypeEnum.PROFILE,
        new ProfileInstanceStrategy(this.renderer)
      );
      console.log(
        '[ObjectManager] ProfileInstanceStrategy registered with renderer'
      );
    } else {
      console.warn(
        '[ObjectManager] Renderer not available, ProfileInstanceStrategy not registered'
      );
    }

    // 注册 Connector 策略（V2 - 双模型体系）
    this.modelFactory.registerStrategy(
      AssetTypeEnum.CONNECTOR,
      new ConnectorInstanceStrategy()
    );
    console.log('[ObjectManager] ConnectorInstanceStrategy registered');

    // 注册 Fastener 策略（V2 - 双模型体系）
    this.modelFactory.registerStrategy(
      AssetTypeEnum.FASTENER,
      new FastenerInstanceStrategy()
    );
    console.log('[ObjectManager] FastenerInstanceStrategy registered');

    console.log('[ObjectManager] Instance strategies registered');
  }
}
