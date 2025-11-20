# 存储与持久化系统

**最后更新**: 2025-11-21

本文档详细说明铝型材框架设计器的存储与持久化系统，包括 AutoSaveService、三层持久化策略、SceneIO 序列化和 queryService。

---

## 1. 三层持久化策略

### 1.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 内存层（Memory）                                   │
│  - ObjectManager 管理场景对象                                │
│  - 路由切换时保持（CoreServiceProvider）                    │
│  - 读写速度：最快                                            │
└─────────────────────────────────────────────────────────────┘
                            │ 自动保存（3秒防抖 + 30秒最小间隔）
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: 本地存储层（localStorage）                        │
│  - AutoSaveService 自动保存                                  │
│  - 浏览器刷新后可恢复                                        │
│  - 读写速度：较快                                            │
└─────────────────────────────────────────────────────────────┘
                            │ 手动保存（未来功能）
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 云端存储层（Cloud）                                │
│  - 网络保存/加载（预留接口）                                 │
│  - 跨设备同步                                                │
│  - 读写速度：较慢                                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 设计原则

1. **内存优先** - 所有操作先在内存中完成，保证性能
2. **自动持久化** - 用户无感知，减少数据丢失风险
3. **防抖控制** - 避免频繁写入 localStorage
4. **最小间隔** - 限制保存频率，防止性能问题
5. **渐进式加载** - 优先本地，失败后尝试网络

---

## 2. AutoSaveService - 自动保存服务

### 2.1 核心功能

**设计目标**：

- 监听 ObjectManager 变更，自动保存到 localStorage
- 防抖优化，避免频繁保存
- 最小间隔控制，限制保存频率
- 错误处理和重试机制

### 2.2 实现代码

```typescript
// src/core/services/AutoSaveService.ts
export interface AutoSaveConfig {
  debounceMs?: number; // 防抖时间（默认 3000ms）
  minSaveInterval?: number; // 最小保存间隔（默认 30000ms）
  enableCloudSave?: boolean; // 是否启用云端保存（默认 false）
}

export class AutoSaveService {
  private objectManager: ObjectManager;
  private getProjectId: () => string;
  private config: Required<AutoSaveConfig>;

  private saveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;
  private isPending: boolean = false;

  constructor(
    objectManager: ObjectManager,
    getProjectId: () => string,
    config?: AutoSaveConfig
  ) {
    this.objectManager = objectManager;
    this.getProjectId = getProjectId;
    this.config = {
      debounceMs: config?.debounceMs ?? 3000,
      minSaveInterval: config?.minSaveInterval ?? 30000,
      enableCloudSave: config?.enableCloudSave ?? false,
    };

    this.setupListeners();
  }

  /**
   * 设置监听器，监听 ObjectManager 变更
   */
  private setupListeners(): void {
    this.objectManager.on('object:added', this.scheduleSave);
    this.objectManager.on('object:removed', this.scheduleSave);
    this.objectManager.on('object:updated', this.scheduleSave);
  }

  /**
   * 调度保存（防抖 + 最小间隔）
   */
  private scheduleSave = (): void => {
    // 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 标记为待保存
    this.isPending = true;
    this.emit('save:pending');

    // 计算距离上次保存的时间
    const now = Date.now();
    const timeSinceLastSave = now - this.lastSaveTime;

    // 如果距离上次保存时间小于最小间隔，延长防抖时间
    const debounceTime =
      timeSinceLastSave < this.config.minSaveInterval
        ? this.config.minSaveInterval -
          timeSinceLastSave +
          this.config.debounceMs
        : this.config.debounceMs;

    // 设置新的定时器
    this.saveTimer = setTimeout(() => {
      this.performSave();
    }, debounceTime);
  };

  /**
   * 执行保存
   */
  private async performSave(): Promise<void> {
    try {
      this.emit('save:saving');

      const projectId = this.getProjectId();
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // 从 ObjectManager 导出场景数据
      const sceneData = this.objectManager.exportScene({
        projectId,
        projectName: `Project ${projectId}`,
        createdAt: new Date(),
        modifiedAt: new Date(),
      });

      // 保存到 localStorage
      await saveProjectToLocalStorage(projectId, sceneData);

      // 如果启用云端保存，尝试保存到云端（非阻塞）
      if (this.config.enableCloudSave) {
        saveProjectToNetwork(projectId, sceneData).catch(error => {
          console.warn('[AutoSaveService] Cloud save failed:', error);
        });
      }

      // 更新状态
      this.lastSaveTime = Date.now();
      this.isPending = false;
      this.emit('save:saved', { timestamp: new Date() });

      console.log(`[AutoSaveService] Project ${projectId} saved successfully`);
    } catch (error) {
      this.emit('save:error', { error: (error as Error).message });
      console.error('[AutoSaveService] Save failed:', error);
    }
  }

  /**
   * 手动触发保存（跳过防抖）
   */
  public async saveNow(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    await this.performSave();
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.objectManager.off('object:added', this.scheduleSave);
    this.objectManager.off('object:removed', this.scheduleSave);
    this.objectManager.off('object:updated', this.scheduleSave);
  }

  /**
   * 事件发射器
   */
  private emit(event: string, data?: unknown): void {
    // 发送到 EventBus 或内部事件系统
    designerEventBus.emit(`autosave:${event}` as any, data);
  }
}
```

### 2.3 工作流程

```
用户操作 → ObjectManager 变更
  ↓
ObjectManager.emit('object:added')
  ↓
AutoSaveService.scheduleSave()
  ↓
清除旧定时器 + 设置新定时器（3秒防抖）
  ↓
等待 3 秒...
  ↓
performSave()
  ├─ objectManager.exportScene()  // 导出数据
  ├─ saveProjectToLocalStorage()  // 保存到 localStorage
  └─ emit('save:saved')           // 通知 UI

  ↓ （如果启用云端保存）
saveProjectToNetwork() // 非阻塞，失败不影响本地保存
```

---

## 3. SceneIO - 场景序列化

### 3.1 工程文件格式

**设计目标**：轻量、快速、支持增量更新

```typescript
// src/core/object/SceneIO.ts
export interface ProjectFileFormat {
  version: string; // 文件格式版本（向后兼容）
  metadata: ProjectMetadata; // 项目元信息
  objects: SceneObjectData[]; // 场景对象列表
}

export interface ProjectMetadata {
  projectId: string;
  projectName: string;
  createdAt: Date;
  modifiedAt: Date;
  author?: string;
  description?: string;
}

export interface SceneObjectData {
  id: string;
  name: string;
  assetId: string; // 引用素材 ID（不保存完整 Asset）
  assetType: AssetType;
  assetSource: AssetSource;

  transform: Transform; // 位置、旋转、缩放
  userParams: Record<string, unknown>; // 用户参数
  machiningOps: MachiningOperation[]; // 加工操作

  visual: {
    isVisible: boolean;
    // 注意：不保存 mesh，重新加载时重新生成
  };
}
```

### 3.2 导出逻辑

```typescript
// ObjectManager.exportScene()
public exportScene(metadata: ProjectMetadata): ProjectFileFormat {
  const objects = Array.from(this.objects.values()).map(obj => ({
    id: obj.id,
    name: obj.name,
    assetId: obj.assetId,
    assetType: obj.assetType,
    assetSource: obj.assetSource,
    transform: obj.transform,
    userParams: obj.userParams,
    machiningOps: obj.compute.machiningOps,
    visual: {
      isVisible: obj.visual?.isVisible ?? true,
    },
  }));

  return {
    version: '1.0',
    metadata,
    objects,
  };
}
```

### 3.3 导入逻辑

```typescript
// ObjectManager.importScene()
public importScene(data: ProjectFileFormat): void {
  // 清空现有场景
  this.clear();

  // 重新创建对象
  for (const objData of data.objects) {
    // 获取 Asset（从 AssetRegistry）
    const asset = this.assetService.getAsset(objData.assetId);
    if (!asset) {
      console.warn(`Asset ${objData.assetId} not found, skipping object ${objData.id}`);
      continue;
    }

    // 使用 ModelFactory 创建 SceneObject
    const sceneObject = this.modelFactory.createFromAsset(asset, {
      name: objData.name,
      transform: objData.transform,
      userParams: objData.userParams,
      machiningOps: objData.machiningOps,
    });

    // 添加到场景
    this.addObject(sceneObject);

    // 恢复可见性
    this.setObjectVisibility(sceneObject.id, objData.visual.isVisible);
  }
}
```

---

## 4. queryService - 项目查询服务

### 4.1 职责

**设计目标**：提供统一的项目数据访问接口

```typescript
// src/core/services/queryService.ts
const STORAGE_PREFIX = 'alu_frame_designer';
const RECENT_PROJECTS_KEY = `${STORAGE_PREFIX}_recent_projects`;
const LAST_PROJECT_KEY = `${STORAGE_PREFIX}_last_project`;

/**
 * 从 localStorage 加载项目
 */
export function loadProjectFromLocalStorage(
  projectId: string
): ProjectFileFormat | null {
  try {
    const key = `${STORAGE_PREFIX}_project_${projectId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
}

/**
 * 保存项目到 localStorage
 */
export function saveProjectToLocalStorage(
  projectId: string,
  data: ProjectFileFormat
): void {
  try {
    const key = `${STORAGE_PREFIX}_project_${projectId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // 更新最近项目列表
    updateRecentProjects(projectId, data.metadata.projectName);

    // 更新最后打开项目
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    throw error;
  }
}

/**
 * 获取最后打开的项目 ID
 */
export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * 获取最近项目列表
 */
export function getRecentProjects(): Array<{
  id: string;
  name: string;
  timestamp: number;
}> {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 更新最近项目列表
 */
function updateRecentProjects(projectId: string, projectName: string): void {
  try {
    const recent = getRecentProjects();

    // 移除旧的相同项目
    const filtered = recent.filter(p => p.id !== projectId);

    // 添加到列表头部
    filtered.unshift({
      id: projectId,
      name: projectName,
      timestamp: Date.now(),
    });

    // 限制列表长度（最多 10 个）
    const limited = filtered.slice(0, 10);

    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to update recent projects:', error);
  }
}
```

### 4.2 网络加载（预留接口）

```typescript
/**
 * 从网络加载项目（预留接口）
 */
export async function loadProjectFromNetwork(
  projectId: string
): Promise<ProjectFileFormat | null> {
  // TODO: 实现网络加载逻辑
  console.warn('Network loading not implemented yet');
  return null;
}

/**
 * 保存项目到网络（预留接口）
 */
export async function saveProjectToNetwork(
  projectId: string,
  data: ProjectFileFormat
): Promise<void> {
  // TODO: 实现网络保存逻辑
  console.warn('Network saving not implemented yet');
}
```

---

## 5. 项目加载流程

### 5.1 DesignerPage 启动流程

```typescript
// src/pages/DesignerPage.tsx
useEffect(() => {
  // 1. 从 URL 获取项目 ID
  const projectIdFromUrl = getProjectIdFromUrl();

  // 2. 如果 URL 没有，从 localStorage 获取最后打开的项目
  const projectId = projectIdFromUrl || getLastProjectId() || 'default';

  // 3. 更新 designerProjectStore
  useDesignerProjectStore.getState().setProjectId(projectId);

  // 4. 尝试加载项目
  loadProject(projectId, coreServices.objectManager);
}, []);

/**
 * 加载项目数据
 */
function loadProject(projectId: string, objectManager: ObjectManager): void {
  // 优先从 localStorage 加载
  const localData = loadProjectFromLocalStorage(projectId);

  if (localData) {
    console.log(`Loading project ${projectId} from localStorage`);
    objectManager.importScene(localData);
    return;
  }

  // 如果本地没有，尝试从网络加载
  loadProjectFromNetwork(projectId)
    .then(networkData => {
      if (networkData) {
        console.log(`Loading project ${projectId} from network`);
        objectManager.importScene(networkData);
      } else {
        console.log(`Creating new project ${projectId}`);
        // 新项目，不需要加载数据
      }
    })
    .catch(error => {
      console.error('Failed to load project from network:', error);
    });
}
```

---

## 6. AutoSaveIndicator - UI 反馈

### 6.1 保存状态显示

```tsx
// src/features/designer/ui/AutoSaveIndicator.tsx
export const AutoSaveIndicator: React.FC = () => {
  const { autoSave } = useCoreServices();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  useEffect(() => {
    // 监听 AutoSaveService 事件
    const handlePending = () => setStatus('pending');
    const handleSaving = () => setStatus('saving');
    const handleSaved = ({ timestamp }: { timestamp: Date }) => {
      setStatus('saved');
      setLastSavedTime(timestamp);
    };
    const handleError = ({ error }: { error: string }) => {
      setStatus('error');
      console.error('Auto save error:', error);
    };

    designerEventBus.on('autosave:save:pending', handlePending);
    designerEventBus.on('autosave:save:saving', handleSaving);
    designerEventBus.on('autosave:save:saved', handleSaved);
    designerEventBus.on('autosave:save:error', handleError);

    return () => {
      designerEventBus.off('autosave:save:pending', handlePending);
      designerEventBus.off('autosave:save:saving', handleSaving);
      designerEventBus.off('autosave:save:saved', handleSaved);
      designerEventBus.off('autosave:save:error', handleError);
    };
  }, [autoSave]);

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'pending' && (
        <>
          <span className="text-yellow-400">💾</span>
          <span>待保存</span>
        </>
      )}
      {status === 'saving' && (
        <>
          <span className="text-blue-400">⏳</span>
          <span>保存中</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <span className="text-green-400">✓</span>
          <span>已保存</span>
          {lastSavedTime && (
            <span className="text-gray-400">
              {formatRelativeTime(lastSavedTime)}
            </span>
          )}
        </>
      )}
      {status === 'error' && (
        <>
          <span className="text-red-400">✗</span>
          <span>保存失败</span>
        </>
      )}
    </div>
  );
};
```

---

## 7. 性能优化

### 7.1 防抖策略

```typescript
// 3 秒防抖 - 避免频繁保存
private config = {
  debounceMs: 3000,
};

// 用户连续操作时，只在最后一次操作 3 秒后保存
// 例如：用户连续添加 10 个对象，只在最后一个添加完 3 秒后保存
```

### 7.2 最小间隔控制

```typescript
// 30 秒最小间隔 - 限制保存频率
private config = {
  minSaveInterval: 30000,
};

// 即使用户频繁操作，也不会在 30 秒内保存多次
// 例如：用户每 1 秒添加一个对象，但每 30 秒才保存一次
```

### 7.3 增量保存（未来优化）

```typescript
// 当前：每次保存整个场景
// 优化方向：只保存变更的对象

interface IncrementalSaveData {
  added: SceneObjectData[];
  updated: SceneObjectData[];
  removed: string[]; // 只保存 ID
}
```

---

## 8. 错误处理

### 8.1 localStorage 容量限制

```typescript
// localStorage 通常有 5-10MB 限制
try {
  localStorage.setItem(key, JSON.stringify(data));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // 清理旧项目数据
    cleanupOldProjects();
    // 重试保存
    localStorage.setItem(key, JSON.stringify(data));
  } else {
    throw error;
  }
}
```

### 8.2 数据损坏恢复

```typescript
// 加载时检查数据完整性
export function loadProjectFromLocalStorage(
  projectId: string
): ProjectFileFormat | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // 验证数据格式
    if (!isValidProjectFileFormat(parsed)) {
      console.error('Invalid project file format');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse project data:', error);
    // 尝试加载备份
    return loadProjectBackup(projectId);
  }
}
```

---

**相关文档**：

- [核心架构设计](./CoreArchitecture.md) - CoreServiceProvider、ObjectManager
- [状态管理策略](./StateManagement.md) - designerProjectStore、Context Provider
- [渲染系统设计](./RenderingSystem.md) - SceneObject 结构
