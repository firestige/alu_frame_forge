import * as React from 'react';
import ControlPanel from './camera/ControlPanel';
import Toolbar from './DesignerToolbar';
import ObjectManagerSidebar from './ObjectManagerSidebar';
import { usePersistentState } from '../hooks/usePersistentState';
import { use3DViewer } from '../hooks/use3DViewer';
import { useSelectionService } from '../hooks/useSelectionService';

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
const DesignerPageUI: React.FC<DesignerPageUIProps> = ({
  status,
  onRendererReady,
}) => {
  console.log('[DesignerPageUI] 渲染 - status:', status);

  // ==================== 1. 3D 容器和 Renderer ====================

  const containerRef = React.useRef<HTMLDivElement>(null);

  const viewerControls = use3DViewer({
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

  const renderer = viewerControls.getRenderer();

  // 当 renderer 就绪时，通知父组件
  React.useEffect(() => {
    if (renderer) {
      console.log('[DesignerPageUI] ✅ Renderer 就绪，通知父组件');
      onRendererReady(renderer);
    }
  }, [renderer, onRendererReady]);

  // ==================== 2. 选择服务（UI 层状态）====================

  useSelectionService(renderer);

  // ==================== 3. UI 状态（持久化） ====================

  // 工具选择
  const [selectedTool, setSelectedTool] = usePersistentState<
    'select' | 'move' | 'rotate'
  >('designer.tool', 'select');

  // 侧边栏折叠状态（预留）
  const [sidebarCollapsed] = usePersistentState(
    'designer.sidebarCollapsed',
    false
  );

  // ==================== UI 状态（瞬态） ====================

  // TODO: 上下文菜单 - 暂时隐藏，后续重构为事件驱动模式
  // const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({
  //   visible: false,
  //   x: 0,
  //   y: 0,
  //   modelId: null,
  // });
  //
  // const handleCloseContextMenu = React.useCallback(() => {
  //   setContextMenu((prev) => ({ ...prev, visible: false }));
  // }, []);

  // ==================== 渲染 ====================

  return (
    <div className="w-full h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="relative shrink w-full">
        <Toolbar selectedTool={selectedTool} onToolChange={setSelectedTool} />
      </div>

      {/* 主内容区域 */}
      <div className="flex grow flex-1 min-h-0">
        {/* 左侧对象管理器边栏 */}
        {!sidebarCollapsed && <ObjectManagerSidebar />}

        {/* 3D 视图容器 */}
        <div ref={containerRef} className="relative flex-1">
          {/* 右上角视角控制面板 */}
          <ControlPanel />

          {/* 上下文菜单 - 暂时隐藏，后续重构 */}
          {/* <ContextMenuContainer
            contextMenu={contextMenu}
            onClose={handleCloseContextMenu}
          /> */}
        </div>
      </div>
    </div>
  );
};

export default DesignerPageUI;
