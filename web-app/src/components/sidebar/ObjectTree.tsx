import * as React from 'react';
import { type Model } from '../../core/object/ObjectManager.ts';

interface ObjectTreeProps {
  models: Model[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
  onToggleVisibility: (modelId: string) => void;
}

const ObjectTree: React.FC<ObjectTreeProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onToggleVisibility,
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs text-slate-400 mb-2 font-medium">
          场景对象 ({models.length})
        </div>
        {models.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            暂无对象
          </div>
        ) : (
          <div className="space-y-1">
            {models.map(model => (
              <div
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                  transition-colors text-xs
                  ${
                    selectedModelId === model.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-700 text-slate-300'
                  }
                  ${!model.isVisible ? 'opacity-50' : ''}
                `}
              >
                {/* 可见性切换按钮 */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onToggleVisibility(model.id);
                  }}
                  className="text-sm hover:text-blue-400"
                >
                  {model.isVisible ? '👁️' : '🚫'}
                </button>

                {/* 模型类型图标 */}
                <span className="text-sm">
                  {model.type === 'aluminum_profile' && '🔩'}
                  {model.type === 'connector' && '🔗'}
                  {model.type === 'panel' && '🪟'}
                  {model.type === 'custom' && '📦'}
                </span>

                {/* 模型名称 */}
                <span
                  className={`flex-1 truncate ${!model.isVisible ? 'line-through' : ''}`}
                >
                  {model.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectTree;
