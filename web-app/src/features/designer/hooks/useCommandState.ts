import * as React from 'react';
import { onState, offState } from '@/core/services/eventBus';
import type { DesignerStateEvents } from '@/core/services/eventBus';

/**
 * useCommandState - 订阅后端状态变化
 *
 * 自动处理订阅和取消订阅，组件卸载时自动清理
 *
 * @param stateKey - 状态事件名
 * @param callback - 状态变化时的回调函数
 *
 * @example
 * useCommandState('state:object:list', (data) => {
 *   setObjects(data.objects);
 * });
 */
export const useCommandState = <K extends keyof DesignerStateEvents>(
  stateKey: K,
  callback: (data: DesignerStateEvents[K]) => void
) => {
  React.useEffect(() => {
    const handler = (data: DesignerStateEvents[K]) => callback(data);
    onState(stateKey, handler);

    return () => {
      offState(stateKey, handler);
    };
  }, [stateKey, callback]);
};
