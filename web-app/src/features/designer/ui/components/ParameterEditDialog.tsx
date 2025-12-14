import * as React from 'react';
import { Dialog } from '@/components/Dialog';
import { PropertyEditor } from './PropertyEditor';
import { BaseButton } from '@/components/Button';
import type { SceneObject } from '@/core/object/types/scene-object';
import type { AnyAsset } from '@/core/asset/types/asset';
import { getParameterConstraint } from '../../utils/parameterConstraints';

/**
 * ParameterEditDialog 属性接口
 */
export interface ParameterEditDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 要编辑的对象 */
  object: SceneObject;
  /** 对象的资产信息 */
  asset: AnyAsset | undefined;
  /** 确认回调 */
  onConfirm: (updatedParams: Record<string, number | string | boolean>) => void;
}

/**
 * ParameterEditDialog - 参数编辑对话框
 *
 * 功能：
 * - 显示对象的所有 userParams
 * - 根据参数约束提供合适的输入组件
 * - 支持验证和取消
 * - 确认后调用回调更新参数
 *
 * @example
 * <ParameterEditDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   object={selectedObject}
 *   asset={asset}
 *   onConfirm={(params) => {
 *     objectManager.updateUserParams(object.id, params);
 *     setIsOpen(false);
 *   }}
 * />
 */
export const ParameterEditDialog: React.FC<ParameterEditDialogProps> = ({
  open,
  onClose,
  object,
  asset,
  onConfirm,
}) => {
  // 编辑中的参数副本
  const [editingParams, setEditingParams] = React.useState<
    Record<string, number | string | boolean>
  >({});

  // 同步对象参数到编辑状态
  React.useEffect(() => {
    if (open && object) {
      setEditingParams({ ...object.userParams });
    }
  }, [open, object]);

  /**
   * 更新单个参数
   */
  const handleParamChange = (
    paramName: string,
    value: number | string | boolean
  ) => {
    setEditingParams(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  /**
   * 确认修改
   */
  const handleConfirm = () => {
    onConfirm(editingParams);
    onClose();
  };

  /**
   * 取消修改
   */
  const handleCancel = () => {
    // 恢复原值
    setEditingParams({ ...object.userParams });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      title={`编辑参数 - ${object.name}`}
      size="md"
      actions={
        <>
          <BaseButton onClick={handleCancel} className="text-slate-400">
            取消
          </BaseButton>
          <BaseButton
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            确定
          </BaseButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* 对象基本信息 */}
        <div className="text-sm text-slate-400">
          <div>类型: {object.assetType}</div>
          {asset && <div>资产: {asset.name}</div>}
        </div>

        {/* 参数编辑器列表 */}
        {Object.keys(editingParams).length > 0 ? (
          <div className="space-y-3 border-t border-slate-700 pt-4">
            {Object.entries(editingParams).map(([paramName, value]) => {
              const constraint = getParameterConstraint(asset, paramName);

              return (
                <PropertyEditor
                  key={paramName}
                  paramName={paramName}
                  value={value}
                  constraint={constraint}
                  onChange={newValue => handleParamChange(paramName, newValue)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500 text-center py-4">
            该对象没有可编辑的参数
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ParameterEditDialog;
