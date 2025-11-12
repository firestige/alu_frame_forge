import { useEffect, useRef, useState } from 'react';
import { ObjectManager } from '@/core/object';
import { ModelCreationService } from '../services/ModelCreationService';
import { ModelEditorService } from '../services/ModelEditorService';
import { PlacementController } from '../services/PlacementService';
import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * 业务服务状态
 */
interface BusinessServices {
  objectManager: ObjectManager | null;
  creation: ModelCreationService | null;
  editor: ModelEditorService | null;
  placement: PlacementController | null;
  status: 'loading' | 'ready';
}

/**
 * useBusinessServices - 初始化业务服务 Hook（重构后）
 *
 * 职责：
 * - 创建 ObjectManager（不依赖 renderer）
 * - 创建业务服务（ModelCreationService, ModelEditorService, PlacementController 等）
 * - 管理服务初始化状态
 *
 * 注意：
 * - PlacementController 需要 renderer，所以初始化分为两个阶段
 *
 * @param renderer 渲染器实例（可选，用于初始化 PlacementController）
 * @returns 业务服务实例和初始化状态
 */
export function useBusinessServices(
  renderer?: IRenderer | null
): BusinessServices {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const servicesRef = useRef<{
    objectManager: ObjectManager;
    creation: ModelCreationService;
    editor: ModelEditorService;
    placement: PlacementController | null;
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
        placement: null, // 稍后初始化
      };

      setStatus('ready');
    };

    init();

    return () => {
      servicesRef.current?.placement?.dispose();
      servicesRef.current = null;
    };
  }, []);

  // 当 renderer 准备好时，创建 PlacementController
  useEffect(() => {
    if (!servicesRef.current || !renderer) {
      return;
    }

    if (servicesRef.current.placement) {
      return; // 已经创建过了
    }

    const placementController = new PlacementController(
      renderer,
      servicesRef.current.objectManager
    );

    servicesRef.current.placement = placementController;

    console.log('[useBusinessServices] PlacementController initialized');

    return () => {
      placementController.dispose();
    };
  }, [renderer]);

  return {
    objectManager: servicesRef.current?.objectManager || null,
    creation: servicesRef.current?.creation || null,
    editor: servicesRef.current?.editor || null,
    placement: servicesRef.current?.placement || null,
    status,
  };
}
