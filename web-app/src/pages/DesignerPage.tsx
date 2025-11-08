import * as React from 'react';
import * as THREE from 'three';
import { use3DViewer } from '../features/designer/hooks/use3DViewer';
import { useDesignerServices } from '../features/designer/hooks/useDesignerServices';
import { useModelInteraction } from '../features/designer/hooks/useModelInteraction';
import { useModelOperations } from '../features/designer/hooks/useModelOperations';
import DesignerPageUI from '../features/designer/ui/DesignerPageUI';
import type { ViewPos } from '../features/designer/ui/camera/ControlPanel';

/**
 * DesignerPage - 设计器页面容器
 * 负责：
 * 1. 初始化 3D 视图和所有服务
 * 2. 管理状态（工具选择、模型选择等）
 * 3. 绑定业务逻辑和数据
 * 4. 将状态和回调传递给显示层组件
 */
const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = React.useState<
    'select' | 'move' | 'rotate'
  >('select');

  // 1. 初始化 3D 视图
  const { resetCamera, getRenderer } = use3DViewer({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    backgroundColor: '#1a1a1a',
    cameraPosition: { x: 5, y: 5, z: 5 },
    orbitControls: {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 2,
      maxDistance: 20,
    },
  });

  // 获取渲染器实例
  const renderer = getRenderer();
  const getScene = React.useCallback(
    () => renderer?.getNativeScene() as THREE.Scene | null,
    [renderer]
  );
  const getCamera = React.useCallback(
    () => renderer?.getNativeCamera() as THREE.Camera | null,
    [renderer]
  );

  // 2. 初始化所有服务
  const services = useDesignerServices(getScene);

  // 3. 初始化模型交互
  const {
    selectedModelId,
    setSelectedModelId,
    selectModel,
    contextMenu,
    closeContextMenu,
  } = useModelInteraction({
    containerRef,
    getCamera,
    interactionService: services.interactionService,
  });

  // 4. 初始化模型操作
  const modelOperations = useModelOperations({
    creationService: services.creationService,
    editorService: services.editorService,
  });

  // 视角切换
  const handleViewPosChange = React.useCallback(
    (pos: ViewPos) => {
      const camera = getCamera();
      if (!camera) return;
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(0, 0, 0);
    },
    [getCamera]
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
      modelOperations.editModel(modelId);
    },
    [modelOperations]
  );

  const handleContextMenuToggleVisibility = React.useCallback(
    (modelId: string) => {
      modelOperations.toggleVisibility(modelId);
    },
    [modelOperations]
  );

  const handleContextMenuShowProperties = React.useCallback(
    (modelId: string) => {
      modelOperations.showProperties(modelId);
    },
    [modelOperations]
  );

  const handleContextMenuDelete = React.useCallback(
    (modelId: string) => {
      const deleted = modelOperations.deleteModel(modelId);
      if (deleted && selectedModelId === modelId) {
        setSelectedModelId(null);
      }
    },
    [modelOperations, selectedModelId, setSelectedModelId]
  );

  return (
    <DesignerPageUI
      containerRef={containerRef}
      selectedTool={selectedTool}
      onToolChange={handleToolChange}
      onCreateCube={modelOperations.createCube}
      onCreateBox={modelOperations.createBox}
      onCreateAluminumProfile={modelOperations.createAluminumProfile}
      onCreatePanel={modelOperations.createPanel}
      onCreateConnector={modelOperations.createConnector}
      onResetCamera={resetCamera}
      onViewPosChange={handleViewPosChange}
      objectManager={services.objectManager}
      selectedModelId={selectedModelId}
      onSelectModel={selectModel}
      onRefresh={modelOperations.refresh}
      contextMenu={contextMenu}
      onCloseContextMenu={closeContextMenu}
      onContextMenuEdit={handleContextMenuEdit}
      onContextMenuToggleVisibility={handleContextMenuToggleVisibility}
      onContextMenuShowProperties={handleContextMenuShowProperties}
      onContextMenuDelete={handleContextMenuDelete}
    />
  );
};

export default DesignerPage;
