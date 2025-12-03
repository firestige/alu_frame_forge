import * as React from 'react';
import {
  eventBus,
  sendCommand,
  onState,
  offState,
} from '@/core/services/eventBus';
import { CameraPreset } from '@/core/renderer/renderer-types';

/**
 * SimpleControlPanel - MVP 阶段的相机视角控制面板
 *
 * 特点：
 * - 使用事件驱动架构（通过 eventBus）
 * - 支持 7 个基础视图（6个正交 + 等轴测）
 * - 显示当前激活的预设高亮
 * - 显示快捷键提示
 * - 未来可直接替换为 ViewCubePanel
 */
const ControlPanel: React.FC = () => {
  const [activePreset, setActivePreset] = React.useState<string | null>(null);

  // 订阅视角变化事件
  React.useEffect(() => {
    const handleViewChanged = (event: {
      preset: string | null;
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
    }) => {
      setActivePreset(event.preset);
    };

    onState('camera:viewChanged', handleViewChanged);

    return () => {
      offState('camera:viewChanged', handleViewChanged);
    };
  }, []);

  // 发送视角切换命令
  const handlePresetClick = (preset: CameraPreset) => {
    sendCommand('command:camera:setPreset', { preset, animated: true });
  };

  // 判断按钮是否激活
  const isActive = (preset: CameraPreset) => activePreset === preset;

  return (
    <div className="absolute right-4 top-4 z-20 pointer-events-auto">
      <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl w-36">
        <div className="text-xs text-slate-400 mb-2 font-medium">视图控制</div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handlePresetClick(CameraPreset.FRONT)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.FRONT)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="正视图 (1)"
            >
              前
            </button>
            <button
              onClick={() => handlePresetClick(CameraPreset.TOP)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.TOP)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="俯视图 (2)"
            >
              上
            </button>
            <button
              onClick={() => handlePresetClick(CameraPreset.RIGHT)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.RIGHT)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="右视图 (3)"
            >
              右
            </button>
            <button
              onClick={() => handlePresetClick(CameraPreset.BACK)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.BACK)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="后视图 (4)"
            >
              后
            </button>
            <button
              onClick={() => handlePresetClick(CameraPreset.BOTTOM)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.BOTTOM)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="仰视图 (5)"
            >
              下
            </button>
            <button
              onClick={() => handlePresetClick(CameraPreset.LEFT)}
              className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                isActive(CameraPreset.LEFT)
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title="左视图 (6)"
            >
              左
            </button>
          </div>
          <button
            onClick={() => handlePresetClick(CameraPreset.ISOMETRIC)}
            className={`px-2 py-1 text-white text-xs rounded transition-colors ${
              isActive(CameraPreset.ISOMETRIC)
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title="等轴测视图 (快捷键: 7 或 H)"
          >
            等轴测
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          快捷键: 1-7 | H 回到等轴测
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
