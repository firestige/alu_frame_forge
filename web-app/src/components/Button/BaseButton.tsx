import React from 'react';

export interface BaseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

/**
 * BaseButton - 最原始的按钮架构，对外开放全部 HTML Button API
 * 不包含任何默认样式，完全由使用者控制
 */
const BaseButton: React.FC<BaseButtonProps> = ({ children, ...props }) => {
  return <button {...props}>{children}</button>;
};

export default BaseButton;
