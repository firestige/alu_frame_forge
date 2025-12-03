# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-12-04

> **说明**：已完成任务（#1-11）的详细历史记录请参考 [开发日志](./doc/DevelopLog.md)

---

## P0 - 最高优先级（立即执行）

_当前无 P0 任务_

---

## P1 - 高优先级（本周完成）

当前聚焦任务：3D 交互基础能力（详见任务 2-4）。

---

### ~~1. 实现 3D 视角控制~~ ✅ 已完成

**状态**: ✅ 已完成 (2025-12-04, PR #14)

**描述**: 实现标准的 3D 视角控制，支持旋转、平移、缩放。

**技术方案**: 使用 Three.js OrbitControls

**任务列表**:

- [x] 集成 OrbitControls 到 ThreeRenderer
- [x] 配置控制参数（旋转速度、缩放范围等）
- [x] 添加视角预设（正视图、侧视图、俯视图、等轴测）
- [x] 添加"重置视角"功能
- [x] 键盘快捷键支持

**参考文档**: [RenderingSystem.md](./doc/design/RenderingSystem.md)

**详细记录**: 见 [开发日志 #11](./doc/DevelopLog.md#11-3d-视角控制实现)

---

---

### 2. 实现对象选中功能

**状态**: ⏳ 待执行

**描述**: 实现 3D 场景中对象的选中和高亮显示。

**技术方案**: 射线检测 + 轮廓高亮

**任务列表**:

- [ ] 实现鼠标点击选中（使用 RaycasterService）
- [ ] 实现选中对象高亮（OutlinePass 或材质替换）
- [ ] 实现多选（Ctrl + 点击）
- [ ] 实现框选（拖拽矩形选择）
- [ ] 同步选中状态到 Store
- [ ] 在对象列表中显示选中状态

**参考文档**: [RenderingSystem.md](./doc/design/RenderingSystem.md)、[StateManagement.md](./doc/design/StateManagement.md)

---

### 3. 实现对象移动和旋转

**状态**: ⏳ 待执行

**描述**: 实现 3D 场景中对象的交互式移动和旋转。

**技术方案**: TransformControls

**任务列表**:

- [ ] 集成 TransformControls 到场景
- [ ] 实现移动模式（translate）
- [ ] 实现旋转模式（rotate）
- [ ] 实现缩放模式（scale，可选）
- [ ] 添加工具栏切换按钮（移动/旋转/选择）
- [ ] 变换完成后同步到 ObjectManager
- [ ] 支持键盘快捷键（W/E/R 切换模式）

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)、[RenderingSystem.md](./doc/design/RenderingSystem.md)

---

### 4. 实现右键上下文菜单

**状态**: ⏳ 待执行

**描述**: 在 3D 场景和对象列表中实现右键菜单。

**技术方案**: 使用已有的 Popover 组件

**任务列表**:

- [ ] 实现场景右键菜单（创建对象、视角控制等）
- [ ] 实现对象右键菜单（删除、复制、隐藏等）
- [ ] 实现对象列表项右键菜单
- [ ] 集成到 DesignerPageUI
- [ ] 添加快捷键提示

**参考文档**: [UIDesign.md](./doc/design/UIDesign.md)

---

## P3 - 低优先级（长期规划）

### 5. 实现 ProfileInstanceStrategy（真实型材生成）

**状态**: ⏳ 待执行

**前置条件**: StubProfileStrategy 验证通过

**描述**: 实现真实的型材截面拉伸逻辑，替换当前的 Stub 策略。

**技术方案**:

- SVG Path 解析：将 `crossSection.path` 转换为 Three.js Shape
- 几何体生成：使用 `THREE.ExtrudeGeometry` 进行拉伸
- 参数化尺寸：从 `userParams.length` 读取拉伸长度

**核心实现**:

```typescript
class ProfileInstanceStrategy implements InstanceStrategy {
  createSceneObject(
    asset: ProfileAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    // 1. 解析 SVG Path
    const shape = this.parseSVGPath(asset.parameters.crossSection.path);

    // 2. 创建拉伸几何体
    const length =
      options.userParams?.length ?? asset.parameters.length.default;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });

    // 3. 创建材质和网格
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);

    // 4. 应用加工操作（如果有）
    if (options.machiningOps && options.machiningOps.length > 0) {
      this.applyMachiningOperations(mesh, options.machiningOps);
    }

    // 5. 返回 SceneObject
    return {
      /* ... */
    };
  }
}
```

**任务列表**:

- [ ] 实现 SVG Path 解析器（支持 M, L, C, Q, A 命令）
- [ ] 实现 ExtrudeGeometry 生成逻辑
- [ ] 实现加工操作应用（布尔运算）
- [ ] 集成 three-bvh-csg 库
- [ ] 注册到 ModelFactory（替换 StubProfileStrategy）
- [ ] 测试各种型材截面

**参考资料**:

- [Three.js ExtrudeGeometry 文档](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)
- [SVG Path 规范](https://www.w3.org/TR/SVG/paths.html)
- [three-bvh-csg GitHub](https://github.com/gkjohnson/three-bvh-csg)

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)、[RenderingSystem.md](./doc/design/RenderingSystem.md)

---

### 6. 实现 FastenerInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现紧固件（螺栓、螺母）的参数化模型生成。

**技术方案**:

- 螺栓：圆柱体 + 六角头 + 螺纹（可选）
- 螺母：六角柱 + 内螺纹（可选）
- T型螺母：特殊形状的参数化生成

**任务列表**:

- [ ] 实现螺栓几何体生成
- [ ] 实现螺母几何体生成
- [ ] 实现 T 型螺母几何体生成
- [ ] 参数化控制（规格、长度等）
- [ ] 注册到 ModelFactory

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)

---

### 7. 实现 ConnectorInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现连接件（角码、直角连接件等）的参数化模型生成。

**任务列表**:

- [ ] 定义连接件类型枚举
- [ ] 实现各种连接件几何体生成
- [ ] 参数化控制（尺寸、孔位等）
- [ ] 注册到 ModelFactory

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)

---

### 8. GeometryFactory 重构

**状态**: ⏳ 待执行

**描述**: 重构 GeometryFactory 为实例方法，供策略使用。

**当前问题**:

- GeometryFactory 有静态方法
- 策略无法方便地使用其功能

**重构方案**:

- 将 GeometryFactory 改为实例类
- 策略通过构造函数注入 GeometryFactory
- 提供通用的几何体生成方法（圆柱、六角柱、布尔运算等）

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)

---

### 9. 加工操作实现

**状态**: ⏳ 待执行

**描述**: 实现型材的加工操作（打孔、切角、攻丝、槽口）。

**技术方案**: 使用 three-bvh-csg 库进行 CSG 运算

**任务列表**:

- [ ] 集成 three-bvh-csg 库
- [ ] 实现打孔操作（减去圆柱体）
- [ ] 实现切角操作（修改顶点位置）
- [ ] 实现攻丝操作（添加螺纹几何）
- [ ] 实现槽口操作（减去矩形体）
- [ ] 在 ProfileInstanceStrategy 中应用

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)

---

### 10. 建立持续集成机制

**状态**: ⏳ 待执行

**描述**: 自动化构建、测试和部署流程。

**任务**:

- [ ] 配置 GitHub Actions
  - 自动运行单元测试
  - 自动运行 Lint 检查
  - 自动构建生产版本
- [ ] 配置测试覆盖率报告
  - 配置自动部署（Preview 环境）
- [ ] 设置 PR 检查门禁

---

### 11. 实现工程管理器（ProjectManager）

**状态**: ⏳ 待执行

**优先级**: P3（低优先级，需进一步设计讨论）

**描述**: 设计并实现工程管理系统，负责管理用户的设计工程（Project），提供保存、打开、自动恢复等功能。

**核心功能**:

1. **工程持久化**
   - 保存工程到本地存储（IndexedDB）
   - 保存工程到云端（后端API，待实现）
   - 导出工程文件到本地文件系统（.json格式）
   - 从本地文件系统导入工程

2. **工程生命周期管理**
   - 创建新工程
   - 打开已有工程（本地/云端）
   - 保存当前工程（手动/自动保存）
   - 关闭工程（切换到其他工程）

3. **自动恢复机制**
   - 应用启动时自动加载最近打开的工程
   - 维护"最近打开"列表（Recent Projects）
   - 找不到最近工程时创建新的默认工程
   - 异常退出后的工程恢复

4. **工程元数据**
   - 工程名称、创建时间、修改时间
   - 工程缩略图（3D场景截图）
   - 工程描述、标签
   - 版本历史（可选）

**技术方案**:

```typescript
interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  thumbnail?: string; // Base64 or URL
  createdAt: Date;
  updatedAt: Date;
  sceneData: SceneObjectData[]; // 从 ObjectManager 序列化
  metadata: {
    version: string; // 数据格式版本
    appVersion: string; // 应用版本
  };
}

class ProjectManager {
  // 工程操作
  async createProject(name: string): Promise<Project>;
  async openProject(
    projectId: string,
    source: 'local' | 'cloud'
  ): Promise<Project>;
  async saveProject(project: Project, target: 'local' | 'cloud'): Promise<void>;
  async deleteProject(projectId: string): Promise<void>;

  // 最近工程
  async getRecentProjects(): Promise<Project[]>;
  async loadLastOpenedProject(): Promise<Project | null>;

  // 导入导出
  async exportToFile(project: Project): Promise<void>;
  async importFromFile(file: File): Promise<Project>;
}
```

**待讨论问题**:

- [ ] 工程切换时的提示逻辑（未保存警告）
- [ ] 云端存储方案选型（需要后端支持）
- [ ] 工程文件格式版本兼容性策略
- [ ] 多工程并行编辑支持（是否需要）
- [ ] 工程模板功能（预设常用框架结构）
- [ ] 协作功能（多人编辑同一工程）

**前置条件**:

- 当前 ObjectManager 已支持场景序列化（SceneIO）
- AutoSaveService 可作为工程自动保存的基础

**后续拆解**:

- 本任务为高层设计，需拆分为多个子任务执行
- 优先实现本地存储版本，云端功能可后续迭代

**参考文档**: [StorageSystem.md](./doc/design/StorageSystem.md)、[CoreArchitecture.md](./doc/design/CoreArchitecture.md)

**前置条件**: StubProfileStrategy 验证通过

**描述**: 实现真实的型材截面拉伸逻辑，替换当前的 Stub 策略。

**技术方案**:

- SVG Path 解析：将 `crossSection.path` 转换为 Three.js Shape
- 几何体生成：使用 `THREE.ExtrudeGeometry` 进行拉伸
- 参数化尺寸：从 `userParams.length` 读取拉伸长度

**核心实现**:

```typescript
class ProfileInstanceStrategy implements InstanceStrategy {
  createSceneObject(
    asset: ProfileAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    // 1. 解析 SVG Path
    const shape = this.parseSVGPath(asset.parameters.crossSection.path);

    // 2. 创建拉伸几何体
    const length =
      options.userParams?.length ?? asset.parameters.length.default;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });

    // 3. 创建材质和网格
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, material);

    // 4. 应用加工操作（如果有）
    if (options.machiningOps && options.machiningOps.length > 0) {
      this.applyMachiningOperations(mesh, options.machiningOps);
    }

    // 5. 返回 SceneObject
    return {
      /* ... */
    };
  }
}
```

**任务列表**:

- [ ] 实现 SVG Path 解析器（支持 M, L, C, Q, A 命令）
- [ ] 实现 ExtrudeGeometry 生成逻辑
- [ ] 实现加工操作应用（布尔运算）
- [ ] 集成 three-bvh-csg 库
- [ ] 注册到 ModelFactory（替换 StubProfileStrategy）
- [ ] 测试各种型材截面

**参考资料**:

- [Three.js ExtrudeGeometry 文档](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)
- [SVG Path 规范](https://www.w3.org/TR/SVG/paths.html)
- [three-bvh-csg GitHub](https://github.com/gkjohnson/three-bvh-csg)

---

### 12. 实现 FastenerInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现紧固件（螺栓、螺母）的参数化模型生成。

**技术方案**:

- 螺栓：圆柱体 + 六角头 + 螺纹（可选）
- 螺母：六角柱 + 内螺纹（可选）
- T型螺母：特殊形状的参数化生成

**任务列表**:

- [ ] 实现螺栓几何体生成
- [ ] 实现螺母几何体生成
- [ ] 实现 T 型螺母几何体生成
- [ ] 参数化控制（规格、长度等）
- [ ] 注册到 ModelFactory

---

### 13. 实现 ConnectorInstanceStrategy

**状态**: ⏳ 待执行

**描述**: 实现连接件（角码、直角连接件等）的参数化模型生成。

**任务列表**:

- [ ] 定义连接件类型枚举
- [ ] 实现各种连接件几何体生成
- [ ] 参数化控制（尺寸、孔位等）
- [ ] 注册到 ModelFactory

---

### 14. GeometryFactory 重构

**状态**: ⏳ 待执行

**描述**: 重构 GeometryFactory 为实例方法，供策略使用。

**当前问题**:

- GeometryFactory 有静态方法
- 策略无法方便地使用其功能

**重构方案**:

- 将 GeometryFactory 改为实例类
- 策略通过构造函数注入 GeometryFactory
- 提供通用的几何体生成方法（圆柱、六角柱、布尔运算等）

---

### 15. 加工操作实现

**状态**: ⏳ 待执行

**描述**: 实现型材的加工操作（打孔、切角、攻丝、槽口）。

**技术方案**: 使用 three-bvh-csg 库进行 CSG 运算

**任务列表**:

- [ ] 集成 three-bvh-csg 库
- [ ] 实现打孔操作（减去圆柱体）
- [ ] 实现切角操作（修改顶点位置）
- [ ] 实现攻丝操作（添加螺纹几何）
- [ ] 实现槽口操作（减去矩形体）
- [ ] 在 ProfileInstanceStrategy 中应用

---

### 16. 建立持续集成机制

**状态**: ⏳ 待执行

**描述**: 自动化构建、测试和部署流程。

**任务**:

- [ ] 配置 GitHub Actions
  - 自动运行单元测试
  - 自动运行 Lint 检查
  - 自动构建生产版本
- [ ] 配置测试覆盖率报告
  - 配置自动部署（Preview 环境）
- [ ] 设置 PR 检查门禁

---

### 17. 实现工程管理器（ProjectManager）

**状态**: ⏳ 待执行

**优先级**: P3（低优先级，需进一步设计讨论）

**描述**: 设计并实现工程管理系统，负责管理用户的设计工程（Project），提供保存、打开、自动恢复等功能。

**核心功能**:

1. **工程持久化**
   - 保存工程到本地存储（IndexedDB）
   - 保存工程到云端（后端API，待实现）
   - 导出工程文件到本地文件系统（.json格式）
   - 从本地文件系统导入工程

2. **工程生命周期管理**
   - 创建新工程
   - 打开已有工程（本地/云端）
   - 保存当前工程（手动/自动保存）
   - 关闭工程（切换到其他工程）

3. **自动恢复机制**
   - 应用启动时自动加载最近打开的工程
   - 维护"最近打开"列表（Recent Projects）
   - 找不到最近工程时创建新的默认工程
   - 异常退出后的工程恢复

4. **工程元数据**
   - 工程名称、创建时间、修改时间
   - 工程缩略图（3D场景截图）
   - 工程描述、标签
   - 版本历史（可选）

**技术方案**:

```typescript
interface Project {
  id: string; // UUID
  name: string;
  description?: string;
  thumbnail?: string; // Base64 or URL
  createdAt: Date;
  updatedAt: Date;
  sceneData: SceneObjectData[]; // 从 ObjectManager 序列化
  metadata: {
    version: string; // 数据格式版本
    appVersion: string; // 应用版本
  };
}

class ProjectManager {
  // 工程操作
  async createProject(name: string): Promise<Project>;
  async openProject(
    projectId: string,
    source: 'local' | 'cloud'
  ): Promise<Project>;
  async saveProject(project: Project, target: 'local' | 'cloud'): Promise<void>;
  async deleteProject(projectId: string): Promise<void>;

  // 最近工程
  async getRecentProjects(): Promise<Project[]>;
  async loadLastOpenedProject(): Promise<Project | null>;

  // 导入导出
  async exportToFile(project: Project): Promise<void>;
  async importFromFile(file: File): Promise<Project>;
}
```

**待讨论问题**:

- [ ] 工程切换时的提示逻辑（未保存警告）
- [ ] 云端存储方案选型（需要后端支持）
- [ ] 工程文件格式版本兼容性策略
- [ ] 多工程并行编辑支持（是否需要）
- [ ] 工程模板功能（预设常用框架结构）
- [ ] 协作功能（多人编辑同一工程）

**前置条件**:

- 当前 ObjectManager 已支持场景序列化（SceneIO）
- AutoSaveService 可作为工程自动保存的基础

**后续拆解**:

- 本任务为高层设计，需拆分为多个子任务执行
- 优先实现本地存储版本，云端功能可后续迭代

---

## 参考文档

### 核心架构文档

- [项目总览](./doc/Architecture.md) - 项目整体架构、技术栈、模块索引
- [快速上下文](./doc/ArchitecturePrompt.md) - AI 助手快速理解项目的入口文档
- [文档中心](./doc/README.md) - 完整文档导航

### 设计子系统文档

- [核心架构设计](./doc/design/CoreArchitecture.md) - 分层架构、CoreServiceProvider、事件驱动、策略模式
- [UI 设计系统](./doc/design/UIDesign.md) - 主题系统、Framer Motion、组件库、响应式设计
- [状态管理策略](./doc/design/StateManagement.md) - Context Provider、Zustand、usePersistentState
- [存储与持久化](./doc/design/StorageSystem.md) - AutoSaveService、三层持久化、SceneIO
- [渲染系统设计](./doc/design/RenderingSystem.md) - 渲染器抽象、Three.js 实现、RenderSyncService

### 开发指南

- [工作流规范](./doc/guides/Workflow.md) - 协同工作流、Git 规则、文档同步
- [Git 自动化](./doc/guides/GitAutomation.md) - 自动化脚本使用指南
- [测试计划](./doc/guides/Testing.md) - 测试策略和计划

### 其他文档

- [开发日志](./doc/DevelopLog.md) - 已完成任务的详细历史记录
- [命令系统参考](./doc/api/CommandReference.md) - API 命令参考

---

**维护说明**: 本文档应随项目进展定期更新，已完成的事项移至 [开发日志](./doc/DevelopLog.md) 归档。
