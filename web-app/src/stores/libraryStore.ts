import { create } from 'zustand';

export interface Asset {
  id: string;
  name: string;
  description: string;
  svg: string;
  series: number; // 20, 30 等
  category?: string;
}

interface LibraryState {
  assets: Asset[];
  searchQuery: string;
  selectedAssets: string[];

  // Actions
  setAssets: (assets: Asset[]) => void;
  setSearchQuery: (query: string) => void;
  addAsset: (asset: Asset) => void;
  removeAssets: (ids: string[]) => void;
  toggleSelectAsset: (id: string) => void;
  clearSelection: () => void;
}

export const useLibraryStore = create<LibraryState>(set => ({
  assets: [],
  searchQuery: '',
  selectedAssets: [],

  setAssets: assets => set({ assets }),
  setSearchQuery: query => set({ searchQuery: query }),

  addAsset: asset => set(state => ({ assets: [...state.assets, asset] })),

  removeAssets: ids =>
    set(state => ({
      assets: state.assets.filter(a => !ids.includes(a.id)),
      selectedAssets: state.selectedAssets.filter(id => !ids.includes(id)),
    })),

  toggleSelectAsset: id =>
    set(state => ({
      selectedAssets: state.selectedAssets.includes(id)
        ? state.selectedAssets.filter(i => i !== id)
        : [...state.selectedAssets, id],
    })),

  clearSelection: () => set({ selectedAssets: [] }),
}));
