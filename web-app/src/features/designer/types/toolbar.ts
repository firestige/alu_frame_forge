/**
 * Toolbar 配置类型定义
 * 
 * 用于数据驱动的工具栏组件
 */

/**
 * 工具栏操作项配置
 */
export interface ToolbarAction {
  /** 唯一标识符 */
  id: string;

  /** 显示文本（可选） */
  label?: string;

  /** 图标组件 */
  icon: React.ReactNode;

  /** 提示文本 */
  tooltip?: string;

  /** 要发送的命令 */
  command: string;

  /** 命令参数 */
  payload?: any;

  /** 是否为激活状态 */
  active?: boolean;

  /** 是否禁用 */
  disabled?: boolean;

  /** 分组标识（用于按钮分组） */
  group?: string;
}
