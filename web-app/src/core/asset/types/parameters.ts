import type { ParameterType } from './enums';

/**
 * 参数定义基础接口
 * 用于定义参数化模型的参数元数据
 */
interface BaseParameterDef {
  type: ParameterType;
  label: string;
  description?: string;
  required?: boolean;
}

/**
 * 范围参数定义
 * 用于数值型参数，如长度、直径等
 */
export interface RangeParameterDef extends BaseParameterDef {
  type: typeof ParameterType.RANGE;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string; // 单位，如 "mm", "°"
}

/**
 * 枚举参数定义
 * 用于离散选择型参数，如螺纹规格、螺距类型等
 */
export interface EnumParameterDef<T extends string = string>
  extends BaseParameterDef {
  type: typeof ParameterType.ENUM;
  options: readonly T[];
  default: T;
  // 选项的显示名称映射（可选）
  optionLabels?: Record<T, string>;
}

/**
 * 布尔参数定义
 * 用于开关型参数
 */
export interface BooleanParameterDef extends BaseParameterDef {
  type: typeof ParameterType.BOOLEAN;
  default: boolean;
}

/**
 * 参数定义联合类型
 */
export type ParameterDef<T = unknown> = T extends string
  ? EnumParameterDef<T>
  : T extends number
    ? RangeParameterDef
    : T extends boolean
      ? BooleanParameterDef
      : RangeParameterDef | EnumParameterDef | BooleanParameterDef;

/**
 * 参数集合
 * 键值对形式存储多个参数定义
 */
export type ParameterDefinitions = Record<string, ParameterDef>;

/**
 * 从参数定义提取实际值类型
 * 用于类型安全的参数值推导
 */
export type ParameterValues<T extends ParameterDefinitions> = {
  [K in keyof T]: T[K] extends EnumParameterDef<infer E>
    ? E
    : T[K] extends RangeParameterDef
      ? number
      : T[K] extends BooleanParameterDef
        ? boolean
        : unknown;
};
