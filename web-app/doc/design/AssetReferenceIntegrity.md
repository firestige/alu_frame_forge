# 资产引用完整性设计

**文档版本**: 1.0.0  
**创建日期**: 2025-12-14  
**状态**: 设计阶段（未实施）

---

## 1. 背景与目标

### 1.1 问题场景

在铝型材框架设计器中，用户可以：

1. 在 **Library 页面** 管理资产（删除自定义型材）
2. 在 **Designer 页面** 使用资产创建场景对象

**核心问题**：当用户在 Library 中删除某个资产后，Designer 中引用该资产的对象会如何处理？

### 1.2 设计目标

1. **保证数据完整性** - 删除资产后，引用对象不应处于未定义状态
2. **提供恢复机制** - 允许用户重新关联新资产，而不是直接丢失数据
3. **用户友好** - 清晰提示哪些对象受影响，提供明确的操作路径
4. **架构清晰** - 资产生命周期管理职责明确

---

## 2. 核心概念

### 2.1 资产引用关系

```typescript
// 场景对象引用资产
interface SceneObject {
  id: string;
  assetId: string; // 引用资产 ID
  visual: {
    mesh: Three.Mesh; // 根据资产生成的渲染模型
  };
  compute: {
    geometry: GeometryDescription; // 根据资产生成的计算模型
  };
}

// 资产定义
interface Asset {
  id: string;
  name: string;
  source: AssetSource; // BUILTIN | CUSTOM
  // ... 其他属性
}
```

**引用关系**：`SceneObject.assetId` → `Asset.id`

### 2.2 锁定对象状态

当资产被删除后，引用该资产的对象进入 **锁定状态**：

```typescript
interface SceneObject {
  id: string;
  assetId: string;
  isLocked?: boolean; // 🆕 锁定标记
  // ...
}
```

**锁定对象的限制**：

| 操作           | 是否允许 | 说明                 |
| -------------- | -------- | -------------------- |
| 删除对象       | ✅       | 可以从场景中移除     |
| 重新关联资产   | ✅       | 关联新资产后自动解锁 |
| 修改用户参数   | ❌       | 长度、规格等不可修改 |
| 移动/旋转/缩放 | ❌       | Transform 操作被禁用 |
| 查看属性       | ✅       | 可以查看但不能编辑   |

---

## 3. 实现方案

### 3.1 资产删除流程

```
┌─────────────────────────────────────────────────┐
│  Library 页面 - 用户删除资产                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│  AssetService.deleteAsset(assetId)              │
│  1. 检查资产来源（BUILTIN 不可删除）            │
│  2. 从 AssetRegistry 移除                       │
│  3. 发布 'asset:deleted' 事件                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│  EventBus 广播事件                              │
│  eventBus.emit('asset:deleted', { assetId })   │
└──────────────────┬──────────────────────────────┘
                   │
          ┌────────┴────────┐
          ↓                 ↓
┌──────────────────┐   ┌──────────────────┐
│ Library 页面     │   │ Designer 页面    │
│ - 刷新资产列表   │   │ - 标记锁定对象   │
│ - 更新 UI        │   │ - 显示警告提示   │
└──────────────────┘   └──────────────────┘
```

### 3.2 代码实现

#### 资产删除（AssetService）

```typescript
// src/core/asset/AssetService.ts
export class AssetService {
  deleteAsset(assetId: string): void {
    const asset = this.registry.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // 检查权限
    if (asset.source === AssetSource.BUILTIN) {
      throw new Error('Cannot delete builtin asset');
    }

    // 从注册表移除
    this.registry.remove(assetId);

    // 发布事件
    designerEventBus.emit('asset:deleted', { assetId });

    console.log(`[AssetService] 资产已删除: ${assetId}`);
  }
}
```

#### 对象锁定检测（Designer 页面）

```typescript
// src/pages/DesignerPage.tsx
const validateAssetReferences = () => {
  const objects = coreServices.objectManager.getAllObjects();
  const lockedObjects: SceneObject[] = [];

  objects.forEach(obj => {
    const asset = coreServices.assetService.getAsset(obj.assetId);
    if (!asset) {
      // 资产不存在，标记为锁定
      coreServices.objectManager.updateObject(obj.id, { isLocked: true });
      lockedObjects.push(obj);
    }
  });

  if (lockedObjects.length > 0) {
    console.warn(
      `[DesignerPage] 检测到 ${lockedObjects.length} 个对象引用的资产已删除`,
      lockedObjects.map(o => o.id)
    );

    // 显示提示
    showWarning({
      title: '部分对象已锁定',
      message: `${lockedObjects.length} 个对象的资产已删除，请重新关联资产或删除对象`,
      actions: [
        {
          label: '查看锁定对象',
          onClick: () => showLockedObjectsList(lockedObjects),
        },
        { label: '关闭', onClick: () => {} },
      ],
    });
  }
};

// 页面加载时验证
React.useEffect(() => {
  if (!isRendererReady) return;
  validateAssetReferences();
}, [isRendererReady]);

// 监听资产删除事件
React.useEffect(() => {
  const handleAssetDeleted = ({ assetId }: { assetId: string }) => {
    validateAssetReferences();
  };

  designerEventBus.on('asset:deleted', handleAssetDeleted);
  return () => {
    designerEventBus.off('asset:deleted', handleAssetDeleted);
  };
}, []);
```

#### 资产重新关联（Designer 页面）

```typescript
// src/features/designer/services/AssetReassociationService.ts
export class AssetReassociationService {
  constructor(
    private objectManager: ObjectManager,
    private assetService: AssetService,
    private modelFactory: ModelFactory
  ) {}

  /**
   * 重新关联资产
   * @param objectId 对象 ID
   * @param newAssetId 新资产 ID
   */
  async reassociateAsset(objectId: string, newAssetId: string): Promise<void> {
    const object = this.objectManager.getObject(objectId);
    if (!object) {
      throw new Error(`Object not found: ${objectId}`);
    }

    const newAsset = this.assetService.getAsset(newAssetId);
    if (!newAsset) {
      throw new Error(`Asset not found: ${newAssetId}`);
    }

    // 验证类型兼容性
    const oldAssetId = object.assetId;
    const oldAsset = this.assetService.getAsset(oldAssetId);
    if (oldAsset && oldAsset.type !== newAsset.type) {
      throw new Error(
        `Asset type mismatch: expected ${oldAsset.type}, got ${newAsset.type}`
      );
    }

    // 重新生成模型
    const newSceneObject = await this.modelFactory.createFromAsset(newAssetId, {
      name: object.name,
      transform: object.transform,
      userParams: object.userParams,
    });

    // 更新对象
    this.objectManager.updateObject(objectId, {
      assetId: newAssetId,
      visual: newSceneObject.visual,
      compute: newSceneObject.compute,
      isLocked: false, // 解除锁定
    });

    console.log(
      `[AssetReassociation] 对象 ${objectId} 已重新关联到资产 ${newAssetId}`
    );

    // 发布事件
    designerEventBus.emit('object:reassociated', {
      objectId,
      oldAssetId,
      newAssetId,
    });
  }
}
```

### 3.3 UI 交互流程

#### 锁定对象列表

```tsx
// src/features/designer/ui/LockedObjectsPanel.tsx
export const LockedObjectsPanel: React.FC = () => {
  const { objectManager, assetService } = useCoreServices();
  const [lockedObjects, setLockedObjects] = React.useState<SceneObject[]>([]);

  React.useEffect(() => {
    const objects = objectManager.getAllObjects();
    const locked = objects.filter(obj => obj.isLocked);
    setLockedObjects(locked);
  }, []);

  const handleReassociate = (objectId: string) => {
    // 打开资产选择器
    openAssetPicker({
      onSelect: async newAssetId => {
        await reassociationService.reassociateAsset(objectId, newAssetId);
        // 刷新列表
        const objects = objectManager.getAllObjects();
        const locked = objects.filter(obj => obj.isLocked);
        setLockedObjects(locked);
      },
    });
  };

  return (
    <Panel title="锁定对象" icon={<LockIcon />}>
      {lockedObjects.length === 0 ? (
        <EmptyState message="没有锁定的对象" />
      ) : (
        <List>
          {lockedObjects.map(obj => (
            <ListItem key={obj.id}>
              <LockIcon />
              <Text>{obj.name}</Text>
              <Text type="secondary">资产已删除: {obj.assetId}</Text>
              <ButtonGroup>
                <Button onClick={() => handleReassociate(obj.id)}>
                  重新关联
                </Button>
                <Button
                  variant="danger"
                  onClick={() => objectManager.removeObject(obj.id)}
                >
                  删除
                </Button>
              </ButtonGroup>
            </ListItem>
          ))}
        </List>
      )}
    </Panel>
  );
};
```

#### 资产选择器

```tsx
// src/features/designer/ui/AssetPickerDialog.tsx
export const AssetPickerDialog: React.FC<{
  onSelect: (assetId: string) => void;
  filterType?: AssetType;
}> = ({ onSelect, filterType }) => {
  const { assetService } = useCoreServices();
  const [assets, setAssets] = React.useState<AnyAsset[]>([]);

  React.useEffect(() => {
    let allAssets = assetService.getAllAssets();
    if (filterType) {
      allAssets = allAssets.filter(a => a.type === filterType);
    }
    setAssets(allAssets);
  }, [filterType]);

  return (
    <Dialog title="选择资产">
      <AssetGrid>
        {assets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onClick={() => onSelect(asset.id)}
          />
        ))}
      </AssetGrid>
    </Dialog>
  );
};
```

---

## 4. 事件定义

```typescript
// src/core/services/eventBus.ts
export type Events = {
  // ... 其他事件

  // 资产管理事件
  'asset:deleted': { assetId: string };
  'asset:added': { assetId: string };
  'asset:updated': { assetId: string };

  // 对象状态事件
  'object:locked': { objectId: string; reason: string };
  'object:unlocked': { objectId: string };
  'object:reassociated': {
    objectId: string;
    oldAssetId: string;
    newAssetId: string;
  };
};
```

---

## 5. 数据存储

### 5.1 场景文件格式

```typescript
interface ProjectData {
  id: string;
  name: string;
  objects: SceneObjectData[];
  metadata: ProjectMetadata;
}

interface SceneObjectData {
  id: string;
  assetId: string;
  name: string;
  transform: Transform;
  userParams: Record<string, unknown>;
  isLocked?: boolean; // 🆕 持久化锁定状态
}
```

### 5.2 加载时验证

```typescript
// src/core/object/SceneIO.ts
export class SceneIO {
  async loadProject(projectId: string): Promise<ProjectData> {
    const data = await storage.loadProject(projectId);

    // 验证资产引用
    data.objects.forEach(objData => {
      const asset = this.assetService.getAsset(objData.assetId);
      if (!asset) {
        console.warn(`[SceneIO] 资产不存在: ${objData.assetId}，对象将被锁定`);
        objData.isLocked = true;
      }
    });

    return data;
  }
}
```

---

## 6. 实施计划

### 6.1 Phase 1: 基础锁定机制

- [ ] 添加 `SceneObject.isLocked` 字段
- [ ] 实现 `AssetService.deleteAsset()` 方法
- [ ] 添加 `asset:deleted` 事件
- [ ] Designer 页面监听事件并标记锁定对象
- [ ] 显示锁定对象警告提示

### 6.2 Phase 2: 重新关联功能

- [ ] 实现 `AssetReassociationService`
- [ ] 创建锁定对象列表 UI
- [ ] 实现资产选择器对话框
- [ ] 添加类型兼容性验证
- [ ] 发布 `object:reassociated` 事件

### 6.3 Phase 3: 完善体验

- [ ] 删除资产前显示引用数量警告
- [ ] 支持批量重新关联
- [ ] 持久化锁定状态到 ProjectData
- [ ] 添加锁定对象可视化标记（场景中显示图标）
- [ ] 提供"清理锁定对象"批量删除功能

---

## 7. 测试场景

### 7.1 单元测试

```typescript
describe('AssetReassociationService', () => {
  it('should reassociate asset successfully', async () => {
    const object = createMockObject({ assetId: 'profile-old', isLocked: true });
    const newAsset = createMockAsset({
      id: 'profile-new',
      type: AssetType.PROFILE,
    });

    await service.reassociateAsset(object.id, newAsset.id);

    const updated = objectManager.getObject(object.id);
    expect(updated.assetId).toBe('profile-new');
    expect(updated.isLocked).toBe(false);
  });

  it('should throw error for type mismatch', async () => {
    const object = createMockObject({ assetId: 'profile-old' });
    const newAsset = createMockAsset({
      id: 'fastener-new',
      type: AssetType.FASTENER,
    });

    await expect(
      service.reassociateAsset(object.id, newAsset.id)
    ).rejects.toThrow('Asset type mismatch');
  });
});
```

### 7.2 集成测试

1. **删除资产流程**
   - 在 Library 删除自定义资产
   - 切换到 Designer 页面
   - 验证引用对象被标记为锁定
   - 验证显示警告提示

2. **重新关联流程**
   - 打开锁定对象列表
   - 选择重新关联
   - 选择新资产
   - 验证对象解锁
   - 验证渲染正常

3. **持久化验证**
   - 创建包含锁定对象的项目
   - 保存并关闭
   - 重新打开项目
   - 验证锁定状态保持

---

## 8. 相关文档

- [核心架构设计](./CoreArchitecture.md) - 资产管理生命周期章节
- [状态管理策略](./StateManagement.md) - 事件驱动模式
- [存储系统设计](./StorageSystem.md) - 项目文件持久化

---

**TODO**: 本文档为设计阶段，待 Phase 1 实施后更新实际实现细节。
