/**
 * CameraCommandHandler - 相机命令处理器
 *
 * 职责：
 * 1. 监听事件总线上的相机命令
 * 2. 调用 CameraService 执行操作
 * 3. 处理快捷键绑定
 */

import { eventBus, onCommand, offCommand } from '@/core/services/eventBus';
import { CameraPreset } from '@/core/renderer/renderer-types';
import type { CameraService } from '@/core/renderer/services/CameraService';

export class CameraCommandHandler {
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private cameraService: CameraService;

  constructor(cameraService: CameraService) {
    this.cameraService = cameraService;
    this.registerEventListeners();
    this.registerKeyboardShortcuts();
  }

  private registerEventListeners(): void {
    // 设置预设视角
    onCommand('command:camera:setPreset', ({ preset, animated }) => {
      const presetEnum = preset as CameraPreset;
      this.cameraService.setViewPreset(presetEnum, animated ?? true);
    });

    // 通过方向向量设置视角
    onCommand(
      'command:camera:setViewByDirection',
      ({ direction, up, animated }) => {
        this.cameraService.setViewByDirection(direction, up, animated ?? true);
      }
    );

    // 重置视角
    onCommand('command:camera:reset', ({ animated }) => {
      this.cameraService.reset(animated ?? true);
    });

    // 聚焦到对象
    onCommand('command:camera:focusObject', ({ objectId, padding }) => {
      this.cameraService.focusOnObject(objectId, padding);
    });

    // 兼容旧的 setView 命令
    onCommand('command:camera:setView', ({ position, target }) => {
      // 直接设置位置（不通过预设）
      this.cameraService.setViewByDirection(
        {
          x: position.x - target.x,
          y: position.y - target.y,
          z: position.z - target.z,
        },
        undefined,
        true
      );
    });

    // 聚焦到对象（使用objectId）
    onCommand('command:camera:focusObject', ({ objectId }) => {
      this.cameraService.focusOnObject(objectId);
    });

    // 释放聚焦
    onCommand('command:camera:resetFocus', () => {
      this.cameraService.resetFocus(true);
    });
  }

  private registerKeyboardShortcuts(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 数字键 1-7 切换视图
      const presetMap: Record<string, CameraPreset> = {
        '1': CameraPreset.FRONT,
        '2': CameraPreset.TOP,
        '3': CameraPreset.RIGHT,
        '4': CameraPreset.BACK,
        '5': CameraPreset.BOTTOM,
        '6': CameraPreset.LEFT,
        '7': CameraPreset.ISOMETRIC,
      };

      if (presetMap[e.key]) {
        e.preventDefault();
        eventBus.emit('command:camera:setPreset', {
          preset: presetMap[e.key],
          animated: true,
        });
      }

      // H 键重置视角
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        eventBus.emit('command:camera:reset', { animated: true });
      }

      // F 键聚焦到选中对象（需要与 selection service 集成）
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        // TODO: 获取当前选中对象ID并聚焦
        // 当前先发出事件，由其他模块处理
        console.log('Focus shortcut pressed (F key)');
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  dispose(): void {
    // 移除键盘监听
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }

    // 移除事件监听
    offCommand('command:camera:setPreset', () => {});
    offCommand('command:camera:setViewByDirection', () => {});
    offCommand('command:camera:reset', () => {});
    offCommand('command:camera:focusObject', () => {});
    offCommand('command:camera:setView', () => {});
  }
}
