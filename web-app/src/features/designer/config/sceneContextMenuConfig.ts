import type { MenuAction } from '../types/contextMenu';

/**
 * 场景空白处右键菜单配置
 *
 * 用于 3D 场景空白区域的右键菜单
 */
export const SCENE_CONTEXT_MENU: MenuAction[] = [
  {
    id: 'paste',
    label: '粘贴',
    icon: '📋',
    command: 'command:model:paste',
    shortcut: 'Ctrl+V',
    disabled: ctx => !ctx.hasClipboard,
  },
  { separator: true },
  {
    id: 'camera-reset',
    label: '重置相机',
    icon: '📷',
    command: 'command:camera:reset',
    payload: { animated: true },
    shortcut: 'H',
  },
  {
    id: 'camera-frame-all',
    label: '框选全部',
    icon: '🔍',
    command: 'command:camera:frameAll',
    payload: { animated: true },
    shortcut: 'F',
  },
  { separator: true },
  {
    id: 'view-front',
    label: '前视图',
    icon: '⬆️',
    command: 'command:camera:setPreset',
    payload: { preset: 'front', animated: true },
    shortcut: '1',
  },
  {
    id: 'view-back',
    label: '后视图',
    icon: '⬇️',
    command: 'command:camera:setPreset',
    payload: { preset: 'back', animated: true },
    shortcut: 'Ctrl+1',
  },
  {
    id: 'view-left',
    label: '左视图',
    icon: '⬅️',
    command: 'command:camera:setPreset',
    payload: { preset: 'left', animated: true },
    shortcut: '3',
  },
  {
    id: 'view-right',
    label: '右视图',
    icon: '➡️',
    command: 'command:camera:setPreset',
    payload: { preset: 'right', animated: true },
    shortcut: 'Ctrl+3',
  },
  {
    id: 'view-top',
    label: '俯视图',
    icon: '🔝',
    command: 'command:camera:setPreset',
    payload: { preset: 'top', animated: true },
    shortcut: '7',
  },
  {
    id: 'view-bottom',
    label: '仰视图',
    icon: '🔽',
    command: 'command:camera:setPreset',
    payload: { preset: 'bottom', animated: true },
    shortcut: 'Ctrl+7',
  },
  { separator: true },
  {
    id: 'view-isometric',
    label: '等轴测视图',
    icon: '📐',
    command: 'command:camera:setPreset',
    payload: { preset: 'isometric', animated: true },
    shortcut: '9',
  },
  { separator: true },
  {
    id: 'select-all',
    label: '全选',
    icon: '✅',
    command: 'command:selection:selectAll',
    shortcut: 'Ctrl+A',
  },
];
