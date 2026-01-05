import * as React from 'react';
import { useDesignerObjects } from '../hooks/useDesignerObjects';
import { sendCommand } from '@/core/services/eventBus';
import ObjectTree from './ObjectTree';
import PropertyPanel from './PropertyPanel';

/**
 * ObjectManagerSidebar - 对象管理器侧边栏
 *
 * 重构后：
 * - 通过 useDesignerObjects() 获取对象列表
 * - 内部管理选中状态（纯 UI 选中）
 * - 通过事件系统发送操作命令
 */
const ObjectManagerSidebar: React.FC = () => {
  // 通过 Hook 获取对象列表
  const objects = useDesignerObjects();

  // 调试：输出对象列表状态
  React.useEffect(() => {
    console.log('[ObjectManagerSidebar] 对象列表更新:', objects.length, objects);
  }, [objects]);

  // 内部管理选中状态
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // 获取选中的对象
  const selectedObject = React.useMemo(() => {
    if (!selectedId) return null;
    return objects.find(obj => obj.id === selectedId) || null;
  }, [selectedId, objects]);

  // 选中对象
  const handleSelectModel = (objectId: string) => {
    setSelectedId(objectId);
  };

  // 切换可见性
  const handleToggleVisibility = (objectId: string) => {
    sendCommand('command:model:toggleVisibility', objectId);
  };

  // 删除对象
  const handleDelete = (objectId: string) => {
    sendCommand('command:model:delete', objectId);
    if (selectedId === objectId) {
      setSelectedId(null);
    }
  };

  // 更新属性
  const handleUpdateProperty = (
    property: string,
    value: string | number | boolean
  ) => {
    if (!selectedId) return;

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
        const obj = objects.find(o => o.id === selectedId);
        if (obj) {
          const newPosition = { ...obj.transform.position };
          newPosition[propKey] = numValue;
          sendCommand('command:model:update', {
            id: selectedId,
            updates: { transform: { ...obj.transform, position: newPosition } },
          });
        }
      } else if (
        transformKey === 'rotation' &&
        (propKey === 'x' || propKey === 'y' || propKey === 'z')
      ) {
        const obj = objects.find(o => o.id === selectedId);
        if (obj) {
          const newRotation = { ...obj.transform.rotation };
          // 将度数转换为弧度
          newRotation[propKey] = (numValue * Math.PI) / 180;
          sendCommand('command:model:update', {
            id: selectedId,
            updates: { transform: { ...obj.transform, rotation: newRotation } },
          });
        }
      } else if (
        transformKey === 'scale' &&
        (propKey === 'x' || propKey === 'y' || propKey === 'z')
      ) {
        const obj = objects.find(o => o.id === selectedId);
        if (obj) {
          const newScale = { ...obj.transform.scale };
          newScale[propKey] = numValue;
          sendCommand('command:model:update', {
            id: selectedId,
            updates: { transform: { ...obj.transform, scale: newScale } },
          });
        }
      }
    }
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="text-sm font-medium text-white">对象管理器</span>
      </div>

      {/* 对象树 - 占上半部分 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ObjectTree
          objects={objects}
          selectedObjectId={selectedId}
          onSelectObject={handleSelectModel}
          onToggleVisibility={handleToggleVisibility}
          onDelete={handleDelete}
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
