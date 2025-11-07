import React from 'react';
import BaseButton, { type BaseButtonProps } from './BaseButton';

export interface OutlinedButtonProps extends BaseButtonProps {
  children: React.ReactNode;
}

/**
 * OutlinedButton - 线框扁平按钮
 * 提供边框样式，背景透明，适合次要操作
 */
const OutlinedButton: React.FC<OutlinedButtonProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <BaseButton
      className={`border border-primary-500 text-primary-500 bg-transparent py-2 px-4 rounded hover:bg-primary-50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </BaseButton>
  );
};

export default OutlinedButton;
