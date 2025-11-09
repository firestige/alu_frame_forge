# 设计器架构重构计划 - Context & Provider 模式

## 📋 重构概述

### **目标**

将设计器从 Props Drilling 模式重构为 Context + Provider + Event-Driven 架构。

### **核心原则**

1. **UI 组件通过 Hook 访问服务** - 不直接持有业务服务实例
2. **状态分类管理** - 业务状态和 UI 状态各自管理，通过事件同步
3. **Pages 作为 Container** - 负责组装、初始化服务、驱动查询
4. **UI 状态持久化** - 使用 localStorage 记住用户偏好

### **架构对比**

#### **重构前（Props Drilling）**

```
DesignerPage
├─ 管理 UI 状态（selectedTool, contextMenu）
├─ 包装 20+ 个事件处理函数
├─ 传递 props 给 DesignerPageUI
│  ├─ 再传递给 Toolbar
│  ├─ 再传递给 ObjectManagerSidebar
│  └─ 再传递给 ContextMenu
```

**问题：**

- Props 层层传递，耦合严重
- UI 状态和业务状态混杂
- 职责边界模糊
- 无法持久化用户设置

#### **重构后（Context + Event-Driven）**

```
DesignerPage (Container)
├─ 初始化服务
├─ 驱动项目加载
├─ 设置事件桥梁
└─ 提供 DesignerProvider
    ↓
DesignerPageUI (UI 协调)
├─ 管理 UI 状态（持久化）
├─ 发送 Command 事件
└─ 组合子组件
    ↓
子 UI 组件
├─ useDesignerContext() - 访问服务
├─ useDesignerObjects() - 读取数据
└─ sendCommand() - 发送操作
```

**优势：**

- 无 Props Drilling
- 职责清晰分离
- 严格事件驱动
- UI 状态持久化

---

## 🗂️ 目录结构

### **新增文件**

```
src/
├─ core/
│  └─ services/
│     └─ queryService.ts                    ← 项目加载/保存工具
│
├─ features/designer/
│  ├─ context/
│  │  ├─ DesignerContext.tsx               ← Context 定义
│  │  ├─ DesignerProvider.tsx              ← Provider 组件
│  │  └─ index.ts                          ← 统一导出
│  │
│  ├─ hooks/
│  │  ├─ usePersistentState.ts             ← 持久化 Hook
│  │  ├─ useDesignerContext.ts             ← 消费 Context
│  │  ├─ useDesignerObjects.ts             ← 订阅对象列表
│  │  ├─ useDesignerSelection.ts           ← 选中状态（可选）
│  │  └─ useDesignerProject.ts             ← 项目信息
│  │
│  └─ stores/
│     ├─ designerObjectStore.ts            ← 对象列表 Store
│     ├─ designerProjectStore.ts           ← 项目信息 Store
│     └─ index.ts                          ← 统一导出
│
└─ (重构文件详见各阶段检查点)
```

---

## 📊 实施阶段

### **Phase 1: 基础设施搭建**

**时间估算：** 2-3 小时  
**检查点文档：** `Phase1-Infrastructure-Checkpoint.md`

**任务：**

- [ ] 创建 `usePersistentState.ts` Hook
- [ ] 创建 `designerObjectStore.ts` (Zustand)
- [ ] 创建 `designerProjectStore.ts` (Zustand)
- [ ] 创建 `queryService.ts` 工具
- [ ] 编译验证

---

### **Phase 2: Context 和 Provider**

**时间估算：** 1-2 小时  
**检查点文档：** `Phase2-Context-Checkpoint.md`

**任务：**

- [ ] 创建 `DesignerContext.tsx`
- [ ] 创建 `DesignerProvider.tsx`
- [ ] 创建消费 Hooks
  - [ ] `useDesignerContext.ts`
  - [ ] `useDesignerObjects.ts`
  - [ ] `useDesignerProject.ts`
- [ ] 编译验证

---

### **Phase 3: 重构 DesignerPage**

**时间估算：** 2-3 小时  
**检查点文档：** `Phase3-DesignerPage-Checkpoint.md`

**任务：**

- [ ] 添加项目加载逻辑
- [ ] 设置 Command 事件监听
- [ ] 设置 ObjectManager → Store 同步
- [ ] 包裹 DesignerProvider
- [ ] 移除 UI 状态管理
- [ ] 移除事件包装函数
- [ ] 功能验证

---

### **Phase 4: 重构 DesignerPageUI**

**时间估算：** 1-2 小时  
**检查点文档：** `Phase4-DesignerPageUI-Checkpoint.md`

**任务：**

- [ ] UI 状态改用 `usePersistentState`
- [ ] 移除业务相关 props
- [ ] 使用 `sendCommand` 发送操作
- [ ] 调整子组件接口
- [ ] 功能验证

---

### **Phase 5: 重构 UI 组件**

**时间估算：** 2-3 小时  
**检查点文档：** `Phase5-UIComponents-Checkpoint.md`

**任务：**

- [ ] 重构 `ObjectManagerSidebar`
- [ ] 重构 `Toolbar`
- [ ] 重构 `PropertyPanel`
- [ ] 重构 `ContextMenu` 相关
- [ ] 功能验证

---

### **Phase 6: 事件桥梁和最终验证**

**时间估算：** 1-2 小时  
**检查点文档：** `Phase6-EventBridge-Checkpoint.md`

**任务：**

- [ ] 完善事件监听逻辑
- [ ] 完整功能测试
- [ ] 性能验证
- [ ] 文档更新

---

## 🎯 关键设计决策

### **1. 状态分类**

| 状态类型                       | 存储位置             | 访问方式             | 是否持久化     |
| ------------------------------ | -------------------- | -------------------- | -------------- |
| **业务数据** (objects)         | designerObjectStore  | useDesignerObjects() | 保存到项目文件 |
| **项目信息** (projectId, name) | designerProjectStore | useDesignerProject() | 保存到项目文件 |
| **UI 偏好** (tool, sidebar)    | localStorage         | usePersistentState() | ✅             |
| **瞬态 UI** (contextMenu)      | useState             | 组件内部             | ❌             |

### **2. 选中状态归属**

**原则：** 根据后续操作性质决定

- **纯 UI 选中**（仅高亮）→ 组件内部 `useState`
- **业务选中**（删除、修改）→ 通过事件触发业务操作
- **全局共享**（多组件使用）→ 可选创建 `designerSelectionStore`

### **3. 事件流设计**

```
用户操作 (UI)
  ↓
sendCommand('command:xxx', data)
  ↓
designerEventBus
  ↓
DesignerPage 监听 → 调用服务
  ↓
ObjectManager 处理 → emit('object:xxx')
  ↓
DesignerPage 监听 → 更新 Store
  ↓
useDesignerObjects() → UI 重渲染
```

### **4. Provider 提供内容**

```typescript
interface DesignerContextValue {
  services: {
    objectManager: ObjectManager;
    renderSync: RenderSyncService;
    creation: ModelCreationService;
    interaction: ModelInteractionService;
    editor: ModelEditorService;
  };
  eventBus: typeof designerEventBus;
}
```

### **5. 项目加载流程**

```
DesignerPage.useEffect
  ↓
确定项目 ID (URL 参数 / localStorage)
  ↓
queryService.loadProject(projectId)
  ↓
注入数据到 ObjectManager
  ↓
更新 ProjectStore
  ↓
设置 isProjectLoaded = true
  ↓
渲染 <DesignerProvider>
```

---

## 🔍 重构前后对比

### **DesignerPage.tsx**

#### **重构前（115 行）**

```typescript
const DesignerPage = () => {
  const [selectedTool, setSelectedTool] = useState('select');
  const designer = useDesigner(...);

  const handleCreateCube = () => { /* 包装 */ };
  const handleCreateBox = () => { /* 包装 */ };
  const handleViewPosChange = () => { /* 包装 */ };
  // ... 20+ 个包装函数

  return (
    <DesignerPageUI
      selectedTool={selectedTool}
      onToolChange={setSelectedTool}
      onCreateCube={handleCreateCube}
      // ... 20+ props
    />
  );
};
```

#### **重构后（~80 行）**

```typescript
const DesignerPage = () => {
  // 1. 初始化
  const viewer = use3DViewer(...);
  const services = useDesignerServices(...);

  // 2. 项目加载
  useEffect(() => {
    loadProject();
  }, []);

  // 3. 事件桥梁
  useEffect(() => {
    setupCommandListeners();
    setupObjectManagerSync();
  }, [services]);

  // 4. 提供 Context
  return (
    <DesignerProvider services={services} eventBus={designerEventBus}>
      <DesignerPageUI />
    </DesignerProvider>
  );
};
```

### **ObjectManagerSidebar.tsx**

#### **重构前**

```typescript
interface Props {
  objectManager: ObjectManager | null;
  selectedModelId: string | null;
  onSelectModel: (id: string | null) => void;
  onRefresh: () => void;
}

const ObjectManagerSidebar: React.FC<Props> = ({
  objectManager,
  selectedModelId,
  onSelectModel,
  onRefresh,
}) => {
  // 从 props 获取数据
  const objects = objectManager?.getAllObjects() || [];
};
```

#### **重构后**

```typescript
const ObjectManagerSidebar = () => {
  // 通过 Hook 获取数据
  const objects = useDesignerObjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { eventBus } = useDesignerContext();

  const handleDelete = (id: string) => {
    sendCommand('command:model:delete', id);
  };
};
```

---

## 📁 文档索引

### **主文档**

- `RefactoringPlan-ContextProvider.md` - 本文档（重构总览）
- `RefactoringQuickStart-ContextProvider.md` - 快速启动指南

### **阶段检查点**

1. `Phase1-Infrastructure-Checkpoint.md` - 基础设施
2. `Phase2-Context-Checkpoint.md` - Context 层
3. `Phase3-DesignerPage-Checkpoint.md` - Page 重构
4. `Phase4-DesignerPageUI-Checkpoint.md` - UI 协调层
5. `Phase5-UIComponents-Checkpoint.md` - 子组件
6. `Phase6-EventBridge-Checkpoint.md` - 事件桥梁

### **参考文档**

- `RefactoringProgress.md` - 上一轮重构记录
- `DesignerArchitecture.md` - 整体架构说明

---

## 🚀 开始重构

**准备工作：**

1. 确保当前代码可编译运行
2. 创建新分支：`git checkout -b refactor/context-provider`
3. 阅读 `Phase1-Infrastructure-Checkpoint.md`
4. 开始实施 Phase 1

**会话恢复：**
如果重构中断，请：

1. 查看本文档确认整体方案
2. 查看对应 Phase 的检查点文档
3. 查看 `RefactoringQuickStart-ContextProvider.md` 快速恢复

---

**文档创建时间：** 2025-11-09  
**预计完成时间：** 10-15 小时  
**当前状态：** 准备开始
