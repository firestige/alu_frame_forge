import { useState, useCallback } from 'react';

/**
 * 持久化状态 Hook
 *
 * 将 React state 自动同步到 localStorage
 *
 * @param key - localStorage 键名
 * @param defaultValue - 默认值
 * @returns [state, setState] - 类似 useState
 *
 * @example
 * ```tsx
 * const [tool, setTool] = usePersistentState('designer.tool', 'select');
 * setTool('move'); // 自动保存到 localStorage
 * ```
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 初始化：从 localStorage 读取或使用默认值
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load state from localStorage (${key}):`, error);
      return defaultValue;
    }
  });

  // 包装 setState：同时更新 state 和 localStorage
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        // 支持函数式更新
        const nextValue =
          typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        // 保存到 localStorage
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Failed to save state to localStorage (${key}):`, error);
        }

        return nextValue;
      });
    },
    [key]
  );

  return [state, setPersistentState];
}
