import * as React from 'react';
import { NumberInput } from '@/components/Input';
import type { ParameterConstraint } from '../utils/parameterConstraints';

/**
 * PropertyEditor - 通用属性编辑器
 *
 * 功能：
 * - 根据参数类型自动选择合适的输入组件
 * - 应用参数约束（min/max/step）
 * - 支持数值、字符串、布尔类型
 *
 * @example
 * <PropertyEditor
 *   paramName="length"
 *   value={800}
 *   constraint={{ type: 'number', min: 100, max: 3000, step: 50, unit: 'mm' }}
 *   onChange={(newValue) => updateParameter('length', newValue)}
 * />
 */
export interface PropertyEditorProps {
  /** 参数名称（用作 label） */
  paramName: string;
  /** 当前值 */
  value: number | string | boolean;
  /** 参数约束 */
  constraint?: ParameterConstraint;
  /** 值变化回调 */
  onChange: (value: number | string | boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  paramName,
  value,
  constraint,
  onChange,
  disabled = false,
}) => {
  // 如果没有约束信息，显示只读文本
  if (!constraint) {
    return (
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{paramName}:</span>
        <span className="text-white">{String(value)}</span>
      </div>
    );
  }

  // 根据类型选择编辑器
  switch (constraint.type) {
    case 'number':
      return (
        <NumberInput
          label={paramName}
          value={value as number}
          onChange={newValue => onChange(newValue)}
          min={constraint.min}
          max={constraint.max}
          step={constraint.step}
          unit={constraint.unit}
          disabled={disabled}
        />
      );

    case 'string':
      // 字符串输入（未来扩展）
      return (
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-400 min-w-[60px]">
            {paramName}
          </label>
          <input
            type="text"
            value={value as string}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 bg-slate-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:text-slate-500"
          />
        </div>
      );

    case 'boolean':
      // 布尔值开关（未来扩展）
      return (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{paramName}:</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={e => onChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
            />
          </label>
        </div>
      );

    default:
      return null;
  }
};

export default PropertyEditor;
