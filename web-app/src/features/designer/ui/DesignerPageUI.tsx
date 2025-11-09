import * as React from 'react';
import ControlPanel from './camera/ControlPanel';
import Toolbar from './DesignerToolbar';
import ObjectManagerSidebar from './ObjectManagerSidebar';
import { usePersistentState } from '../hooks/usePersistentState';

/**
 * DesignerPageUI Props
 *
 * 重构后只接收必要的 ref，所有业务数据通过 Context/Hook 获取
 */
export interface DesignerPageUIProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * DesignerPageUI - 设计器 UI 协调层
 *
 * 职责：
 * - 管理 UI 状态（工具选择、侧边栏、上下文菜单等）
 * - 组合和布局子组件
 * - 通过 Context 访问业务数据
 *
 * 不做：
 * - 不直接持有业务服务
 * - 不接收业务数据 props
 */
const DesignerPageUI: React.FC<DesignerPageUIProps> = ({ containerRef }) => {
  // ==================== UI 状态（持久化） ====================

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
