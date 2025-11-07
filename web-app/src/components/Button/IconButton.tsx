import React from 'react';
import BaseButton, { type BaseButtonProps } from './BaseButton';

export interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  icon: React.ReactNode;
}

/**
 * IconButton - 圆形图标按钮
 * 提供一个图标位置，适合放置单个图标
 */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  className = '',
  ...props
}) => {
  return (
    <BaseButton
      className={`inline-flex items-center justify-center p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors ${className}`}
      {...props}
    >
      {icon}
    </BaseButton>
  );
};

export default IconButton;
