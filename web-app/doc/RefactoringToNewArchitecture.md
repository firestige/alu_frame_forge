# 迁移到新架构重构总结

## 概述

本次重构将项目从基于 `Model` 的旧架构迁移到基于 `SceneObject + Asset` 的新架构。由于项目还在开发阶段，没有生产业务代码，因此直接进行了完整迁移。

## 重构时间

2025年11月8日

## 核心变更

### 1. 类型系统 ✅

#### 新增文件

- `/src/features/designer/models/PropertyTypes.ts` - 类型安全的属性更新系统
  - `TransformPropertyPath` - Transform 属性路径类型
  - `UserParamPropertyPath` - 用户参数属性路径类型
  - `EditablePropertyPath` - 可编辑属性路径联合类型
  - `PropertyValueMap` - 属性值类型映射
  - `PropertyValue<K>` - 泛型属性值类型
  - `PropertyUpdateHandler` - 类型安全的更新回调

#### 更新文件

- `/src/features/designer/models/index.ts` - 导出 PropertyTypes

### 2. 核心对象管理 ✅

#### 重构文件

**ObjectManager** (`/src/core/object/ObjectManager.ts`)
- **旧**: 基于 `Model<TMetadata>` 类型
- **新**: 基于 `SceneObject` 类型
- **变更**:
  - 移除泛型 `<TMetadata>`
  - 对象存储：`Map<string, Model>` → `Map<string, SceneObject>`
  - 方法重命名：`addModel()` → `addObject()`
  - 方法重命名：`removeModel()` → `removeObject()`
  - 方法重命名：`getModel()` → `getObject()`
  - 新增：`setObjectVisibility()` - 便捷的可见性设置方法
  - 新增：`updatePosition()`, `updateRotation()`, `updateScale()` - 细粒度更新
  - 移除：参数化调整相关方法（`updateModelParameters`, `stretchModel`, `resizeFace`）
  - 移除：碰撞检测相关方法（后续由专门服务处理）
  - 移除：约束管理相关方法（后续由专门服务处理）

**AssetRegistry** (`/src/core/object/AssetRegistry.ts`)
- **旧**: 简单的资产注册表
- **新**: 支持内置/自定义资产分类的高级注册表
- **变更**:
  - 分类存储：`builtinAssets` 和 `customAssets` 两个 Map
  - 方法重命名：`registerAsset()` → `register()`
  - 方法重命名：`getAsset()` → `get()`
  - 方法重命名：`getAllAssets()` → `getAll()`
  - 方法重命名：`getAssetsByType()` → `getByType()`
  - 新增：`getBySource()` - 按来源查询
  - 新增：`search()` - 名称/描述搜索
  - 新增：`update()` - 更新自定义资产
  - 新增：`delete()` - 删除自定义资产
  - 新增：`getStats()` - 统计信息

**ModelFactory** (`/src/core/object/ModelFactory.ts`)
- **旧**: 基于 switch 的工厂模式
- **新**: 基于策略模式的工厂
- **变更**:
  - 采用策略模式：`Map<AssetType, InstanceStrategy>`
  - 方法重命名：`createFromAsset()` 保持不变
  - 新增：`registerStrategy()` - 注册实例化策略
  - 新增：`getStrategy()` - 获取策略
  - 新增：`hasStrategy()` - 检查策略支持
  - 新增：`createBatch()` - 批量创建
  - 新增：`updateGeometry()` - 更新几何体

#### 备份文件

- `ObjectManager.old.bak` - 旧版 ObjectManager
- `ObjectManager.old.ts` - 更旧的版本
- `AssetRegistry.old.bak` - 旧版 AssetRegistry
- `ModelFactory.old.bak` - 旧版 ModelFactory

### 3. UI 层更新 ✅

#### PropertyPanel (`/src/features/designer/ui/PropertyPanel.tsx`)

**接口变更**:
```typescript
// 旧
interface PropertyPanelProps {
  model: Model | null;
  onUpdateProperty: (property: string, value: any) => void;
}

// 新
interface PropertyPanelProps {
  object: SceneObject | null;
  onUpdateProperty: PropertyUpdateHandler;
}
```

**关键变更**:
- Props 名称：`model` → `object`
- 类型：`Model` → `SceneObject`
- 回调类型：`(property: string, value: any)` → `PropertyUpdateHandler` (类型安全)
- 访问路径：`model.position.x` → `object.transform.position.x`
- 可见性：`model.isVisible` → `object.visual?.isVisible`
- 参数：`model.parameters` → `object.userParams`
- 类型显示：`model.type` → `object.assetType`

**类型安全改进**:
- 消除了所有 `any` 类型
- 使用 `TransformPropertyPath` 约束属性路径
- 属性更新时类型自动匹配

### 4. 导出配置 ✅

#### `/src/core/object/index.ts`

**新增导出**:
```typescript
// 导出所有新架构类型
export type * from './types';

// 导出新架构核心类
export { ObjectManager } from './ObjectManager';
export { AssetRegistry } from './AssetRegistry';
export { ModelFactory } from './ModelFactory';
```

**保留旧导出**（兼容性）:
```typescript
export type { Model, ModelParameters, ... } from './types';
export { ModelRepository, ModelOperations, ConstraintManager, SceneIO };
```

## 架构优势

### 1. 双模型系统
- **Visual Model**: 用于渲染的简化表示
- **Compute Model**: 用于 FEA 和干涉检测的完整表示

### 2. 清晰的职责分离
- **Asset**: 定义资产的静态特性
- **SceneObject**: 场景中的实例化对象
- **Transform**: 独立的变换信息结构

### 3. 策略模式
- 每种资产类型有独立的实例化策略
- 易于扩展新的资产类型
- 解耦资产定义和实例化逻辑

### 4. 类型安全
- 消除 `any` 类型
- 属性路径类型约束
- 编译时类型检查

## 验证结果

### TypeScript 编译
```bash
npx tsc --noEmit
# ✅ 无错误
```

### ESLint 检查
```bash
npx eslint src/core/object/{ObjectManager,AssetRegistry,ModelFactory}.ts \
  src/features/designer/models/PropertyTypes.ts \
  src/features/designer/ui/PropertyPanel.tsx --max-warnings=0
# ✅ 无错误（自动修复格式问题）
```

## 迁移清单

### ✅ 已完成
1. 创建 PropertyTypes.ts 类型系统
2. 重构 ObjectManager 使用 SceneObject
3. 重构 AssetRegistry 支持分类存储
4. 重构 ModelFactory 采用策略模式
5. 更新 PropertyPanel 使用类型安全接口
6. 更新导出配置
7. 类型检查通过
8. ESLint 检查通过

### 📋 待迁移（按需）

#### 服务层
- `ModelCreationService` - 需要适配新的 ObjectManager 接口
- `ModelEditorService` - 需要使用 SceneObject 类型
- `ModelInteractionService` - 需要更新事件处理
- `PlacementService` - 需要适配新的创建流程

#### UI 组件
- `ObjectList` - 需要显示 SceneObject 而非 Model
- `ModelEditor` - 需要编辑 SceneObject 属性
- 其他依赖 Model 类型的组件

#### Hooks
- `useModelOperations` - 需要适配新的 ObjectManager API
- `useModelInteraction` - 需要处理 SceneObject 事件
- `useDesigner` - 核心 hook，需要完整重构

#### 数据层
- 加载内置资产数据
- 实现策略注册初始化

## 向后兼容

### 保留的旧代码
- `Model` 类型定义（在 `types.ts` 中）
- `ModelRepository`, `ModelOperations`, `ConstraintManager` 等服务
- 旧版文件以 `.old.bak` 后缀备份

### 迁移建议
1. 新功能直接使用新架构
2. 旧功能按模块逐步迁移
3. 使用适配器模式处理过渡期

## 注意事项

### 破坏性变更

1. **ObjectManager API**
   - 方法名变更（addModel → addObject 等）
   - 不再支持泛型 `<TMetadata>`
   - 移除碰撞检测和约束管理方法

2. **PropertyPanel Props**
   - `model` prop 改名为 `object`
   - 回调函数类型签名变更

3. **AssetRegistry API**
   - 方法名变更（registerAsset → register 等）
   - 新增内置/自定义分类逻辑

### 建议

1. **IDE 重构工具**: 使用 IDE 的重命名功能批量更新引用
2. **渐进式迁移**: 按模块逐步迁移，避免一次性修改过多
3. **测试覆盖**: 迁移后添加单元测试确保功能正确性
4. **文档更新**: 同步更新 API 文档和使用示例

## 下一步

1. 初始化资产注册（加载内置 Profile、Fastener、Connector）
2. 注册实例化策略到 ModelFactory
3. 迁移 designer services 层
4. 迁移 UI 组件和 hooks
5. 添加单元测试
6. 性能优化和压力测试

## 参考文档

- [Asset Management Architecture](./AssetManagementArchitecture.md)
- [Designer Architecture](./DesignerArchitecture.md)
- [Refactoring Progress](./RefactoringProgress.md)
