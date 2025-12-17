/**
 * ToastContainer - Toast 消息容器
 * 管理多个 Toast 消息的显示和移除
 */

import { useState, useCallback } from 'react';
import Toast, { type ToastMessage } from './Toast';

interface ToastContainerProps {
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

const ToastContainer = ({ position = 'top-right' }: ToastContainerProps) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  // 暴露添加 Toast 的方法到全局
  if (typeof window !== 'undefined') {
    (window as any).__addToast = (message: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev, { ...message, id }]);
    };
  }

  return (
    <div
      className={`fixed ${getPositionStyles()} z-[9999] flex flex-col gap-2 pointer-events-none`}
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast message={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
