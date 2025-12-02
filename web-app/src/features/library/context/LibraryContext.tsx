import * as React from 'react';
import { useCoreServices } from '@/core';
import type { AssetService } from '@/core/asset';

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
 * LibraryProvider - 型材库 Context Provider
 *
 * 职责：
 * - 从 CoreServices 获取共享的 AssetService 实例
 * - 提供统一的访问接口给 Library 模块
 *
 * 架构说明：
 * - 使用 CoreServiceProvider 中的 AssetService 单例
 * - 与 Designer 模块共享相同的资产数据
 * - 遵循"单一数据源"原则
 *
 * 修复：Issue #9 - 移除重复的 AssetService 实例创建
 */
export const LibraryProvider: React.FC<LibraryProviderProps> = ({
  children,
}) => {
  // 从 CoreServices 获取共享的 AssetService 实例
  const { assetService } = useCoreServices();

  const value: LibraryContextValue = {
    assetService,
  };

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
};

/**
 * useLibraryContext Hook
 *
 * 提供对共享 AssetService 的访问
 *
 * @example
 * ```tsx
 * const { assetService } = useLibraryContext();
 * const profiles = assetService.getAllProfiles();
 * ```
 */
export const useLibraryContext = (): LibraryContextValue => {
  const context = React.useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibraryContext must be used within LibraryProvider');
  }
  return context;
};
