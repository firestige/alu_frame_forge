/**
 * 素材类型枚举
 * 定义系统支持的所有素材类型
 */
export const AssetType = {
  /** 铝型材 - 通过截面拉伸生成 */
  PROFILE: 'profile',
  /** 紧固件 - 螺栓、螺母、垫片等标准件 */
  FASTENER: 'fastener',
  /** 连接件 - 角件、支架等标准连接部件 */
  CONNECTOR: 'connector',
  /** 配件 - 封板、脚垫等辅助部件 */
  ACCESSORY: 'accessory',
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];

/**
 * 素材来源枚举
 * 区分内置素材和用户自定义素材
 */
export const AssetSource = {
  /** 内置素材 - 系统预置，不可删除 */
  BUILTIN: 'builtin',
  /** 自定义素材 - 用户导入，可删除修改 */
  CUSTOM: 'custom',
} as const;

export type AssetSource = (typeof AssetSource)[keyof typeof AssetSource];

/**
 * 加工操作类型枚举
 * 定义铝型材支持的各种加工操作
 */
export const MachiningOpType = {
  /** 打孔 - 在型材上钻孔 */
  HOLE: 'hole',
  /** 切角 - 倒角处理 */
  CHAMFER: 'chamfer',
  /** 攻丝 - 螺纹加工 */
  THREAD: 'thread',
  /** 槽口 - 开槽处理 */
  NOTCH: 'notch',
} as const;

export type MachiningOpType =
  (typeof MachiningOpType)[keyof typeof MachiningOpType];

/**
 * 参数类型枚举
 * 用于参数化模型的参数定义
 */
export const ParameterType = {
  /** 数值范围 - 如长度 10-100mm */
  RANGE: 'range',
  /** 枚举选择 - 如 M5/M6/M8 */
  ENUM: 'enum',
  /** 布尔值 - 如是否开槽 */
  BOOLEAN: 'boolean',
} as const;

export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType];

/**
 * 紧固件族类型
 */
export const FastenerFamily = {
  BOLT: 'bolt', // 螺栓
  NUT: 'nut', // 螺母
  WASHER: 'washer', // 垫片
  SCREW: 'screw', // 螺钉
} as const;

export type FastenerFamily =
  (typeof FastenerFamily)[keyof typeof FastenerFamily];

/**
 * 连接件族类型
 */
export const ConnectorFamily = {
  CORNER: 'corner', // 角件
  BRACKET: 'bracket', // 支架
  PLATE: 'plate', // 连接板
  JOINT: 'joint', // 接头
} as const;

export type ConnectorFamily =
  (typeof ConnectorFamily)[keyof typeof ConnectorFamily];

/**
 * 螺纹类型
 */
export const ThreadType = {
  COARSE: 'coarse', // 粗牙
  FINE: 'fine', // 细牙
} as const;

export type ThreadType = (typeof ThreadType)[keyof typeof ThreadType];
