import type { ObjectManager, SceneObject } from '@/core/object';
import { designerEventBus } from '@/core/services/eventBus';
import { onCommand, publishState } from '@/core/services/eventBus';

/**
 * 模型编辑服务（重构后 - 纯业务逻辑）
 *
 * 职责：
 * - 处理对象的业务操作（编辑、删除、复制等）
 * - 通过事件通知 UI 层状态变化
 *
 * 不做：
 * - 不管理选中状态（UI 层职责）
 * - 不依赖 renderer
 */
export class ModelEditorService {
  private objectManager: ObjectManager;

  constructor(objectManager: ObjectManager) {
    this.objectManager = objectManager;
    this.setupCommandListeners();
  }

  /**
   * 注册命令监听器
   */
  private setupCommandListeners(): void {
    onCommand('command:model:editParameters', this.handleEditParametersCommand);
  }

  /**
   * 处理编辑参数命令（通过事件总线）
   */
  private handleEditParametersCommand = (objectId: string): void => {
    // 发布状态，通知 UI 层打开参数编辑对话框
    publishState('state:model:editParametersRequested', { objectId });
  };

  /**
   * 编辑对象参数（保留用于向后兼容）
   * @deprecated 建议使用 command:model:editParameters 命令代替
   */
  public editModel(objectId: string): void {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return;

    console.log('编辑对象:', obj);

    // 简单的 prompt 编辑（后续可替换为对话框）
    const currentValue = obj.userParams.length?.toString() || '1000';
    const newLength = prompt(
      `输入新的长度（针对型材和长方体）:\n当前值: ${currentValue}mm`,
      currentValue
    );

    if (newLength !== null && newLength !== '') {
      const length = parseFloat(newLength);
      if (!isNaN(length) && length > 0) {
        this.objectManager.updateUserParams(obj.id, { length });
        console.log('长度已更新为:', length);
      } else {
        alert('请输入有效的数值');
      }
    }
  }

  /**
   * 切换对象可见性
   */
  public toggleVisibility(objectId: string): void {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return;

    const newVisibility = !(obj.visual?.isVisible ?? true);
    this.objectManager.setObjectVisibility(obj.id, newVisibility);

    console.log(
      `对象 ${obj.name} 可见性已切换为: ${newVisibility ? '显示' : '隐藏'}`
    );
  }

  /**
   * 显示对象属性
   */
  public showProperties(objectId: string): void {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return;

    const info = {
      ID: obj.id,
      名称: obj.name,
      资产ID: obj.assetId,
      类型: obj.assetType,
      位置: `(${obj.transform.position.x.toFixed(2)}, ${obj.transform.position.y.toFixed(2)}, ${obj.transform.position.z.toFixed(2)})`,
      旋转: `(${obj.transform.rotation.x.toFixed(2)}, ${obj.transform.rotation.y.toFixed(2)}, ${obj.transform.rotation.z.toFixed(2)})`,
      缩放: `(${obj.transform.scale.x.toFixed(2)}, ${obj.transform.scale.y.toFixed(2)}, ${obj.transform.scale.z.toFixed(2)})`,
      可见: obj.visual?.isVisible ? '是' : '否',
      参数: obj.userParams,
    };

    console.log('对象属性:', info);

    // 格式化显示
    const formattedInfo = Object.entries(info)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value, null, 2)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    alert(`对象属性\n${'='.repeat(40)}\n${formattedInfo}`);
  }

  /**
   * 删除对象
   */
  public deleteModel(objectId: string): boolean {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return false;

    const confirmed = window.confirm(
      `确定要删除 "${obj.name}" 吗？\n\n此操作无法撤销。`
    );

    if (confirmed) {
      this.objectManager.removeObject(obj.id);

      // 通知 UI 层清除选中状态（如果删除的是当前选中对象）
      designerEventBus.emit('ui:selection:clear', { deletedObjectId: obj.id });

      console.log(`对象 ${obj.name} 已删除`);
      return true;
    }

    return false;
  }

  /**
   * 复制对象
   */
  public duplicateModel(objectId: string): SceneObject | null {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return null;

    // 创建副本，位置稍微偏移
    const duplicate = this.objectManager.createObjectFromAsset(obj.assetId, {
      name: `${obj.name}_副本`,
      transform: {
        position: {
          x: obj.transform.position.x + 0.5,
          y: obj.transform.position.y + 0.5,
          z: obj.transform.position.z + 0.5,
        },
        rotation: { ...obj.transform.rotation },
        scale: { ...obj.transform.scale },
      },
      userParams: { ...obj.userParams },
    });

    console.log(`已复制对象 ${obj.name}:`, duplicate);
    return duplicate;
  }

  /**
   * 重置对象变换
   */
  public resetTransform(objectId: string): void {
    const obj = this.objectManager.getObject(objectId);
    if (!obj) return;

    this.objectManager.updateTransform(obj.id, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
      scale: { x: 1, y: 1, z: 1 },
    });

    console.log(`对象 ${obj.name} 变换已重置`);
  }

  /**
   * 批量操作：隐藏所有对象
   */
  public hideAllModels(): void {
    const objects = this.objectManager.getAllObjects();
    objects.forEach(obj => {
      this.objectManager.setObjectVisibility(obj.id, false);
    });
    console.log(`已隐藏 ${objects.length} 个对象`);
  }

  /**
   * 批量操作：显示所有对象
   */
  public showAllModels(): void {
    const objects = this.objectManager.getAllObjects();
    objects.forEach(obj => {
      this.objectManager.setObjectVisibility(obj.id, true);
    });
    console.log(`已显示 ${objects.length} 个对象`);
  }

  /**
   * 批量操作：删除所有对象
   */
  public deleteAllModels(): void {
    const objects = this.objectManager.getAllObjects();
    const confirmed = window.confirm(
      `确定要删除所有 ${objects.length} 个对象吗？\n\n此操作无法撤销。`
    );

    if (confirmed) {
      this.objectManager.clear();

      // 通知 UI 层清除选中状态
      designerEventBus.emit('ui:selection:clear', { reason: 'all-deleted' });

      console.log('所有对象已删除');
    }
  }

  /**
   * 获取对象统计信息
   */
  public getStatistics(): {
    total: number;
    visible: number;
    hidden: number;
    byType: Record<string, number>;
  } {
    const objects = this.objectManager.getAllObjects();

    const stats = {
      total: objects.length,
      visible: objects.filter(obj => obj.visual?.isVisible ?? true).length,
      hidden: objects.filter(obj => !(obj.visual?.isVisible ?? true)).length,
      byType: {} as Record<string, number>,
    };

    objects.forEach(obj => {
      stats.byType[obj.assetType] = (stats.byType[obj.assetType] || 0) + 1;
    });

    return stats;
  }
}
