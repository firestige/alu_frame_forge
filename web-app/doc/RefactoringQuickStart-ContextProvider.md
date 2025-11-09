# Context Provider 重构 - 快速启动指南

## 🎯 重构目标

将设计器从 **Props Drilling** 模式重构为 **Context + Provider + Event-Driven** 架构。

---

## 📚 文档索引

| 文档                                    | 用途                |
| --------------------------------------- | ------------------- |
| **RefactoringPlan-ContextProvider.md**  | 完整方案、架构设计  |
| **Phase1-Infrastructure-Checkpoint.md** | 基础设施搭建        |
| **Phase2-Context-Checkpoint.md**        | Context 和 Provider |
| **Phase3-DesignerPage-Checkpoint.md**   | DesignerPage 重构   |
| **Phase4-6-UIComponents-Checkpoint.md** | UI 组件重构         |
| **本文档**                              | 快速恢复会话        |

---

## 🚀 快速开始

### **1. 确认当前进度**

检查已完成的阶段：

```bash
# 查看已创建的文件
ls src/features/designer/stores/     # Phase 1
ls src/features/designer/context/    # Phase 2
git log --oneline | head -5          # 查看最近提交
```

### **2. 确定当前阶段**

| 已完成  | 当前阶段  | 下一步文档                            |
| ------- | --------- | ------------------------------------- |
| 无      | Phase 1   | `Phase1-Infrastructure-Checkpoint.md` |
| Phase 1 | Phase 2   | `Phase2-Context-Checkpoint.md`        |
| Phase 2 | Phase 3   | `Phase3-DesignerPage-Checkpoint.md`   |
| Phase 3 | Phase 4-6 | `Phase4-6-UIComponents-Checkpoint.md` |

### **3. 继续实施**

阅读对应的检查点文档，按照步骤执行。

---

## 🔍 会话恢复提示词

### **Phase 1 进行中**

```
我正在进行设计器的 Context Provider 重构。
当前阶段：Phase 1 - 基础设施搭建

任务：
- 创建 usePersistentState Hook
- 创建 designerObjectStore (Zustand)
- 创建 designerProjectStore (Zustand)
- 创建 queryService

请阅读 doc/Phase1-Infrastructure-Checkpoint.md 继续实施。
```

### **Phase 2 进行中**

```
我正在进行设计器的 Context Provider 重构。
当前阶段：Phase 2 - Context 和 Provider

Phase 1 已完成：
- usePersistentState
- designerObjectStore
- designerProjectStore
- queryService

当前任务：创建 DesignerContext 和相关 Hooks。
请阅读 doc/Phase2-Context-Checkpoint.md 继续实施。
```

### **Phase 3 进行中**

```
我正在进行设计器的 Context Provider 重构。
当前阶段：Phase 3 - 重构 DesignerPage

Phase 1-2 已完成：
- 基础设施（Store, Hook, queryService）
- Context 和 Provider

当前任务：重构 DesignerPage 为 Container 模式。
请阅读 doc/Phase3-DesignerPage-Checkpoint.md 继续实施。
```

### **Phase 4-6 进行中**

```
我正在进行设计器的 Context Provider 重构。
当前阶段：Phase 4-6 - UI 组件重构

Phase 1-3 已完成：
- 基础设施
- Context 和 Provider
- DesignerPage Container 模式

当前任务：重构 UI 组件使用 Hook 和事件。
请阅读 doc/Phase4-6-UIComponents-Checkpoint.md 继续实施。
```

---

## 📋 快速检查清单

### **Phase 1 完成标志**

```bash
# 文件存在
ls src/features/designer/hooks/usePersistentState.ts
ls src/features/designer/stores/designerObjectStore.ts
ls src/features/designer/stores/designerProjectStore.ts
ls src/core/services/queryService.ts

# 编译通过
npm run build
```

### **Phase 2 完成标志**

```bash
# 文件存在
ls src/features/designer/context/DesignerContext.tsx
ls src/features/designer/hooks/useDesignerContext.ts
ls src/features/designer/hooks/useDesignerObjects.ts
ls src/features/designer/hooks/useDesignerProject.ts

# 编译通过
npm run build
```

### **Phase 3 完成标志**

- DesignerPage 包裹了 `<DesignerProvider>`
- 移除了 UI 状态管理
- 移除了事件包装函数
- 添加了项目加载逻辑
- 设置了事件监听

### **Phase 4-6 完成标志**

- DesignerPageUI 使用 `usePersistentState`
- 子组件使用 `useDesignerXXX` Hooks
- 子组件通过 `sendCommand` 发送操作
- 所有功能正常工作
- UI 状态持久化

---

## 🔧 常见问题

### **Q: 编译报错找不到模块**

```bash
# 检查 tsconfig.json 的 paths 配置
# 确保 @/core/* 和 @/features/* 映射正确
```

### **Q: Store 更新但 UI 不刷新**

```typescript
// 检查是否正确订阅 Store
const objects = useDesignerObjectStore(state => state.objects);

// 检查是否正确更新 Store
useDesignerObjectStore.getState().setObjects(newObjects);
```

### **Q: 事件监听不生效**

```typescript
// 检查是否正确导入
import { onCommand, offCommand } from '@/core/services/eventBus';

// 检查是否正确清理
return () => {
  offCommand('command:xxx', handler);
};
```

### **Q: 持久化不工作**

```typescript
// 检查 localStorage 键名
const [value, setValue] = usePersistentState('designer.tool', 'select');

// 检查浏览器控制台
localStorage.getItem('designer.tool');
```

---

## 📊 架构关键点速查

### **数据流**

```
用户操作 → sendCommand → EventBus → Service → ObjectManager
  → emit('object:xxx') → Store 更新 → Hook 订阅 → UI 重渲染
```

### **状态分类**

| 状态类型 | 存储位置      | 访问方式             |
| -------- | ------------- | -------------------- |
| 业务数据 | ObjectManager | useDesignerObjects() |
| 项目信息 | ProjectStore  | useDesignerProject() |
| UI 偏好  | localStorage  | usePersistentState() |
| 瞬态 UI  | useState      | 组件内部             |

### **事件类型**

| 事件前缀   | 用途       | 发送方        | 接收方       |
| ---------- | ---------- | ------------- | ------------ |
| `command:` | 操作命令   | UI 组件       | DesignerPage |
| `object:`  | 状态变更   | ObjectManager | DesignerPage |
| `state:`   | 渲染器状态 | Renderer      | UI 组件      |

---

## 🎯 成功标准

- ✅ 消除了 Props Drilling
- ✅ UI 与业务完全解耦
- ✅ 严格事件驱动
- ✅ UI 状态持久化
- ✅ 所有功能正常
- ✅ 代码质量提升

---

## 📞 需要帮助？

1. **查看完整方案：** `RefactoringPlan-ContextProvider.md`
2. **查看当前阶段检查点：** `PhaseX-XXX-Checkpoint.md`
3. **查看上一轮重构记录：** `RefactoringProgress.md`
4. **使用恢复提示词** 重启会话

---

**文档创建时间：** 2025-11-09  
**最后更新：** 2025-11-09
