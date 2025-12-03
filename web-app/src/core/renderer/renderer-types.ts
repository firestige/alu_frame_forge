/**
 * 渲染器抽象接口
 * 用于解耦具体的 3D 渲染库（如 Three.js、Babylon.js 等）
 *
 * 设计原则：
 * 1. 只定义当前需要的核心接口
 * 2. 实体管理器通过通用数据格式与渲染器交互
 * 3. UI 层通过事件总线（mitt）与渲染器解耦
 */

// ==================== 基础类型 ====================

/**
 * 3D 向量（位置、方向等）
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 欧拉角（旋转）
 */
export interface Euler {
  x: number;
  y: number;
  z: number;
  order?: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
}

/**
 * 四元数（旋转）
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * 2D 向量（鼠标位置等）
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 颜色（十六进制数字）
 */
export type ColorHex = number;

// ==================== 相机视角控制 ====================

/**
 * 标准相机预设（26个标准位置）
 * 支持面（6个）、棱（12个）、角（8个）视图
 */
export enum CameraPreset {
  // === 6 个面视图 ===
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',

  // === 12 个棱视图 ===
  FRONT_TOP = 'front-top',
  FRONT_BOTTOM = 'front-bottom',
  FRONT_LEFT = 'front-left',
  FRONT_RIGHT = 'front-right',
  BACK_TOP = 'back-top',
  BACK_BOTTOM = 'back-bottom',
  BACK_LEFT = 'back-left',
  BACK_RIGHT = 'back-right',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',

  // === 8 个角视图 ===
  FRONT_TOP_LEFT = 'front-top-left',
  FRONT_TOP_RIGHT = 'front-top-right',
  FRONT_BOTTOM_LEFT = 'front-bottom-left',
  FRONT_BOTTOM_RIGHT = 'front-bottom-right',
  BACK_TOP_LEFT = 'back-top-left',
  BACK_TOP_RIGHT = 'back-top-right',
  BACK_BOTTOM_LEFT = 'back-bottom-left',
  BACK_BOTTOM_RIGHT = 'back-bottom-right',

  // === 常用等轴测 ===
  ISOMETRIC = 'isometric', // 等同于 FRONT_TOP_RIGHT
  ISOMETRIC_ALT = 'isometric-alt', // 等同于 BACK_TOP_LEFT
}

/**
 * 视角描述符 - 统一的视角定义格式
 * 支持从预设枚举或自由向量创建
 */
export interface ViewDescriptor {
  /** 相机位置 */
  position: Vector3;
  /** 观察目标点 */
  target: Vector3;
  /** 上方向（用于特殊视图如顶视图） */
  up?: Vector3;
  /** 视角名称（用于 UI 显示） */
  name?: string;
  /** 预设标识（如果是预设视角） */
  preset?: CameraPreset;
}

/**
 * 包围盒
 */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

// ==================== 渲染对象 ====================

/**
 * 渲染对象句柄
 * 抽象表示，具体实现由渲染器决定
 */
export type RenderHandle = string | number | symbol;

/**
 * 场景句柄
 */
export type SceneHandle = RenderHandle;

/**
 * 相机句柄
 */
export type CameraHandle = RenderHandle;

// ==================== 渲染器配置 ====================

/**
 * 渲染器初始化配置
 */
export interface RendererConfig {
  container: HTMLElement;
  backgroundColor?: string; // 支持 hex 字符串 "#222222" 或 CSS 颜色名
  enableShadow?: boolean;
  antialias?: boolean;
  camera?: CameraConfig;
  orbitControls?: OrbitControlsConfig;
}

/**
 * 相机配置
 */
export interface CameraConfig {
  position?: Vector3;
  lookAt?: Vector3;
  fov?: number;
  near?: number;
  far?: number;
}

/**
 * 轨道控制器配置
 */
export interface OrbitControlsConfig {
  enabled?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
}

// ==================== 射线检测 ====================

/**
 * 工作平面配置
 * 用于定义一个虚拟平面，通常垂直于相机视线
 */
export interface WorkPlaneConfig {
  /** 平面法线（单位向量） */
  normal: Vector3;
  /** 平面上的一个点（用于定位平面） */
  point: Vector3;
}

/**
 * 射线检测结果
 */
export interface RaycastHit {
  /** 对象句柄（如果命中场景对象） */
  handle?: string;

  /** 交点世界坐标 */
  point: Vector3;

  /** 命中点的法线 */
  normal?: Vector3;

  /** 距离相机的距离 */
  distance: number;

  /** 是否命中工作平面 */
  isWorkPlane?: boolean;

  /** 用户数据（对象的 userData） */
  userData?: Record<string, unknown>;
}

// ==================== 渲染器核心接口 ====================

/**
 * 3D 渲染器核心接口
 * 只包含当前必需的功能
 */
export interface IRenderer {
  // ==================== 生命周期 ====================

  /**
   * 初始化渲染器
   */
  initialize(config: RendererConfig): void;

  /**
   * 销毁渲染器，释放资源
   */
  dispose(): void;

  /**
   * 调整渲染器大小
   */
  resize(width: number, height: number): void;

  // ==================== 场景管理 ====================

  /**
   * 获取主场景句柄
   */
  getScene(): SceneHandle;

  /**
   * 设置背景色
   */
  setBackgroundColor(color: ColorHex): void;

  /**
   * 添加网格辅助器
   */
  addGridHelper(size?: number, divisions?: number): void;

  /**
   * 添加坐标轴辅助器
   */
  addAxesHelper(size?: number): void;

  /**
   * 启用网格辅助器（如果已存在则直接显示）
   */
  enableGridHelper(size?: number, divisions?: number): void;

  /**
   * 启用坐标轴辅助器（如果已存在则直接显示）
   */
  enableAxesHelper(size?: number): void;

  // ==================== 场景对象管理 ====================

  /**
   * 添加对象到场景
   * @param object 渲染对象句柄（通常是原生对象）
   * @param userData 用户数据（用于标识和过滤）
   */
  addObject(object: unknown, userData?: Record<string, unknown>): void;

  /**
   * 从场景移除对象
   * @param object 渲染对象句柄
   */
  removeObject(object: unknown): void;

  /**
   * 更新对象变换
   * @param object 渲染对象句柄
   * @param transform 变换数据
   */
  updateObjectTransform(
    object: unknown,
    transform: {
      position?: Vector3;
      rotation?: Euler;
      scale?: Vector3;
    }
  ): void;

  /**
   * 设置对象可见性
   * @param object 渲染对象句柄
   * @param visible 是否可见
   */
  setObjectVisibility(object: unknown, visible: boolean): void;

  /**
   * 销毁对象资源
   * @param object 渲染对象句柄
   */
  disposeObject(object: unknown): void;

  /**
   * 高亮对象（添加发光效果）
   * @param object 渲染对象句柄
   * @param color 高亮颜色（十六进制）
   * @param intensity 发光强度（0-1）
   */
  highlightObject(object: unknown, color?: ColorHex, intensity?: number): void;

  /**
   * 取消对象高亮
   * @param object 渲染对象句柄
   */
  unhighlightObject(object: unknown): void;

  // ==================== 相机管理 ====================

  /**
   * 获取主相机句柄
   */
  getCamera(): CameraHandle;

  /**
   * 设置相机位置
   */
  setCameraPosition(position: Vector3): void;

  /**
   * 设置相机观察目标
   */
  setCameraLookAt(target: Vector3): void;

  /**
   * 重置相机到初始位置
   */
  resetCamera(): void;

  // ==================== 轨道控制器 ====================

  /**
   * 启用轨道控制器
   */
  enableOrbitControls(config?: OrbitControlsConfig): void;

  /**
   * 禁用轨道控制器
   */
  disableOrbitControls(): void;

  // ==================== 射线检测（交互） ====================

  /**
   * 从归一化设备坐标（NDC）进行射线检测
   * @param ndc 归一化设备坐标 {x: -1~1, y: -1~1}
   * @param options 可选配置
   * @returns 射线检测结果数组，按距离排序
   */
  raycastFromNDC(
    ndc: Vector2,
    options?: {
      /** 忽略的对象句柄列表 */
      ignoreHandles?: string[];
      /** 是否包含辅助对象（网格、坐标轴等） */
      includeHelpers?: boolean;
      /** 是否检测工作平面 */
      includeWorkPlane?: boolean;
      /** 工作平面配置 */
      workPlane?: WorkPlaneConfig;
    }
  ): RaycastHit[];

  /**
   * 从屏幕坐标进行射线检测
   * @param screenX 屏幕 X 坐标（clientX）
   * @param screenY 屏幕 Y 坐标（clientY）
   * @param viewport 视口信息
   * @param options 检测选项
   * @returns 射线检测结果数组，按距离排序
   */
  raycastFromScreen(
    screenX: number,
    screenY: number,
    viewport: { left: number; top: number; width: number; height: number },
    options?: {
      /** 忽略的对象句柄列表 */
      ignoreHandles?: string[];
      /** 是否包含辅助对象（网格、坐标轴等） */
      includeHelpers?: boolean;
      /** 是否检测工作平面 */
      includeWorkPlane?: boolean;
      /** 工作平面配置 */
      workPlane?: WorkPlaneConfig;
    }
  ): RaycastHit[];

  // ==================== 预览对象管理 ====================

  /**
   * 添加预览对象到场景（半透明显示）
   * @param handle 对象句柄（用于后续操作）
   * @param object 渲染对象（由 GeometryFactory 创建）
   * @param options 预览选项
   */
  addPreviewObject(
    handle: string,
    object: unknown,
    options?: {
      color?: number;
      opacity?: number;
    }
  ): void;

  /**
   * 更新预览对象的变换
   * @param handle 对象句柄
   * @param transform 变换数据
   */
  updatePreviewTransform(
    handle: string,
    transform: {
      position?: Vector3;
      rotation?: Euler | Quaternion;
      scale?: Vector3;
    }
  ): void;

  /**
   * 移除预览对象
   * @param handle 对象句柄
   */
  removePreviewObject(handle: string): void;

  /**
   * 设置预览对象的样式
   * @param handle 对象句柄
   * @param style 样式选项
   */
  setPreviewStyle(
    handle: string,
    style: {
      color?: number;
      opacity?: number;
    }
  ): void;

  // ==================== 渲染循环 ====================

  /**
   * 启动渲染循环
   */
  startRenderLoop(callback?: () => void): void;

  /**
   * 停止渲染循环
   */
  stopRenderLoop(): void;

  /**
   * 手动渲染一帧
   */
  render(): void;

  // ==================== 原生对象访问（用于高级场景） ====================

  /**
   * 获取原生场景对象
   * 用于 ObjectManager 直接操作场景
   */
  getNativeScene(): unknown;

  /**
   * 获取原生相机对象
   * 用于特殊相机操作
   */
  getNativeCamera(): unknown;
}

/**
 * 渲染器工厂接口
 */
export interface IRendererFactory {
  createRenderer(): IRenderer;
}
