import type { AnyAsset } from '@/core/asset/types/asset';

/**
 * 参数约束信息
 */
export interface ParameterConstraint {
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default?: number | string | boolean;
}

/**
 * 获取资产参数的约束信息
 *
 * @param asset 资产对象
 * @param paramName 参数名称
 * @returns 参数约束信息，如果没有定义则返回 undefined
 *
 * @example
 * const constraint = getParameterConstraint(profileAsset, 'length');
 * // => { type: 'number', min: 100, max: 3000, step: 50, unit: 'mm', default: 500 }
 */
export function getParameterConstraint(
  asset: AnyAsset | undefined,
  paramName: string
): ParameterConstraint | undefined {
  if (!asset) return undefined;

  // ProfileAsset 的特殊处理
  if (asset.type === 'profile') {
    if (paramName === 'length' && 'lengthConstraints' in asset) {
      const constraints = asset.lengthConstraints as {
        min: number;
        max: number;
        default: number;
        step?: number;
      };

      return {
        type: 'number',
        min: constraints.min,
        max: constraints.max,
        step: constraints.step,
        unit: 'mm',
        default: constraints.default,
      };
    }
  }

  // PanelAsset 的特殊处理（如果有）
  if (asset.type === 'panel') {
    // 未来扩展：面板的宽度、高度、厚度约束
    if (paramName === 'width' || paramName === 'height') {
      return {
        type: 'number',
        min: 100,
        max: 2000,
        step: 10,
        unit: 'mm',
        default: 500,
      };
    }
    if (paramName === 'thickness') {
      return {
        type: 'number',
        min: 1,
        max: 20,
        step: 0.5,
        unit: 'mm',
        default: 3,
      };
    }
  }

  // 未来扩展：从 asset.parameters 字段读取通用参数定义
  // if ('parameters' in asset && asset.parameters) {
  //   const param = asset.parameters[paramName];
  //   if (param) {
  //     return {
  //       type: param.type,
  //       min: param.min,
  //       max: param.max,
  //       ...
  //     };
  //   }
  // }

  return undefined;
}
