import { useEffect } from 'react';
import type { IRenderer } from '@/core/renderer/renderer-types';
import { sendCommand } from '@/core/services/eventBus';

/**
 * useSceneClick - 处理 3D 场景点击事件
 *
 * 职责：
 * - 监听容器的点击事件
 * - 通过 raycast 检测点击的对象
 * - 支持单选和多选（Ctrl/Cmd+点击）
 * - 发送选择命令到 eventBus
 */
export function useSceneClick(
  containerRef: React.RefObject<HTMLDivElement>,
  renderer: IRenderer | null
): void {
  useEffect(() => {
    if (!containerRef.current || !renderer) {
      return;
    }

    const container = containerRef.current;

    const handleClick = (event: MouseEvent) => {
      // 获取容器的边界矩形
      const rect = container.getBoundingClientRect();

      // 计算归一化设备坐标 (NDC: -1 到 +1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 射线检测
      const hits = renderer.raycastFromNDC(
        { x, y },
        {
          includeHelpers: false, // 不检测辅助对象
          includeWorkPlane: false, // 不检测工作平面
        }
      );

      // 检测是否按下 Ctrl/Cmd 键（多选模式）
      const isMultiSelectMode = event.ctrlKey || event.metaKey;

      if (hits && hits.length > 0) {
        // 点击到对象：选中第一个对象
        const hitObject = hits[0];
        // handle 包含 userData.modelId 或 uuid
        const objectId = hitObject.handle;

        if (objectId) {
          if (isMultiSelectMode) {
            // 多选模式：切换选中状态
            console.log('[useSceneClick] Toggle selection:', objectId);
            sendCommand('command:selection:toggle', objectId);
          } else {
            // 单选模式：设置选中
            console.log('[useSceneClick] Object selected:', objectId);
            sendCommand('command:selection:set', objectId);
          }
        } else {
          // 点击到场景对象但没有 ID（可能是辅助对象）
          if (!isMultiSelectMode) {
            console.log(
              '[useSceneClick] Hit object without ID, clearing selection'
            );
            sendCommand('command:selection:clear', undefined);
          }
        }
      } else {
        // 点击空白处：取消选择（仅在非多选模式下）
        if (!isMultiSelectMode) {
          console.log('[useSceneClick] No hits, clearing selection');
          sendCommand('command:selection:clear', undefined);
        }
      }
    };

    // 添加点击事件监听
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [containerRef, renderer]);
}
