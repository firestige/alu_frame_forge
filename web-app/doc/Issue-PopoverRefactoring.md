# Issue: Refactor ContextMenu to Generic Popover Component

## 🔴 问题描述 (Problem Statement)

### 架构违规 (Architecture Violation)

当前代码中存在严重的架构违规问题：

**文件**: `src/components/menu/ContextMenuContainer.tsx`  
**违规代码** (Line 4):

```typescript
import type { ContextMenuState } from '@/features/designer/hooks/useModelInteraction.ts';
```

**违规说明**:

- `components/` 层级不应依赖 `features/` 层级
- 违反了单向依赖原则：`features` → `components` → `core`
- 导致组件无法在其他 feature 中复用

### 当前架构问题 (Current Architecture Issues)

```
❌ 错误的依赖关系:
components/menu/ContextMenuContainer.tsx
    └─ imports from ─> features/designer/hooks/useModelInteraction.ts

✅ 正确的依赖关系应该是:
features/designer/ui/ModelContextMenu.tsx
    └─ imports from ─> components/Popover/Popover.tsx
```

### 功能局限 (Functional Limitations)

1. **硬编码业务逻辑**: `ContextMenu.tsx` 硬编码了模型操作菜单项（编辑、显示/隐藏、属性、删除）
2. **复用性差**: 无法用于其他场景（AppBar 的 profile 下拉、Library 材料上下文菜单、场景上下文菜单）
3. **定位限制**: 仅支持坐标定位，不支持元素引用定位
4. **样式耦合**: Menu 样式与 Popover 定位逻辑耦合

## 🎯 重构目标 (Refactoring Goals)

### 1. 架构合规 (Architecture Compliance)

- ✅ 移除 `components/` 对 `features/` 的依赖
- ✅ 创建纯粹的通用 Popover 组件
- ✅ 业务逻辑移至 `features/designer/ui/`

### 2. 组件复用 (Component Reusability)

- ✅ 支持多种使用场景：
  - AppBar 中的 Profile 下拉菜单
  - Library 中的材料上下文菜单
  - Designer 中的实体上下文菜单
  - Designer 中的场景上下文菜单

### 3. 功能增强 (Feature Enhancement)

- ✅ 支持坐标定位 (coordinate-based)
- ✅ 支持元素引用定位 (ref-based)
- ✅ 分离定位逻辑与内容渲染
- ✅ 灵活的样式定制能力

## 📦 实施范围 (Implementation Scope)

### 本次重构包含 (Included)

1. **创建通用组件**:
   - `components/Popover/Popover.tsx` - 核心定位组件
   - `components/Popover/PopoverMenu.tsx` - 菜单样式包装器
   - `components/Popover/index.ts` - 导出文件

2. **迁移现有功能**:
   - 重构 `ContextMenu.tsx` 使用新的 Popover
   - 更新 `ContextMenuContainer.tsx` 移除架构违规
   - 保持现有的模型上下文菜单功能

3. **类型定义**:
   - 在 `components/Popover/` 中定义通用类型
   - 移除对 `features/designer` 类型的依赖

### 本次不包含 (Excluded - Future Work)

- AppBar Profile 下拉菜单的迁移（未来单独 PR）
- Library 材料上下文菜单的实现（未来单独 PR）
- Designer 场景上下文菜单的实现（未来单独 PR）
- 其他 feature 中的 Popover 使用场景

**注**: 本次重构仅处理当前 `ContextMenu` 与 `features/designer` 的耦合解除，为未来的复用奠定基础。

## 🏗️ 架构设计 (Architecture Design)

### 组件层次结构 (Component Hierarchy)

```
┌─────────────────────────────────────────────────────────┐
│  features/designer/ui/ModelContextMenu.tsx              │
│  (业务逻辑层 - Business Logic Layer)                     │
│  - 定义菜单项                                             │
│  - 处理业务操作                                           │
└─────────────────────────────────────────────────────────┘
                          │ uses
                          ↓
┌─────────────────────────────────────────────────────────┐
│  components/Popover/PopoverMenu.tsx                     │
│  (可选包装层 - Optional Wrapper)                          │
│  - 提供菜单样式                                           │
│  - 简化 menu 场景使用                                     │
└─────────────────────────────────────────────────────────┘
                          │ uses
                          ↓
┌─────────────────────────────────────────────────────────┐
│  components/Popover/Popover.tsx                         │
│  (核心定位层 - Core Positioning Layer)                   │
│  - 定位计算                                              │
│  - Portal 渲染                                           │
│  - 边界检测                                              │
│  - 关闭处理                                              │
└─────────────────────────────────────────────────────────┘
```

### 依赖关系 (Dependency Graph)

```
features/designer/
  └─ ui/ModelContextMenu.tsx
        ├─ imports: components/Popover ✅
        ├─ imports: core/object/ObjectManager ✅
        └─ imports: features/designer/models/InteractionState ✅

components/Popover/
  └─ Popover.tsx, PopoverMenu.tsx
        ├─ imports: react ✅
        └─ NO imports from features/ ✅

components/menu/
  └─ ContextMenuContainer.tsx (DEPRECATED)
        └─ 将被 features/designer/ui/ModelContextMenu.tsx 替代
```

## ✅ 验收标准 (Acceptance Criteria)

### 功能验收 (Functional)

- [ ] 模型右键上下文菜单功能正常（编辑、显示/隐藏、属性、删除）
- [ ] Popover 支持坐标定位
- [ ] Popover 支持元素引用定位
- [ ] 点击外部关闭功能正常
- [ ] ESC 键关闭功能正常
- [ ] 边界检测防止溢出屏幕

### 架构验收 (Architecture)

- [ ] `components/Popover/` 不依赖任何 `features/` 代码
- [ ] 业务逻辑完全在 `features/designer/` 中
- [ ] 类型定义清晰分离（通用类型 vs 业务类型）
- [ ] 组件可被其他 feature 无障碍复用

### 代码质量 (Code Quality)

- [ ] TypeScript 类型安全
- [ ] Props 文档完整（JSDoc 注释）
- [ ] 代码符合项目 ESLint 规范
- [ ] 无 console 警告或错误

## 🚀 预期收益 (Expected Benefits)

1. **架构纯净**: 消除架构违规，建立清晰的依赖边界
2. **代码复用**: Popover 可用于 4+ 个不同场景，减少重复代码
3. **维护性**: 定位逻辑集中管理，bug 修复影响所有场景
4. **扩展性**: 新的下拉/弹出场景可直接复用 Popover
5. **一致性**: 所有弹出式 UI 使用统一的定位和交互逻辑

## 📝 相关文档 (Related Documentation)

- [实施方案 - Implementation Plan](./ImplementationPlan-PopoverRefactoring.md)
- [架构文档 - Designer Architecture](./DesignerArchitecture.md)
- [资产管理架构 - Asset Management Architecture](./AssetManagementArchitecture.md)

## 🏷️ 标签 (Labels)

`refactoring` `architecture` `component-library` `technical-debt` `high-priority`

---

**创建日期**: 2025-11-11  
**预计工作量**: 4-6 小时  
**优先级**: High  
**影响范围**: components/, features/designer/
