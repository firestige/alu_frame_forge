import * as React from 'react';
import { useCommand } from '@/features/designer/hooks/useCommand';
import { PopoverMenu } from '@/components/Popover';
import type {
  MenuAction,
  MenuContext,
} from '@/features/designer/types/contextMenu';

export interface CommandContextMenuProps {
  /** 菜单操作项列表（配置数据） */
  actions: MenuAction[];

  /** 上下文信息（用于动态 payload 和 disabled） */
  context: MenuContext;

  /** 菜单位置 */
  position: { x: number; y: number };

  /** 是否显示 */
  open: boolean;

  /** 关闭回调 */
  onClose: () => void;
}

/**
 * CommandContextMenu - 数据驱动的右键菜单组件
 *
 * 通过配置数据渲染右键菜单，点击菜单项时发送对应命令
 *
 * @example
 * <CommandContextMenu
 *   actions={OBJECT_CONTEXT_MENU}
 *   context={{ objectId: 'obj-1' }}
 *   position={{ x: 100, y: 200 }}
 *   open={true}
 *   onClose={handleClose}
 * />
 */
export const CommandContextMenu: React.FC<CommandContextMenuProps> = ({
  actions,
  context,
  position,
  open,
  onClose,
}) => {
  const { send } = useCommand();

  const handleActionClick = (action: MenuAction) => {
    // 类型守卫：确保不是分隔符
    if ('separator' in action && action.separator) return;

    // 检查是否禁用
    const disabled =
      typeof action.disabled === 'function'
        ? action.disabled(context)
        : action.disabled;

    if (disabled) return;

    // 计算 payload
    const payload =
      typeof action.payload === 'function'
        ? action.payload(context)
        : action.payload;

    // 发送命令
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send(action.command as any, payload);

    // 关闭菜单
    onClose();
  };

  return (
    <PopoverMenu open={open} position={position} onClose={onClose}>
      <div className="py-1 min-w-[180px]">
        {actions.map((action, index) => {
          if ('separator' in action && action.separator) {
            return (
              <div
                key={`separator-${index}`}
                className="h-px bg-gray-200 my-1"
              />
            );
          }

          // 类型守卫后，action 确定是非分隔符类型
          const isDisabled =
            typeof action.disabled === 'function'
              ? action.disabled(context)
              : action.disabled;

          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={isDisabled}
              className={`
                w-full px-3 py-2 text-sm text-left flex items-center gap-2
                transition-colors
                ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100 cursor-pointer'
                }
                ${action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {action.icon && <span>{action.icon}</span>}
              <span className="flex-1">{action.label}</span>
              {action.shortcut && (
                <span className="text-xs text-gray-400">{action.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </PopoverMenu>
  );
};
