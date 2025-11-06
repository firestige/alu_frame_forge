import * as THREE from 'three';
import { ObjectManager, type Model } from '../../../core/object/ObjectManager.ts';

/**
 * 模型交互服务
 * 负责模型的选中、高亮、射线检测等交互逻辑
 */
export class ModelInteractionService {
  private objectManager: ObjectManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedModelId: string | null = null;

  constructor(objectManager: ObjectManager) {
    this.objectManager = objectManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * 获取当前选中的模型 ID
   */
  public getSelectedModelId(): string | null {
    return this.selectedModelId;
  }

  /**
   * 高亮指定模型
   */
  public highlightModel(modelId: string | null): void {
    const allModels = this.objectManager.getAllModels();

    // 移除所有高亮
    allModels.forEach(model => {
      this.removeHighlight(model);
    });

    // 添加新的高亮
    if (modelId) {
      const model = this.objectManager.getModel(modelId);
      if (model) {
        this.applyHighlight(model);
      }
    }

    this.selectedModelId = modelId;
  }

  /**
   * 移除模型高亮
   */
  private removeHighlight(model: Model): void {
    if (
      model.object3D instanceof THREE.Mesh &&
      model.object3D.userData.originalMaterial
    ) {
      model.object3D.material = model.object3D.userData.originalMaterial;
      delete model.object3D.userData.originalMaterial;
    }
  }

  /**
   * 应用高亮效果
   */
  private applyHighlight(model: Model): void {
    if (model.object3D instanceof THREE.Mesh) {
      // 保存原始材质
      model.object3D.userData.originalMaterial = model.object3D.material;

      // 创建高亮材质
      const highlightMaterial = (
        model.object3D.material as THREE.MeshStandardMaterial
      ).clone();
      highlightMaterial.emissive = new THREE.Color(0x00ff00);
      highlightMaterial.emissiveIntensity = 0.5;
      model.object3D.material = highlightMaterial;
    }
  }

  /**
   * 处理点击事件（选中模型）
   */
  public handleClick(
    event: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): string | null {
    this.updateMousePosition(event, container);
    this.raycaster.setFromCamera(this.mouse, camera);

    const interactiveObjects = this.getInteractiveObjects();
    const intersects = this.raycaster.intersectObjects(
      interactiveObjects,
      true
    );

    if (intersects.length > 0) {
      const modelId = intersects[0].object.userData.modelId;
      if (modelId) {
        this.highlightModel(modelId);
        return modelId;
      }
    } else {
      this.highlightModel(null);
    }

    return null;
  }

  /**
   * 处理右键点击（上下文菜单）
   */
  public handleContextMenu(
    event: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): { modelId: string | null; x: number; y: number } {
    this.updateMousePosition(event, container);
    this.raycaster.setFromCamera(this.mouse, camera);

    const interactiveObjects = this.getInteractiveObjects();
    const intersects = this.raycaster.intersectObjects(
      interactiveObjects,
      true
    );

    if (intersects.length > 0) {
      const modelId = intersects[0].object.userData.modelId;
      if (modelId) {
        this.highlightModel(modelId);
        return {
          modelId,
          x: event.clientX,
          y: event.clientY,
        };
      }
    }

    return {
      modelId: null,
      x: event.clientX,
      y: event.clientY,
    };
  }

  /**
   * 更新鼠标位置
   */
  private updateMousePosition(event: MouseEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 获取所有可交互的对象
   */
  private getInteractiveObjects(): THREE.Object3D[] {
    const interactiveObjects: THREE.Object3D[] = [];
    this.objectManager.getAllModels().forEach(model => {
      if (model.object3D && model.object3D.userData.interactive) {
        interactiveObjects.push(model.object3D);
      }
    });
    return interactiveObjects;
  }

  /**
   * 清除选中状态
   */
  public clearSelection(): void {
    this.highlightModel(null);
  }

  /**
   * 获取鼠标下的模型
   */
  public getModelUnderMouse(
    event: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): Model | null {
    this.updateMousePosition(event, container);
    this.raycaster.setFromCamera(this.mouse, camera);

    const interactiveObjects = this.getInteractiveObjects();
    const intersects = this.raycaster.intersectObjects(
      interactiveObjects,
      true
    );

    if (intersects.length > 0) {
      const modelId = intersects[0].object.userData.modelId;
      if (modelId) {
        return this.objectManager.getModel(modelId) || null;
      }
    }

    return null;
  }
}
