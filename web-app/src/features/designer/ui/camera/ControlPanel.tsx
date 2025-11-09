import * as React from 'react';
import { sendCommand } from '@/core/services/eventBus';

const ControlPanel: React.FC = () => {
  const viewPresets = {
    front: { position: { x: 0, y: 0, z: 5 }, target: { x: 0, y: 0, z: 0 } },
    back: { position: { x: 0, y: 0, z: -5 }, target: { x: 0, y: 0, z: 0 } },
    left: { position: { x: -5, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    right: { position: { x: 5, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    top: { position: { x: 0, y: 5, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    bottom: { position: { x: 0, y: -5, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    isometric: { position: { x: 5, y: 5, z: 5 }, target: { x: 0, y: 0, z: 0 } },
  };

  const handleViewChange = (view: keyof typeof viewPresets) => {
    sendCommand('command:camera:setView', viewPresets[view]);
  };

  const handleCameraReset = () => {
    sendCommand('command:camera:reset', undefined);
  };

  return (
    <div className="absolute right-4 top-4 z-20 pointer-events-auto">
      <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl w-36">
        <div className="text-xs text-slate-400 mb-2 font-medium">视图控制</div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => handleViewChange('front')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="正视图"
            >
              前
            </button>
            <button
              onClick={() => handleViewChange('top')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="俯视图"
            >
              上
            </button>
            <button
              onClick={() => handleViewChange('right')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="右视图"
            >
              右
            </button>
            <button
              onClick={() => handleViewChange('back')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="后视图"
            >
              后
            </button>
            <button
              onClick={() => handleViewChange('bottom')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="仰视图"
            >
              下
            </button>
            <button
              onClick={() => handleViewChange('left')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              title="左视图"
            >
              左
            </button>
          </div>
          <button
            onClick={() => handleViewChange('isometric')}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            title="等轴测视图"
          >
            等轴测
          </button>
          <button
            onClick={handleCameraReset}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
            title="重置相机"
          >
            重置
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-400">点击切换视角</div>
      </div>
    </div>
  );
};

export default ControlPanel;
