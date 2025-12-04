/**
 * OutlineEffect - 对象轮廓高亮效果
 *
 * 使用 Three.js 后处理框架实现对象选中高亮效果
 * 基于 EffectComposer + OutlinePass
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * 高亮配置
 */
export interface OutlineConfig {
  /** 边缘强度 */
  edgeStrength?: number;
  /** 边缘发光 */
  edgeGlow?: number;
  /** 边缘厚度 */
  edgeThickness?: number;
  /** 可见边缘颜色 */
  visibleEdgeColor?: string;
  /** 隐藏边缘颜色 */
  hiddenEdgeColor?: string;
}

/**
 * OutlineEffect - 轮廓高亮效果
 */
export class OutlineEffect {
  private composer: EffectComposer;
  private outlinePass: OutlinePass;
  private fxaaPass: ShaderPass;
  private outputPass: OutputPass;
  private highlightedObjects = new Map<string, THREE.Object3D>();
  private renderer: THREE.WebGLRenderer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config?: OutlineConfig
  ) {
    this.renderer = renderer;

    // 初始化 EffectComposer
    this.composer = new EffectComposer(renderer);

    // 添加 RenderPass（基础渲染）
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 添加 OutlinePass（轮廓高亮）
    const resolution = new THREE.Vector2(
      renderer.domElement.width,
      renderer.domElement.height
    );
    this.outlinePass = new OutlinePass(resolution, scene, camera);

    // 应用配置
    this.outlinePass.edgeStrength = config?.edgeStrength ?? 3.0;
    this.outlinePass.edgeGlow = config?.edgeGlow ?? 0.0;
    this.outlinePass.edgeThickness = config?.edgeThickness ?? 1.0;
    this.outlinePass.visibleEdgeColor.set(
      config?.visibleEdgeColor ?? '#00ff00'
    );
    this.outlinePass.hiddenEdgeColor.set(config?.hiddenEdgeColor ?? '#ff0000');

    this.composer.addPass(this.outlinePass);

    // 添加 FXAA（抗锯齿）
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFXAAResolution();
    this.composer.addPass(this.fxaaPass);

    // ⭐ 添加 OutputPass（处理色调映射和伽马校正）
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    console.log(
      '[OutlineEffect] Initialized with OutputPass for proper tone mapping'
    );
  }

  /**
   * 设置对象轮廓高亮
   * @param object 场景对象
   * @param enabled 是否启用高亮
   */
  setObjectOutline(object: THREE.Object3D, enabled: boolean): void {
    const objectId = object.userData.modelId || object.uuid;

    console.log('[OutlineEffect] setObjectOutline called:', {
      objectId,
      enabled,
      objectType: object.type,
      objectName: object.name,
    });

    if (enabled) {
      this.highlightedObjects.set(objectId, object);
    } else {
      this.highlightedObjects.delete(objectId);
    }

    this.updateOutlinePass();

    console.log('[OutlineEffect] Current highlighted objects:', {
      count: this.highlightedObjects.size,
      ids: Array.from(this.highlightedObjects.keys()),
      selectedObjects: this.outlinePass.selectedObjects.length,
    });
  }

  /**
   * 清除所有轮廓高亮
   */
  clearAllOutlines(): void {
    this.highlightedObjects.clear();
    this.updateOutlinePass();
  }

  /**
   * 更新 OutlinePass 的选中对象列表
   */
  private updateOutlinePass(): void {
    this.outlinePass.selectedObjects = Array.from(
      this.highlightedObjects.values()
    );
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return !!this.composer && !!this.outlinePass;
  }

  /**
   * 渲染（替代标准渲染器渲染）
   */
  render(): void {
    this.composer.render();
  }

  /**
   * 调整渲染器大小
   */
  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.outlinePass.resolution.set(width, height);
    this.updateFXAAResolution();
  }

  /**
   * 更新 FXAA 分辨率
   */
  private updateFXAAResolution(): void {
    const pixelRatio = this.renderer.getPixelRatio();
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    this.fxaaPass.material.uniforms['resolution'].value.x =
      1 / (width * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y =
      1 / (height * pixelRatio);
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    this.highlightedObjects.clear();
    this.composer.dispose();
  }

  /**
   * 获取 EffectComposer（用于外部渲染循环）
   */
  getComposer(): EffectComposer {
    return this.composer;
  }

  /**
   * 是否有高亮对象
   */
  hasHighlightedObjects(): boolean {
    return this.highlightedObjects.size > 0;
  }
}
