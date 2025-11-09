import { useEffect, useRef } from 'react';
import type { IRenderer } from '@/core/renderer/renderer-types';
import { SelectionService } from '../services/SelectionService';

/**
 * useSelectionService - UI 选择服务 Hook
 *
 * 职责：
 * - 在 UI 层创建 SelectionService
 * - 管理 SelectionService 的生命周期
 * - 随 renderer 的创建/销毁自动初始化/清理
 *
 * @param renderer 渲染器实例
 * @returns SelectionService 实例（可能为 null）
 */
export function useSelectionService(
  renderer: IRenderer | null
): SelectionService | null {
  const serviceRef = useRef<SelectionService | null>(null);

  useEffect(() => {
    if (!renderer) {
      return;
    }

    console.log('[useSelectionService] 创建 SelectionService');
    const selectionService = new SelectionService(renderer);
    serviceRef.current = selectionService;

    return () => {
      console.log('[useSelectionService] 销毁 SelectionService');
      selectionService.dispose();
      serviceRef.current = null;
    };
  }, [renderer]);

  return serviceRef.current;
}
