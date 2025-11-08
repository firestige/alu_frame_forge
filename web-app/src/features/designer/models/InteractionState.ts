/**
 * 交互状态模型
 * 定义设计器的用户交互状态
 */

import type { Vector3 } from '@/core/renderer/renderer-types';

/**
 * 上下文菜单状态
 */
export interface ContextMenuState {
  /** 是否显示 */
  visible: boolean;
  /** 菜单位置（屏幕坐标） */
  position?: {
    x: number;
    y: number;
  };
  /** 目标模型ID */
  targetModelId?: string;
  /** 菜单项 */
  items?: ContextMenuItem[];
}

/**
 * 上下文菜单项
 */
export interface ContextMenuItem {
  /** 菜单项ID */
  id: string;
  /** 显示标签 */
  label: string;
  /** 图标（可选） */
  icon?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击处理函数 */
  onClick: () => void;
  /** 分隔线 */
  divider?: boolean;
}

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽的模型ID */
  modelId?: string;
  /** 拖拽起始位置（世界坐标） */
  startPosition?: Vector3;
  /** 当前拖拽位置（世界坐标） */
  currentPosition?: Vector3;
  /** 拖拽偏移量 */
  offset?: Vector3;
}

/**
 * 高亮状态
 */
export interface HighlightState {
  /** 当前高亮的模型ID */
  highlightedModelId: string | null;
  /** 高亮类型 */
  highlightType?: 'hover' | 'selected' | 'error';
}

/**
 * 预览状态（创建模型时的预览）
 */
export interface PreviewState {
  /** 是否显示预览 */
  visible: boolean;
  /** 预览对象类型 */
  objectType?: string;
  /** 预览位置 */
  position?: Vector3;
  /** 预览参数 */
  parameters?: Record<string, unknown>;
}

/**
 * 面板状态
 */
export interface PanelState {
  /** 左侧边栏是否展开 */
  leftSidebarOpen: boolean;
  /** 右侧边栏是否展开 */
  rightSidebarOpen: boolean;
  /** 属性面板是否展开 */
  propertyPanelOpen: boolean;
  /** 当前激活的面板ID */
  activePanelId?: string;
}

/**
 * 加载状态
 */
export interface LoadingState {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载消息 */
  message?: string;
  /** 加载进度（0-100） */
  progress?: number;
}

/**
 * 完整的交互状态
 */
export interface InteractionState {
  /** 上下文菜单状态 */
  contextMenu: ContextMenuState;
  /** 拖拽状态 */
  drag: DragState;
  /** 高亮状态 */
  highlight: HighlightState;
  /** 预览状态 */
  preview: PreviewState;
  /** 面板状态 */
  panel: PanelState;
  /** 加载状态 */
  loading: LoadingState;
}

/**
 * 默认交互状态
 */
export const defaultInteractionState: InteractionState = {
  contextMenu: {
    visible: false,
  },
  drag: {
    isDragging: false,
  },
  highlight: {
    highlightedModelId: null,
  },
  preview: {
    visible: false,
  },
  panel: {
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    propertyPanelOpen: false,
  },
  loading: {
    isLoading: false,
  },
};
