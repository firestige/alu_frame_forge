import { useEffect, useRef, useState } from 'react';
import { ObjectManager } from '@/core/object';
import { ModelCreationService } from '../services/ModelCreationService';
import { ModelEditorService } from '../services/ModelEditorService';

/**
 * 业务服务状态
 */
interface BusinessServices {
  objectManager: ObjectManager | null;
  creation: ModelCreationService | null;
  editor: ModelEditorService | null;
  status: 'loading' | 'ready';
}

/**
 * useBusinessServices - 初始化业务服务 Hook（重构后）
 *
 * 职责：
 * - 创建 ObjectManager（不依赖 renderer）
 * - 创建业务服务（ModelCreationService, ModelEditorService 等）
 * - 管理服务初始化状态
 *
 * 不涉及：
 * ❌ 不依赖 renderer（渲染层的事）
 * ❌ 不管理选中状态（UI 状态）
 * ❌ 不包含 ModelInteractionService（已移除，功能由 SelectionService 接管）
 *
 * @returns 业务服务实例和初始化状态
 */
export function useBusinessServices(): BusinessServices {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const servicesRef = useRef<{
    objectManager: ObjectManager;
    creation: ModelCreationService;
    editor: ModelEditorService;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. 创建 ObjectManager（不依赖 renderer）
      const objectManager = new ObjectManager();

      // 2. 创建业务服务
      const creation = new ModelCreationService(objectManager);
      const editor = new ModelEditorService(objectManager);

      servicesRef.current = {
        objectManager,
        creation,
        editor,
      };

      setStatus('ready');
    };

    init();

    return () => {
      servicesRef.current = null;
    };
  }, []);

  return {
    objectManager: servicesRef.current?.objectManager || null,
    creation: servicesRef.current?.creation || null,
    editor: servicesRef.current?.editor || null,
    status,
  };
}
