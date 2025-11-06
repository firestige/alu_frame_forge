import * as React from 'react';
import { ObjectManager, type Model } from '../../core/object/ObjectManager.ts';
import ObjectTree from './ObjectTree';
import PropertyPanel from './PropertyPanel';

interface ObjectManagerSidebarProps {
  objectManager: ObjectManager | null;
  selectedModelId: string | null;
  onSelectModel: (modelId: string | null) => void;
  onRefresh: () => void;
}

const ObjectManagerSidebar: React.FC<ObjectManagerSidebarProps> = ({
  objectManager,
  selectedModelId,
  onSelectModel,
  onRefresh,
}) => {
  const [models, setModels] = React.useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<Model | null>(null);

  // 更新模型列表
  React.useEffect(() => {
    if (objectManager) {
      const allModels = objectManager.getAllModels();
      setModels(allModels);
    }
  }, [objectManager, onRefresh]);

  // 更新选中的模型
  React.useEffect(() => {
    if (objectManager && selectedModelId) {
      const model = objectManager.getModel(selectedModelId);
      setSelectedModel(model || null);
    } else {
      setSelectedModel(null);
    }
  }, [objectManager, selectedModelId]);

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
  };

  const handleToggleVisibility = (modelId: string) => {
    if (!objectManager) return;

    const model = objectManager.getModel(modelId);
    if (model) {
      objectManager.updateModel(modelId, {
        isVisible: !model.isVisible,
      });
      onRefresh();
    }
  };

  const handleUpdateProperty = (property: string, value: any) => {
    if (!objectManager || !selectedModelId) return;

    const model = objectManager.getModel(selectedModelId);
    if (!model) return;

    // 解析属性路径（例如 "position.x"）
    const parts = property.split('.');
    if (parts.length === 2) {
      const [objKey, propKey] = parts;

      if (objKey === 'position') {
        const newPosition = model.position.clone();
        (newPosition as any)[propKey] = value;
        objectManager.updateModel(selectedModelId, {
          position: newPosition,
        });
      } else if (objKey === 'rotation') {
        const newRotation = model.rotation.clone();
        // 将度数转换为弧度
        (newRotation as any)[propKey] = (value * Math.PI) / 180;
        objectManager.updateModel(selectedModelId, {
          rotation: newRotation,
        });
      } else if (objKey === 'scale') {
        const newScale = model.scale.clone();
        (newScale as any)[propKey] = value;
        objectManager.updateModel(selectedModelId, {
          scale: newScale,
        });
      }

      onRefresh();
    }
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="text-sm font-medium text-white">对象管理器</span>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-400 hover:text-white transition-colors"
          title="刷新"
        >
          🔄
        </button>
      </div>

      {/* 对象树 - 占上半部分 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ObjectTree
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          onToggleVisibility={handleToggleVisibility}
        />
      </div>

      {/* 属性面板 - 占下半部分 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PropertyPanel
          model={selectedModel}
          onUpdateProperty={handleUpdateProperty}
        />
      </div>
    </div>
  );
};

export default ObjectManagerSidebar;

