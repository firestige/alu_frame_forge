/**
 * useTransformTool - 变换工具 Hook
 *
 * 职责:
 * - 监听工具切换（translate/rotate/scale）
 * - 监听选择状态变化
 * - 自动附着/分离 TransformController
 * - 监听键盘快捷键（Q/W/E/R）
 */

import * as React from 'react';
import { sendCommand, onState, offState } from '@/core/services/eventBus';

export function useTransformTool(
  selectedTool: 'select' | 'translate' | 'rotate' | 'scale',
  onToolChange: (tool: 'select' | 'translate' | 'rotate' | 'scale') => void
): void {
  const [selectedObjectIds, setSelectedObjectIds] = React.useState<string[]>(
    []
  );

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
          onToolChange('select');
          break;
        case 'w':
          onToolChange('translate');
          break;
        case 'e':
          onToolChange('rotate');
          break;
        case 'r':
          onToolChange('scale');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToolChange]);
}
