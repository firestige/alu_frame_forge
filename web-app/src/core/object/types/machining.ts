import { MachiningOpType } from './enums';

/**
 * 加工操作基础接口
 * 所有加工操作的共同属性
 */
interface BaseMachiningOperation {
  /** 操作唯一标识 */
  id: string;
  /** 操作类型 */
  type: MachiningOpType;
  /** 沿型材长度方向的位置 (mm)，0 为起点 */
  position: number;
  /** 操作名称（可选，用于显示） */
  name?: string;
}

/**
 * 打孔操作
 * 在型材表面钻孔
 */
export interface HoleOperation extends BaseMachiningOperation {
  type: typeof MachiningOpType.HOLE;
  parameters: {
    /** 孔径 (mm) */
    diameter: number;
    /** 孔深 (mm)，-1 表示通孔 */
    depth: number;
    /** 钻孔角度（相对于型材轴线，度） */
    angle: number;
    /** 钻孔面 */
    face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
    /** 孔中心偏移（相对于面中心，mm） */
    offset?: {
      x: number;
      y: number;
    };
  };
}

/**
 * 切角操作
 * 在型材边缘倒角
 */
export interface ChamferOperation extends BaseMachiningOperation {
  type: typeof MachiningOpType.CHAMFER;
  parameters: {
    /** 倒角长度 (mm) */
    length: number;
    /** 倒角角度（度） */
    angle: number;
    /** 倒角边 */
    edge: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** 倒角类型 */
    chamferType: 'linear' | 'arc';
  };
}

/**
 * 攻丝操作
 * 在孔内加工螺纹
 */
export interface ThreadOperation extends BaseMachiningOperation {
  type: typeof MachiningOpType.THREAD;
  parameters: {
    /** 螺纹规格，如 "M5", "M6" */
    spec: string;
    /** 螺纹深度 (mm) */
    depth: number;
    /** 加工面 */
    face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
    /** 螺纹中心位置偏移 */
    offset?: {
      x: number;
      y: number;
    };
    /** 是否为通孔螺纹 */
    through?: boolean;
  };
}

/**
 * 槽口操作
 * 在型材表面开槽
 */
export interface NotchOperation extends BaseMachiningOperation {
  type: typeof MachiningOpType.NOTCH;
  parameters: {
    /** 槽口宽度 (mm) */
    width: number;
    /** 槽口深度 (mm) */
    depth: number;
    /** 槽口长度 (mm) */
    length: number;
    /** 加工面 */
    face: 'top' | 'bottom' | 'left' | 'right';
    /** 槽口形状 */
    shape: 'rectangular' | 'u-shaped' | 'v-shaped';
  };
}

/**
 * 加工操作联合类型
 */
export type MachiningOperation =
  | HoleOperation
  | ChamferOperation
  | ThreadOperation
  | NotchOperation;

/**
 * 加工操作辅助函数：创建打孔操作
 */
export function createHoleOperation(
  position: number,
  params: HoleOperation['parameters']
): HoleOperation {
  return {
    id: `hole-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: MachiningOpType.HOLE,
    position,
    parameters: params,
  };
}

/**
 * 加工操作辅助函数：创建切角操作
 */
export function createChamferOperation(
  position: number,
  params: ChamferOperation['parameters']
): ChamferOperation {
  return {
    id: `chamfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: MachiningOpType.CHAMFER,
    position,
    parameters: params,
  };
}

/**
 * 加工操作辅助函数：创建攻丝操作
 */
export function createThreadOperation(
  position: number,
  params: ThreadOperation['parameters']
): ThreadOperation {
  return {
    id: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: MachiningOpType.THREAD,
    position,
    parameters: params,
  };
}

/**
 * 加工操作辅助函数：创建槽口操作
 */
export function createNotchOperation(
  position: number,
  params: NotchOperation['parameters']
): NotchOperation {
  return {
    id: `notch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: MachiningOpType.NOTCH,
    position,
    parameters: params,
  };
}
