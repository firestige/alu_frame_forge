import * as React from 'react';
import ContextMenu from './ContextMenu';
import { ObjectManager } from '../../core/object/ObjectManager.ts';
import type { ContextMenuState } from '../../features/designer/hooks/useModelInteraction.ts';

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
  const selectedModel = React.useMemo(() => {
    if (!contextMenu.modelId || !objectManager) return null;
    return objectManager.getModel(contextMenu.modelId);
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
      targetName={selectedModel?.name || '对象'}
      isVisible={selectedModel?.isVisible ?? true}
    />
  );
};

export default ContextMenuContainer;
