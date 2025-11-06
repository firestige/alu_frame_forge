import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as React from 'react';

export interface ViewerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  backgroundColor?: number;
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
    backgroundColor = 0x222222,
    cameraPosition = { x: 5, y: 5, z: 5 },
    orbitControls = {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 2,
      maxDistance: 20,
    },
  } = options;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // 创建摄像机
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = orbitControls.enableDamping ?? true;
    controls.dampingFactor = orbitControls.dampingFactor ?? 0.05;
    controls.minDistance = orbitControls.minDistance ?? 2;
    controls.maxDistance = orbitControls.maxDistance ?? 20;
    controls.enablePan = true;
    controls.enableZoom = true;
    controlsRef.current = controls;

    // 添加环境光 - 提供基础照明
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // 添加主方向光 - 较强，从右上方照射
    const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainDirectionalLight.position.set(5, 8, 3);
    mainDirectionalLight.castShadow = true;
    mainDirectionalLight.shadow.mapSize.width = 2048;
    mainDirectionalLight.shadow.mapSize.height = 2048;
    mainDirectionalLight.shadow.camera.near = 0.5;
    mainDirectionalLight.shadow.camera.far = 50;
    scene.add(mainDirectionalLight);

    // 添加辅助方向光 - 较弱，从左下方照射，形成明暗对比
    const fillDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillDirectionalLight.position.set(-3, -2, -5);
    scene.add(fillDirectionalLight);

    // 添加演示用的绿色立方体
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.5,
      metalness: 0.2,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    // 添加地面网格（可选，帮助观察空间）
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 添加坐标轴辅助器（可选，帮助调试）
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 处理窗口大小调整
    const handleResize = () => {
      if (!container || !camera || !renderer) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // 更新控制器
      if (controls) {
        controls.update();
      }

      // 渲染场景
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (controls) {
        controls.dispose();
      }

      if (renderer) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }

      // 清理几何体和材质
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [containerRef, backgroundColor, cameraPosition, orbitControls]);

  // 返回控制方法
  return {
    // 重置摄像机位置
    resetCamera: () => {
      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z
        );
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    },

    // 获取场景引用（供外部添加对象使用）
    getScene: () => sceneRef.current,

    // 获取摄像机引用
    getCamera: () => cameraRef.current,

    // 获取渲染器引用
    getRenderer: () => rendererRef.current,

    // 获取控制器引用
    getControls: () => controlsRef.current,
  };
}
