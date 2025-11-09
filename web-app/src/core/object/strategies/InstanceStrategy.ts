import type { AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
} from '../types/scene-object';

/**
 * 实例化策略接口
 * 定义从素材创建场景对象的标准流程
 *
 * 策略模式的核心接口，每种素材类型需要实现此接口
 * 以定义自己的实例化逻辑
 */
export interface InstanceStrategy {
  /**
   * 检查是否能处理该素材
   * @param asset 待检查的素材
   * @returns 是否能处理
   */
  canHandle(asset: AnyAsset): boolean;

  /**
   * 从素材创建场景对象
   * @param asset 素材定义
   * @param options 创建选项（包含用户参数）
   * @returns 完整的场景对象
   */
  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject;

  /**
   * 更新场景对象的几何体
   * 当用户参数或加工操作变化时调用
   * @param sceneObject 待更新的场景对象
   * @param asset 关联的素材
   */
  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void;
}
