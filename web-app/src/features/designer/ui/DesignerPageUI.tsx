import * as React from 'react';
import { ObjectManager } from '../../../core/object/ObjectManager';
import ControlPanel, { type ViewPos } from './camera/ControlPanel';
import ContextMenuContainer from '../../../components/menu/ContextMenuContainer';
import Toolbar from './DesignerToolbar';
import ObjectManagerSidebar from '../../../components/sidebar/ObjectManagerSidebar';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  modelId: string | null;
}

export interface DesignerPageUIProps {
  // 3D 容器引用
  containerRef: React.RefObject<HTMLDivElement | null>;

  // 工具状态
  selectedTool: 'select' | 'move' | 'rotate';
  onToolChange: (tool: 'select' | 'move' | 'rotate') => void;

  // 模型创建操作
  onCreateCube: () => void;
  onCreateBox: () => void;
  onCreateAluminumProfile: () => void;
  onCreatePanel: () => void;
  onCreateConnector: () => void;

  // 相机操作
  onResetCamera: () => void;
  onViewPosChange: (pos: ViewPos) => void;

  // 对象管理
  objectManager: ObjectManager | null;
  selectedModelId: string | null;
  onSelectModel: (modelId: string | null) => void;
  onRefresh: () => void;

  // 上下文菜单
  contextMenu: ContextMenuState;
  onCloseContextMenu: () => void;
  onContextMenuEdit: (modelId: string) => void;
  onContextMenuToggleVisibility: (modelId: string) => void;
  onContextMenuShowProperties: (modelId: string) => void;
  onContextMenuDelete: (modelId: string) => void;
}

/**
 * DesignerPageUI - 设计器显示层组件
 * 负责组织具体的显示层实现，通过 props 接收数据和回调
 */
const DesignerPageUI: React.FC<DesignerPageUIProps> = ({
  containerRef,
  selectedTool,
  onToolChange,
  onCreateCube,
  onCreateBox,
  onCreateAluminumProfile,
  onCreatePanel,
  onCreateConnector,
  onResetCamera,
  onViewPosChange,
  objectManager,
  selectedModelId,
  onSelectModel,
  onRefresh,
  contextMenu,
  onCloseContextMenu,
  onContextMenuEdit,
  onContextMenuToggleVisibility,
  onContextMenuShowProperties,
  onContextMenuDelete,
}) => {
  return (
    <div className="w-full h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="relative shrink w-full">
        <Toolbar
          onCreateCube={onCreateCube}
          onCreateBox={onCreateBox}
          onCreateAluminumProfile={onCreateAluminumProfile}
          onCreatePanel={onCreatePanel}
          onCreateConnector={onCreateConnector}
          onResetCamera={onResetCamera}
          selectedTool={selectedTool}
          onToolChange={onToolChange}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex grow flex-1 min-h-0">
        {/* 左侧对象管理器边栏 */}
        <ObjectManagerSidebar
          objectManager={objectManager}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          onRefresh={onRefresh}
        />

        {/* 3D 视图容器 */}
        <div ref={containerRef} className="relative flex-1">
          {/* 右上角视角控制面板 */}
          <ControlPanel onView={onViewPosChange} />

          {/* 上下文菜单 */}
          <ContextMenuContainer
            contextMenu={contextMenu}
            objectManager={objectManager}
            onClose={onCloseContextMenu}
            onEdit={onContextMenuEdit}
            onToggleVisibility={onContextMenuToggleVisibility}
            onShowProperties={onContextMenuShowProperties}
            onDelete={onContextMenuDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default DesignerPageUI;
