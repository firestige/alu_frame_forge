/**
 * useTransformTool - 变换工具 Hook
 *
 * 职责:
 * - 监听工具切换（translate/rotate/scale）
 * - 监听选择状态变化
 * - 自动附着/分离 TransformController
 * - 监听键盘快捷键（Q/W/E/R）
 * - 处理 command:tool:change 命令并发布 state:tool:changed 状态
 */

import * as React from 'react';
import {
  sendCommand,
  onCommand,
  offCommand,
  onState,
  offState,
  publishState,
} from '@/core/services/eventBus';

export function useTransformTool(): void {
  const [selectedTool, setSelectedTool] = React.useState<
    'select' | 'translate' | 'rotate' | 'scale'
  >('select');
  const [selectedObjectIds, setSelectedObjectIds] = React.useState<string[]>(
    [],
  );

  // 监听工具切换命令
  React.useEffect(() => {
    const handleToolChange = (
      tool: 'select' | 'translate' | 'rotate' | 'scale',
    ): void => {
      setSelectedTool(tool);
      publishState('state:tool:changed', tool);
    };

    onCommand('command:tool:change', handleToolChange);

    return () => {
      offCommand('command:tool:change', handleToolChange);
    };
  }, []);

  // 监听选择状态变化
  React.useEffect(() => {
    const handleSelectionChanged = (data: { selectedIds: string[] }): void => {
      setSelectedObjectIds(data.selectedIds);
    };

    onState('state:selection:changed', handleSelectionChanged);

    return () => {
      offState('state:selection:changed', handleSelectionChanged);
    };
  }, []);

  // 监听工具切换和选择状态变化
  React.useEffect(() => {
    if (selectedTool === 'select') {
      // 选择模式 → 分离控制器
      sendCommand('command:transform:detach', undefined);
    } else {
      // 变换模式（translate/rotate/scale）
      if (selectedObjectIds.length === 1) {
        // 单选 → 附着控制器到选中对象
        const objectId = selectedObjectIds[0];
        sendCommand('command:transform:attach', { objectId });
        sendCommand('command:transform:setMode', { mode: selectedTool });
      } else {
        // 多选或未选中 → 分离控制器
        sendCommand('command:transform:detach', undefined);
      }
    }
  }, [selectedTool, selectedObjectIds]);

  // 键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // 忽略输入框
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'q':
          sendCommand('command:tool:change', 'select');
          break;
        case 'w':
          sendCommand('command:tool:change', 'translate');
          break;
        case 'e':
          sendCommand('command:tool:change', 'rotate');
          break;
        case 'r':
          sendCommand('command:tool:change', 'scale');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
