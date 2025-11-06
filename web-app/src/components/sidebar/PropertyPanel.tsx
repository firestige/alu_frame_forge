import * as React from 'react';
import { type Model } from '../../core/object/ObjectManager.ts';

interface PropertyPanelProps {
  model: Model | null;
  onUpdateProperty: (property: string, value: any) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  model,
  onUpdateProperty,
}) => {
  const [editingValues, setEditingValues] = React.useState<
    Record<string, string>
  >({});

  React.useEffect(() => {
    if (model) {
      setEditingValues({
        posX: model.position.x.toFixed(2),
        posY: model.position.y.toFixed(2),
        posZ: model.position.z.toFixed(2),
        rotX: ((model.rotation.x * 180) / Math.PI).toFixed(2),
        rotY: ((model.rotation.y * 180) / Math.PI).toFixed(2),
        rotZ: ((model.rotation.z * 180) / Math.PI).toFixed(2),
        scaleX: model.scale.x.toFixed(2),
        scaleY: model.scale.y.toFixed(2),
        scaleZ: model.scale.z.toFixed(2),
      });
    }
  }, [model]);

  if (!model) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
        未选中对象
      </div>
    );
  }

  const handleInputChange = (key: string, value: string) => {
    setEditingValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputBlur = (property: string, key: string) => {
    const value = parseFloat(editingValues[key]);
    if (!isNaN(value)) {
      onUpdateProperty(property, value);
    }
  };

  const PropertyInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
  }> = ({ label, value, onChange, onBlur }) => (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-slate-400 w-6">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="flex-1 bg-slate-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto border-t border-slate-700">
      <div className="p-3 space-y-3">
        {/* 基本信息 */}
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">基本信息</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">名称:</span>
              <span className="text-white">{model.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">类型:</span>
              <span className="text-white">{model.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">可见:</span>
              <span className="text-white">{model.isVisible ? '是' : '否'}</span>
            </div>
          </div>
        </div>

        {/* 位置 */}
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">位置</div>
          <div className="space-y-1">
            <PropertyInput
              label="X"
              value={editingValues.posX || '0'}
              onChange={(v) => handleInputChange('posX', v)}
              onBlur={() =>
                handleInputBlur('position.x', 'posX')
              }
            />
            <PropertyInput
              label="Y"
              value={editingValues.posY || '0'}
              onChange={(v) => handleInputChange('posY', v)}
              onBlur={() =>
                handleInputBlur('position.y', 'posY')
              }
            />
            <PropertyInput
              label="Z"
              value={editingValues.posZ || '0'}
              onChange={(v) => handleInputChange('posZ', v)}
              onBlur={() =>
                handleInputBlur('position.z', 'posZ')
              }
            />
          </div>
        </div>

        {/* 旋转 */}
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">
            旋转 (度)
          </div>
          <div className="space-y-1">
            <PropertyInput
              label="X"
              value={editingValues.rotX || '0'}
              onChange={(v) => handleInputChange('rotX', v)}
              onBlur={() =>
                handleInputBlur('rotation.x', 'rotX')
              }
            />
            <PropertyInput
              label="Y"
              value={editingValues.rotY || '0'}
              onChange={(v) => handleInputChange('rotY', v)}
              onBlur={() =>
                handleInputBlur('rotation.y', 'rotY')
              }
            />
            <PropertyInput
              label="Z"
              value={editingValues.rotZ || '0'}
              onChange={(v) => handleInputChange('rotZ', v)}
              onBlur={() =>
                handleInputBlur('rotation.z', 'rotZ')
              }
            />
          </div>
        </div>

        {/* 缩放 */}
        <div>
          <div className="text-xs text-slate-400 mb-2 font-medium">缩放</div>
          <div className="space-y-1">
            <PropertyInput
              label="X"
              value={editingValues.scaleX || '1'}
              onChange={(v) => handleInputChange('scaleX', v)}
              onBlur={() =>
                handleInputBlur('scale.x', 'scaleX')
              }
            />
            <PropertyInput
              label="Y"
              value={editingValues.scaleY || '1'}
              onChange={(v) => handleInputChange('scaleY', v)}
              onBlur={() =>
                handleInputBlur('scale.y', 'scaleY')
              }
            />
            <PropertyInput
              label="Z"
              value={editingValues.scaleZ || '1'}
              onChange={(v) => handleInputChange('scaleZ', v)}
              onBlur={() =>
                handleInputBlur('scale.z', 'scaleZ')
              }
            />
          </div>
        </div>

        {/* 参数 */}
        {model.parameters && Object.keys(model.parameters).length > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-2 font-medium">参数</div>
            <div className="space-y-1.5 text-xs">
              {Object.entries(model.parameters).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-400">{key}:</span>
                  <span className="text-white">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;

