import { useEffect, useState, useRef } from 'react';
import { useCoreServices } from '@/core';

/**
 * AutoSaveIndicator 组件
 *
 * 功能：
 * 1. 订阅 AutoSaveService 的状态事件（pending/saving/saved/error）
 * 2. 显示当前保存状态（图标 + 文字）
 * 3. 显示最后保存时间戳
 * 4. 提供"立即保存"按钮，手动触发保存
 *
 * 集成位置：AppBar 右侧，紧邻项目名称
 */

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface StatusConfig {
  icon: string;
  text: string;
  color: string;
}

const STATUS_CONFIG: Record<SaveStatus, StatusConfig> = {
  idle: {
    icon: '💾',
    text: '未保存',
    color: 'text-gray-400',
  },
  pending: {
    icon: '⏳',
    text: '待保存',
    color: 'text-yellow-400',
  },
  saving: {
    icon: '⏳',
    text: '保存中',
    color: 'text-blue-400',
  },
  saved: {
    icon: '✓',
    text: '已保存',
    color: 'text-green-400',
  },
  error: {
    icon: '✗',
    text: '保存失败',
    color: 'text-red-400',
  },
};

export const AutoSaveIndicator: React.FC = () => {
  const { autoSave } = useCoreServices();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 订阅 AutoSaveService 的状态事件
    const handlePending = () => {
      setStatus('pending');
      setErrorMessage('');
      setVisible(true);
      // pending 状态持续显示
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const handleSaving = () => {
      setStatus('saving');
      setErrorMessage('');
      setVisible(true);
      // saving 状态持续显示
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const handleSaved = () => {
      setStatus('saved');
      setLastSavedTime(new Date());
      setErrorMessage('');
      setVisible(true);
      // "已保存"状态显示2秒后隐藏
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 2000) as unknown as number;
    };

    const handleError = (data: { error: Error }) => {
      setStatus('error');
      setErrorMessage(data.error.message);
      setVisible(true);
      // error 状态持续显示，直到用户手动保存
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      console.error('[AutoSaveIndicator] 保存失败:', data.error);
    };

    if (!autoSave) return;

    autoSave.on('autosave:pending', handlePending);
    autoSave.on('autosave:saving', handleSaving);
    autoSave.on('autosave:saved', handleSaved);
    autoSave.on('autosave:error', handleError);

    return () => {
      // 清理定时器
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
      autoSave.off('autosave:pending', handlePending);
      autoSave.off('autosave:saving', handleSaving);
      autoSave.off('autosave:saved', handleSaved);
      autoSave.off('autosave:error', handleError);
    };
  }, [autoSave]);

  // 手动保存按钮点击处理
  const handleManualSave = () => {
    if (!autoSave) return;
    autoSave.forceSave();
  };

  // 格式化时间戳
  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const config = STATUS_CONFIG[status];

  // 不可见时不渲染
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#2a2a2a] border border-[#3a3a3a]">
      {/* 状态图标 + 文字 */}
      <div className={`flex items-center gap-1 ${config.color}`}>
        <span className="text-base">{config.icon}</span>
        <span className="text-xs font-medium">{config.text}</span>
      </div>

      {/* 时间戳 */}
      {lastSavedTime && status === 'saved' && (
        <span className="text-xs text-gray-500">
          {formatTime(lastSavedTime)}
        </span>
      )}

      {/* 错误信息 */}
      {status === 'error' && errorMessage && (
        <span className="text-xs text-red-400" title={errorMessage}>
          {errorMessage.substring(0, 20)}
          {errorMessage.length > 20 ? '...' : ''}
        </span>
      )}

      {/* 立即保存按钮 */}
      <button
        onClick={handleManualSave}
        disabled={status === 'saving'}
        title="立即保存"
        className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        💾
      </button>
    </div>
  );
};

export default AutoSaveIndicator;
