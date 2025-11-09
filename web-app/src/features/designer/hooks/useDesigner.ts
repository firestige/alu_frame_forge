/**
 * 主设计器 Hook
 * 组合所有子 hooks，提供统一的设计器接口
 */

import { use3DViewer, type ViewerOptions } from './use3DViewer';
import { useDesignerServices } from './useDesignerServices';
import { useModelInteraction } from './useModelInteraction';
import { useModelOperations } from './useModelOperations';

export interface UseDesignerOptions {
  viewerOptions: ViewerOptions;
}

/**
 * 使用设计器的主 Hook
 *
 * 这个 hook 整合了设计器的所有功能：
 * - 3D 渲染器初始化和管理
 * - 对象管理和渲染同步
 * - 模型创建和编辑服务
 * - 用户交互和操作
 *
 * @example
 * ```tsx
 * function DesignerPage() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   const designer = useDesigner({
 *     viewerOptions: {
 *       containerRef,
 *       backgroundColor: '#1a1a1a',
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <Toolbar onCreateCube={designer.operations.createCube} />
 *       <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDesigner(options: UseDesignerOptions) {
  const { viewerOptions } = options;

  console.log('[useDesigner] Hook 开始执行');

  // 1. 初始化 3D 渲染器
  console.log('[useDesigner] 步骤 1: 初始化 3D 渲染器');
  const viewer = use3DViewer(viewerOptions);
  console.log('[useDesigner] ✅ viewer 初始化完成');

  // 2. 初始化所有服务（ObjectManager、RenderSyncService 等）
  console.log('[useDesigner] 步骤 2: 初始化所有服务');
  const services = useDesignerServices(viewer.getRenderer);
  console.log(
    '[useDesigner] ✅ services 获取完成，objectManager:',
    services.objectManager ? '有值' : 'null'
  );

  // 3. 组合用户交互逻辑
  const interaction = useModelInteraction({
    containerRef: viewerOptions.containerRef,
    interactionService: services.interactionService,
  });

  // 4. 组合模型操作逻辑
  const operations = useModelOperations({
    creationService: services.creationService,
    editorService: services.editorService,
  });

  console.log('[useDesigner] 所有步骤完成，准备返回');

  // 返回统一的设计器接口
  return {
    // 渲染器相关
    viewer,

    // 核心服务
    services: {
      objectManager: services.objectManager,
      renderSync: services.renderSyncService,
      creation: services.creationService,
      interaction: services.interactionService,
      editor: services.editorService,
    },

    // 用户交互
    interaction: {
      selectedModelId: interaction.selectedModelId,
      selectModel: interaction.selectModel,
      contextMenu: interaction.contextMenu,
      closeContextMenu: interaction.closeContextMenu,
    },

    // 模型操作
    operations: {
      createCube: operations.createCube,
      createBox: operations.createBox,
      createAluminumProfile: operations.createAluminumProfile,
      createPanel: operations.createPanel,
      createConnector: operations.createConnector,
      editModel: operations.editModel,
      toggleVisibility: operations.toggleVisibility,
      showProperties: operations.showProperties,
      deleteModel: operations.deleteModel,
      refresh: operations.refresh,
    },
  };
}

// 导出类型
export type Designer = ReturnType<typeof useDesigner>;
