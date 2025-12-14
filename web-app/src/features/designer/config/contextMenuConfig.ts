import type { MenuAction, MenuContext } from '../types/contextMenu';

/**
 * 对象右键菜单配置
 */
export const OBJECT_CONTEXT_MENU: MenuAction[] = [
  {
    id: 'edit-parameters',
    label: '编辑参数',
    icon: '⚙️',
    command: 'command:model:editParameters',
    payload: (ctx: MenuContext) => ctx.objectId,
    shortcut: 'E',
  },
  { separator: true },
  {
    id: 'properties',
    label: '属性',
    icon: '✏️',
    command: 'command:model:showProperties',
    payload: (ctx: MenuContext) => ctx.objectId,
  },
  {
    id: 'translate',
    label: '移动',
    icon: '↔️',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'translate' }),
    shortcut: 'W',
  },
  {
    id: 'rotate',
    label: '旋转',
    icon: '🔄',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'rotate' }),
    shortcut: 'E',
  },
  {
    id: 'scale',
    label: '缩放',
    icon: '📏',
    command: 'command:transform:setMode',
    payload: () => ({ mode: 'scale' }),
    shortcut: 'R',
  },
  { separator: true },
  {
    id: 'duplicate',
    label: '复制',
    icon: '📋',
    command: 'command:model:duplicate',
    payload: (ctx: MenuContext) => ctx.objectId,
    shortcut: 'Ctrl+D',
  },
  {
    id: 'visibility',
    label: '显示/隐藏',
    icon: '👁️',
    command: 'command:model:toggleVisibility',
    payload: (ctx: MenuContext) => ctx.objectId,
  },
  { separator: true },
  {
    id: 'delete',
    label: '删除',
    icon: '🗑️',
    command: 'command:model:delete',
    payload: (ctx: MenuContext) => ctx.objectId,
    shortcut: 'Delete',
    danger: true,
  },
];

/**
 * 场景空白处右键菜单配置
 */
export const SCENE_CONTEXT_MENU: MenuAction[] = [
  {
    id: 'create-profile',
    label: '创建铝型材',
    icon: '🔩',
    command: 'command:create:aluminumProfile',
  },
  {
    id: 'create-cube',
    label: '创建立方体',
    icon: '📦',
    command: 'command:create:cube',
  },
  {
    id: 'create-panel',
    label: '创建面板',
    icon: '🔲',
    command: 'command:create:panel',
  },
  { separator: true },
  {
    id: 'view-reset',
    label: '重置视角',
    icon: '🏠',
    command: 'command:camera:reset',
    payload: { animated: true },
    shortcut: 'H',
  },
  {
    id: 'view-iso',
    label: '等轴测视图',
    icon: '📐',
    command: 'command:camera:setPreset',
    payload: { preset: 'isometric' },
    shortcut: '7',
  },
];
