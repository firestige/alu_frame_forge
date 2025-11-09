import { create } from 'zustand';

/**
 * 项目元数据
 */
interface ProjectMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 项目状态
 */
type ProjectStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 设计器项目状态
 */
interface DesignerProjectState {
  // 数据
  projectId: string | null;
  projectName: string;
  metadata: ProjectMetadata;
  status: ProjectStatus;
  error: Error | null;

  // Actions
  setProject: (data: {
    id: string;
    name: string;
    metadata: ProjectMetadata;
  }) => void;
  setStatus: (status: ProjectStatus) => void;
  setError: (error: Error | null) => void;
  clearProject: () => void;
}

/**
 * 设计器项目 Store
 *
 * 职责：
 * - 存储当前项目的元数据
 * - 管理项目加载状态
 *
 * 数据来源：
 * - DesignerPage 加载项目后设置
 *
 * 数据消费：
 * - UI 组件通过 useDesignerProject() Hook 读取
 *
 * @example
 * ```tsx
 * // 在 UI 组件中使用
 * const project = useDesignerProjectStore(state => ({
 *   name: state.projectName,
 *   status: state.status
 * }));
 *
 * // 在 DesignerPage 中设置项目
 * useDesignerProjectStore.getState().setProject({
 *   id: 'proj-123',
 *   name: '我的项目',
 *   metadata: { ... }
 * });
 * ```
 */
export const useDesignerProjectStore = create<DesignerProjectState>(set => ({
  // 初始状态
  projectId: null,
  projectName: '未命名项目',
  metadata: {
    name: '未命名项目',
    description: '',
    author: '',
  },
  status: 'idle',
  error: null,

  // 设置项目信息
  setProject: data =>
    set({
      projectId: data.id,
      projectName: data.name,
      metadata: data.metadata,
      status: 'ready',
      error: null,
    }),

  // 设置加载状态
  setStatus: status => set({ status }),

  // 设置错误
  setError: error =>
    set({
      error,
      status: 'error',
    }),

  // 清空项目
  clearProject: () =>
    set({
      projectId: null,
      projectName: '未命名项目',
      metadata: {
        name: '未命名项目',
        description: '',
        author: '',
      },
      status: 'idle',
      error: null,
    }),
}));
