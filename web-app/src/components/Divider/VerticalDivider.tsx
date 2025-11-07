import React from 'react';

export interface VerticalDividerProps {
  className?: string;
}

/**
 * VerticalDivider - 垂直分隔线
 * 用于工具栏或其他水平布局中分隔元素
 */
const VerticalDivider: React.FC<VerticalDividerProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`w-px h-6 bg-secondary-300 ${className}`}
      role="separator"
      aria-orientation="vertical"
    />
  );
};

export default VerticalDivider;
