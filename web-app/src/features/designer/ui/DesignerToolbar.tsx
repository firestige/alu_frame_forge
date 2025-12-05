import * as React from 'react';
import { sendCommand } from '@/core/services/eventBus';
import { useDesignerContext } from '../hooks/useDesignerContext';
import type { ProfileAsset } from '@/core/asset';
import ProfileDropdownPanel from './components/ProfileDropdownPanel';
import { Popover } from '@/components/Popover';

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
  isOpen?: boolean; // 新增：允许父组件控制
  onOpenChange?: (isOpen: boolean) => void; // 新增：通知父组件状态变化
}

const ToolButtonWithDropdown: React.FC<ToolButtonWithDropdownProps> = ({
  icon,
  label,
  variant = 'default',
  disabled = false,
  dropdownContent,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const variantStyles = {
    default: 'bg-slate-700 hover:bg-slate-600',
    primary: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
  };

  const handleButtonClick = () => {
    if (!disabled) {
      const newIsOpen = !isOpen;
      if (onOpenChange) {
        onOpenChange(newIsOpen);
      } else {
        setInternalIsOpen(newIsOpen);
      }
    }
  };

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <>
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

      {/* 使用 Popover 组件替代自定义定位逻辑 */}
      <Popover
        open={isOpen}
        anchorEl={buttonRef.current}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        offset={{ y: 8 }}
        onClose={handleClose}
        className="w-[480px] max-h-[640px] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
      >
        {dropdownContent}
      </Popover>
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
  // 当前选中的工具（UI 状态）
  selectedTool: 'select' | 'translate' | 'rotate' | 'scale';
  onToolChange: (tool: 'select' | 'translate' | 'rotate' | 'scale') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ selectedTool, onToolChange }) => {
  // 获取 AssetService
  const { services } = useDesignerContext();
  const assetService = services.objectManager.getAssetService();

  // 型材相关状态
  const [activeSeries, setActiveSeries] = React.useState<number>(20);
  const [profiles, setProfiles] = React.useState<ProfileAsset[]>([]);
  const [availableSeries, setAvailableSeries] = React.useState<number[]>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] =
    React.useState(false);

  // 加载型材数据
  React.useEffect(() => {
    if (isProfileDropdownOpen) {
      const series = assetService.getAvailableSeries();
      setAvailableSeries(series);

      const profilesData = assetService.getProfilesBySeries(activeSeries);
      setProfiles(profilesData);
    }
  }, [isProfileDropdownOpen, activeSeries, assetService]);

  const handleCreateCube = () => {
    sendCommand('command:create:cube', undefined);
  };

  const handleCreateBox = () => {
    sendCommand('command:create:box', undefined);
  };

  const handleSelectProfile = (assetId: string) => {
    sendCommand('command:create:profile:prepare', {
      assetId,
      mode: 'interactive',
    });
    setIsProfileDropdownOpen(false);
  };

  const handleCreatePanel = () => {
    sendCommand('command:create:panel', undefined);
  };

  const handleCreateConnector = () => {
    sendCommand('command:create:connector', undefined);
  };

  const handleResetCamera = () => {
    sendCommand('command:camera:reset', undefined);
  };

  return (
    <div className="w-full bg-slate-800 border-b border-slate-700 shadow-lg">
      <div className="flex items-start py-2 overflow-x-auto">
        {/* 基础工具 */}
        <ButtonGroup title="工具">
          <ToolButton
            icon="👆"
            label="选择"
            active={selectedTool === 'select'}
            onClick={() => onToolChange('select')}
          />
          <ToolButton
            icon="✋"
            label="移动"
            active={selectedTool === 'translate'}
            onClick={() => onToolChange('translate')}
          />
          <ToolButton
            icon="🔄"
            label="旋转"
            active={selectedTool === 'rotate'}
            onClick={() => onToolChange('rotate')}
          />
          <ToolButton
            icon="📏"
            label="缩放"
            active={selectedTool === 'scale'}
            onClick={() => onToolChange('scale')}
          />
        </ButtonGroup>

        {/* 模型创建 */}
        <ButtonGroup title="插入">
          <ToolButton
            icon="📦"
            label="立方体"
            onClick={handleCreateCube}
            variant="success"
          />
          <ToolButton
            icon="⬛"
            label="长方体"
            onClick={handleCreateBox}
            variant="success"
          />
          <ToolButtonWithDropdown
            icon="🔩"
            label="铝型材"
            variant="warning"
            isOpen={isProfileDropdownOpen}
            onOpenChange={setIsProfileDropdownOpen}
            dropdownContent={
              <ProfileDropdownPanel
                availableSeries={availableSeries}
                activeSeries={activeSeries}
                profiles={profiles}
                onSeriesChange={setActiveSeries}
                onSelectProfile={handleSelectProfile}
              />
            }
          />
          <ToolButton icon="🪟" label="面板" onClick={handleCreatePanel} />
          <ToolButton
            icon="🔗"
            label="连接件"
            onClick={handleCreateConnector}
          />
        </ButtonGroup>

        {/* 场景操作 */}
        <ButtonGroup title="视图">
          <ToolButton icon="📷" label="重置相机" onClick={handleResetCamera} />
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
