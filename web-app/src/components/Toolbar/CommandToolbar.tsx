import * as React from 'react';
import { useCommand } from '@/features/designer/hooks/useCommand';
import { IconButton } from '@/components/Button';
import type { ToolbarAction } from '@/features/designer/types/toolbar';

export interface CommandToolbarProps {
  /** 工具栏操作项列表（配置数据） */
  actions: ToolbarAction[];

  /** 当前激活的操作 ID */
  activeId?: string;

  /** 自定义类名 */
  className?: string;
}

/**
 * CommandToolbar - 数据驱动的通用工具栏组件
 *
 * 通过配置数据渲染工具栏，点击按钮时发送对应命令
 *
 * @example
 * <CommandToolbar
 *   actions={TRANSFORM_TOOLBAR_CONFIG}
 *   activeId="translate"
 * />
 */
export const CommandToolbar: React.FC<CommandToolbarProps> = ({
  actions,
  activeId,
  className = '',
}) => {
  const { send } = useCommand();

  const handleActionClick = (action: ToolbarAction) => {
    if (action.disabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send(action.command as any, action.payload);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {actions.map(action => {
        const isActive = action.id === activeId;
        return (
          <IconButton
            key={action.id}
            icon={action.icon}
            disabled={action.disabled}
            onClick={() => handleActionClick(action)}
            title={action.tooltip}
            aria-label={action.label || action.tooltip}
            className={isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}
          />
        );
      })}
    </div>
  );
};
