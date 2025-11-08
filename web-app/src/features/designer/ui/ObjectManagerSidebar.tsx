import * as React from 'react';
import type { ObjectManager, SceneObject } from '@/core/object';
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
  const [objects, setObjects] = React.useState<SceneObject[]>([]);
  const [selectedObject, setSelectedObject] =
    React.useState<SceneObject | null>(null);

  // 更新对象列表
  React.useEffect(() => {
    if (objectManager) {
      const allObjects = objectManager.getAllObjects();
      setObjects(allObjects);
    }
  }, [objectManager, onRefresh]);

  // 更新选中的对象
  React.useEffect(() => {
    if (objectManager && selectedModelId) {
      const obj = objectManager.getObject(selectedModelId);
      setSelectedObject(obj || null);
    } else {
      setSelectedObject(null);
    }
  }, [objectManager, selectedModelId]);

  const handleSelectModel = (objectId: string) => {
    onSelectModel(objectId);
  };

  const handleToggleVisibility = (objectId: string) => {
    if (!objectManager) return;

    const obj = objectManager.getObject(objectId);
    if (obj) {
      const newVisibility = !(obj.visual?.isVisible ?? true);
      objectManager.setObjectVisibility(objectId, newVisibility);
      onRefresh();
    }
  };

  const handleUpdateProperty = (
    property: string,
    value: string | number | boolean
  ) => {
    if (!objectManager || !selectedModelId) return;

    const obj = objectManager.getObject(selectedModelId);
    if (!obj) return;

    const numValue =
      typeof value === 'number' ? value : parseFloat(value as string);
    if (isNaN(numValue)) return;

    // 解析属性路径（例如 "transform.position.x"）
    const parts = property.split('.');
    if (parts.length === 3 && parts[0] === 'transform') {
      const [, transformKey, propKey] = parts;

      if (
        transformKey === 'position' &&
        (propKey === 'x' || propKey === 'y' || propKey === 'z')
      ) {
        const newPosition = { ...obj.transform.position };
        newPosition[propKey] = numValue;
        objectManager.updatePosition(selectedModelId, newPosition);
      } else if (
        transformKey === 'rotation' &&
        (propKey === 'x' || propKey === 'y' || propKey === 'z')
      ) {
        const newRotation = { ...obj.transform.rotation };
        // 将度数转换为弧度
        newRotation[propKey] = (numValue * Math.PI) / 180;
        objectManager.updateRotation(selectedModelId, newRotation);
      } else if (
        transformKey === 'scale' &&
        (propKey === 'x' || propKey === 'y' || propKey === 'z')
      ) {
        const newScale = { ...obj.transform.scale };
        newScale[propKey] = numValue;
        objectManager.updateScale(selectedModelId, newScale);
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
          objects={objects}
          selectedObjectId={selectedModelId}
          onSelectObject={handleSelectModel}
          onToggleVisibility={handleToggleVisibility}
        />
      </div>

      {/* 属性面板 - 占下半部分 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PropertyPanel
          object={selectedObject}
          onUpdateProperty={handleUpdateProperty}
        />
      </div>
    </div>
  );
};

export default ObjectManagerSidebar;
