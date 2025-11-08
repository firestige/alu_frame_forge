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
 * 射线检测结果
 */
export interface RaycastHit {
  handle: RenderHandle;
  point: Vector3;
  distance: number;
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
   * 从屏幕坐标进行射线检测
   * @param mousePosition 归一化的鼠标位置 (-1 到 1)
   * @param filterFn 可选的过滤函数，用于筛选可检测对象
   */
  raycastFromScreen(
    mousePosition: Vector2,
    filterFn?: (userData: Record<string, unknown>) => boolean
  ): RaycastHit[];

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
