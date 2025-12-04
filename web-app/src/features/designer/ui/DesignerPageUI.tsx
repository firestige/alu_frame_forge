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
import { BoxSelectionOverlay } from './BoxSelectionOverlay';

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
  // ==================== 1. UI 状态（持久化）- 必须最先声明 ====================

  // 工具选择
  const [selectedTool, setSelectedTool] = usePersistentState<
    'select' | 'move' | 'rotate'
  >('designer.tool', 'select');

  // 侧边栏折叠状态（预留）
  const [sidebarCollapsed] = usePersistentState(
    'designer.sidebarCollapsed',
    false
  );

  // ==================== 2. 3D 容器和 Renderer ====================

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
      onRendererReady(renderer);
    }
  }, [renderer, onRendererReady]);

  // ==================== 3. 选择服务（UI 层状态）====================

  useSelectionService(renderer);

  // ==================== 4. 场景点击事件处理 ====================

  useSceneClick(containerRef as React.RefObject<HTMLDivElement>, renderer);

  // ==================== 5. 框选事件处理 ====================

  // 只在"选择模式"且按住 Shift 时启用框选
  const enableBoxSelect = selectedTool === 'select';
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

          {/* 框选矩形覆盖层 */}
          <BoxSelectionOverlay />
        </div>
      </div>
    </div>
  );
};

export default DesignerPageUI;
