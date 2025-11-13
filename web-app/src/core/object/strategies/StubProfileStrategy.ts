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

    // 应用变换
    if (options.transform?.position) {
      const pos = options.transform.position;
      mesh.position.set(pos.x, pos.y, pos.z);
    }

    if (options.transform?.rotation) {
      const rot = options.transform.rotation;
      mesh.rotation.set(rot.x, rot.y, rot.z);
    }

    if (options.transform?.scale) {
      const scale = options.transform.scale;
      mesh.scale.set(scale.x, scale.y, scale.z);
    }

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
        position: options.transform?.position || { x: 0, y: 0, z: 0 },
        rotation: options.transform?.rotation || {
          x: 0,
          y: 0,
          z: 0,
          order: 'XYZ',
        },
        scale: options.transform?.scale || { x: 1, y: 1, z: 1 },
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
