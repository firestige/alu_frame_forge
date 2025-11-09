import { useDesignerObjectStore } from '../stores';

/**
 * 订阅设计器对象列表
 *
 * 从 Store 读取对象列表，自动响应变化
 *
 * @returns 对象列表
 *
 * @example
 * ```tsx
 * function ObjectList() {
 *   const objects = useDesignerObjects();
 *
 *   return (
 *     <ul>
 *       {objects.map(obj => (
 *         <li key={obj.id}>{obj.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useDesignerObjects() {
  return useDesignerObjectStore(state => state.objects);
}
