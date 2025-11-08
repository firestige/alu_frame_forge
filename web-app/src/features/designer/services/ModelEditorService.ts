import {
  ObjectManager,
  type Model,
} from '../../../core/object/ObjectManager.ts';
import { ModelInteractionService } from './ModelInteractionService.ts';

/**
 * 模型编辑服务
 * 负责处理上下文菜单的各种操作
 */
export class ModelEditorService {
  private objectManager: ObjectManager;
  private interactionService: ModelInteractionService;

  constructor(
    objectManager: ObjectManager,
    interactionService: ModelInteractionService
  ) {
    this.objectManager = objectManager;
    this.interactionService = interactionService;
  }

  /**
   * 编辑模型参数
   */
  public editModel(modelId: string): void {
    const model = this.objectManager.getModel(modelId);
    if (!model) return;

    console.log('编辑模型:', model);

    // 简单的 prompt 编辑（后续可替换为对话框）
    const currentValue = model.parameters.length?.toString() || '1000';
    const newLength = prompt(
      `输入新的长度（针对型材和长方体）:\n当前值: ${currentValue}mm`,
      currentValue
    );

    if (newLength !== null && newLength !== '') {
      const length = parseFloat(newLength);
      if (!isNaN(length) && length > 0) {
        this.objectManager.updateModelParameters(model.id, { length });
        console.log('长度已更新为:', length);
      } else {
        alert('请输入有效的数值');
      }
    }
  }

  /**
   * 切换模型可见性
   */
  public toggleVisibility(modelId: string): void {
    const model = this.objectManager.getModel(modelId);
    if (!model) return;

    this.objectManager.updateModel(model.id, {
      isVisible: !model.isVisible,
    });

    console.log(
      `模型 ${model.name} 可见性已切换为: ${model.isVisible ? '显示' : '隐藏'}`
    );
  }

  /**
   * 显示模型属性
   */
  public showProperties(modelId: string): void {
    const model = this.objectManager.getModel(modelId);
    if (!model) return;

    const info = {
      ID: model.id,
      名称: model.name,
      类型: model.type,
      位置: `(${model.position.x.toFixed(2)}, ${model.position.y.toFixed(2)}, ${model.position.z.toFixed(2)})`,
      旋转: `(${model.rotation.x.toFixed(2)}, ${model.rotation.y.toFixed(2)}, ${model.rotation.z.toFixed(2)})`,
      缩放: `(${model.scale.x.toFixed(2)}, ${model.scale.y.toFixed(2)}, ${model.scale.z.toFixed(2)})`,
      可见: model.isVisible ? '是' : '否',
      参数: model.parameters,
      创建时间: model.createdAt.toLocaleString(),
      修改时间: model.updatedAt.toLocaleString(),
    };

    console.log('模型属性:', info);

    // 格式化显示
    const formattedInfo = Object.entries(info)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value, null, 2)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    alert(`模型属性\n${'='.repeat(40)}\n${formattedInfo}`);
  }

  /**
   * 删除模型
   */
  public deleteModel(modelId: string): boolean {
    const model = this.objectManager.getModel(modelId);
    if (!model) return false;

    const confirmed = window.confirm(
      `确定要删除 "${model.name}" 吗？\n\n此操作无法撤销。`
    );

    if (confirmed) {
      this.objectManager.removeModel(model.id);
      this.interactionService.clearSelection();
      console.log(`模型 ${model.name} 已删除`);
      return true;
    }

    return false;
  }

  /**
   * 复制模型
   */
  public duplicateModel(modelId: string): Model | null {
    const model = this.objectManager.getModel(modelId);
    if (!model) return null;

    const assetId = model.metadata.assetId;
    if (!assetId) {
      console.warn('无法复制模型：缺少 assetId');
      return null;
    }

    // 创建副本，位置稍微偏移
    const duplicate = this.objectManager.createModelFromAsset(assetId, {
      name: `${model.name}_副本`,
      position: model.position
        .clone()
        .add(new (model.position.constructor as any)(0.5, 0.5, 0.5)),
      rotation: model.rotation.clone(),
      parameters: { ...model.parameters },
    });

    console.log(`已复制模型 ${model.name}:`, duplicate);
    return duplicate;
  }

  /**
   * 重置模型变换
   */
  public resetTransform(modelId: string): void {
    const model = this.objectManager.getModel(modelId);
    if (!model) return;

    this.objectManager.updateModel(model.id, {
      position: new (model.position.constructor as any)(0, 0, 0),
      rotation: new (model.rotation.constructor as any)(0, 0, 0),
      scale: new (model.scale.constructor as any)(1, 1, 1),
    });

    console.log(`模型 ${model.name} 变换已重置`);
  }

  /**
   * 批量操作：隐藏所有模型
   */
  public hideAllModels(): void {
    const models = this.objectManager.getAllModels();
    models.forEach(model => {
      this.objectManager.updateModel(model.id, { isVisible: false });
    });
    console.log(`已隐藏 ${models.length} 个模型`);
  }

  /**
   * 批量操作：显示所有模型
   */
  public showAllModels(): void {
    const models = this.objectManager.getAllModels();
    models.forEach(model => {
      this.objectManager.updateModel(model.id, { isVisible: true });
    });
    console.log(`已显示 ${models.length} 个模型`);
  }

  /**
   * 批量操作：删除所有模型
   */
  public deleteAllModels(): void {
    const models = this.objectManager.getAllModels();
    const confirmed = window.confirm(
      `确定要删除所有 ${models.length} 个模型吗？\n\n此操作无法撤销。`
    );

    if (confirmed) {
      this.objectManager.clear();
      this.interactionService.clearSelection();
      console.log('所有模型已删除');
    }
  }

  /**
   * 获取模型统计信息
   */
  public getStatistics(): {
    total: number;
    visible: number;
    hidden: number;
    byType: Record<string, number>;
  } {
    const models = this.objectManager.getAllModels();

    const stats = {
      total: models.length,
      visible: models.filter(m => m.isVisible).length,
      hidden: models.filter(m => !m.isVisible).length,
      byType: {} as Record<string, number>,
    };

    models.forEach(model => {
      stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;
    });

    return stats;
  }
}
