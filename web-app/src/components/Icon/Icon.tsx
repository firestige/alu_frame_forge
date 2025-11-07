import React from 'react';

export interface IconProps {
  icon: string; // iconify icon name, e.g., "mdi:home" or "heroicons:home"
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icon - Iconify 图标组件
 * 使用 Tailwind Iconify 插件渲染图标
 */
const Icon: React.FC<IconProps> = ({ icon, className = '', style }) => {
  return (
    <span className={`iconify ${className}`} data-icon={icon} style={style} />
  );
};

export default Icon;
