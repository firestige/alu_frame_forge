/**
 * BoxSelectionOverlay - 框选矩形覆盖层组件
 *
 * 职责：
 * - 监听框选状态事件
 * - 渲染半透明蓝色矩形框
 * - 使用绝对定位覆盖在 3D 场景上
 * - 使用 Framer Motion 提供流畅动画
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onState, offState } from '@/core/services/eventBus';

/**
 * 框选矩形区域
 */
interface BoxRegion {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * BoxSelectionOverlay 组件
 */
export function BoxSelectionOverlay() {
  const [isActive, setIsActive] = useState(false);
  const [region, setRegion] = useState<BoxRegion | null>(null);

  useEffect(() => {
    // 监听框选开始
    const handleStarted = () => {
      setIsActive(true);
      setRegion(null);
    };

    // 监听框选活动（更新矩形）
    const handleActive = (payload: BoxRegion) => {
      setRegion(payload);
    };

    // 监听框选完成
    const handleCompleted = () => {
      setIsActive(false);
      setRegion(null);
    };

    // 监听框选取消
    const handleCancelled = () => {
      setIsActive(false);
      setRegion(null);
    };

    onState('state:boxselect:started', handleStarted);
    onState('state:boxselect:active', handleActive);
    onState('state:boxselect:completed', handleCompleted);
    onState('state:boxselect:cancelled', handleCancelled);

    return () => {
      offState('state:boxselect:started', handleStarted);
      offState('state:boxselect:active', handleActive);
      offState('state:boxselect:completed', handleCompleted);
      offState('state:boxselect:cancelled', handleCancelled);
    };
  }, []);

  // 计算矩形样式
  const boxStyle = region
    ? {
        left: region.startX,
        top: region.startY,
        width: region.endX - region.startX,
        height: region.endY - region.startY,
      }
    : {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };

  return (
    <AnimatePresence>
      {isActive && region && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="pointer-events-none fixed"
          style={{
            left: boxStyle.left,
            top: boxStyle.top,
            width: boxStyle.width,
            height: boxStyle.height,
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            zIndex: 1060,
          }}
          data-testid="box-selection-overlay"
        />
      )}
    </AnimatePresence>
  );
}
