import * as React from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

/**
 * Dialog 属性接口
 */
export interface DialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 对话框标题 */
  title?: string;
  /** 对话框内容 */
  children: React.ReactNode;
  /** 底部操作按钮 */
  actions?: React.ReactNode;
  /** 对话框尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
}

/**
 * Dialog - 模态对话框组件
 *
 * 功能：
 * - 基于 Headless UI，完全无障碍
 * - 支持 ESC 键关闭
 * - 支持点击背景关闭
 * - 符合设计系统规范
 * - 动画过渡（Framer Motion style）
 *
 * @example
 * <Dialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="编辑参数"
 *   actions={
 *     <>
 *       <Button onClick={handleSave}>保存</Button>
 *       <Button onClick={() => setIsOpen(false)}>取消</Button>
 *     </>
 *   }
 * >
 *   <p>对话框内容</p>
 * </Dialog>
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  showCloseButton = true,
}) => {
  // 尺寸映射
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-[1050]" onClose={onClose}>
        {/* 背景遮罩 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* 对话框容器 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel
                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg bg-slate-800 shadow-xl transition-all`}
              >
                {/* 标题栏 */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    {title && (
                      <HeadlessDialog.Title
                        as="h3"
                        className="text-lg font-medium text-white"
                      >
                        {title}
                      </HeadlessDialog.Title>
                    )}
                    {showCloseButton && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white transition-colors"
                        onClick={onClose}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* 内容区域 */}
                <div className="px-6 py-4">{children}</div>

                {/* 底部操作按钮 */}
                {actions && (
                  <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700 bg-slate-750">
                    {actions}
                  </div>
                )}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

export default Dialog;
