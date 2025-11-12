import { useEffect } from 'react';
import { designerEventBus, sendCommand } from '@/core/services/eventBus';
import { useDesignerContext } from './useDesignerContext';

/**
 * useCreationCommands - 处理创建命令
 *
 * 职责：
 * - 监听 UI 层发送的创建相关命令
 * - 将创建命令转换为对应的业务操作
 * - 协调 PlacementController 和 ObjectManager
 *
 * 架构：
 * - UI 层：发送创建命令（如 command:create:profile:prepare）
 * - 此 Hook：根据命令类型决定直接创建还是进入交互式放置
 * - Core 层：执行具体的创建或放置逻辑
 */
export function useCreationCommands() {
  const { services } = useDesignerContext();

  useEffect(() => {
    // 处理交互式型材创建
    const handlePrepareProfile = (data: {
      assetId: string;
      mode: 'interactive';
    }) => {
      if (data.mode === 'interactive') {
        // 获取资产
        const asset = services.objectManager.getAsset(data.assetId);
        if (!asset) {
          console.error(
            `[useCreationCommands] Asset not found: ${data.assetId}`
          );
          return;
        }

        // 发送放置开始命令
        sendCommand('command:placement:start', { asset });
      }
    };

    designerEventBus.on('command:create:profile:prepare', handlePrepareProfile);

    return () => {
      designerEventBus.off(
        'command:create:profile:prepare',
        handlePrepareProfile
      );
    };
  }, [services]);
}
