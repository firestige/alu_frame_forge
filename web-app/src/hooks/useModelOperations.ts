import { useCallback, useReducer } from 'react';
import { ModelCreationService } from '../service/ModelCreationService';
import { ModelEditorService } from '../service/ModelEditorService';

export interface ModelOperationsOptions {
  creationService: ModelCreationService | null;
  editorService: ModelEditorService | null;
}

export function useModelOperations(options: ModelOperationsOptions) {
  const { creationService, editorService } = options;
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const createCube = useCallback(() => {
    creationService?.createCube();
    forceUpdate();
  }, [creationService]);

  const createBox = useCallback(() => {
    creationService?.createBox();
    forceUpdate();
  }, [creationService]);

  const createAluminumProfile = useCallback(() => {
    creationService?.createAluminumProfile();
    forceUpdate();
  }, [creationService]);

  const createPanel = useCallback(() => {
    creationService?.createPanel();
    forceUpdate();
  }, [creationService]);

  const createConnector = useCallback(() => {
    creationService?.createConnector();
    forceUpdate();
  }, [creationService]);

  const editModel = useCallback(
    (modelId: string) => {
      editorService?.editModel(modelId);
      forceUpdate();
    },
    [editorService]
  );

  const toggleVisibility = useCallback(
    (modelId: string) => {
      editorService?.toggleVisibility(modelId);
      forceUpdate();
    },
    [editorService]
  );

  const showProperties = useCallback(
    (modelId: string) => {
      editorService?.showProperties(modelId);
    },
    [editorService]
  );

  const deleteModel = useCallback(
    (modelId: string): boolean => {
      const deleted = editorService?.deleteModel(modelId) ?? false;
      if (deleted) {
        forceUpdate();
      }
      return deleted;
    },
    [editorService]
  );

  return {
    createCube,
    createBox,
    createAluminumProfile,
    createPanel,
    createConnector,
    editModel,
    toggleVisibility,
    showProperties,
    deleteModel,
    refresh: forceUpdate,
  };
}

