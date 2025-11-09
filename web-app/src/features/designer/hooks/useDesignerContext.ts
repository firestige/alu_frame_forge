import { useContext } from 'react';
import { DesignerContext } from '../context/DesignerContext';

/**
 * 使用设计器 Context
 *
 * 提供对所有业务服务和事件总线的访问
 *
 * @throws 如果在 DesignerProvider 外使用
 *
 * @example
 * ```tsx
 * const { services, eventBus } = useDesignerContext();
 *
 * // 读取数据（允许）
 * const object = services.objectManager.getObject(id);
 *
 * // 发送命令（推荐）
 * sendCommand('command:create:cube', undefined);
 * ```
 */
export function useDesignerContext() {
  const context = useContext(DesignerContext);

  if (!context) {
    throw new Error('useDesignerContext must be used within DesignerProvider');
  }

  return context;
}
