/**
 * Constraint Draft Store
 * 
 * Manages the state of draft constraints created during constraint mode.
 * Draft constraints are temporary anchor pairs that will be used to place connectors.
 */

import { create } from 'zustand';

export interface DraftConstraint {
  id: string;
  objectAId: string;
  objectBId: string;
  anchorAId?: string;
  anchorBId?: string;
  constraintType: 'point-to-point' | 'axis-align' | 'distance';
  createdAt: number;
}

interface ConstraintDraftState {
  // Constraint mode enabled/disabled
  constraintModeEnabled: boolean;
  
  // Draft constraints array
  drafts: DraftConstraint[];
  
  // Currently active draft for placement
  activeDraftId: string | null;
  
  // Selected connector asset for placement
  selectedConnectorAssetId: string | null;
  
  // Actions
  setConstraintMode: (enabled: boolean) => void;
  addDraft: (draft: Omit<DraftConstraint, 'id' | 'createdAt'>) => void;
  removeDraft: (draftId: string) => void;
  setActiveDraft: (draftId: string | null) => void;
  clearDrafts: () => void;
  setSelectedConnector: (assetId: string | null) => void;
}

export const useConstraintDraftStore = create<ConstraintDraftState>((set) => ({
  constraintModeEnabled: false,
  drafts: [],
  activeDraftId: null,
  selectedConnectorAssetId: null,
  
  setConstraintMode: (enabled: boolean) => {
    set({ constraintModeEnabled: enabled });
    // Clear drafts when exiting constraint mode
    if (!enabled) {
      set({ drafts: [], activeDraftId: null });
    }
  },
  
  addDraft: (draft: Omit<DraftConstraint, 'id' | 'createdAt'>) => {
    const id = `draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newDraft: DraftConstraint = {
      ...draft,
      id,
      createdAt: Date.now(),
    };
    set((state) => ({
      drafts: [...state.drafts, newDraft],
      activeDraftId: id, // Auto-select newly created draft
    }));
  },
  
  removeDraft: (draftId: string) => {
    set((state) => ({
      drafts: state.drafts.filter((d) => d.id !== draftId),
      activeDraftId: state.activeDraftId === draftId ? null : state.activeDraftId,
    }));
  },
  
  setActiveDraft: (draftId: string | null) => {
    set({ activeDraftId: draftId });
  },
  
  clearDrafts: () => {
    set({ drafts: [], activeDraftId: null });
  },
  
  setSelectedConnector: (assetId: string | null) => {
    set({ selectedConnectorAssetId: assetId });
  },
}));
