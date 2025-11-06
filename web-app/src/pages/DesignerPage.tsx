import * as React from 'react';
import { use3DViewer } from '../hooks/use3DViewer';
import { useDesignerServices } from '../hooks/useDesignerServices';
import { useModelInteraction } from '../hooks/useModelInteraction';
import { useModelOperations } from '../hooks/useModelOperations';
import ControlPanel, {
  type ViewPos,
} from '../components/camera/ControlPanel.tsx';
import ContextMenuContainer from '../components/menu/ContextMenuContainer.tsx';
import Toolbar from '../components/toolbar/Toolbar.tsx';
import ObjectManagerSidebar from '../components/sidebar/ObjectManagerSidebar.tsx';

const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = React.useState<
    'select' | 'move' | 'rotate'
  >('select');

  // 1. 初始化 3D 视图
  const { resetCamera, getScene, getCamera } = use3DViewer({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    backgroundColor: 0x1a1a1a,
    cameraPosition: { x: 5, y: 5, z: 5 },
    orbitControls: {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 2,
      maxDistance: 20,
    },
  });

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
    <div className="w-full h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="relative shrink w-full">
        <Toolbar
          onCreateCube={modelOperations.createCube}
          onCreateBox={modelOperations.createBox}
          onCreateAluminumProfile={modelOperations.createAluminumProfile}
          onCreatePanel={modelOperations.createPanel}
          onCreateConnector={modelOperations.createConnector}
          onResetCamera={resetCamera}
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex grow flex-1 min-h-0">
        {/* 左侧对象管理器边栏 */}
        <ObjectManagerSidebar
          objectManager={services.objectManager}
          selectedModelId={selectedModelId}
          onSelectModel={selectModel}
          onRefresh={modelOperations.refresh}
        />

        {/* 3D 视图容器 */}
        <div ref={containerRef} className="relative flex-1">
          {/* 右上角视角控制面板 */}
          <ControlPanel onView={handleViewPosChange} />

          {/* 上下文菜单 */}
          <ContextMenuContainer
            contextMenu={contextMenu}
            objectManager={services.objectManager}
            onClose={closeContextMenu}
            onEdit={handleContextMenuEdit}
            onToggleVisibility={handleContextMenuToggleVisibility}
            onShowProperties={handleContextMenuShowProperties}
            onDelete={handleContextMenuDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;
