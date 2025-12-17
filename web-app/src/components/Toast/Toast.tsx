/**
 * Toast 通知组件
 * 用于显示临时提示信息（成功、错误、警告、信息）
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // 持续时间（ms），默认 3000
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast = ({ message, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(message.id), 300); // 等待动画结束
    }, message.duration || 3000);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onClose]);

  const getTypeStyles = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-700 text-white';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${getTypeStyles()} min-w-[300px] max-w-[500px]`}
        >
          <span className="text-xl">{getIcon()}</span>
          <span className="flex-1">{message.message}</span>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(message.id), 300);
            }}
            className="text-white hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
