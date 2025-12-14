# 状态管理策略

**最后更新**: 2025-12-05

本文档详细说明铝型材框架设计器的状态管理策略，包括 Context Provider、Zustand、持久化 Hook 和状态划分原则。

---

## 1. 状态管理架构

### 1.1 分层策略

```
┌─────────────────────────────────────────────────────────────┐
│  应用级状态 (CoreServices Context)                           │
│  - ObjectManager, AssetService, EventBus, AutoSaveService   │
│  - 路由切换时保持                                            │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│  功能模块状态 (Zustand Stores)                               │
│  - designerObjectStore:  对象列表                           │
│  - designerProjectStore: 项目元信息                         │
│  - libraryStore:         素材库状态                         │
│  - drawerStore:          侧边栏状态                         │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│  页面级状态 (Features Context)                               │
│  - DesignerContext: 业务服务实例                            │
│  - 页面切换时重建                                            │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│  组件级状态 (React State + Props)                           │
│  - UI 交互状态（展开/折叠、选中项等）                       │
│  - 表单输入状态                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 状态分类原则

| 状态类型         | 管理方式             | 生命周期     | 示例                           |
| ---------------- | -------------------- | ------------ | ------------------------------ |
| **核心数据**     | CoreServices Context | 应用全局     | ObjectManager, AssetService    |
| **功能模块数据** | Zustand Store        | 功能模块     | 对象列表、项目信息             |
| **业务服务实例** | Features Context     | 页面级       | CreationService, EditorService |
| **UI 交互状态**  | React State          | 组件级       | 工具选择、面板展开             |
| **持久化偏好**   | usePersistentState   | localStorage | 侧边栏折叠、工具选择           |

### 1.3 Implementation 层通信原则 ⭐

**关键原则**：Implementation 层（Three.js 实现）**不应使用 EventBus**

**通信方式**：

```
UI Layer ↔ Feature/Core Layer: EventBus (双向)
Core Interface ↔ Implementation: 直接调用 + 回调函数
```

**错误示例**：

```typescript
// ❌ Implementation 层直接使用 EventBus
class ThreeTransformController {
  private handleDragStart = () => {
    publishState('state:transform:draggingChanged', { dragging: true });
  };
}
```

**正确示例**：

```typescript
// ✅ Implementation 层通过回调报告
class ThreeTransformController {
  public onDraggingChanged?: (dragging: boolean) => void;

  private handleDragStart = () => {
    this.onDraggingChanged?.(true); // 通过回调向上报告
  };
}

// ✅ Feature 层设置回调并发布 EventBus
class TransformService {
  constructor(renderer: IRenderer) {
    const controller = renderer.getTransformController();

    // 在 Feature 层连接回调和 EventBus
    controller.onDraggingChanged = dragging => {
      publishState('state:transform:draggingChanged', { dragging });
    };
  }
}
```

**为什么这样设计？**

1. **解耦技术实现**：Implementation 层不应知道业务层的事件系统
2. **易于替换**：切换到 Babylon.js 时，使用相同的回调接口
3. **职责清晰**：技术层负责实现，业务层负责状态发布
4. **可测试性**：可以 mock 回调函数进行单元测试

详见：[核心架构设计 - 通信原则](./CoreArchitecture.md#34-通信原则与分层规则-)

---

## 2. Context Provider 模式

### 2.1 CoreServiceProvider - 应用级

**职责**：提供核心服务单例，确保路由切换时状态不丢失

```tsx
// src/core/CoreServiceProvider.tsx
export interface CoreServices {
  objectManager: ObjectManager; // 场景对象管理
  assetService: AssetService; // 资产服务
  eventBus: Emitter<Events>; // 事件总线
  autoSave: AutoSaveService; // 自动保存
}

export const CoreServiceProvider: React.FC<{ children }> = ({ children }) => {
  const servicesRef = useRef<CoreServices | null>(null);

  // 单例初始化
  if (!servicesRef.current) {
    const objectManager = new ObjectManager();
    const assetService = new AssetService();
    const eventBus = designerEventBus;

    servicesRef.current = {
      objectManager,
      assetService,
      eventBus,
      autoSave: null,
    };
  }

  // 动态初始化 AutoSaveService（避免循环依赖）
  useEffect(() => {
    import('@/features/designer/stores/designerProjectStore').then(module => {
      const autoSave = new AutoSaveService(
        servicesRef.current!.objectManager,
        () => module.designerProjectStore.getState().projectId
      );
      servicesRef.current!.autoSave = autoSave;
    });

    return () => {
      servicesRef.current?.autoSave?.dispose();
    };
  }, []);

  return (
    <CoreServiceContext.Provider value={servicesRef.current}>
      {children}
    </CoreServiceContext.Provider>
  );
};

// Hook 访问服务
export const useCoreServices = (): CoreServices => {
  const services = useContext(CoreServiceContext);
  if (!services) {
    throw new Error('useCoreServices must be used within CoreServiceProvider');
  }
  return services;
};
```

**使用场景**：

```tsx
// Pages/Features 层
const { objectManager, assetService, autoSave } = useCoreServices();

// 操作场景对象
objectManager.addObject(sceneObject);
objectManager.removeObject(objectId);

// 访问素材
const asset = assetService.getAsset(assetId);
```

### 2.2 DesignerContext - 页面级

**职责**：提供业务服务实例，页面切换时重建

```tsx
// src/features/designer/context/DesignerContext.tsx
interface DesignerContextValue {
  services: {
    creation: ModelCreationService;
    editor: ModelEditorService;
    placement: PlacementController;
    renderSync: RenderSyncService;
  };
  eventBus: typeof designerEventBus;
}

export const DesignerProvider: React.FC<DesignerProviderProps> = ({
  children,
  services,
}) => {
  return (
    <DesignerContext.Provider value={{ services, eventBus: designerEventBus }}>
      {children}
    </DesignerContext.Provider>
  );
};

// Hook 访问服务
export const useDesignerContext = (): DesignerContextValue => {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error('useDesignerContext must be used within DesignerProvider');
  }
  return context;
};
```

**使用场景**：

```tsx
// UI 组件
const { services } = useDesignerContext();

// 创建对象
services.creation.createAluminumProfile();

// 编辑对象
services.editor.editModel(modelId);
```

---

## 3. Zustand 状态管理

### 3.1 全局状态

#### drawerStore - 侧边栏状态

```typescript
// src/stores/drawerStore.ts
import { create } from 'zustand';

interface DrawerStore {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useDrawerStore = create<DrawerStore>(set => ({
  isOpen: true,
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
```

**使用方式**：

```tsx
// 获取状态
const isOpen = useDrawerStore(state => state.isOpen);

// 调用方法
const toggleDrawer = useDrawerStore(state => state.toggle);
toggleDrawer();
```

#### libraryStore - 素材库状态

```typescript
// src/stores/libraryStore.ts
interface LibraryState {
  selectedCategory: string | null;
  searchQuery: string;
  viewMode: 'grid' | 'list';

  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const useLibraryStore = create<LibraryState>(set => ({
  selectedCategory: null,
  searchQuery: '',
  viewMode: 'grid',

  setSelectedCategory: category => set({ selectedCategory: category }),
  setSearchQuery: query => set({ searchQuery: query }),
  setViewMode: mode => set({ viewMode: mode }),
}));
```

### 3.2 功能模块状态

#### designerObjectStore - 对象列表管理

```typescript
// src/features/designer/stores/designerObjectStore.ts
interface DesignerObjectState {
  objectIds: string[]; // 对象 ID 列表
  selectedObjectId: string | null; // 当前选中对象

  setObjectIds: (ids: string[]) => void;
  selectObject: (id: string | null) => void;
  addObjectId: (id: string) => void;
  removeObjectId: (id: string) => void;
}

export const useDesignerObjectStore = create<DesignerObjectState>(set => ({
  objectIds: [],
  selectedObjectId: null,

  setObjectIds: ids => set({ objectIds: ids }),
  selectObject: id => set({ selectedObjectId: id }),
  addObjectId: id =>
    set(state => ({
      objectIds: [...state.objectIds, id],
    })),
  removeObjectId: id =>
    set(state => ({
      objectIds: state.objectIds.filter(objId => objId !== id),
      selectedObjectId:
        state.selectedObjectId === id ? null : state.selectedObjectId,
    })),
}));
```

**同步策略**：

```tsx
// DesignerPage 监听 ObjectManager 事件，同步到 Store
useEffect(() => {
  const handleObjectAdded = (objectId: string) => {
    designerObjectStore.getState().addObjectId(objectId);
  };

  const handleObjectRemoved = (objectId: string) => {
    designerObjectStore.getState().removeObjectId(objectId);
  };

  coreServices.objectManager.on('object:added', handleObjectAdded);
  coreServices.objectManager.on('object:removed', handleObjectRemoved);

  return () => {
    coreServices.objectManager.off('object:added', handleObjectAdded);
    coreServices.objectManager.off('object:removed', handleObjectRemoved);
  };
}, []);
```

#### designerProjectStore - 项目信息管理

```typescript
// src/features/designer/stores/designerProjectStore.ts
interface DesignerProjectState {
  projectId: string;
  projectName: string;
  lastSaved: Date | null;
  isDirty: boolean;

  setProjectId: (id: string) => void;
  setProjectName: (name: string) => void;
  markSaved: () => void;
  markDirty: () => void;
}

export const useDesignerProjectStore = create<DesignerProjectState>(set => ({
  projectId: '',
  projectName: 'Untitled Project',
  lastSaved: null,
  isDirty: false,

  setProjectId: id => set({ projectId: id }),
  setProjectName: name => set({ projectName: name }),
  markSaved: () => set({ lastSaved: new Date(), isDirty: false }),
  markDirty: () => set({ isDirty: true }),
}));
```

---

## 4. 持久化状态 Hook

### 4.1 usePersistentState

**设计目标**：将 React state 自动同步到 localStorage

```typescript
// src/features/designer/hooks/usePersistentState.ts
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 初始化：从 localStorage 读取
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load from localStorage (${key}):`, error);
      return defaultValue;
    }
  });

  // 包装 setState：同时更新 state 和 localStorage
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        const nextValue =
          typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`Failed to save to localStorage (${key}):`, error);
        }

        return nextValue;
      });
    },
    [key]
  );

  return [state, setPersistentState];
}
```

### 4.2 使用场景

#### UI 偏好设置

```tsx
// 持久化工具选择
const [selectedTool, setSelectedTool] = usePersistentState<ToolType>(
  'designer.selectedTool',
  'select'
);

// 持久化侧边栏折叠状态
const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState(
  'designer.sidebarCollapsed',
  false
);

// 持久化视图模式
const [viewMode, setViewMode] = usePersistentState<'grid' | 'list'>(
  'library.viewMode',
  'grid'
);
```

#### 优势

1. **自动持久化** - 无需手动 localStorage 操作
2. **类型安全** - 完整的 TypeScript 支持
3. **函数式更新** - 支持 `setState(prev => ...)`
4. **错误处理** - 优雅降级，不影响正常使用

---

## 5. 状态同步策略

### 5.1 ObjectManager ↔ Zustand Store

**问题**：ObjectManager（Core 层）变更后，UI 层需要响应

**解决方案**：在 DesignerPage 监听事件，同步到 Store

```tsx
// src/pages/DesignerPage.tsx
useEffect(() => {
  // 初始化：加载对象列表
  const allObjects = coreServices.objectManager.getAllObjects();
  const objectIds = allObjects.map(obj => obj.id);
  useDesignerObjectStore.getState().setObjectIds(objectIds);

  // 监听对象添加
  const handleObjectAdded = (objectId: string) => {
    useDesignerObjectStore.getState().addObjectId(objectId);
  };

  // 监听对象移除
  const handleObjectRemoved = (objectId: string) => {
    useDesignerObjectStore.getState().removeObjectId(objectId);
  };

  // 监听对象更新（可选，如果需要刷新 UI）
  const handleObjectUpdated = (objectId: string) => {
    // 触发 UI 重渲染
    forceUpdate();
  };

  coreServices.objectManager.on('object:added', handleObjectAdded);
  coreServices.objectManager.on('object:removed', handleObjectRemoved);
  coreServices.objectManager.on('object:updated', handleObjectUpdated);

  return () => {
    coreServices.objectManager.off('object:added', handleObjectAdded);
    coreServices.objectManager.off('object:removed', handleObjectRemoved);
    coreServices.objectManager.off('object:updated', handleObjectUpdated);
  };
}, [coreServices.objectManager]);
```

### 5.2 AutoSaveService ↔ designerProjectStore

**问题**：AutoSaveService 需要 `projectId`，但 projectId 在 `designerProjectStore`

**解决方案**：通过回调函数注入（依赖注入）

```typescript
// CoreServiceProvider 中
import('@/features/designer/stores/designerProjectStore').then(module => {
  const autoSave = new AutoSaveService(
    objectManager,
    () => module.designerProjectStore.getState().projectId // 注入回调
  );
  servicesRef.current!.autoSave = autoSave;
});
```

### 5.3 UI 层 → ObjectManager

**问题**：UI 层如何触发对象操作？

**解决方案 1**：通过 Event Bus 发送命令

```tsx
// UI 层
sendCommand('command:model:delete', modelId);

// DesignerPage 监听命令
onCommand('command:model:delete', modelId => {
  coreServices.objectManager.removeObject(modelId);
});
```

**解决方案 2**：直接调用 ObjectManager API

```tsx
// UI 层
const { objectManager } = useCoreServices();
objectManager.removeObject(modelId);
```

**选择标准**：

- **简单操作** → 直接调用 API（删除、更新属性）
- **复杂流程** → 通过 Event Bus（创建、放置）

---

## 6. 状态管理最佳实践

### 6.1 状态存放位置

| 状态类型     | 存放位置           | 理由                              |
| ------------ | ------------------ | --------------------------------- |
| 场景对象数据 | ObjectManager      | 核心业务数据，需要持久化          |
| 对象 ID 列表 | Zustand Store      | UI 需要响应变化，但不需要完整对象 |
| 选中对象 ID  | Zustand Store      | UI 交互状态，多组件共享           |
| 工具选择     | usePersistentState | 用户偏好，需要持久化              |
| 表单输入     | React State        | 临时输入，组件内部状态            |
| 面板展开     | React State        | UI 临时状态，无需共享             |

### 6.2 避免冗余状态

**❌ 不好**：在 Store 中存储完整对象

```typescript
// 不推荐：重复存储，容易不同步
interface BadDesign {
  objects: SceneObject[]; // 与 ObjectManager 重复
}
```

**✅ 好**：只存储对象 ID

```typescript
// 推荐：只存储引用，数据源唯一
interface GoodDesign {
  objectIds: string[]; // 只存储 ID
}

// 使用时从 ObjectManager 获取完整对象
const object = objectManager.getObject(objectId);
```

### 6.3 选择器性能优化

```tsx
// ❌ 不好：每次重渲染都返回新数组
const objectIds = useDesignerObjectStore(state => state.objectIds);

// ✅ 好：使用选择器，减少不必要的重渲染
const objectIds = useDesignerObjectStore(
  state => state.objectIds,
  shallow // 浅比较，数组内容不变则不触发重渲染
);
```

### 6.4 避免循环依赖

**问题**：CoreServiceProvider 需要 designerProjectStore，但 designerProjectStore 在 Features 层

**解决方案**：动态导入

```typescript
// CoreServiceProvider.tsx
useEffect(() => {
  // 动态导入，避免循环依赖
  import('@/features/designer/stores/designerProjectStore').then(module => {
    const autoSave = new AutoSaveService(
      objectManager,
      () => module.designerProjectStore.getState().projectId
    );
    servicesRef.current!.autoSave = autoSave;
  });
}, []);
```

---

## 7. 状态调试工具

### 7.1 Zustand DevTools

```typescript
// 开发环境启用 DevTools
export const useDesignerObjectStore = create<DesignerObjectState>()(
  devtools(
    set => ({
      objectIds: [],
      // ...
    }),
    { name: 'DesignerObjectStore' }
  )
);
```

### 7.2 React DevTools

- 查看 Context Provider 提供的值
- 追踪 usePersistentState 的变化
- 观察组件重渲染原因

---

## 8. 迁移路径（历史遗留）

### 8.1 旧架构问题

**2025-11-14 之前的问题**：

- ObjectManager 在 Features 层创建（`useBusinessServices` Hook）
- 路由切换导致 ObjectManager 被销毁，场景对象丢失
- 违反架构原则（Core 层服务在 Features 层创建）

### 8.2 迁移步骤

1. **创建 CoreServiceProvider** - 在 App 层初始化 Core 服务
2. **重构 DesignerPage** - 从 Context 获取 Core 服务
3. **清理 useBusinessServices** - 删除旧的 Hook
4. **更新测试** - 修改测试用例，使用新的 Provider

---

**相关文档**：

- [核心架构设计](./CoreArchitecture.md) - CoreServiceProvider、事件驱动
- [存储系统设计](./StorageSystem.md) - AutoSaveService、持久化策略
- [UI 设计系统](./UIDesign.md) - usePersistentState Hook
