/**
 * RendererCore - Three.js 渲染器核心
 * 负责 WebGL 渲染器的创建和渲染循环管理
 */

import * as THREE from 'three';
import type { RendererConfig } from '../renderer-types';

export class RendererCore {
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private renderLoopCallback: (() => void) | null = null;

  /**
   * 初始化渲染器
   */
  initialize(config: RendererConfig): THREE.WebGLRenderer {
    this.container = config.container;

    // 创建 WebGL 渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: config.antialias !== false,
      alpha: true,
    });

    this.renderer.setSize(
      config.container.clientWidth,
      config.container.clientHeight
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // 启用阴影
    if (config.enableShadow !== false) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 添加到容器
    config.container.appendChild(this.renderer.domElement);

    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);

    return this.renderer;
  }

  /**
   * 获取渲染器实例
   */
  getRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    return this.renderer;
  }

  /**
   * 调整渲染器大小
   */
  resize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 手动渲染一帧
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.renderer) {
      this.renderer.render(scene, camera);
    }
  }

  /**
   * 启动渲染循环
   */
  startRenderLoop(
    scene: THREE.Scene,
    camera: THREE.Camera,
    onUpdate?: () => void,
    callback?: () => void
  ): void {
    this.renderLoopCallback = callback || null;

    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate);

      // 调用更新回调（例如更新控制器）
      if (onUpdate) {
        onUpdate();
      }

      // 调用用户回调
      if (this.renderLoopCallback) {
        this.renderLoopCallback();
      }

      // 渲染场景
      this.render(scene, camera);
    };

    animate();
  }

  /**
   * 停止渲染循环
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize = (): void => {
    if (!this.container || !this.renderer) return;
    this.resize(this.container.clientWidth, this.container.clientHeight);
  };

  /**
   * 销毁渲染器
   */
  dispose(): void {
    this.stopRenderLoop();

    window.removeEventListener('resize', this.handleResize);

    if (this.renderer && this.container) {
      if (this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
      this.renderer = null;
    }

    this.container = null;
  }
}
