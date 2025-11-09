import { useEffect, useRef, useState } from 'react';
import { ObjectManager } from '@/core/object';
import { ModelCreationService } from '../services/ModelCreationService';
import { ModelEditorService } from '../services/ModelEditorService';
import { ModelInteractionService } from '../services/ModelInteractionService';

/**
 * 业务服务状态
 */
interface BusinessServices {
  objectManager: ObjectManager | null;
  creation: ModelCreationService | null;
  editor: ModelEditorService | null;
  interaction: ModelInteractionService | null;
  status: 'loading' | 'ready';
}

/**
 * useBusinessServices - 初始化业务服务 Hook
 *
 * 职责：
 * - 创建 ObjectManager（不依赖 renderer）
 * - 创建业务服务（ModelCreationService, ModelEditorService 等）
 * - 管理服务初始化状态
 *
 * 不涉及：
 * ❌ 不依赖 renderer（渲染层的事）
 * ❌ 不管理选中状态（UI 状态）
 *
 * @returns 业务服务实例和初始化状态
 */
export function useBusinessServices(): BusinessServices {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const servicesRef = useRef<{
    objectManager: ObjectManager;
    creation: ModelCreationService;
    editor: ModelEditorService;
    interaction: ModelInteractionService;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      console.log('[useBusinessServices] 开始初始化业务服务...');

      // 1. 创建 ObjectManager（不依赖 renderer）
      const objectManager = new ObjectManager();
      console.log('[useBusinessServices] ✅ ObjectManager 已创建');

      // 2. 创建业务服务
      const creation = new ModelCreationService(objectManager);
      console.log('[useBusinessServices] ✅ ModelCreationService 已创建');

      const interaction = new ModelInteractionService(objectManager);
      console.log('[useBusinessServices] ✅ ModelInteractionService 已创建');

      // ModelEditorService 依赖 ModelInteractionService
      const editor = new ModelEditorService(objectManager, interaction);
      console.log('[useBusinessServices] ✅ ModelEditorService 已创建');

      servicesRef.current = {
        objectManager,
        creation,
        editor,
        interaction,
      };

      console.log('[useBusinessServices] 🎉 所有业务服务初始化完成');
      setStatus('ready');
    };

    init();

    return () => {
      console.log('[useBusinessServices] Cleanup: 清理业务服务');
      servicesRef.current = null;
    };
  }, []);

  return {
    objectManager: servicesRef.current?.objectManager || null,
    creation: servicesRef.current?.creation || null,
    editor: servicesRef.current?.editor || null,
    interaction: servicesRef.current?.interaction || null,
    status,
  };
}
