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
        px-3 py-1.5 rounded text-xs text-white transition-colors
        flex flex-col items-center gap-1 min-w-[60px]
        ${active ? 'ring-2 ring-blue-400 bg-slate-600' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : variantStyles[variant]}
      `}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-[10px]">{label}</span>
    </button>
  );
};

// 带下拉面板的按钮组件
interface ToolButtonWithDropdownProps {
  icon?: string;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  disabled?: boolean;
  dropdownContent?: React.ReactNode;
}

const ToolButtonWithDropdown: React.FC<ToolButtonWithDropdownProps> = ({
  icon,
  label,
  variant = 'default',
  disabled = false,
  dropdownContent,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({
    top: 0,
    left: 0,
  });

  const variantStyles = {
    default: 'bg-slate-700 hover:bg-slate-600',
    primary: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
  };

  // 计算下拉菜单位置
  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 按钮底部 + 8px 间距
        left: rect.left,
      });
    }
  }, [isOpen]);

  // 处理点击外部区域关闭下拉面板
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded text-xs text-white transition-colors
            flex flex-col items-center gap-1 min-w-[60px]
            ${isOpen ? 'ring-2 ring-blue-400 bg-slate-600' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : variantStyles[variant]}
          `}
        >
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-[10px]">{label}</span>
        </button>
      </div>

      {/* 下拉面板 - 使用 fixed 定位悬浮显示 */}
      {isOpen && dropdownContent && (
        <div
          ref={dropdownRef}
          className="fixed w-[480px] h-[640px] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999,
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {dropdownContent}
        </div>
      )}
    </>
  );
};

// 按钮组组件 - 横向布局
interface ButtonGroupProps {
  title?: string;
  children: React.ReactNode;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col gap-1 px-3 border-r border-slate-700 last:border-r-0">
      {title && (
        <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
          {title}
        </div>
      )}
      <div className="flex gap-1">{children}</div>
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
  onCreatePanel,
  onCreateConnector,
  onResetCamera,
  selectedTool = 'select',
  onToolChange,
}) => {
  return (
    <div className="w-full bg-slate-800 border-b border-slate-700 shadow-lg">
      <div className="flex items-start py-2 overflow-x-auto">
        {/* 基础工具 */}
        <ButtonGroup title="工具">
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
        <ButtonGroup title="插入">
          <ToolButtonWithDropdown
            icon="🔩"
            label="铝型材"
            variant="warning"
            dropdownContent={
              <div className="w-full h-full p-4 overflow-auto">
                <h3 className="text-white text-lg font-semibold mb-4">
                  选择铝型材类型
                </h3>
                <div className="text-slate-400 text-sm">
                  铝型材库内容区域...
                </div>
                {/* 这里可以添加铝型材选择的具体内容 */}
              </div>
            }
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
        <ButtonGroup title="视图">
          <ToolButton icon="📷" label="重置相机" onClick={onResetCamera} />
        </ButtonGroup>

        {/* 高级功能 */}
        <ButtonGroup title="高级">
          <ToolButton icon="🔗" label="约束" disabled />
          <ToolButton icon="📏" label="测量" disabled />
        </ButtonGroup>
      </div>
    </div>
  );
};

export default Toolbar;
