import * as React from 'react';
import type { ObjectManager } from '@/core/object';
import type { ModelCreationService } from '../services/ModelCreationService';
import type { ModelInteractionService } from '../services/ModelInteractionService';
import type { ModelEditorService } from '../services/ModelEditorService';
import type { RenderSyncService } from '../services/RenderSyncService';
import { designerEventBus } from '@/core/services/eventBus';

/**
 * 设计器 Context 值类型
 */
export interface DesignerContextValue {
  // 业务服务（只读引用）
  services: {
    objectManager: ObjectManager;
    renderSync: RenderSyncService;
    creation: ModelCreationService;
    interaction: ModelInteractionService;
    editor: ModelEditorService;
  };

  // 事件总线
  eventBus: typeof designerEventBus;
}

/**
 * 设计器 Context
 */
export const DesignerContext = React.createContext<DesignerContextValue | null>(
  null
);

/**
 * Provider Props
 */
export interface DesignerProviderProps {
  value: DesignerContextValue;
  children: React.ReactNode;
}

/**
 * 设计器 Provider 组件
 *
 * 职责：
 * - 向下传递服务实例和事件总线
 * - 不管理状态，只提供访问入口
 *
 * @example
 * ```tsx
 * <DesignerProvider value={{ services, eventBus }}>
 *   <DesignerPageUI />
 * </DesignerProvider>
 * ```
 */
export const DesignerProvider: React.FC<DesignerProviderProps> = ({
  value,
  children,
}) => {
  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
};
