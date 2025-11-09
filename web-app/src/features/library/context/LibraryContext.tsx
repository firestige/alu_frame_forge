import * as React from 'react';
import { AssetService } from '@/core/asset';

/**
 * Library Context 值类型
 */
export interface LibraryContextValue {
  assetService: AssetService;
}

/**
 * Library Context
 */
export const LibraryContext = React.createContext<LibraryContextValue | null>(
  null
);

/**
 * LibraryProvider Props
 */
export interface LibraryProviderProps {
  children: React.ReactNode;
}

/**
 * LibraryProvider - 型材库独立 Context Provider
 *
 * 特点：
 * - 创建独立的 AssetService 实例
 * - 与 Designer 的 AssetService 隔离
 * - 在 Provider 初始化时加载数据
 */
export const LibraryProvider: React.FC<LibraryProviderProps> = ({
  children,
}) => {
  const assetService = React.useMemo(() => {
    const service = new AssetService();
    service.initialize();
    return service;
  }, []);

  const value: LibraryContextValue = {
    assetService,
  };

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
};

/**
 * useLibraryContext Hook
 */
export const useLibraryContext = (): LibraryContextValue => {
  const context = React.useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibraryContext must be used within LibraryProvider');
  }
  return context;
};
