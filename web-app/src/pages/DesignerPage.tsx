import * as React from 'react';
import { use3DViewer } from '../hooks/use3DViewer';
import ControlPanel, {
  type ViewPos,
} from '../components/camera/ControlPanel.tsx';
import ContextMenu from '../components/menu/ContextMenu.tsx';
import Toolbar from '../components/toolbar/Toolbar.tsx';
import ObjectManagerSidebar from '../components/sidebar/ObjectManagerSidebar.tsx';
import { ObjectManager } from '../service/ObjectManager';
import { ModelCreationService } from '../service/ModelCreationService';
import { ModelInteractionService } from '../service/ModelInteractionService';
import { ModelEditorService } from '../service/ModelEditorService';

const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const objectManagerRef = React.useRef<ObjectManager | null>(null);
  const creationServiceRef = React.useRef<ModelCreationService | null>(null);
  const interactionServiceRef = React.useRef<ModelInteractionService | null>(
    null
  );
  const editorServiceRef = React.useRef<ModelEditorService | null>(null);

  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    modelId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    modelId: null,
  });

  const [selectedTool, setSelectedTool] = React.useState<
    'select' | 'move' | 'rotate'
  >('select');

  const [selectedModelId, setSelectedModelId] = React.useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

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

  // 初始化所有服务
  React.useEffect(() => {
    const scene = getScene();
    if (scene && !objectManagerRef.current) {
      // 初始化 ObjectManager
      objectManagerRef.current = new ObjectManager(scene);

      // 初始化各个服务
      creationServiceRef.current = new ModelCreationService(
        objectManagerRef.current
      );
      interactionServiceRef.current = new ModelInteractionService(
        objectManagerRef.current
      );
      editorServiceRef.current = new ModelEditorService(
        objectManagerRef.current,
        interactionServiceRef.current
      );

      console.log('所有服务已初始化');
    }
  }, [getScene]);

  // 刷新界面
  const handleRefresh = React.useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    forceUpdate();
  }, []);

  // 处理点击事件（左键选中）
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;

      const camera = getCamera();
      const interactionService = interactionServiceRef.current;
      if (!camera || !interactionService) return;

      const modelId = interactionService.handleClick(event, container, camera);
      setSelectedModelId(modelId);
      handleRefresh();
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [getCamera, handleRefresh]);

  // 处理右键点击事件（上下文菜单）
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const camera = getCamera();
      const interactionService = interactionServiceRef.current;
      if (!camera || !interactionService) return;

      const result = interactionService.handleContextMenu(
        event,
        container,
        camera
      );

      setContextMenu({
        visible: result.modelId !== null,
        x: result.x,
        y: result.y,
        modelId: result.modelId,
      });

      if (result.modelId) {
        setSelectedModelId(result.modelId);
      }

      handleRefresh();
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () =>
      container.removeEventListener('contextmenu', handleContextMenu);
  }, [getCamera, handleRefresh]);

  // 视角切换
  const onViewPosChange = React.useCallback(
    (pos: ViewPos) => {
      const camera = getCamera();
      if (!camera) return;
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(0, 0, 0);
    },
    [getCamera]
  );

  // 上下文菜单处理器（委托给 EditorService）
  const handleEdit = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.editModel(contextMenu.modelId);
    handleRefresh();
  }, [contextMenu.modelId, handleRefresh]);

  const handleToggleVisibility = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.toggleVisibility(contextMenu.modelId);
    handleRefresh();
  }, [contextMenu.modelId, handleRefresh]);

  const handleShowProperties = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.showProperties(contextMenu.modelId);
  }, [contextMenu.modelId]);

  const handleDelete = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    const deleted = editorServiceRef.current.deleteModel(contextMenu.modelId);
    if (deleted && selectedModelId === contextMenu.modelId) {
      setSelectedModelId(null);
    }
    handleRefresh();
  }, [contextMenu.modelId, selectedModelId, handleRefresh]);

  // 模型创建处理器（委托给 CreationService）
  const handleCreateCube = React.useCallback(() => {
    creationServiceRef.current?.createCube();
    handleRefresh();
  }, [handleRefresh]);

  const handleCreateBox = React.useCallback(() => {
    creationServiceRef.current?.createBox();
    handleRefresh();
  }, [handleRefresh]);

  const handleCreateAluminumProfile = React.useCallback(() => {
    creationServiceRef.current?.createAluminumProfile();
    handleRefresh();
  }, [handleRefresh]);

  const handleCreatePanel = React.useCallback(() => {
    creationServiceRef.current?.createPanel();
    handleRefresh();
  }, [handleRefresh]);

  const handleCreateConnector = React.useCallback(() => {
    creationServiceRef.current?.createConnector();
    handleRefresh();
  }, [handleRefresh]);

  // 工具切换处理器
  const handleToolChange = React.useCallback(
    (tool: 'select' | 'move' | 'rotate') => {
      setSelectedTool(tool);
      console.log('切换工具:', tool);
    },
    []
  );

  // 从侧边栏选择模型
  const handleSelectModelFromSidebar = React.useCallback((modelId: string | null) => {
    setSelectedModelId(modelId);

    // 同步高亮
    const interactionService = interactionServiceRef.current;
    if (interactionService) {
      interactionService.highlightModel(modelId);
    }
  }, []);

  // 获取当前选中模型的信息
  const selectedModel = React.useMemo(() => {
    if (!contextMenu.modelId || !objectManagerRef.current) return null;
    return objectManagerRef.current.getModel(contextMenu.modelId);
  }, [contextMenu.modelId]);

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={containerRef} className="relative flex-1 w-full">
        <Toolbar
          onCreateCube={handleCreateCube}
          onCreateBox={handleCreateBox}
          onCreateAluminumProfile={handleCreateAluminumProfile}
          onCreatePanel={handleCreatePanel}
          onCreateConnector={handleCreateConnector}
          onResetCamera={resetCamera}
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
        />
      </div>
      {/* 主内容区域 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧对象管理器边栏 */}
        <ObjectManagerSidebar
          objectManager={objectManagerRef.current}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModelFromSidebar}
          onRefresh={handleRefresh}
        />

        {/* 3D 视图容器 */}
        <div ref={containerRef} className="relative flex-1">
          {/* 右上角视角控制面板 */}
          <ControlPanel onView={onViewPosChange} />
          {/* 上下文菜单 */}
          <ContextMenu
            visible={contextMenu.visible}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu({ ...contextMenu, visible: false })}
            onEdit={handleEdit}
            onToggleVisibility={handleToggleVisibility}
            onShowProperties={handleShowProperties}
            onDelete={handleDelete}
            targetName={selectedModel?.name || '对象'}
            isVisible={selectedModel?.isVisible ?? true}
          />
        </div>
      </div>
    </div>
  );
};

export default DesignerPage;
