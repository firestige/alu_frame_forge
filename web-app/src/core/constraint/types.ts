/**
 * 约束类型枚举
 */
export enum ConstraintType {
  /** 固定连接（位置+旋转锁定） */
  FIXED_JOINT = 'fixed-joint',

  /** 点对点对齐 */
  POINT_TO_POINT = 'point-to-point',

  /** 轴对齐（法向对齐） */
  AXIS_ALIGN = 'axis-align',

  /** 滑动约束（沿轴滑动） */
  SLIDING_JOINT = 'sliding-joint',

  /** 角度约束 */
  ANGLE = 'angle',

  /** 距离约束 */
  DISTANCE = 'distance',
}

/**
 * 约束优先级
 */
export enum ConstraintPriority {
  /** 低优先级 */
  LOW = 0,

  /** 普通优先级 */
  NORMAL = 1,

  /** 高优先级（结构性约束） */
  HIGH = 2,

  /** 关键约束（不可违反） */
  CRITICAL = 3,
}

/**
 * 约束状态
 */
export enum ConstraintStatus {
  /** 满足约束 */
  SATISFIED = 'satisfied',

  /** 部分满足 */
  PARTIAL = 'partial',

  /** 违反约束 */
  VIOLATED = 'violated',

  /** 冲突 */
  CONFLICT = 'conflict',
}

/**
 * 基础约束接口
 */
export interface BaseConstraint {
  /** 约束唯一标识 */
  id: string;

  /** 约束类型 */
  type: ConstraintType;

  /** 优先级 */
  priority: ConstraintPriority;

  /** 约束的对象 ID 列表 */
  objectIds: string[];

  /** 是否启用 */
  enabled: boolean;

  /** 可选元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 固定连接约束
 */
export interface FixedJointConstraint extends BaseConstraint {
  type: ConstraintType.FIXED_JOINT;

  /** 主对象 ID */
  primaryObjectId: string;

  /** 次对象 ID */
  secondaryObjectId: string;

  /** 相对变换（次对象相对于主对象） */
  relativeTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
}

/**
 * 点对点约束
 */
export interface PointToPointConstraint extends BaseConstraint {
  type: ConstraintType.POINT_TO_POINT;

  /** 对象 A ID */
  objectAId: string;

  /** 对象 B ID */
  objectBId: string;

  /** 对象 A 上的锚点 ID */
  anchorAId: string;

  /** 对象 B 上的锚点 ID */
  anchorBId: string;
}

/**
 * 轴对齐约束
 */
export interface AxisAlignConstraint extends BaseConstraint {
  type: ConstraintType.AXIS_ALIGN;

  /** 对象 A ID */
  objectAId: string;

  /** 对象 B ID */
  objectBId: string;

  /** 对象 A 的轴方向 */
  axisA: { x: number; y: number; z: number };

  /** 对象 B 的轴方向 */
  axisB: { x: number; y: number; z: number };

  /** 是否反向对齐 */
  reverse?: boolean;
}

/**
 * 滑动约束
 */
export interface SlidingJointConstraint extends BaseConstraint {
  type: ConstraintType.SLIDING_JOINT;

  /** 主对象 ID（被滑动的对象） */
  primaryObjectId: string;

  /** 次对象 ID（滑动的对象） */
  secondaryObjectId: string;

  /** 滑动轴（世界坐标） */
  slidingAxis: { x: number; y: number; z: number };

  /** 滑动范围（最小值） */
  minPosition: number;

  /** 滑动范围（最大值） */
  maxPosition: number;

  /** 当前位置 */
  currentPosition: number;
}

/**
 * 角度约束
 */
export interface AngleConstraint extends BaseConstraint {
  type: ConstraintType.ANGLE;

  /** 对象 A ID */
  objectAId: string;

  /** 对象 B ID */
  objectBId: string;

  /** 目标角度（弧度） */
  targetAngle: number;

  /** 旋转轴 */
  axis: { x: number; y: number; z: number };
}

/**
 * 距离约束
 */
export interface DistanceConstraint extends BaseConstraint {
  type: ConstraintType.DISTANCE;

  /** 对象 A ID */
  objectAId: string;

  /** 对象 B ID */
  objectBId: string;

  /** 目标距离 */
  targetDistance: number;

  /** 容差 */
  tolerance?: number;
}

/**
 * 约束联合类型
 */
export type Constraint =
  | FixedJointConstraint
  | PointToPointConstraint
  | AxisAlignConstraint
  | SlidingJointConstraint
  | AngleConstraint
  | DistanceConstraint;

/**
 * 约束求解结果
 */
export interface ConstraintSolveResult {
  /** 是否成功 */
  success: boolean;

  /** 调整后的变换（objectId -> Transform） */
  adjustedTransforms: Map<
    string,
    {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
    }
  >;

  /** 约束状态（constraintId -> Status） */
  constraintStatus: Map<string, ConstraintStatus>;

  /** 冲突的约束 ID 列表 */
  conflicts: string[];

  /** 求解耗时（毫秒） */
  solveTime: number;

  /** 迭代次数 */
  iterations?: number;
}

/**
 * 约束验证结果
 */
export interface ConstraintValidationResult {
  /** 是否有效 */
  valid: boolean;

  /** 约束状态 */
  status: ConstraintStatus;

  /** 错误信息 */
  error?: string;

  /** 误差值 */
  deviation?: number;
}
