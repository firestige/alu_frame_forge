import * as React from 'react';
import ControlPanel from './camera/ControlPanel';

import Toolbar from './DesignerToolbar';
import ObjectManagerSidebar from './ObjectManagerSidebar';
import { usePersistentState } from '../hooks/usePersistentState';
import { use3DViewer } from '../hooks/use3DViewer';
import { useSelectionService } from '../hooks/useSelectionService';
import { useSceneClick } from '../hooks/useSceneClick';
import { useBoxSelect } from '../hooks/useBoxSelect';
import { usePlacementInput } from '../hooks/usePlacementInput';
import { usePlacementState } from '../hooks/usePlacementState';
import { useCreationCommands } from '../hooks/useCreationCommands';
import { useTransformTool } from '../hooks/useTransformTool';
import { useSceneContextMenu } from '../hooks/useSceneContextMenu';
import { BoxSelectionOverlay } from './BoxSelectionOverlay';
import { CommandContextMenu } from '@/components/ContextMenu';
import { OBJECT_CONTEXT_MENU } from '../config/contextMenuConfig';
import { SCENE_CONTEXT_MENU } from '../config/sceneContextMenuConfig';
import { onState, sendCommand } from '@/core/services/eventBus';
import { useSelectionState } from '../hooks/useSelectionState';
import { useDesignerObjects } from '../hooks/useDesignerObjects';
import { ParameterEditDialog } from './components/ParameterEditDialog';
import { useCoreServices } from '@/core/CoreServiceProvider';

import type { IRenderer } from '@/core/renderer';

/**
 * DesignerPageUI Props
 *
 * 重构后的 Props：
 * - status: 显示加载状态
 * - onRendererReady: 当 Renderer 初始化完成时回调
 */
export interface DesignerPageUIProps {
  status: 'loading' | 'ready';
  onRendererReady: (renderer: IRenderer) => void;
}

/**
 * DesignerPageUI - 设计器 UI 协调层（重构后）
 *
 * 职责：
 * - 管理 3D 容器和 Renderer 生命周期
 * - 管理 UI 状态（工具选择、侧边栏、选中状态等）
 * - 组合和布局子组件
 * - 通过 Context 访问业务数据
 *
 * 不做：
 * - 不直接持有业务服务（通过 Context 访问）
 * - 不管理项目加载逻辑（父组件职责）
 */
const DesignerPageUI: React.FC<DesignerPageUIProps> = ({ onRendererReady }) => {
  // ==================== 0. Core Services ====================

  const { objectManager } = useCoreServices();

  // ==================== 1. UI 状态（持久化）- 必须最先声明 ====================

  // 侧边栏折叠状态（预留）
  const [sidebarCollapsed] = usePersistentState(
    'designer.sidebarCollapsed',
    false
  );

  // 参数编辑对话框状态
  const [paramEditDialogOpen, setParamEditDialogOpen] = React.useState(false);
  const [editingObjectId, setEditingObjectId] = React.useState<string | null>(
    null
  );

  // ==================== 2. 3D 容器和 Renderer ====================

  const containerRef = React.useRef<HTMLDivElement>(null);

  const viewerControls = use3DViewer({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    backgroundColor: '#1a1a1a',
    // 不传递 cameraPosition 和 orbitControls，使用 use3DViewer 的默认值
    // 默认: cameraPosition = { x: 0.8, y: 0.8, z: 0.8 }, FOV = 45°
    // 默认: minDistance = 0.005m (5mm), maxDistance = 10m
  });

  const renderer = viewerControls.getRenderer();

  // 当 renderer 就绪时，通知父组件
  React.useEffect(() => {
    if (renderer) {
      onRendererReady(renderer);
    }
  }, [renderer, onRendererReady]);

  // ==================== 3. 选择服务（UI 层状态）====================

  useSelectionService(renderer);

  // ==================== 4. 场景点击事件处理 ====================

  useSceneClick(containerRef as React.RefObject<HTMLDivElement>, renderer);

  // ==================== 5. 框选事件处理 ====================

  // 框选功能：通过监听 state:tool:changed 来决定是否启用
  // 只在"选择模式"且按住 Shift 时启用框选
  const [enableBoxSelect, setEnableBoxSelect] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onState('state:tool:changed', (tool: string) => {
      setEnableBoxSelect(tool === 'select');
    });
    return unsubscribe;
  }, []);

  useBoxSelect(
    containerRef as React.RefObject<HTMLDivElement>,
    renderer,
    enableBoxSelect
  );

  // ==================== 6. 创建命令处理 ====================

  useCreationCommands();

  // ==================== 7. 放置输入处理 ====================

  const { isPlacementActive } = usePlacementState();
  usePlacementInput(containerRef, isPlacementActive);

  // ==================== 8. 变换工具处理 ====================

  useTransformTool();

  // ==================== 9. 场景右键菜单 ====================

  const { contextMenu, closeContextMenu } = useSceneContextMenu(
    containerRef as React.RefObject<HTMLDivElement>,
    renderer
  );

  // ==================== 10. 参数编辑对话框 ====================

  // 监听编辑参数请求
  React.useEffect(() => {
    const unsubscribe = onState(
      'state:model:editParametersRequested',
      (data: { objectId: string }) => {
        setEditingObjectId(data.objectId);
        setParamEditDialogOpen(true);
      }
    );
    return unsubscribe;
  }, []);

  // 获取正在编辑的对象
  const editingObject = editingObjectId
    ? objectManager.getObject(editingObjectId)
    : null;
  const editingAsset = editingObject
    ? objectManager.getAsset(editingObject.assetId)
    : undefined;

  // 处理参数编辑确认
  const handleParamEditConfirm = (
    updatedParams: Record<string, number | string | boolean>
  ) => {
    if (editingObjectId) {
      objectManager.updateUserParams(editingObjectId, updatedParams);
    }
    setParamEditDialogOpen(false);
    setEditingObjectId(null);
  };

  // 处理参数编辑取消
  const handleParamEditCancel = () => {
    setParamEditDialogOpen(false);
    setEditingObjectId(null);
  };

  // ==================== 11. 快捷键：F键聚焦选中对象 ====================

  const { selectedIds } = useSelectionState();
  const objects = useDesignerObjects();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F键：聚焦到选中对象
      if (e.key === 'f' || e.key === 'F') {
        if (!e.shiftKey && selectedIds.length > 0) {
          const firstId = selectedIds[0];
          sendCommand('command:camera:focusObject', {
            objectId: firstId,
          });
        } else if (e.shiftKey) {
          // Shift+F：释放聚焦，回到原点
          sendCommand('command:camera:resetFocus', undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  // ==================== 渲染 ====================

  return (
    <div className="w-full h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="relative shrink w-full">
        <Toolbar />
      </div>

      {/* 主内容区域 */}
      <div className="flex grow flex-1 min-h-0">
        {/* 左侧对象管理器边栏 */}
        {!sidebarCollapsed && <ObjectManagerSidebar />}

        {/* 3D 视图容器 */}
        <div ref={containerRef} className="relative flex-1">
          {/* 右上角视角控制面板 */}
          <ControlPanel />

          {/* 框选矩形覆盖层 */}
          <BoxSelectionOverlay />

          {/* 场景右键菜单 */}
          {contextMenu.open && (
            <CommandContextMenu
              position={{ x: contextMenu.x, y: contextMenu.y }}
              open={contextMenu.open}
              actions={
                contextMenu.type === 'object'
                  ? OBJECT_CONTEXT_MENU
                  : SCENE_CONTEXT_MENU
              }
              context={{
                objectId: contextMenu.targetId,
                ...contextMenu.metadata,
              }}
              onClose={closeContextMenu}
            />
          )}

          {/* 参数编辑对话框 */}
          {editingObject && (
            <ParameterEditDialog
              open={paramEditDialogOpen}
              onClose={handleParamEditCancel}
              object={editingObject}
              asset={editingAsset}
              onConfirm={handleParamEditConfirm}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignerPageUI;
