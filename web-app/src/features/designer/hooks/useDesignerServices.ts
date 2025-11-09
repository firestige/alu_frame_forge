import { useEffect, useRef, useState } from 'react';
import { ObjectManager } from '@/core/object';
import { ModelCreationService } from '../services/ModelCreationService';
import { ModelInteractionService } from '../services/ModelInteractionService';
import { ModelEditorService } from '../services/ModelEditorService';
import { RenderSyncService } from '../services/RenderSyncService';
import type { IRenderer } from '@/core/renderer/renderer-types';

/**
 * 关于在 Hook 中用 useRef 存储服务实例 + useState 触发更新的说明：
 * - 服务实例存储在 ref 中，保持稳定引用，避免重复创建
 * - 使用 servicesReady state 来触发组件重新渲染，让父组件知道服务已就绪
 * - 这样既保持了服务实例的稳定性，又能让 React 检测到变化
 */
export function useDesignerServices(getRenderer: () => IRenderer | null) {
  const objectManagerRef = useRef<ObjectManager | null>(null);
  const renderSyncServiceRef = useRef<RenderSyncService | null>(null);
  const creationServiceRef = useRef<ModelCreationService | null>(null);
  const interactionServiceRef = useRef<ModelInteractionService | null>(null);
  const editorServiceRef = useRef<ModelEditorService | null>(null);

  // 🔑 使用 state 来触发重新渲染，让父组件知道服务已创建
  const [servicesReady, setServicesReady] = useState(false);

  // 🔑 关键修复：在渲染时调用 getRenderer() 获取当前 renderer 值
  // 这样 useEffect 依赖的是 renderer 值本身，而不是永远不变的 getRenderer 函数引用
  const renderer = getRenderer();

  console.log(
    '[useDesignerServices] Hook 被调用 - objectManager:',
    objectManagerRef.current ? '✅' : '❌',
    'renderer:',
    renderer ? '✅' : '❌',
    'servicesReady:',
    servicesReady
  );

  useEffect(() => {
    console.log(
      '[useDesignerServices] useEffect 触发 - renderer:',
      renderer ? '✅ 有效' : '❌ null',
      'objectManager 已存在:',
      !!objectManagerRef.current
    );

    if (renderer && !objectManagerRef.current) {
      console.log('[useDesignerServices] 🚀 开始初始化所有服务...');

      // 1. 创建 ObjectManager（不传 renderer，实现解耦）
      objectManagerRef.current = new ObjectManager();
      console.log('[useDesignerServices] ✅ ObjectManager 已创建');

      // 2. 创建 RenderSyncService（建立 ObjectManager 和 Renderer 之间的桥梁）
      renderSyncServiceRef.current = new RenderSyncService(
        objectManagerRef.current,
        renderer
      );
      console.log('[useDesignerServices] ✅ RenderSyncService 已创建');

      // 3. 初始化其他业务服务
      creationServiceRef.current = new ModelCreationService(
        objectManagerRef.current
      );
      console.log('[useDesignerServices] ✅ ModelCreationService 已创建');

      interactionServiceRef.current = new ModelInteractionService(
        objectManagerRef.current,
        renderer,
        renderSyncServiceRef.current
      );
      console.log('[useDesignerServices] ✅ ModelInteractionService 已创建');

      editorServiceRef.current = new ModelEditorService(
        objectManagerRef.current,
        interactionServiceRef.current
      );
      console.log('[useDesignerServices] ✅ ModelEditorService 已创建');

      console.log('[useDesignerServices] 🎉 所有服务初始化完成！');

      // 🔑 触发状态更新，让父组件重新渲染并获取到新的服务实例
      setServicesReady(true);
      console.log('[useDesignerServices] ✅ 触发 state 更新，通知父组件');
    } else {
      console.log('[useDesignerServices] ⏭️  跳过初始化');
    }

    // Cleanup 函数
    return () => {
      console.log('[useDesignerServices] Cleanup 函数执行');
      if (renderSyncServiceRef.current) {
        renderSyncServiceRef.current.dispose();
        renderSyncServiceRef.current = null;
      }
      setServicesReady(false);
    };
  }, [renderer]); // 🔑 依赖 renderer 值，而不是 getRenderer 函数

  const returnValue = {
    objectManager: objectManagerRef.current,
    renderSyncService: renderSyncServiceRef.current,
    creationService: creationServiceRef.current,
    interactionService: interactionServiceRef.current,
    editorService: editorServiceRef.current,
  };

  console.log(
    '[useDesignerServices] 返回 - objectManager:',
    returnValue.objectManager ? '✅' : '❌'
  );

  return returnValue;
}
