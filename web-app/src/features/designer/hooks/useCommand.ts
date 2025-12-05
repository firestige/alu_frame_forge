import * as React from 'react';
import { sendCommand } from '@/core/services/eventBus';
import type { DesignerCommandEvents } from '@/core/services/eventBus';

/**
 * useCommand - UI 组件发送命令的统一接口
 *
 * 使所有 UI 组件通过相同的方式发送命令，无需直接导入 sendCommand
 *
 * @example
 * const { send } = useCommand();
 * send('command:model:delete', objectId);
 */
export const useCommand = () => {
  const send = React.useCallback(
    <K extends keyof DesignerCommandEvents>(
      command: K,
      ...args: DesignerCommandEvents[K] extends void
        ? []
        : [DesignerCommandEvents[K]]
    ) => {
      const payload = args[0];
      sendCommand(command, payload as DesignerCommandEvents[K]);
    },
    []
  );

  return { send };
};
