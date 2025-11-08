/**
 * 设计器事件总线
 * 用于 UI 层和渲染器之间的解耦通信
 */

import mitt, { type Emitter } from 'mitt';
import type { Vector3 } from '../renderer/renderer-types';

// ==================== 事件类型定义 ====================

/**
 * 事件映射接口
 * 用于类型安全的事件定义
 */
export interface EventMap {
  [key: string]: unknown;
}

/**
 * 设计器命令事件
 * UI 层发送命令到渲染器/服务层
 */
export type DesignerCommandEvents = {
  // 模型创建命令
  'command:create:cube': void;
  'command:create:box': void;
  'command:create:aluminumProfile': void;
  'command:create:panel': void;
  'command:create:connector': void;

  // 相机命令
  'command:camera:reset': void;
  'command:camera:setPosition': Vector3;
  'command:camera:setView': {
    position: Vector3;
    target: Vector3;
  };

  // 模型编辑命令
  'command:model:delete': string; // modelId
  'command:model:toggleVisibility': string;
  'command:model:showProperties': string;
  'command:model:edit': string;

  // 选择命令
  'command:selection:clear': void;
  'command:selection:set': string; // modelId
};

/**
 * 设计器状态事件
 * 渲染器/服务层发布状态变更给 UI 层
 */
export type DesignerStateEvents = {
  // 模型相关事件
  'state:model:created': { modelId: string; type: string };
  'state:model:deleted': { modelId: string };
  'state:model:selected': { modelId: string | null };
  'state:model:updated': { modelId: string };

  // 场景相关事件
  'state:scene:loaded': void;
  'state:scene:cleared': void;

  // 渲染器相关事件
  'state:renderer:ready': void;
  'state:renderer:error': Error;
};

/**
 * 所有事件类型
 */
export type DesignerEvents = DesignerCommandEvents & DesignerStateEvents;

// ==================== 事件总线实例 ====================

/**
 * 全局设计器事件总线
 */
export const designerEventBus: Emitter<DesignerEvents> = mitt<DesignerEvents>();

// ==================== 辅助函数 ====================

/**
 * 发送命令
 */
export function sendCommand<K extends keyof DesignerCommandEvents>(
  command: K,
  data: DesignerCommandEvents[K]
): void {
  designerEventBus.emit(
    command as keyof DesignerEvents,
    data as DesignerEvents[keyof DesignerEvents]
  );
}

/**
 * 发布状态变更
 */
export function publishState<K extends keyof DesignerStateEvents>(
  event: K,
  data: DesignerStateEvents[K]
): void {
  designerEventBus.emit(
    event as keyof DesignerEvents,
    data as DesignerEvents[keyof DesignerEvents]
  );
}

/**
 * 监听命令
 */
export function onCommand<K extends keyof DesignerCommandEvents>(
  command: K,
  handler: (data: DesignerCommandEvents[K]) => void
): void {
  designerEventBus.on(command, handler);
}

/**
 * 监听状态事件
 */
export function onState<K extends keyof DesignerStateEvents>(
  event: K,
  handler: (data: DesignerStateEvents[K]) => void
): void {
  designerEventBus.on(event, handler);
}

/**
 * 取消监听
 */
export function offCommand<K extends keyof DesignerCommandEvents>(
  command: K,
  handler: (data: DesignerCommandEvents[K]) => void
): void {
  designerEventBus.off(command, handler);
}

/**
 * 取消状态监听
 */
export function offState<K extends keyof DesignerStateEvents>(
  event: K,
  handler: (data: DesignerStateEvents[K]) => void
): void {
  designerEventBus.off(event, handler);
}
