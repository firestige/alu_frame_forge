import * as React from 'react';
import { useCoreServices } from '@/core';
import { ModelCreationService } from '../features/designer/services/ModelCreationService';
import { ModelEditorService } from '../features/designer/services/ModelEditorService';
import { PlacementController } from '../features/designer/services/PlacementService';
import { SnappingService } from '../features/designer/services/SnappingSerice';
import { TransformSnappingService } from '../features/designer/services/TransformSnappingService';
import { RenderSyncService } from '../features/designer/services/RenderSyncService';
import { SelectionService } from '../features/designer/services/SelectionService';
import { BoxSelectController } from '../features/designer/services/BoxSelectController';
import { CameraService } from '@/core/renderer/services/CameraService';
import { CameraCommandHandler } from '../features/designer/services/CameraCommandHandler';
import { TransformService } from '../features/designer/services/TransformService';
import { TransformCommandHandler } from '../features/designer/services/TransformCommandHandler';
import { AssemblyCommandHandler } from '../features/designer/services/AssemblyCommandHandler';
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
  onState,
  offState,
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
 * DesignerPage - 设计器页面容器（重构后 - 应用级状态管理）
 *
 * 职责：
 * 1. 从应用级获取 Core 服务（ObjectManager、AssetService、AutoSaveService）
 * 2. 创建页面级 Features 服务（ModelCreationService、ModelEditorService）
 * 3. 接收 UI 层的 renderer，创建 RenderSyncService、PlacementController
 * 4. 驱动项目加载（从 URL 或 localStorage）
 * 5. 设置事件桥梁（Command → Service、ObjectManager → Store）
 * 6. 提供 DesignerProvider，封装所有细节
 *
 * 架构变更（2025-11-14）：
 * - Core 服务（ObjectManager）从应用级 CoreServiceProvider 获取
 * - Features 服务（ModelCreationService）在页面级创建
 * - 路由切换时 Core 服务保留，Features 服务重建
 *
 * 不做：
 * - 不管理 3D 容器和 renderer（UI 层的职责）
 * - 不管理 UI 状态（工具选择、侧边栏、选中状态等）
 * - 不显示 Loading（委托给 UI 层）
 */
const DesignerPage: React.FC = () => {
  // ==================== 1. 从应用级获取 Core 服务 ====================

  const coreServices = useCoreServices();

  // ==================== 2. 管理 Renderer 引用 ====================

  const rendererRef = React.useRef<IRenderer | null>(null);
  const [isRendererReady, setIsRendererReady] = React.useState(false);

  const handleRendererReady = React.useCallback((renderer: IRenderer) => {
    rendererRef.current = renderer;
    setIsRendererReady(true);
  }, []);

  // ==================== 3. 初始化 Features 层服务（页面级）====================

  const [featureServices, setFeatureServices] = React.useState<{
    creation: ModelCreationService | null;
    editor: ModelEditorService | null;
    placement: PlacementController | null;
    renderSync: RenderSyncService | null;
    selection: SelectionService | null;
    boxSelect: BoxSelectController | null;
    cameraService: CameraService | null;
    cameraCommandHandler: CameraCommandHandler | null;
    transformService: TransformService | null;
    transformCommandHandler: TransformCommandHandler | null;
    assemblyCommandHandler: AssemblyCommandHandler | null;
  }>({
    creation: null,
    editor: null,
    placement: null,
    renderSync: null,
    selection: null,
    boxSelect: null,
    cameraService: null,
    cameraCommandHandler: null,
    transformService: null,
    transformCommandHandler: null,
    assemblyCommandHandler: null,
  });

  // 初始化不依赖 renderer 的服务
  React.useEffect(() => {
    console.log('[DesignerPage] 初始化 Features 层服务');

    const creation = new ModelCreationService(coreServices.objectManager);
    const editor = new ModelEditorService(coreServices.objectManager);

    // 初始化 AssemblyCommandHandler（不依赖 renderer）
    const assemblyCommandHandler = new AssemblyCommandHandler(
      coreServices.objectManager,
      coreServices.anchorService,
      coreServices.constraintService,
      coreServices.assetService
    );

    setFeatureServices(prev => ({
      ...prev,
      creation,
      editor,
      assemblyCommandHandler,
    }));

    return () => {
      console.log('[DesignerPage] 清理 Features 层服务');
      // 页面卸载前强制保存，防止路由切换时丢失数据
      coreServices.autoSave?.forceSave();
    };
  }, [coreServices.objectManager, coreServices.autoSave]);

  // 当 renderer 就绪时，创建依赖 renderer 的服务
  React.useEffect(() => {
    if (!rendererRef.current) return;

    console.log(
      '[DesignerPage] 创建 RenderSyncService、PlacementController、SelectionService、BoxSelectController 和 CameraService'
    );

    // 设置 renderer 到 ObjectManager，这会重新注册需要 renderer 的策略（如 ProfileInstanceStrategy）
    coreServices.objectManager.setRenderer(rendererRef.current);

    const renderSync = new RenderSyncService(
      coreServices.objectManager,
      rendererRef.current
    );

    // 初始化 SnappingService
    const snappingService = new SnappingService(coreServices.anchorService, {
      searchRadius: 500, // 500mm
      snapThreshold: 100, // 100mm
      enabled: true,
      priority: ['endpoint', 't-slot', 'face'],
    });

    // 创建 PlacementController，传入 SnappingService
    const placement = new PlacementController(
      rendererRef.current,
      coreServices.objectManager,
      snappingService,
      coreServices.anchorService,
      coreServices.constraintService
    );

    // 初始化 SelectionService
    const selection = new SelectionService(rendererRef.current);

    // 初始化 BoxSelectController
    const boxSelect = new BoxSelectController(
      rendererRef.current,
      coreServices.objectManager
    );

    // 初始化 CameraService 和 CameraCommandHandler
    const cameraController = (rendererRef.current as any).cameraController;
    if (!cameraController) {
      console.error('[DesignerPage] CameraController not found in renderer');
      return;
    }

    const cameraService = new CameraService(cameraController, 1.5); // 1.5m 适合家具场景
    cameraService.loadSavedView(); // 加载保存的视角

    const cameraCommandHandler = new CameraCommandHandler(cameraService);

    // 初始化 TransformService 和 TransformCommandHandler
    const transformService = new TransformService(
      rendererRef.current,
      renderSync
    );
    const transformCommandHandler = new TransformCommandHandler(
      transformService
    );

    // 初始化 TransformSnappingService 并集成到 TransformService
    const transformSnappingService = new TransformSnappingService(
      rendererRef.current,
      snappingService,
      coreServices.anchorService,
      coreServices.constraintService,
      coreServices.objectManager
    );
    transformService.setSnappingService(transformSnappingService);

    setFeatureServices(prev => ({
      ...prev,
      renderSync,
      placement,
      selection,
      boxSelect,
      cameraService,
      cameraCommandHandler,
      transformService,
      transformCommandHandler,
    }));

    return () => {
      renderSync.dispose();
      placement.dispose();
      selection.dispose();
      boxSelect.dispose();
      cameraCommandHandler.dispose();
      transformCommandHandler.dispose();
      transformService.dispose();
    };
  }, [isRendererReady, coreServices.objectManager]);

  // ==================== 4. 项目加载逻辑 ====================

  const hasLoadedRef = React.useRef(false);

  React.useEffect(() => {
    const loadProjectData = async () => {
      // 只有当渲染器就绪时，才开始加载
      if (!isRendererReady) {
        return;
      }

      // 防止重复加载
      if (hasLoadedRef.current) return;

      hasLoadedRef.current = true; // 标记已加载

      const projectId = getProjectIdFromUrl() || getLastProjectId();

      if (!projectId) {
        // 场景1: 未指定项目ID - 创建空白项目
        const newProjectId = `project-${Date.now()}`;
        useDesignerProjectStore.getState().setProject({
          id: newProjectId,
          name: '未命名项目',
          metadata: { name: '未命名项目' },
        });
        return;
      }

      try {
        // 场景2: 指定了项目ID - 尝试加载
        useDesignerProjectStore.getState().setStatus('loading');

        const projectData = await loadProject(projectId);

        if (projectData) {
          // 场景2.1: 加载成功
          coreServices.objectManager.importScene(projectData);

          useDesignerProjectStore.getState().setProject({
            id: projectId,
            name: projectData.metadata.name,
            metadata: projectData.metadata,
          });
        } else {
          // 场景2.2: 加载失败 - fallback 到空白项目
          useDesignerProjectStore.getState().setProject({
            id: `project-${Date.now()}`,
            name: '未命名项目',
            metadata: {
              name: '未命名项目',
              description: `原项目 ${projectId} 加载失败，已创建新项目`,
            },
          });
        }
      } catch (error) {
        // 场景3: 加载过程出错
        console.error('[DesignerPage] 项目加载异常:', error);

        // 检测是否是旧数据格式问题
        const errorMessage = (error as Error).message || '';
        if (
          errorMessage.includes('substring') ||
          errorMessage.includes('outerPath')
        ) {
          console.warn('[DesignerPage] 🔧 检测到旧数据格式，清空 localStorage');
          localStorage.clear();
          window.location.reload();
          return;
        }

        // Fallback: 创建空白项目，而不是卡住
        useDesignerProjectStore.getState().setProject({
          id: `project-${Date.now()}`,
          name: '未命名项目',
          metadata: {
            name: '未命名项目',
            description: `加载项目时出错: ${errorMessage}`,
          },
        });

        // 记录错误但不阻塞
        useDesignerProjectStore.getState().setError(error as Error);
      }
    };

    loadProjectData();
  }, [isRendererReady, coreServices.objectManager]); // 依赖服务就绪和渲染器就绪

  // ==================== 4.5 测试模式：通过 URL 参数创建测试对象 ====================

  React.useEffect(() => {
    if (!isRendererReady) return;

    const searchParams = new URLSearchParams(window.location.search);
    const testParam = searchParams.get('test');

    if (testParam === '2020') {
      console.log('[DesignerPage] 🧪 测试模式：创建2020型材对象');

      try {
        // 验证资产是否存在
        const asset = coreServices.objectManager.getAsset('profile-2020');
        if (!asset) {
          console.error('[DesignerPage] ❌ 资产未找到: profile-2020');
          console.log(
            '[DesignerPage] 可用资产列表:',
            coreServices.objectManager.getAllAssets().map(a => a.id)
          );
          return;
        }
        console.log('[DesignerPage] ✅ 资产已加载:', asset.name, asset);

        const testObject = coreServices.objectManager.createObjectFromAsset(
          'profile-2020',
          {
            name: '2020型材-测试',
            transform: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
              scale: { x: 1, y: 1, z: 1 },
            },
            userParams: {
              length: 20, // 20mm长度（2cm）
            },
          }
        );

        console.log('[DesignerPage] ✅ 测试对象已创建:', {
          id: testObject.id,
          name: testObject.name,
          assetId: testObject.assetId,
          visual: testObject.visual ? '✅ 渲染模型存在' : '❌ 渲染模型缺失',
          compute: testObject.compute ? '✅ 计算模型存在' : '❌ 计算模型缺失',
        });
      } catch (error) {
        console.error('[DesignerPage] ❌ 创建测试对象失败:', error);
        if (error instanceof Error) {
          console.error('[DesignerPage] 错误详情:', {
            message: error.message,
            stack: error.stack,
          });
        }
      }
    }
  }, [isRendererReady, coreServices.objectManager]);

  // ==================== 5. 事件桥梁：Command → Service ====================

  React.useEffect(() => {
    if (!featureServices.creation || !featureServices.editor) return;

    // 监听创建命令
    const handleCreateCube = () => featureServices.creation?.createCube();
    const handleCreateBox = () => featureServices.creation?.createBox();
    const handleCreateProfile = () =>
      featureServices.creation?.createAluminumProfile();
    const handleCreatePanel = () => featureServices.creation?.createPanel();
    const handleCreateConnector = () =>
      featureServices.creation?.createConnector();

    // 监听新命令：准备创建型材（交互式）
    const handlePrepareProfile = (data: {
      assetId: string;
      mode: 'interactive';
    }) => {
      // TODO: 启动交互式放置流程（PlacementService）
      // 临时：打印日志，后续实现
      console.log('[DesignerPage] 准备创建型材:', data);
      // PlacementService.startPlacement(data.assetId);
    };

    // 监听操作命令
    const handleDelete = (modelId: string) =>
      coreServices.objectManager.removeObject(modelId);

    const handleToggleVisibility = (modelId: string) => {
      const obj = coreServices.objectManager.getObject(modelId);
      if (obj) {
        const newVisibility = !(obj.visual?.isVisible ?? true);
        coreServices.objectManager.setObjectVisibility(modelId, newVisibility);
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
      const objectManager = coreServices.objectManager;

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
    onCommand('command:create:profile:prepare', handlePrepareProfile);
    onCommand('command:create:panel', handleCreatePanel);
    onCommand('command:create:connector', handleCreateConnector);
    onCommand('command:model:delete', handleDelete);
    onCommand('command:model:toggleVisibility', handleToggleVisibility);
    onCommand('command:model:update', handleModelUpdate);

    return () => {
      offCommand('command:create:cube', handleCreateCube);
      offCommand('command:create:box', handleCreateBox);
      offCommand('command:create:aluminumProfile', handleCreateProfile);
      offCommand('command:create:profile:prepare', handlePrepareProfile);
      offCommand('command:create:panel', handleCreatePanel);
      offCommand('command:create:connector', handleCreateConnector);
      offCommand('command:model:delete', handleDelete);
      offCommand('command:model:toggleVisibility', handleToggleVisibility);
      offCommand('command:model:update', handleModelUpdate);
    };
  }, [
    featureServices.creation,
    featureServices.editor,
    coreServices.objectManager,
  ]);

  // ==================== 6. 事件桥梁：ObjectManager → Store ====================

  React.useEffect(() => {
    const syncToStore = () => {
      const objects = coreServices.objectManager.getAllObjects();
      useDesignerObjectStore.getState().setObjects(objects);
    };

    // 初始同步
    syncToStore();

    // 监听变更
    coreServices.objectManager.on('object:added', syncToStore);
    coreServices.objectManager.on('object:removed', syncToStore);
    coreServices.objectManager.on('object:updated', syncToStore);
    coreServices.objectManager.on('objects:cleared', syncToStore);

    return () => {
      coreServices.objectManager.off('object:added', syncToStore);
      coreServices.objectManager.off('object:removed', syncToStore);
      coreServices.objectManager.off('object:updated', syncToStore);
      coreServices.objectManager.off('objects:cleared', syncToStore);
    };
  }, [coreServices.objectManager]);

  // ==================== 7. 事件桥梁：Transform Completed → ObjectManager ====================

  React.useEffect(() => {
    const handleTransformCompleted = (data: {
      objectId: string;
      transform: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
      };
    }): void => {
      console.log('[DesignerPage] Transform completed:', data);
      coreServices.objectManager.updateObject(data.objectId, {
        transform: {
          position: data.transform.position,
          rotation: {
            ...data.transform.rotation,
            order: 'XYZ',
          },
          scale: data.transform.scale,
        },
      });
    };

    onState('state:transform:completed', handleTransformCompleted);

    return () => {
      offState('state:transform:completed', handleTransformCompleted);
    };
  }, [coreServices.objectManager]);

  // ==================== 8. 渲染 ====================

  console.log('[DesignerPage] 渲染阶段 - featureServices:', {
    creation: !!featureServices.creation,
    editor: !!featureServices.editor,
    placement: !!featureServices.placement,
    renderSync: !!featureServices.renderSync,
  });

  // 计算状态：loading（初始化）或 ready（就绪）
  const uiStatus: 'loading' | 'ready' =
    featureServices.creation && isRendererReady ? 'ready' : 'loading';

  return (
    <div className="relative w-full h-full">
      {featureServices.creation && featureServices.editor ? (
        <DesignerProvider
          value={{
            services: {
              objectManager: coreServices.objectManager,
              creation: featureServices.creation,
              editor: featureServices.editor,
              placement: featureServices.placement, // ← 允许为 null
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
