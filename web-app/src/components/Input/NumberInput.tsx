import * as React from 'react';

/**
 * 数值输入组件的属性接口
 */
export interface NumberInputProps {
  /** 输入框标签 */
  label?: string;
  /** 当前值 */
  value: number;
  /** 值变化回调 */
  onChange: (value: number) => void;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 单位（如 "mm"） */
  unit?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 输入框宽度类名（Tailwind） */
  className?: string;
}

/**
 * NumberInput - 数值输入组件
 *
 * 功能：
 * - 支持 min/max/step 约束
 * - 显示单位标签
 * - 实时验证
 * - 支持键盘上下键微调
 * - 符合设计系统规范（Tailwind CSS）
 *
 * @example
 * <NumberInput
 *   label="长度"
 *   value={800}
 *   onChange={(v) => console.log(v)}
 *   min={100}
 *   max={3000}
 *   step={50}
 *   unit="mm"
 * />
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled = false,
  placeholder,
  className = '',
}) => {
  // 编辑状态（字符串形式，允许输入中间状态如 "10."）
  const [editingValue, setEditingValue] = React.useState<string>(
    value.toString()
  );
  const [isFocused, setIsFocused] = React.useState(false);

  // 同步外部值到编辑状态（仅当失焦时）
  React.useEffect(() => {
    if (!isFocused) {
      setEditingValue(value.toString());
    }
  }, [value, isFocused]);

  /**
   * 验证并应用数值
   */
  const applyValue = (rawValue: string) => {
    const parsed = parseFloat(rawValue);

    // 验证是否为有效数字
    if (isNaN(parsed)) {
      // 恢复到原值
      setEditingValue(value.toString());
      return;
    }

    // 应用 min/max 约束
    let finalValue = parsed;
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    // 应用 step 约束（四舍五入到最近的步长）
    if (step !== undefined && step > 0) {
      finalValue = Math.round(finalValue / step) * step;
    }

    // 更新显示值和触发回调
    setEditingValue(finalValue.toString());
    onChange(finalValue);
  };

  /**
   * 处理输入变化（允许中间状态）
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // 允许空值、负号、小数点等中间状态
    if (newValue === '' || newValue === '-' || newValue === '.') {
      setEditingValue(newValue);
      return;
    }

    // 验证是否为有效数字格式（允许负数和小数）
    if (/^-?\d*\.?\d*$/.test(newValue)) {
      setEditingValue(newValue);
    }
  };

  /**
   * 处理失焦 - 应用最终值
   */
  const handleBlur = () => {
    setIsFocused(false);
    applyValue(editingValue);
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 回车键 - 应用并失焦
    if (e.key === 'Enter') {
      applyValue(editingValue);
      e.currentTarget.blur();
      return;
    }

    // Esc 键 - 取消编辑
    if (e.key === 'Escape') {
      setEditingValue(value.toString());
      e.currentTarget.blur();
      return;
    }

    // 上下键 - 微调
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? step : -step;
      const newValue = value + delta;

      // 应用约束
      let finalValue = newValue;
      if (min !== undefined && finalValue < min) {
        finalValue = min;
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max;
      }

      setEditingValue(finalValue.toString());
      onChange(finalValue);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="text-[10px] text-slate-400 min-w-[60px]">
          {label}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="flex-1 flex items-center gap-1 bg-slate-700 rounded px-2 py-1 focus-within:ring-1 focus-within:ring-blue-500">
        <input
          type="text"
          inputMode="decimal"
          value={editingValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-xs outline-none disabled:text-slate-500 disabled:cursor-not-allowed"
        />

        {/* 单位标签 */}
        {unit && (
          <span className="text-xs text-slate-400 select-none">{unit}</span>
        )}
      </div>
    </div>
  );
};

export default NumberInput;
