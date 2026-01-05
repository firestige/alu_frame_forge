import { create } from 'zustand';
import type { SceneObject } from '@/core/object';

/**
 * 设计器对象状态
 */
interface DesignerObjectState {
  // 数据
  objects: SceneObject[];

  // Actions
  setObjects: (objects: SceneObject[]) => void;
  addObject: (object: SceneObject) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<SceneObject>) => void;
  clearObjects: () => void;
}

/**
 * 设计器对象 Store
 *
 * 职责：
 * - 存储场景对象列表
 * - 提供对象的增删改查操作
 *
 * 数据来源：
 * - ObjectManager 通过事件同步数据到此 Store
 *
 * 数据消费：
 * - UI 组件通过 useDesignerObjects() Hook 读取
 *
 * @example
 * ```tsx
 * // 在 UI 组件中使用
 * const objects = useDesignerObjectStore(state => state.objects);
 *
 * // 在 DesignerPage 中同步数据
 * useDesignerObjectStore.getState().setObjects(allObjects);
 * ```
 */
export const useDesignerObjectStore = create<DesignerObjectState>(set => ({
  // 初始状态
  objects: [],

  // 设置对象列表（完全替换）
  setObjects: objects => {
    console.log('[DesignerObjectStore] setObjects 被调用，对象数量:', objects.length);
    if (objects.length > 0) {
      console.log('[DesignerObjectStore] 对象:', objects.map(o => ({ id: o.id, name: o.name })));
    }
    set({ objects });
  },

  // 添加单个对象
  addObject: object =>
    set(state => ({
      objects: [...state.objects, object],
    })),

  // 删除对象
  removeObject: objectId =>
    set(state => ({
      objects: state.objects.filter(obj => obj.id !== objectId),
    })),

  // 更新对象
  updateObject: (objectId, updates) =>
    set(state => ({
      objects: state.objects.map(obj =>
        obj.id === objectId ? { ...obj, ...updates } : obj
      ),
    })),

  // 清空所有对象
  clearObjects: () => set({ objects: [] }),
}));
