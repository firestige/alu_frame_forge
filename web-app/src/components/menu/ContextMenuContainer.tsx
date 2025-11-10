/**
 * @deprecated
 *
 * ContextMenuContainer 已废弃，存在架构违规问题（components/ 依赖 features/）。
 *
 * 请使用新的架构方案：
 * 1. 在 features/ 目录中创建业务组件（例如：features/designer/ui/ModelContextMenu.tsx）
 * 2. 使用通用的 Popover 或 PopoverMenu 组件（从 @/components/Popover 导入）
 * 3. 在业务组件中处理业务逻辑
 *
 * 示例：
 * ```tsx
 * import { PopoverMenu } from '@/components/Popover';
 * import { ObjectManager } from '@/core/object/ObjectManager';
 *
 * const ModelContextMenu: React.FC<Props> = ({ open, position, modelId, objectManager, onClose }) => {
 *   const selectedObject = objectManager?.getObject(modelId);
 *
 *   return (
 *     <PopoverMenu open={open} position={position} onClose={onClose}>
 *       <button onClick={handleEdit}>编辑</button>
 *       <button onClick={handleDelete}>删除</button>
 *     </PopoverMenu>
 *   );
 * };
 * ```
 *
 * 相关文档：
 * - Issue: doc/Issue-PopoverRefactoring.md
 * - 实施方案: doc/ImplementationPlan-PopoverRefactoring.md
 */

import * as React from 'react';
import ContextMenu from './ContextMenu';
import { ObjectManager } from '@/core/object/ObjectManager.ts';

/**
 * @deprecated - 架构违规，请勿使用
 * ContextMenuState 应该从 features/designer/models/InteractionState 导入
 * 但这会违反架构原则（components 不应依赖 features）
 */
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  modelId: string | null;
}

interface ContextMenuContainerProps {
  contextMenu: ContextMenuState;
  objectManager: ObjectManager | null;
  onClose: () => void;
  onEdit: (modelId: string) => void;
  onToggleVisibility: (modelId: string) => void;
  onShowProperties: (modelId: string) => void;
  onDelete: (modelId: string) => void;
}

const ContextMenuContainer: React.FC<ContextMenuContainerProps> = ({
  contextMenu,
  objectManager,
  onClose,
  onEdit,
  onToggleVisibility,
  onShowProperties,
  onDelete,
}) => {
  const selectedObject = React.useMemo(() => {
    if (!contextMenu.modelId || !objectManager) return null;
    return objectManager.getObject(contextMenu.modelId);
  }, [contextMenu.modelId, objectManager]);

  const handleEdit = React.useCallback(() => {
    if (contextMenu.modelId) {
      onEdit(contextMenu.modelId);
    }
  }, [contextMenu.modelId, onEdit]);

  const handleToggleVisibility = React.useCallback(() => {
    if (contextMenu.modelId) {
      onToggleVisibility(contextMenu.modelId);
    }
  }, [contextMenu.modelId, onToggleVisibility]);

  const handleShowProperties = React.useCallback(() => {
    if (contextMenu.modelId) {
      onShowProperties(contextMenu.modelId);
    }
  }, [contextMenu.modelId, onShowProperties]);

  const handleDelete = React.useCallback(() => {
    if (contextMenu.modelId) {
      onDelete(contextMenu.modelId);
    }
  }, [contextMenu.modelId, onDelete]);

  return (
    <ContextMenu
      visible={contextMenu.visible}
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={onClose}
      onEdit={handleEdit}
      onToggleVisibility={handleToggleVisibility}
      onShowProperties={handleShowProperties}
      onDelete={handleDelete}
      targetName={selectedObject?.name || '对象'}
      isVisible={selectedObject?.visual?.isVisible ?? true}
    />
  );
};

export default ContextMenuContainer;
