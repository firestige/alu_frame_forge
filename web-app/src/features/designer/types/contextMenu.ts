/**
 * ContextMenu 配置类型定义
 * 
 * 用于数据驱动的右键菜单组件
 */

/**
 * 右键菜单上下文信息
 */
export interface MenuContext {
  /** 对象 ID（对象菜单） */
  objectId?: string;

  /** 选中的对象列表 */
  selectedObjects?: string[];

  /** 对象是否可见 */
  isVisible?: boolean;

  /** 其他上下文信息 */
  [key: string]: any;
}

/**
 * 右键菜单操作项配置
 */
export type MenuAction =
  | {
      /** 唯一标识符 */
      id: string;

      /** 显示文本 */
      label: string;

      /** 图标（emoji 或组件） */
      icon?: string;

      /** 要发送的命令 */
      command: string;

      /**
       * 命令参数
       * - 静态值：直接传递
       * - 函数：根据上下文动态生成
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload?: any | ((context: MenuContext) => any);

      /** 快捷键提示 */
      shortcut?: string;

      /** 是否为危险操作（如删除） */
      danger?: boolean;

      /** 是否为分隔符 */
      separator?: false;

      /**
       * 是否禁用
       * - 布尔值：静态禁用
       * - 函数：根据上下文动态判断
       */
      disabled?: boolean | ((context: MenuContext) => boolean);
    }
  | {
      /** 分隔符 */
      separator: true;
    };
