import * as React from 'react';

// 按钮组件
interface ToolButtonProps {
  icon?: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-slate-700 hover:bg-slate-600',
    primary: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-2 rounded text-sm text-white transition-colors
        flex items-center gap-2 min-w-[80px] justify-center
        ${active ? 'ring-2 ring-blue-400' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : variantStyles[variant]}
      `}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

// 按钮组组件
interface ButtonGroupProps {
  title?: string;
  children: React.ReactNode;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ title, children }) => {
  return (
    <div className="mb-3 last:mb-0">
      {title && (
        <div className="text-xs text-slate-400 mb-1 font-medium">{title}</div>
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
};

// Toolbar 主组件
export interface ToolbarProps {
  // 模型创建回调
  onCreateCube?: () => void;
  onCreateBox?: () => void;
  onCreateAluminumProfile?: () => void;
  onCreatePanel?: () => void;
  onCreateConnector?: () => void;

  // 工具操作回调
  onResetCamera?: () => void;

  // 当前选中的工具
  selectedTool?: 'select' | 'move' | 'rotate' | null;
  onToolChange?: (tool: 'select' | 'move' | 'rotate') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onCreateCube,
  onCreateBox,
  onCreateAluminumProfile,
  onCreatePanel,
  onCreateConnector,
  onResetCamera,
  selectedTool = 'select',
  onToolChange,
}) => {
  return (
    <div
      className="absolute left-4 top-4 z-20"
      style={{
        pointerEvents: 'auto',
      }}
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-md p-3 shadow-lg backdrop-blur-sm w-48">
        <div className="text-sm font-medium text-white mb-3 border-b border-slate-700 pb-2">
          🛠️ 工具栏
        </div>

        {/* 基础工具 */}
        <ButtonGroup title="基础工具">
          <ToolButton
            icon="👆"
            label="选择"
            active={selectedTool === 'select'}
            onClick={() => onToolChange?.('select')}
          />
          <ToolButton
            icon="✋"
            label="移动"
            active={selectedTool === 'move'}
            onClick={() => onToolChange?.('move')}
            disabled
          />
          <ToolButton
            icon="🔄"
            label="旋转"
            active={selectedTool === 'rotate'}
            onClick={() => onToolChange?.('rotate')}
            disabled
          />
        </ButtonGroup>

        {/* 模型创建 */}
        <ButtonGroup title="添加模型">
          <ToolButton
            icon="🟦"
            label="立方体"
            onClick={onCreateCube}
            variant="primary"
          />
          <ToolButton
            icon="📦"
            label="长方体"
            onClick={onCreateBox}
            variant="success"
          />
          <ToolButton
            icon="🔩"
            label="铝型材"
            onClick={onCreateAluminumProfile}
            variant="warning"
          />
          <ToolButton icon="🪟" label="面板" onClick={onCreatePanel} disabled />
          <ToolButton
            icon="🔗"
            label="连接件"
            onClick={onCreateConnector}
            disabled
          />
        </ButtonGroup>

        {/* 场景操作 */}
        <ButtonGroup title="场景操作">
          <ToolButton icon="🔗" label="约束" disabled />
          <ToolButton icon="📏" label="测量" disabled />
          <ToolButton icon="📷" label="重置相机" onClick={onResetCamera} />
        </ButtonGroup>
      </div>
    </div>
  );
};

export default Toolbar;
