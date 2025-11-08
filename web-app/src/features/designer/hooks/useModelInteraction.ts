import { useEffect, useState, useCallback } from 'react';
import { ModelInteractionService } from '../services/ModelInteractionService.ts';

export interface ModelInteractionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  interactionService: ModelInteractionService | null;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  modelId: string | null;
}

export function useModelInteraction(options: ModelInteractionOptions) {
  const { containerRef, interactionService } = options;
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    modelId: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!interactionService) return;
      const modelId = interactionService.handleClick(event, container);
      setSelectedModelId(modelId);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, interactionService]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (event: MouseEvent) => {
      if (!interactionService) return;
      const result = interactionService.handleContextMenu(event, container);

      if (result.modelId !== null) {
        event.preventDefault();
        setContextMenu({
          visible: true,
          x: result.x,
          y: result.y,
          modelId: result.modelId,
        });
        setSelectedModelId(result.modelId);
      } else {
        setContextMenu({
          visible: false,
          x: 0,
          y: 0,
          modelId: null,
        });
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () =>
      container.removeEventListener('contextmenu', handleContextMenu);
  }, [containerRef, interactionService]);

  const selectModel = useCallback(
    (modelId: string | null) => {
      setSelectedModelId(modelId);
      if (interactionService) {
        interactionService.highlightModel(modelId);
      }
    },
    [interactionService]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    selectedModelId,
    setSelectedModelId,
    selectModel,
    contextMenu,
    setContextMenu,
    closeContextMenu,
  };
}
