import * as THREE from 'three';
import type { InstanceStrategy } from './InstanceStrategy';
import type { AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';

/**
 * Stub 型材策略（用于验证流程）
 *
 * 临时实现：
 * - 返回简单的立方体 Mesh
 * - 不进行复杂的截面拉伸
 * - 用于验证放置、创建、显示流程
 *
 * TODO: 替换为真正的 ProfileInstanceStrategy（实现截面拉伸）
 *
 * @see doc/Architecture.md - 3.4.1 ModelFactory 详解
 * @see TODO.md - 任务 #2 实现 ProfileInstanceStrategy
 */
export class StubProfileStrategy implements InstanceStrategy {
  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.PROFILE;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    console.log('[StubProfileStrategy] Creating stub object for:', asset.name);

    // 创建简单的立方体作为 visual mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080, // 灰色
      metalness: 0.5,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // 确保默认transform值完整且有效
    const defaultTransform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, order: 'XYZ' as const },
      scale: { x: 1, y: 1, z: 1 },
    };

    // 合并传入的transform，确保所有字段都有值
    const finalTransform = {
      position: {
        x: options.transform?.position?.x ?? defaultTransform.position.x,
        y: options.transform?.position?.y ?? defaultTransform.position.y,
        z: options.transform?.position?.z ?? defaultTransform.position.z,
      },
      rotation: {
        x: options.transform?.rotation?.x ?? defaultTransform.rotation.x,
        y: options.transform?.rotation?.y ?? defaultTransform.rotation.y,
        z: options.transform?.rotation?.z ?? defaultTransform.rotation.z,
        order: (options.transform?.rotation?.order ??
          defaultTransform.rotation.order) as 'XYZ',
      },
      scale: {
        x: options.transform?.scale?.x ?? defaultTransform.scale.x,
        y: options.transform?.scale?.y ?? defaultTransform.scale.y,
        z: options.transform?.scale?.z ?? defaultTransform.scale.z,
      },
    };

    // 应用变换（确保不会有null或undefined）
    mesh.position.set(
      finalTransform.position.x,
      finalTransform.position.y,
      finalTransform.position.z
    );

    mesh.rotation.set(
      finalTransform.rotation.x,
      finalTransform.rotation.y,
      finalTransform.rotation.z
    );

    mesh.scale.set(
      finalTransform.scale.x,
      finalTransform.scale.y,
      finalTransform.scale.z
    );

    // 添加 userData 用于识别
    mesh.userData.modelId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mesh.userData.assetId = asset.id;
    mesh.userData.assetType = asset.type;

    // 创建 SceneObject
    const sceneObject: SceneObject = {
      id: mesh.userData.modelId,
      name: options.name || `${asset.name}_instance`,
      assetId: asset.id,
      assetSource: 'builtin' as any, // Stub: 假设是内置素材
      assetType: asset.type,

      userParams: options.userParams || {},
      machiningOps: options.machiningOps || [],

      transform: {
        position: finalTransform.position,
        rotation: finalTransform.rotation,
        scale: finalTransform.scale,
      },

      visual: {
        mesh: mesh,
        isVisible: true,
      },

      compute: {
        geometry: {
          type: 'stub',
          description: 'Stub geometry for testing',
        } as any, // 临时类型，真正实现时会是 ExtrudedProfileGeometry
        material: {
          name: 'Aluminum-6063-T5',
          density: 2700,
          yieldStrength: 160,
          elasticModulus: 69000,
        },
        connections: [],
        mass: 1.0, // 假设质量 1kg
      },

      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    console.log(
      '[StubProfileStrategy] Created stub scene object:',
      sceneObject.id
    );

    return sceneObject;
  }

  updateGeometry(_sceneObject: SceneObject, _asset: AnyAsset): void {
    console.log('[StubProfileStrategy] updateGeometry called (stub - no-op)');
    // Stub 实现：不做任何更新
    // TODO: 真正实现时需要根据 userParams 和 machiningOps 重新生成几何体
  }
}
