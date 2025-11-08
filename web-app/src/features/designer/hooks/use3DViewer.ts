import { useEffect, useRef } from 'react';
import * as React from 'react';
import { createThreeRenderer } from '@/core/renderer';
import type { IRenderer } from '@/core/renderer/renderer-types';

export interface ViewerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  backgroundColor?: string;
  cameraPosition?: { x: number; y: number; z: number };
  orbitControls?: {
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
  };
}

export function use3DViewer(options: ViewerOptions) {
  const {
    containerRef,
    backgroundColor = '#222222',
    cameraPosition = { x: 5, y: 5, z: 5 },
    orbitControls = {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 2,
      maxDistance: 20,
    },
  } = options;

  const rendererRef = useRef<IRenderer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建渲染器实例（构造函数会自动调用 initialize）
    const renderer = createThreeRenderer({
      container,
      backgroundColor,
      enableShadow: true,
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: cameraPosition,
      },
      orbitControls: {
        enabled: true,
        ...orbitControls,
      },
    });

    rendererRef.current = renderer;

    // 添加网格和坐标轴辅助器
    renderer.enableGridHelper(10, 10);
    renderer.enableAxesHelper(5);

    // 开始渲染循环
    renderer.startRenderLoop();

    // 清理函数
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [containerRef, backgroundColor, cameraPosition, orbitControls]);

  // 返回控制方法
  return {
    // 重置摄像机位置
    resetCamera: () => {
      if (rendererRef.current) {
        rendererRef.current.setCameraPosition(cameraPosition);
        rendererRef.current.setCameraLookAt({ x: 0, y: 0, z: 0 });
      }
    },

    // 获取渲染器实例
    getRenderer: () => rendererRef.current,
  };
}
