import * as React from 'react';
import { Popover, type PopoverProps } from './Popover';

/**
 * PopoverMenu 组件属性
 * 继承 Popover 的所有属性
 */
export type PopoverMenuProps = PopoverProps;

/**
 * PopoverMenu 菜单包装组件
 * 
 * 在 Popover 基础上预设菜单样式（背景色、圆角、阴影、边框），
 * 简化 menu 场景的使用。
 * 
 * @example
 * <PopoverMenu
 *   open={contextMenu.visible}
 *   position={{ x: contextMenu.x, y: contextMenu.y }}
 *   onClose={handleClose}
 * >
 *   <div className="py-1">
 *     <button className="menu-item">编辑</button>
 *     <button className="menu-item">删除</button>
 *   </div>
 * </PopoverMenu>
 */
export const PopoverMenu: React.FC<PopoverMenuProps> = (props) => {
  const { className = '', children, ...restProps } = props;

  // 预设菜单样式
  const menuClassName = `bg-white rounded-lg shadow-lg border border-gray-200 ${className}`;

  return (
    <Popover {...restProps} className={menuClassName}>
      {children}
    </Popover>
  );
};
