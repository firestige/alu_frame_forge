import * as React from 'react';
import { useBusinessServices } from '../features/designer/hooks/useBusinessServices';
import { RenderSyncService } from '../features/designer/services/RenderSyncService';
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
import type { IRenderer } from '@/core/renderer/renderer-types';

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
 * 1. 初始化业务服务（ObjectManager、ModelCreationService 等）
 * 2. 接收 UI 层的 renderer，创建 RenderSyncService 粘合层
 * 3. 驱动项目加载（从 URL 或 localStorage）
 * 4. 设置事件桥梁（Command → ObjectManager、ObjectManager → Store）
 * 5. 提供 DesignerProvider，封装所有细节
 *
 * 不做：
 * - 不管理 3D 容器和 renderer（UI 层的职责）
 * - 不管理 UI 状态（工具选择、侧边栏、选中状态等）
 * - 不显示 Loading（委托给 UI 层）
 */
const DesignerPage: React.FC = () => {
  console.log('[DesignerPage] 组件渲染开始');

  // ==================== 1. 初始化业务服务 ====================

  const services = useBusinessServices();
  console.log('[DesignerPage] 业务服务状态:', services.status);

  // ==================== 2. 管理 Renderer 引用 ====================

  const rendererRef = React.useRef<IRenderer | null>(null);
  const [isRendererReady, setIsRendererReady] = React.useState(false);

  const handleRendererReady = React.useCallback((renderer: IRenderer) => {
    console.log('[DesignerPage] 收到 renderer 引用');
    rendererRef.current = renderer;
    setIsRendererReady(true);
  }, []);

  // ==================== 3. 创建 RenderSyncService（粘合层）====================

  React.useEffect(() => {
    // 只有当业务服务和渲染器都就绪时，才创建粘合层
    if (services.status !== 'ready' || !rendererRef.current) {
      return;
    }

    console.log('[DesignerPage] 🔗 创建 RenderSyncService 粘合层...');

    // 创建 RenderSyncService 连接 ObjectManager 和 Renderer
    const syncService = new RenderSyncService(
      services.objectManager!,
      rendererRef.current
    );

    console.log('[DesignerPage] ✅ RenderSyncService 已创建，粘合完成');

    return () => {
      console.log('[DesignerPage] 销毁 RenderSyncService');
      syncService.dispose();
    };
  }, [services.status, isRendererReady, services.objectManager]);

  // ==================== 4. 项目加载逻辑 ====================

  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    const loadProjectData = async () => {
      // 只有当业务服务和渲染器都就绪时，才开始加载
      if (services.status !== 'ready' || !isRendererReady) {
        console.log(
          '[DesignerPage] ⏸ 等待服务和渲染器就绪 - services:',
          services.status,
          'renderer:',
          isRendererReady
        );
        return;
      }

      // 防止重复加载
      if (hasLoadedRef.current) return;

      console.log('[DesignerPage] ➡ 开始项目加载流程...');
      hasLoadedRef.current = true; // 标记已加载

      const projectId = getProjectIdFromUrl() || getLastProjectId();

      if (!projectId) {
        // 场景1: 未指定项目ID - 创建空白项目
        console.log('[DesignerPage] 未指定项目，创建空白项目');
        useDesignerProjectStore.getState().setProject({
          id: `project-${Date.now()}`,
          name: '未命名项目',
          metadata: { name: '未命名项目' },
        });
        return;
      }

      try {
        // 场景2: 指定了项目ID - 尝试加载
        console.log('[DesignerPage] 尝试加载项目:', projectId);
        useDesignerProjectStore.getState().setStatus('loading');

        const projectData = await loadProject(projectId);

        if (projectData) {
          // 场景2.1: 加载成功
          console.log('[DesignerPage] 项目加载成功');
          services.objectManager!.importScene(projectData);

          useDesignerProjectStore.getState().setProject({
            id: projectId,
            name: projectData.metadata.name,
            metadata: projectData.metadata,
          });
        } else {
          // 场景2.2: 加载失败 - fallback 到空白项目
          console.warn('[DesignerPage] 项目加载失败，创建空白项目');

          useDesignerProjectStore.getState().setProject({
            id: `project-${Date.now()}`,
            name: '未命名项目',
            metadata: {
              name: '未命名项目',
              description: `原项目 ${projectId} 加载失败，已创建新项目`,
            },
          });

          console.info(
            '[DesignerPage] 提示：指定的项目不存在或加载失败，已自动创建空白项目'
          );
        }
      } catch (error) {
        // 场景3: 加载过程出错
        console.error('[DesignerPage] 项目加载异常:', error);

        // Fallback: 创建空白项目，而不是卡住
        useDesignerProjectStore.getState().setProject({
          id: `project-${Date.now()}`,
          name: '未命名项目',
          metadata: {
            name: '未命名项目',
            description: `加载项目时出错: ${(error as Error).message}`,
          },
        });

        // 记录错误但不阻塞
        useDesignerProjectStore.getState().setError(error as Error);
      }
    };

    loadProjectData();
  }, [services.status, isRendererReady, services.objectManager]); // 依赖服务就绪和渲染器就绪

  // ==================== 5. 事件桥梁：Command → Service ====================

  React.useEffect(() => {
    if (services.status !== 'ready') return;

    console.log('[DesignerPage] 📡 设置事件桥梁: Command → ObjectManager');

    // 监听创建命令
    const handleCreateCube = () => services.creation?.createCube();
    const handleCreateBox = () => services.creation?.createBox();
    const handleCreateProfile = () =>
      services.creation?.createAluminumProfile();
    const handleCreatePanel = () => services.creation?.createPanel();
    const handleCreateConnector = () => services.creation?.createConnector();

    // 监听操作命令
    const handleDelete = (modelId: string) =>
      services.objectManager?.removeObject(modelId);

    const handleToggleVisibility = (modelId: string) => {
      const obj = services.objectManager?.getObject(modelId);
      if (obj) {
        const newVisibility = !(obj.visual?.isVisible ?? true);
        services.objectManager?.setObjectVisibility(modelId, newVisibility);
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
      const objectManager = services.objectManager;
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

    // 监听相机命令 (相机是 UI 状态，这里暂时保留框架)
    const handleCameraSetView = (data: {
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
    }) => {
      // TODO: 实现相机视图设置 (将来可能委托给 renderer)
      console.log('Set camera view:', data);
    };

    const handleCameraReset = () => {
      // TODO: 实现相机重置 (将来可能委托给 renderer)
      console.log('Reset camera');
    };

    onCommand('command:camera:setView', handleCameraSetView);
    onCommand('command:camera:reset', handleCameraReset);

    console.log('[DesignerPage] ✅ 事件桥梁已建立');

    return () => {
      console.log('[DesignerPage] 🔌 清理事件监听');
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
  }, [services.status, services.creation, services.objectManager]);

  // ==================== 6. 事件桥梁：ObjectManager → Store ====================

  React.useEffect(() => {
    if (services.status !== 'ready') return;

    console.log('[DesignerPage] 📡 设置事件桥梁: ObjectManager → Store');

    const syncToStore = () => {
      const objects = services.objectManager!.getAllObjects();
      useDesignerObjectStore.getState().setObjects(objects);
    };

    // 初始同步
    syncToStore();

    // 监听变更
    services.objectManager!.on('object:added', syncToStore);
    services.objectManager!.on('object:removed', syncToStore);
    services.objectManager!.on('object:updated', syncToStore);
    services.objectManager!.on('objects:cleared', syncToStore);

    console.log('[DesignerPage] ✅ Store 同步已建立');

    return () => {
      console.log('[DesignerPage] 🔌 清理 Store 同步');
      services.objectManager?.off('object:added', syncToStore);
      services.objectManager?.off('object:removed', syncToStore);
      services.objectManager?.off('object:updated', syncToStore);
      services.objectManager?.off('objects:cleared', syncToStore);
    };
  }, [services.status, services.objectManager]);

  // ==================== 7. 渲染 ====================

  console.log('[DesignerPage] 渲染阶段 - status:', services.status);

  // 计算状态：loading（初始化）或 ready（就绪）
  const uiStatus: 'loading' | 'ready' =
    services.status === 'ready' && isRendererReady ? 'ready' : 'loading';

  return (
    <div className="relative w-full h-full">
      {services.status === 'ready' ? (
        <DesignerProvider
          value={{
            services: {
              objectManager: services.objectManager!,
              creation: services.creation!,
              editor: services.editor!,
            },
            eventBus: designerEventBus,
          }}
        >
          <DesignerPageUI
            status={uiStatus}
            onRendererReady={handleRendererReady}
          />
        </DesignerProvider>
      ) : (
        // 服务未就绪时，显示简单的加载提示
        <div className="w-full h-full flex justify-center items-center bg-[#1a1a1a] text-white">
          <div>初始化服务中...</div>
        </div>
      )}
    </div>
  );
};

export default DesignerPage;
