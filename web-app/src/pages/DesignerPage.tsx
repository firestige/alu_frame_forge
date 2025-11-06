import * as React from 'react';
import { use3DViewer } from '../hooks/use3DViewer';
import ControlPanel, {
  type ViewPos,
} from '../components/camera/ControlPanel.tsx';
import ContextMenu from '../components/menu/ContextMenu.tsx';
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

  // 处理点击事件（左键选中）
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;

      const camera = getCamera();
      const interactionService = interactionServiceRef.current;
      if (!camera || !interactionService) return;

      interactionService.handleClick(event, container, camera);
      forceUpdate(); // 强制更新以反映选中状态
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [getCamera]);

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

      forceUpdate();
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () =>
      container.removeEventListener('contextmenu', handleContextMenu);
  }, [getCamera]);

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
    forceUpdate();
  }, [contextMenu.modelId]);

  const handleToggleVisibility = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.toggleVisibility(contextMenu.modelId);
    forceUpdate();
  }, [contextMenu.modelId]);

  const handleShowProperties = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.showProperties(contextMenu.modelId);
  }, [contextMenu.modelId]);

  const handleDelete = React.useCallback(() => {
    if (!contextMenu.modelId || !editorServiceRef.current) return;
    editorServiceRef.current.deleteModel(contextMenu.modelId);
    forceUpdate();
  }, [contextMenu.modelId]);

  // 模型创建处理器（委托给 CreationService）
  const addCube = React.useCallback(() => {
    creationServiceRef.current?.createCube();
  }, []);

  const addBox = React.useCallback(() => {
    creationServiceRef.current?.createBox();
  }, []);

  const addAluminumProfile = React.useCallback(() => {
    creationServiceRef.current?.createAluminumProfile();
  }, []);

  // 获取当前选中模型的信息
  const selectedModel = React.useMemo(() => {
    if (!contextMenu.modelId || !objectManagerRef.current) return null;
    return objectManagerRef.current.getModel(contextMenu.modelId);
  }, [contextMenu.modelId]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
        <h2 className="text-lg font-semibold">3D 视图</h2>
        <div className="flex gap-2">
          <button
            onClick={addCube}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            添加立方体
          </button>
          <button
            onClick={addBox}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            添加长方体
          </button>
          <button
            onClick={addAluminumProfile}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
          >
            添加铝型材
          </button>
          <button
            onClick={resetCamera}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
          >
            重置视角
          </button>
        </div>
      </div>
      <div ref={containerRef} className="relative flex-1 w-full">
        <ControlPanel onView={onViewPosChange} />
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
  );
};

export default DesignerPage;
