import { useEffect, useRef, useState } from 'react';
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
    cameraPosition = { x: 0.8, y: 0.8, z: 0.8 }, // 约1.4m距离 + 45° FOV，适合观察50cm型材
    orbitControls = {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 0.005, // 0.005m (5mm) - 可以推近到极近距离观察细节
      maxDistance: 10, // 10m - 适合家具场景的最大观察距离
    },
  } = options;

  // 🔑 使用 useState 而不是 useRef，这样 renderer 变化时会触发依赖它的组件重新渲染
  const [renderer, setRenderer] = useState<IRenderer | null>(null);
  const hasInitializedRef = useRef(false); // 防止重复初始化

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      console.log('[use3DViewer] ⏭️  容器尚未挂载，跳过初始化');
      return;
    }

    if (hasInitializedRef.current) {
      console.log('[use3DViewer] ⏭️  渲染器已初始化，跳过重复创建');
      return;
    }

    console.log('[use3DViewer] 🚀 开始创建 Three.js 渲染器...');
    hasInitializedRef.current = true;

    // 创建渲染器实例（构造函数会自动调用 initialize）
    const newRenderer = createThreeRenderer({
      container,
      backgroundColor,
      enableShadow: true,
      camera: {
        fov: 45, // 45° FOV - 更小的视野角让对象看起来更大（zoom in效果）
        near: 0.001, // 1mm - 适配家具场景
        far: 100, // 100m - 适配家具场景
        position: cameraPosition,
      },
      orbitControls: {
        enabled: true,
        ...orbitControls,
      },
    });

    setRenderer(newRenderer);
    console.log('[use3DViewer] ✅ 渲染器创建成功');

    // 🔍 使用调试接口获取摄像机和控制器状态
    const debugInfo = newRenderer.getDebugInfo();
    const distance = Math.sqrt(
      debugInfo.camera.position.x ** 2 +
        debugInfo.camera.position.y ** 2 +
        debugInfo.camera.position.z ** 2
    );

    console.log('[use3DViewer] 📷 摄像机实际状态:', {
      位置: debugInfo.camera.position,
      观察目标: debugInfo.camera.target,
      '距离原点(米)': distance.toFixed(2),
      'FOV(度)': debugInfo.camera.fov,
      'near(米)': debugInfo.camera.near,
      'far(米)': debugInfo.camera.far,
    });

    console.log(
      '[use3DViewer] 🎮 OrbitControls实际状态:',
      debugInfo.orbitControls
    );

    // 添加网格和坐标轴辅助器
    newRenderer.enableGridHelper(10, 10);
    newRenderer.enableAxesHelper(5);

    // 开始渲染循环
    newRenderer.startRenderLoop();
    console.log('[use3DViewer] ✅ 渲染循环已启动');

    // 清理函数
    return () => {
      console.log('[use3DViewer] Cleanup: 销毁渲染器');
      newRenderer.dispose();
      setRenderer(null);
      hasInitializedRef.current = false;
    };
  }, []); // 空依赖数组，只在挂载时执行一次

  // 返回控制方法
  return {
    // 重置摄像机位置
    resetCamera: () => {
      if (renderer) {
        renderer.setCameraPosition(cameraPosition);
        renderer.setCameraLookAt({ x: 0, y: 0, z: 0 });
      }
    },

    // 获取渲染器实例（现在直接返回 state 值，而不是函数）
    getRenderer: () => renderer,
  };
}
