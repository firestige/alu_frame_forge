/**
 * Toast 工具函数
 * 提供简单的 API 来显示 Toast 通知
 */

import type { ToastType } from './Toast';

interface ToastOptions {
  duration?: number;
}

const showToast = (
  type: ToastType,
  message: string,
  options?: ToastOptions
) => {
  if (typeof window !== 'undefined' && (window as any).__addToast) {
    (window as any).__addToast({
      type,
      message,
      duration: options?.duration,
    });
  } else {
    console.warn('[Toast] ToastContainer not mounted, falling back to console');
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToast('success', message, options),
  error: (message: string, options?: ToastOptions) =>
    showToast('error', message, options),
  warning: (message: string, options?: ToastOptions) =>
    showToast('warning', message, options),
  info: (message: string, options?: ToastOptions) =>
    showToast('info', message, options),
};
