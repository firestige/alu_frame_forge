import * as React from 'react';
import { useDesigner } from '../features/designer/hooks/useDesigner';
import DesignerPageUI from '../features/designer/ui/DesignerPageUI';
import { DesignerProvider } from '../features/designer/context';
import {
  useDesignerObjectStore,
  useDesignerProjectStore,
} from '../features/designer/stores';
import { loadProject, getLastProjectId } from '@/core/services/queryService';
import {
  designerEventBus,
  onCommand,
  offCommand,
} from '@/core/services/eventBus';

/**
 * 从 URL 获取项目 ID
 */
function getProjectIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('projectId');
}

/**
 * DesignerPage - 设计器页面容器（重构后 - Container 模式）
 *
 * 职责：
 * 1. 初始化服务（3D 渲染器、ObjectManager 等）
 * 2. 驱动项目加载（从 URL 或 localStorage）
 * 3. 设置事件桥梁（Command → Service、ObjectManager → Store）
 * 4. 提供 DesignerProvider 包裹 UI 组件
 *
 * 不做：
 * - 不管理 UI 状态（工具选择、侧边栏等）
 * - 不包装事件处理函数
 * - 不传递大量 props 给子组件
 */
const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isProjectLoaded, setIsProjectLoaded] = React.useState(false);

  // 使用统一的设计器 Hook（初始化服务）
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

  // ==================== 项目加载 ====================

  React.useEffect(() => {
    const loadProjectData = async () => {
      if (!designer.services.objectManager) return;

      const projectId = getProjectIdFromUrl() || getLastProjectId();

      if (!projectId) {
        // 新建空白项目
        useDesignerProjectStore.getState().setProject({
          id: `project-${Date.now()}`,
          name: '未命名项目',
          metadata: { name: '未命名项目' },
        });
        setIsProjectLoaded(true);
        return;
      }

      try {
        useDesignerProjectStore.getState().setStatus('loading');

        const projectData = await loadProject(projectId);

        if (projectData) {
          // 注入数据到 ObjectManager
          designer.services.objectManager.importScene(projectData);

          // 更新项目 Store
          useDesignerProjectStore.getState().setProject({
            id: projectId,
            name: projectData.metadata.name,
            metadata: projectData.metadata,
          });
        }

        setIsProjectLoaded(true);
      } catch (error) {
        console.error('项目加载失败:', error);
        useDesignerProjectStore.getState().setError(error as Error);
        setIsProjectLoaded(true);
      }
    };

    if (designer.services.objectManager) {
      loadProjectData();
    }
  }, [designer.services.objectManager]);

  // ==================== 事件桥梁：Command → Service ====================

  React.useEffect(() => {
    if (!designer.services.creation || !designer.services.objectManager) return;

    // 监听创建命令
    const handleCreateCube = () => designer.services.creation?.createCube();
    const handleCreateBox = () => designer.services.creation?.createBox();
    const handleCreateProfile = () =>
      designer.services.creation?.createAluminumProfile();
    const handleCreatePanel = () => designer.services.creation?.createPanel();
    const handleCreateConnector = () =>
      designer.services.creation?.createConnector();

    // 监听操作命令
    const handleDelete = (modelId: string) =>
      designer.services.objectManager?.removeObject(modelId);

    const handleToggleVisibility = (modelId: string) => {
      const obj = designer.services.objectManager?.getObject(modelId);
      if (obj) {
        const newVisibility = !(obj.visual?.isVisible ?? true);
        designer.services.objectManager?.setObjectVisibility(
          modelId,
          newVisibility
        );
      }
    };

    const handleModelUpdate = (data: {
      id: string;
      updates: {
        transform?: {
          position?: { x: number; y: number; z: number };
          rotation?: { x: number; y: number; z: number };
          scale?: { x: number; y: number; z: number };
        };
      };
    }) => {
      const objectManager = designer.services.objectManager;
      if (!objectManager) return;

      const obj = objectManager.getObject(data.id);
      if (!obj) return;

      const { transform } = data.updates;
      if (transform?.position) {
        objectManager.updatePosition(data.id, transform.position);
      }
      if (transform?.rotation) {
        objectManager.updateRotation(data.id, transform.rotation);
      }
      if (transform?.scale) {
        objectManager.updateScale(data.id, transform.scale);
      }
    };

    onCommand('command:create:cube', handleCreateCube);
    onCommand('command:create:box', handleCreateBox);
    onCommand('command:create:aluminumProfile', handleCreateProfile);
    onCommand('command:create:panel', handleCreatePanel);
    onCommand('command:create:connector', handleCreateConnector);
    onCommand('command:model:delete', handleDelete);
    onCommand('command:model:toggleVisibility', handleToggleVisibility);
    onCommand('command:model:update', handleModelUpdate);

    // 监听相机命令
    const handleCameraSetView = (data: {
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
    }) => {
      // TODO: 实现相机视图设置
      console.log('Set camera view:', data);
    };

    const handleCameraReset = () => {
      // TODO: 实现相机重置
      console.log('Reset camera');
    };

    onCommand('command:camera:setView', handleCameraSetView);
    onCommand('command:camera:reset', handleCameraReset);

    return () => {
      offCommand('command:create:cube', handleCreateCube);
      offCommand('command:create:box', handleCreateBox);
      offCommand('command:create:aluminumProfile', handleCreateProfile);
      offCommand('command:create:panel', handleCreatePanel);
      offCommand('command:create:connector', handleCreateConnector);
      offCommand('command:model:delete', handleDelete);
      offCommand('command:model:toggleVisibility', handleToggleVisibility);
      offCommand('command:model:update', handleModelUpdate);
      offCommand('command:camera:setView', handleCameraSetView);
      offCommand('command:camera:reset', handleCameraReset);
    };
  }, [designer.services.creation, designer.services.objectManager]);

  // ==================== 事件桥梁：ObjectManager → Store ====================

  React.useEffect(() => {
    if (!designer.services.objectManager) return;

    const syncToStore = () => {
      const objects = designer.services.objectManager!.getAllObjects();
      useDesignerObjectStore.getState().setObjects(objects);
    };

    // 初始同步
    syncToStore();

    // 监听变更
    designer.services.objectManager.on('object:added', syncToStore);
    designer.services.objectManager.on('object:removed', syncToStore);
    designer.services.objectManager.on('object:updated', syncToStore);
    designer.services.objectManager.on('objects:cleared', syncToStore);

    return () => {
      designer.services.objectManager?.off('object:added', syncToStore);
      designer.services.objectManager?.off('object:removed', syncToStore);
      designer.services.objectManager?.off('object:updated', syncToStore);
      designer.services.objectManager?.off('objects:cleared', syncToStore);
    };
  }, [designer.services.objectManager]);

  // ==================== 渲染 ====================

  if (!isProjectLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>加载项目中...</div>
      </div>
    );
  }

  if (
    !designer.services.objectManager ||
    !designer.services.renderSync ||
    !designer.services.creation ||
    !designer.services.interaction ||
    !designer.services.editor
  ) {
    return <div>初始化服务中...</div>;
  }

  return (
    <DesignerProvider
      value={{
        services: {
          objectManager: designer.services.objectManager,
          renderSync: designer.services.renderSync,
          creation: designer.services.creation,
          interaction: designer.services.interaction,
          editor: designer.services.editor,
        },
        eventBus: designerEventBus,
      }}
    >
      <DesignerPageUI containerRef={containerRef} />
    </DesignerProvider>
  );
};

export default DesignerPage;
