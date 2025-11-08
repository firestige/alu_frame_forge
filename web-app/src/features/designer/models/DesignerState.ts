/**
 * 设计器状态模型
 * 定义设计器的核心状态类型
 */

import type { Vector3, Euler } from '@/core/renderer/renderer-types';

/**
 * 工具类型
 */
export const ToolType = {
  SELECT: 'select', // 选择工具
  CREATE_CUBE: 'create_cube', // 创建立方体
  CREATE_BOX: 'create_box', // 创建长方体
  CREATE_ALUMINUM_PROFILE: 'create_aluminum_profile', // 创建铝型材
  CREATE_PANEL: 'create_panel', // 创建面板
  CREATE_CONNECTOR: 'create_connector', // 创建连接件
  CAMERA: 'camera', // 相机控制
} as const;

export type ToolType = (typeof ToolType)[keyof typeof ToolType];

/**
 * 相机视图类型
 */
export const CameraViewType = {
  PERSPECTIVE: 'perspective', // 透视视图
  FRONT: 'front', // 前视图
  BACK: 'back', // 后视图
  LEFT: 'left', // 左视图
  RIGHT: 'right', // 右视图
  TOP: 'top', // 俯视图
  BOTTOM: 'bottom', // 仰视图
} as const;

export type CameraViewType =
  (typeof CameraViewType)[keyof typeof CameraViewType];

/**
 * 相机状态
 */
export interface CameraState {
  /** 相机位置 */
  position: Vector3;
  /** 相机目标点 */
  target: Vector3;
  /** 相机旋转 */
  rotation?: Euler;
  /** 视图类型 */
  viewType: CameraViewType;
  /** 缩放级别 */
  zoom: number;
}

/**
 * 工具状态
 */
export interface ToolState {
  /** 当前激活的工具 */
  activeTool: ToolType;
  /** 工具选项 */
  options?: Record<string, unknown>;
}

/**
 * 选择状态
 */
export interface SelectionState {
  /** 当前选中的模型ID列表 */
  selectedModelIds: string[];
  /** 最后选中的模型ID */
  lastSelectedModelId: string | null;
}

/**
 * 场景状态
 */
export interface SceneState {
  /** 场景是否已加载 */
  isLoaded: boolean;
  /** 场景是否有未保存的更改 */
  hasUnsavedChanges: boolean;
  /** 场景文件路径 */
  filePath?: string;
}

/**
 * 网格辅助线状态
 */
export interface GridState {
  /** 是否显示网格 */
  visible: boolean;
  /** 网格大小 */
  size: number;
  /** 网格分段数 */
  divisions: number;
}

/**
 * 吸附设置
 */
export interface SnapSettings {
  /** 是否启用位置吸附 */
  enablePositionSnap: boolean;
  /** 位置吸附步长 */
  positionSnapStep: number;
  /** 是否启用角度吸附 */
  enableAngleSnap: boolean;
  /** 角度吸附步长（度） */
  angleSnapStep: number;
  /** 是否启用对象吸附 */
  enableObjectSnap: boolean;
}

/**
 * 完整的设计器状态
 */
export interface DesignerState {
  /** 工具状态 */
  tool: ToolState;
  /** 相机状态 */
  camera: CameraState;
  /** 选择状态 */
  selection: SelectionState;
  /** 场景状态 */
  scene: SceneState;
  /** 网格状态 */
  grid: GridState;
  /** 吸附设置 */
  snap: SnapSettings;
}

/**
 * 默认设计器状态
 */
export const defaultDesignerState: DesignerState = {
  tool: {
    activeTool: ToolType.SELECT,
  },
  camera: {
    position: { x: 10, y: 10, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    viewType: CameraViewType.PERSPECTIVE,
    zoom: 1,
  },
  selection: {
    selectedModelIds: [],
    lastSelectedModelId: null,
  },
  scene: {
    isLoaded: false,
    hasUnsavedChanges: false,
  },
  grid: {
    visible: true,
    size: 100,
    divisions: 10,
  },
  snap: {
    enablePositionSnap: true,
    positionSnapStep: 1,
    enableAngleSnap: true,
    angleSnapStep: 15,
    enableObjectSnap: true,
  },
};
