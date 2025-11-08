import * as React from 'react';
import * as THREE from 'three';
import { useDesigner } from '../features/designer/hooks/useDesigner';
import DesignerPageUI from '../features/designer/ui/DesignerPageUI';
import type { ViewPos } from '../features/designer/ui/camera/ControlPanel';

/**
 * DesignerPage - 设计器页面容器（重构后 - 极简版本）
 *
 * 职责：
 * 1. 作为路由入口，只负责挂载 DesignerPageUI 组件
 * 2. 所有业务逻辑已整合到 useDesigner hook 中
 *
 * 架构优势：
 * - DesignerPage 职责单一，只做组件组合
 * - useDesigner hook 统一管理所有设计器功能
 * - DesignerPageUI 专注于 UI 渲染和事件绑定
 */
const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = React.useState<
    'select' | 'move' | 'rotate'
  >('select');

  // 使用统一的设计器 Hook
  const designer = useDesigner({
    viewerOptions: {
      containerRef: containerRef as React.RefObject<HTMLDivElement>,
      backgroundColor: '#1a1a1a',
      cameraPosition: { x: 5, y: 5, z: 5 },
      orbitControls: {
        enableDamping: true,
        dampingFactor: 0.05,
        minDistance: 2,
        maxDistance: 20,
      },
    },
  });

  // 视角切换
  const handleViewPosChange = React.useCallback(
    (pos: ViewPos) => {
      const renderer = designer.viewer.getRenderer();
      if (!renderer) return;
      const camera = renderer.getNativeCamera() as THREE.Camera | null;
      if (!camera) return;
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(0, 0, 0);
    },
    [designer.viewer]
  );

  // 工具切换
  const handleToolChange = React.useCallback(
    (tool: 'select' | 'move' | 'rotate') => {
      setSelectedTool(tool);
      console.log('切换工具:', tool);
    },
    []
  );

  // 上下文菜单操作（包装后自动刷新）
  const handleContextMenuEdit = React.useCallback(
    (modelId: string) => {
      designer.operations.editModel(modelId);
    },
    [designer.operations]
  );

  const handleContextMenuToggleVisibility = React.useCallback(
    (modelId: string) => {
      designer.operations.toggleVisibility(modelId);
    },
    [designer.operations]
  );

  const handleContextMenuShowProperties = React.useCallback(
    (modelId: string) => {
      designer.operations.showProperties(modelId);
    },
    [designer.operations]
  );

  const handleContextMenuDelete = React.useCallback(
    (modelId: string) => {
      const deleted = designer.operations.deleteModel(modelId);
      if (deleted && designer.interaction.selectedModelId === modelId) {
        designer.interaction.selectModel(null);
      }
    },
    [designer.operations, designer.interaction]
  );

  return (
    <DesignerPageUI
      containerRef={containerRef}
      selectedTool={selectedTool}
      onToolChange={handleToolChange}
      onCreateCube={designer.operations.createCube}
      onCreateBox={designer.operations.createBox}
      onCreateAluminumProfile={designer.operations.createAluminumProfile}
      onCreatePanel={designer.operations.createPanel}
      onCreateConnector={designer.operations.createConnector}
      onResetCamera={designer.viewer.resetCamera}
      onViewPosChange={handleViewPosChange}
      objectManager={designer.services.objectManager}
      selectedModelId={designer.interaction.selectedModelId}
      onSelectModel={designer.interaction.selectModel}
      onRefresh={designer.operations.refresh}
      contextMenu={designer.interaction.contextMenu}
      onCloseContextMenu={designer.interaction.closeContextMenu}
      onContextMenuEdit={handleContextMenuEdit}
      onContextMenuToggleVisibility={handleContextMenuToggleVisibility}
      onContextMenuShowProperties={handleContextMenuShowProperties}
      onContextMenuDelete={handleContextMenuDelete}
    />
  );
};

export default DesignerPage;
