/**
 * 锚点类型枚举
 */
export enum AnchorType {
  /** 型材端点（端面中心） */
  PROFILE_END = 'profile-end',
  
  /** 型材截面角点 */
  PROFILE_CORNER = 'profile-corner',
  
  /** 型材截面中心 */
  PROFILE_CENTER = 'profile-center',
  
  /** 型材侧面吸附点 */
  PROFILE_SNAP = 'profile-snap',
  
  /** T-slot 槽位置 */
  T_SLOT = 't-slot',
  
  /** 孔位置（通孔/螺纹孔） */
  HOLE = 'hole',
  
  /** 连接件锚点 */
  CONNECTOR = 'connector',
}

/**
 * 轻量级锚点定义（用于运行时约束求解和吸附）
 */
export interface AnchorPoint {
  /** 锚点唯一标识 */
  id: string;
  
  /** 所属对象 ID */
  objectId: string;
  
  /** 锚点类型 */
  type: AnchorType;
  
  /** 世界坐标位置 */
  position: { x: number; y: number; z: number };
  
  /** 方向/法向（归一化向量） */
  axis: { x: number; y: number; z: number };
  
  /** 可选元数据 */
  metadata?: {
    /** 面标识（top/bottom/left/right/front/back） */
    face?: string;
    
    /** 孔规格 */
    holeSpec?: {
      diameter: number;
      depth: number;
      threadSpec?: string;
    };
    
    /** T-slot 规格 */
    tSlotSpec?: {
      neckWidth: number;
      headWidth: number;
    };
    
    /** 沿型材轴的位置（用于滑动约束） */
    axialPosition?: number;
  };
}

/**
 * 锚点查询选项
 */
export interface AnchorQueryOptions {
  /** 对象 ID 过滤 */
  objectIds?: string[];
  
  /** 锚点类型过滤 */
  types?: AnchorType[];
  
  /** 排除的锚点 ID */
  excludeIds?: string[];
  
  /** 搜索阈值（世界坐标距离） */
  threshold?: number;
}

/**
 * 锚点查询结果
 */
export interface AnchorQueryResult {
  anchor: AnchorPoint;
  distance: number;
}
