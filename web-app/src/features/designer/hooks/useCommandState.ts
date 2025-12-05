import * as React from 'react';
import { onState, offState } from '@/core/services/eventBus';
import type { DesignerStateEvents } from '@/core/services/eventBus';

/**
 * useCommandState - 订阅后端状态变化
 *
 * 支持两种用法：
 * 1. 回调模式：传入 callback 函数
 * 2. 状态模式：传入 initialValue，返回当前状态值
 *
 * @param stateKey - 状态事件名
 * @param callbackOrInitial - 回调函数或初始值
 *
 * @example
 * // 回调模式
 * useCommandState('state:object:list', (data) => {
 *   setObjects(data.objects);
 * });
 *
 * // 状态模式
 * const currentTool = useCommandState('state:tool:changed', 'select');
 */

// 重载签名：回调模式
export function useCommandState<K extends keyof DesignerStateEvents>(
  stateKey: K,
  callback: (data: DesignerStateEvents[K]) => void
): void;

// 重载签名：状态模式
export function useCommandState<K extends keyof DesignerStateEvents>(
  stateKey: K,
  initialValue: DesignerStateEvents[K]
): DesignerStateEvents[K];

// 实现
export function useCommandState<K extends keyof DesignerStateEvents>(
  stateKey: K,
  callbackOrInitial:
    | ((data: DesignerStateEvents[K]) => void)
    | DesignerStateEvents[K]
): void | DesignerStateEvents[K] {
  const isCallback = typeof callbackOrInitial === 'function';

  // 状态模式
  const [state, setState] = React.useState<DesignerStateEvents[K] | undefined>(
    isCallback ? undefined : callbackOrInitial
  );

  React.useEffect(() => {
    const handler = (data: DesignerStateEvents[K]) => {
      if (isCallback) {
        (callbackOrInitial as (data: DesignerStateEvents[K]) => void)(data);
      } else {
        setState(data);
      }
    };

    onState(stateKey, handler);

    return () => {
      offState(stateKey, handler);
    };
  }, [stateKey, callbackOrInitial, isCallback]);

  return isCallback ? undefined : state;
}
