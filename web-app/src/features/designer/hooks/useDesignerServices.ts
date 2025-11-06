import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ObjectManager } from '../../../core/object/ObjectManager.ts';
import { ModelCreationService } from '../services/ModelCreationService.ts';
import { ModelInteractionService } from '../services/ModelInteractionService.ts';
import { ModelEditorService } from '../services/ModelEditorService.ts';

/**
 * 关于在 Hook 中用 useRef 存储服务实例的说明：
 * - 服务是长生命周期的可变实例，使用 ref 可以保证在整个组件生命周期中保持同一引用，避免每次渲染重复 new 出实例。
 * - ref.current 的变化不会触发组件重新渲染，适合存放不会直接驱动 UI 的类实例（性能更好）。
 * - 稳定的引用便于注册/取消订阅（事件、定时器等），避免因渲染导致的多次注册。
 * - 在 useEffect 中一次性初始化并赋值到 ref.current，便于做 cleanup（一次性销毁或取消订阅）。
 * - 不建议把复杂的类实例放入 state；若服务内部状态需要更新 UI，应把需要展示的数据映射到 React state 或通过订阅机制通知组件。
 */
export function useDesignerServices(getScene: () => THREE.Scene | null) {
  const objectManagerRef = useRef<ObjectManager | null>(null);
  const creationServiceRef = useRef<ModelCreationService | null>(null);
  const interactionServiceRef = useRef<ModelInteractionService | null>(null);
  const editorServiceRef = useRef<ModelEditorService | null>(null);

  useEffect(() => {
    const scene = getScene();
    if (scene && !objectManagerRef.current) {
      objectManagerRef.current = new ObjectManager(scene);
      creationServiceRef.current = new ModelCreationService(
        objectManagerRef.current
      );
      interactionServiceRef.current = new ModelInteractionService(
        objectManagerRef.current
      );
      editorServiceRef.current = new ModelEditorService(
        objectManagerRef.current,
        interactionServiceRef.current
      );
      console.log('所有服务已初始化');
    }
  }, [getScene]);

  return {
    objectManager: objectManagerRef.current,
    creationService: creationServiceRef.current,
    interactionService: interactionServiceRef.current,
    editorService: editorServiceRef.current,
  };
}
