import type { ToolbarAction } from '../types/toolbar';

/**
 * 变换工具工具栏配置
 */
export const TRANSFORM_TOOLBAR_CONFIG: ToolbarAction[] = [
  {
    id: 'select',
    label: '选择',
    icon: '👆',
    command: 'command:tool:change',
    payload: 'select',
    tooltip: '选择工具',
  },
  {
    id: 'translate',
    label: '移动',
    icon: '✋',
    command: 'command:tool:change',
    payload: 'translate',
    tooltip: '平移工具',
  },
  {
    id: 'rotate',
    label: '旋转',
    icon: '🔄',
    command: 'command:tool:change',
    payload: 'rotate',
    tooltip: '旋转工具',
  },
  {
    id: 'scale',
    label: '缩放',
    icon: '📏',
    command: 'command:tool:change',
    payload: 'scale',
    tooltip: '缩放工具',
  },
];
