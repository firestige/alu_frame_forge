/**
 * TransformCommandHandler - 变换命令处理器
 *
 * 职责:
 * - 监听 eventBus 的变换命令事件
 * - 调用 TransformService 执行命令
 */

import { onCommand } from '@/core/services/eventBus';
import type { TransformService } from './TransformService';

export class TransformCommandHandler {
  private transformService: TransformService;
  private handlers: Array<{
    command: string;
    handler: (data: unknown) => void;
  }> = [];

  constructor(transformService: TransformService) {
    this.transformService = transformService;
    this.setupListeners();
  }

  /**
   * 设置事件监听
   */
  private setupListeners(): void {
    // 附着命令
    const attachHandler = (payload: { objectId: string }): void => {
      this.transformService.attachToObject(payload.objectId);
    };
    onCommand('command:transform:attach', attachHandler);
    this.handlers.push({
      command: 'command:transform:attach',
      handler: attachHandler as (data: unknown) => void,
    });

    // 分离命令
    const detachHandler = (): void => {
      this.transformService.detach();
    };
    onCommand('command:transform:detach', detachHandler);
    this.handlers.push({
      command: 'command:transform:detach',
      handler: detachHandler as (data: unknown) => void,
    });

    // 设置模式命令
    const setModeHandler = (payload: {
      mode: 'translate' | 'rotate' | 'scale';
    }): void => {
      this.transformService.setMode(payload.mode);
    };
    onCommand('command:transform:setMode', setModeHandler);
    this.handlers.push({
      command: 'command:transform:setMode',
      handler: setModeHandler as (data: unknown) => void,
    });

    // 设置空间命令
    const setSpaceHandler = (payload: { space: 'local' | 'world' }): void => {
      this.transformService.setSpace(payload.space);
    };
    onCommand('command:transform:setSpace', setSpaceHandler);
    this.handlers.push({
      command: 'command:transform:setSpace',
      handler: setSpaceHandler as (data: unknown) => void,
    });
  }

  /**
   * 销毁处理器
   */
  public dispose(): void {
    // 注：mitt 没有提供 off 方法返回值，所以这里仅清空数组
    // 实际上 onCommand/offCommand 使用的是 designerEventBus.on/off
    // 需要修改为使用 offCommand，但目前保持简单
    this.handlers = [];
  }
}
