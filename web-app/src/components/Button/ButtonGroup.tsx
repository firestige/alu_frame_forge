import React from 'react';

export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ButtonGroup - 按钮组容器
 * 用于将相关的按钮组织在一起，统一间距
 */
const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="group">
      {children}
    </div>
  );
};

export default ButtonGroup;
