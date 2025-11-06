import * as React from 'react';

export type ViewPos = { x: number; y: number; z: number };

type ControlPanelProps = {
  onView: (pos: ViewPos) => void;
};

const presets: { id: string; label: string; pos: ViewPos; title?: string }[] = [
  { id: 'front', label: '前', pos: { x: 0, y: 0, z: 5 }, title: 'Front' },
  { id: 'back', label: '后', pos: { x: 0, y: 0, z: -5 }, title: 'Back' },
  { id: 'left', label: '左', pos: { x: -5, y: 0, z: 0 }, title: 'Left' },
  { id: 'right', label: '右', pos: { x: 5, y: 0, z: 0 }, title: 'Right' },
  { id: 'top', label: '上', pos: { x: 0, y: 5, z: 0 }, title: 'Top' },
  { id: 'bottom', label: '下', pos: { x: 0, y: -5, z: 0 }, title: 'Bottom' },
  {
    id: 'ne',
    label: '↗',
    pos: { x: 5, y: 5, z: 5 },
    title: 'Right-Top-Front',
  },
  {
    id: 'nw',
    label: '↖',
    pos: { x: -5, y: 5, z: 5 },
    title: 'Left-Top-Front',
  },
  {
    id: 'se',
    label: '↘',
    pos: { x: 5, y: -5, z: 5 },
    title: 'Right-Bottom-Front',
  },
];

const ControlPanel: React.FC<ControlPanelProps> = ({ onView }) => {
  return (
    <div
      className="absolute right-4 top-4 z-20"
      style={{
        pointerEvents: 'auto',
      }}
    >
      <div className="bg-slate-800/80 border border-slate-700 rounded-md p-2 shadow-lg backdrop-blur-sm w-36">
        <div className="text-sm font-medium text-white mb-2">视角控制</div>
        <div className="grid grid-cols-3 gap-1">
          {presets.map(p => (
            <button
              key={p.id}
              title={p.title}
              onClick={() => onView(p.pos)}
              className="text-xs text-white bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-sm py-1 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-slate-400">点击切换视角</div>
      </div>
    </div>
  );
};

export default ControlPanel;
