/**
 * SceneManager - Three.js 场景管理器
 * 负责场景的创建、背景设置、辅助器管理等
 */

import * as THREE from 'three';
import type { ColorHex } from '../renderer-types';

export class SceneManager {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.setupDefaultLights();
  }

  /**
   * 获取场景实例
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 设置背景颜色
   * 支持十六进制数字或 CSS 颜色字符串
   */
  setBackgroundColor(color: ColorHex | string): void {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * 添加网格辅助器
   */
  addGridHelper(size = 10, divisions = 10): void {
    const gridHelper = new THREE.GridHelper(
      size,
      divisions,
      0x444444,
      0x222222
    );
    this.scene.add(gridHelper);
  }

  /**
   * 添加坐标轴辅助器
   */
  addAxesHelper(size = 5): void {
    const axesHelper = new THREE.AxesHelper(size);
    this.scene.add(axesHelper);
  }

  /**
   * 设置默认灯光
   */
  private setupDefaultLights(): void {
    // 环境光 - 提供基础照明
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // 主方向光 - 较强，从右上方照射
    const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainDirectionalLight.position.set(5, 8, 3);
    mainDirectionalLight.castShadow = true;
    mainDirectionalLight.shadow.mapSize.width = 2048;
    mainDirectionalLight.shadow.mapSize.height = 2048;
    mainDirectionalLight.shadow.camera.near = 0.5;
    mainDirectionalLight.shadow.camera.far = 50;
    this.scene.add(mainDirectionalLight);

    // 辅助方向光 - 较弱，从左下方照射，形成明暗对比
    const fillDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillDirectionalLight.position.set(-3, -2, -5);
    this.scene.add(fillDirectionalLight);
  }

  /**
   * 清空场景（保留灯光）
   */
  clear(): void {
    const objectsToRemove: THREE.Object3D[] = [];

    this.scene.traverse(object => {
      if (!(object instanceof THREE.Light) && object !== this.scene) {
        objectsToRemove.push(object);
      }
    });

    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  /**
   * 销毁场景
   */
  dispose(): void {
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.scene.clear();
  }
}
