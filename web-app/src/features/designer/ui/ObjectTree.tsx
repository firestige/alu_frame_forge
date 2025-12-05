import * as React from 'react';
import type { SceneObject } from '@/core/object';
import { AssetType } from '@/core/asset';
import { useContextMenu } from '../hooks/useContextMenu';
import { CommandContextMenu } from '@/components/ContextMenu';
import { OBJECT_CONTEXT_MENU } from '../config/contextMenuConfig';

interface ObjectTreeProps {
  objects: SceneObject[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string) => void;
  onToggleVisibility: (objectId: string) => void;
  onDelete?: (objectId: string) => void; // 添加删除回调
}

const ObjectTree: React.FC<ObjectTreeProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  onToggleVisibility,
  onDelete,
}) => {
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  const handleContextMenu = (
    e: React.MouseEvent,
    objectId: string,
    isVisible: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, 'object', objectId, { isVisible });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs text-slate-400 mb-2 font-medium">
          场景对象 ({objects.length})
        </div>
        {objects.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            暂无对象
          </div>
        ) : (
          <div className="space-y-1">
            {objects.map(object => (
              <div
                key={object.id}
                onClick={() => onSelectObject(object.id)}
                onContextMenu={e =>
                  handleContextMenu(e, object.id, object.visual?.isVisible ?? true)
                }
                className={`
                  group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                  transition-colors text-xs
                  ${
                    selectedObjectId === object.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-700 text-slate-300'
                  }
                  ${!object.visual?.isVisible ? 'opacity-50' : ''}
                `}
              >
                {/* 可见性切换按钮 */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onToggleVisibility(object.id);
                  }}
                  className="text-sm hover:text-blue-400"
                >
                  {object.visual?.isVisible ? '👁️' : '🚫'}
                </button>

                {/* 资产类型图标 */}
                <span className="text-sm">
                  {object.assetType === AssetType.PROFILE && '🔩'}
                  {object.assetType === AssetType.CONNECTOR && '🔗'}
                  {object.assetType === AssetType.FASTENER && '🔧'}
                  {object.assetType === AssetType.ACCESSORY && '📦'}
                </span>

                {/* 对象名称 */}
                <span
                  className={`flex-1 truncate ${!object.visual?.isVisible ? 'line-through' : ''}`}
                >
                  {object.name}
                </span>

                {/* 删除按钮 */}
                {onDelete && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(object.id);
                    }}
                    className="text-sm hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && contextMenu.open && (
        <CommandContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          open={contextMenu.open}
          actions={OBJECT_CONTEXT_MENU}
          context={{
            objectId: contextMenu.targetId,
            isVisible: contextMenu.metadata?.isVisible ?? true,
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default ObjectTree;
