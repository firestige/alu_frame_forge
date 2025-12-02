import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Drawer Store 状态接口
 */
interface DrawerStore {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

/**
 * Drawer 状态管理 Store
 *
 * 职责：
 * - 管理全局侧边栏的展开/折叠状态
 * - 持久化用户偏好到 localStorage
 *
 * 持久化策略：
 * - 使用 Zustand persist 中间件
 * - 存储键名: 'drawer-storage'
 * - 刷新页面后自动恢复上次状态
 *
 * 修复：Issue #10 - 添加状态持久化
 */
export const useDrawerStore = create<DrawerStore>()(
  persist(
    set => ({
      isOpen: true,
      toggle: () => set(state => ({ isOpen: !state.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: 'drawer-storage', // localStorage key
    }
  )
);
