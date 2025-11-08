/**
 * 属性路径和值类型定义
 * 用于 PropertyPanel 的类型安全属性更新系统
 */

/**
 * Transform 属性路径
 * 支持嵌套访问：position.x, rotation.y, scale.z 等
 */
export type TransformPropertyPath =
  | 'position.x'
  | 'position.y'
  | 'position.z'
  | 'rotation.x'
  | 'rotation.y'
  | 'rotation.z'
  | 'scale.x'
  | 'scale.y'
  | 'scale.z';

/**
 * 用户参数属性路径
 * 格式：userParams.{参数名}
 * 例如：userParams.length, userParams.diameter
 */
export type UserParamPropertyPath = `userParams.${string}`;

/**
 * 可编辑的属性路径联合类型
 */
export type EditablePropertyPath =
  | TransformPropertyPath
  | UserParamPropertyPath;

/**
 * 属性值类型映射
 * 定义每种属性路径对应的值类型
 */
export type PropertyValueMap = {
  // Transform 属性都是 number 类型
  'position.x': number;
  'position.y': number;
  'position.z': number;
  'rotation.x': number;
  'rotation.y': number;
  'rotation.z': number;
  'scale.x': number;
  'scale.y': number;
  'scale.z': number;
  // 用户参数可以是多种类型
  [key: UserParamPropertyPath]: number | string | boolean;
};

/**
 * 根据属性路径获取对应的值类型
 *
 * @example
 * PropertyValue<'position.x'> // number
 * PropertyValue<'userParams.length'> // number | string | boolean
 */
export type PropertyValue<K extends EditablePropertyPath> =
  K extends TransformPropertyPath
    ? PropertyValueMap[K]
    : K extends UserParamPropertyPath
      ? PropertyValueMap[UserParamPropertyPath]
      : never;

/**
 * 属性更新回调函数类型
 * 使用泛型确保属性路径和值类型匹配
 *
 * @example
 * const handler: PropertyUpdateHandler = (property, value) => {
 *   if (property === 'position.x') {
 *     // value 的类型会被推断为 number
 *   }
 * };
 */
export type PropertyUpdateHandler = <K extends EditablePropertyPath>(
  property: K,
  value: PropertyValue<K>
) => void;
