import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ObjectManager } from '../service/ObjectManager';
import { ModelCreationService } from '../service/ModelCreationService';
import { ModelInteractionService } from '../service/ModelInteractionService';
import { ModelEditorService } from '../service/ModelEditorService';

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

