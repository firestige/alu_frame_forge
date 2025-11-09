import { useDesignerProjectStore } from '../stores';

/**
 * 订阅设计器项目信息
 *
 * @returns 项目信息（id、name、status、metadata）
 *
 * @example
 * ```tsx
 * function ProjectInfo() {
 *   const project = useDesignerProject();
 *
 *   if (project.status === 'loading') {
 *     return <div>加载中...</div>;
 *   }
 *
 *   return <div>项目：{project.name}</div>;
 * }
 * ```
 */
export function useDesignerProject() {
  return useDesignerProjectStore(state => ({
    id: state.projectId,
    name: state.projectName,
    status: state.status,
    metadata: state.metadata,
    error: state.error,
  }));
}
