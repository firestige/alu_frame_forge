# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-12-07

> **说明**：已完成任务的详细历史记录请参考 [开发日志](./doc/DevelopLog.md)

---

## P0 - 最高优先级（立即执行）

_当前无 P0 任务_

---

## P1 - 高优先级（本周完成）

_当前无 P1 任务_

---

## P2 - 中优先级（本月完成）

### 19. 建立 Human-AI 协作方法论文档体系

**状态**: 🚧 进行中

**优先级**: P2（中优先级）

**描述**: 将本项目的人机协作实践提炼为可复制的方法论，作为 AI 工程化能力的证明。

**背景**:

本项目使用 Copilot + Sonnet 4.5 完成绝大部分开发工作。为证明 AI 工程化能力，需要将协作过程中的方法论显性化。

**任务列表**:

- [x] 创建 doc/methodology/ 目录结构
- [x] 编写 README.md - 方法论文档导航
- [x] 编写 ProjectAnalysis.md - 项目价值分析
- [x] 编写 HumanAICollaboration.md - 协作规范详解
- [x] 编写 CaseStudyTemplate.md - 案例提取模板
- [ ] 从 DevelopLog.md 提取 3-5 个典型案例
- [ ] 添加量化成果统计
- [ ] 编写技术博客/分享材料

**参考文档**: [Workflow.md](./doc/guides/Workflow.md)、[DevelopLog.md](./doc/DevelopLog.md)

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

---

### 12. 定制 Gizmo 外观与渲染器 UI 一致性

**状态**: ⏳ 待执行

**优先级**: P3（低优先级，设计探索）

**描述**: 研究如何定制 Three.js TransformControls Gizmo 的外观，使其与应用的整体 UI 风格保持一致。并探讨当更换渲染器时（如 Babylon.js、WebGPU），如何保证 UI 风格的统一性。

**问题背景**:

当前使用的 Three.js `TransformControls` Gizmo（红绿蓝三色箭头）采用标准的 3D 编辑器风格，但与我们应用的 Material Design 主题和自定义配色方案不完全匹配。此外，如果未来切换到其他渲染引擎（Babylon.js、WebGPU 等），每个引擎都有自己的 Gizmo 实现和风格，可能导致用户体验不一致。

**研究方向**:

1. **定制 Three.js TransformControls 外观**
   - 修改 Gizmo 材质颜色（匹配应用主题色）
   - 调整 Gizmo 尺寸和形状
   - 探索是否可以完全自定义 Gizmo 几何体
   - 参考：[TransformControls 源码](https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/TransformControls.js)

2. **抽象 Gizmo 系统**
   - 定义通用的 `IGizmo` 接口（独立于渲染引擎）
   - 为不同渲染器提供统一的 Gizmo 配置
   - 示例接口设计：

     ```typescript
     interface IGizmoConfig {
       colors: {
         x: string; // X 轴颜色（默认红色）
         y: string; // Y 轴颜色（默认绿色）
         z: string; // Z 轴颜色（默认蓝色）
         hover: string; // 悬停高亮颜色
         selected: string; // 选中状态颜色
       };
       size: number; // Gizmo 尺寸倍数
       opacity: number; // 透明度
       lineWidth?: number; // 线条宽度
     }

     interface IGizmo {
       attach(object: unknown): void;
       detach(): void;
       setMode(mode: 'translate' | 'rotate' | 'scale'): void;
       setConfig(config: Partial<IGizmoConfig>): void;
     }
     ```

3. **跨渲染器一致性策略**
   - **方案 A**：统一配置文件
     - 在应用层定义 Gizmo 样式配置
     - 各渲染器实现按照配置生成自己的 Gizmo
     - 优点：配置集中，易于维护
     - 缺点：需要各渲染器支持足够的自定义能力
   - **方案 B**：自定义 Gizmo 实现
     - 完全自己实现 Gizmo 渲染逻辑（使用基础图元）
     - 不依赖渲染引擎内置的 Gizmo 控件
     - 优点：完全控制外观，跨引擎一致性最好
     - 缺点：开发成本高，需要处理鼠标交互逻辑
   - **方案 C**：Overlay UI 模式
     - Gizmo 使用 HTML/CSS 2D 覆盖层实现
     - 3D 场景只处理变换逻辑，不渲染 Gizmo
     - 优点：与应用 UI 风格完全一致，易于定制
     - 缺点：无法准确表达 3D 空间关系，交互可能不够直观

4. **技术调研任务**
   - [ ] 研究 Three.js TransformControls 的可定制性
   - [ ] 调研 Babylon.js 的 Gizmo 系统
   - [ ] 调研 WebGPU 渲染器的交互控件方案
   - [ ] 评估自定义实现 Gizmo 的工作量
   - [ ] 评估 2D Overlay Gizmo 的可行性
   - [ ] 设计 IGizmo 接口和配置系统
   - [ ] 编写技术方案文档

**参考案例**:

- [Babylon.js Gizmo](https://doc.babylonjs.com/features/featuresDeepDive/mesh/gizmo) - 支持自定义颜色和材质
- [Unity3D Gizmo](https://docs.unity3d.com/Manual/GizmosMenu.html) - 可配置颜色和大小
- [Blender Transform Widget](https://docs.blender.org/manual/en/latest/editors/3dview/controls/gizmos.html) - 高度可定制

**讨论问题**:

- 是否需要支持主题色自动应用到 Gizmo？（如深色主题 vs 浅色主题）
- 是否需要支持用户自定义 Gizmo 外观？
- 跨渲染器一致性的优先级有多高？
- 是否可以接受不同渲染器的 Gizmo 有细微差异？

**前置条件**:

- Transform 系统已实现并稳定运行
- IRenderer 接口已稳定，不频繁变更

**后续拆解**:

- 本任务为研究型任务，需先完成技术调研
- 根据调研结果决定具体实施方案
- 可能拆分为多个子任务：配置系统设计、Three.js 定制、抽象层实现等

**参考文档**: [RenderingSystem.md](./doc/design/RenderingSystem.md)、[CoreArchitecture.md](./doc/design/CoreArchitecture.md)

---

## 已完成任务归档

以下任务已完成并归档，详细记录请参考 [开发日志](./doc/DevelopLog.md)：

### ✅ 任务 1: 实现 3D 视角控制

- **完成日期**: 2025-12-04
- **PR**: #14
- **功能**: OrbitControls 集成、视角预设、键盘快捷键
- **详细记录**: [开发日志 #11](./doc/DevelopLog.md#11-3d-视角控制实现)

### ✅ 任务 2: 实现对象选中功能

- **完成日期**: 2025-12-04
- **功能**: 鼠标点击选中、OutlinePass 高亮、Ctrl 多选、Shift 框选
- **技术**: RaycasterService + OutlinePass + BoxSelectController

### ✅ 任务 3: 实现对象移动和旋转

- **完成日期**: 2025-12-05
- **PR**: #17
- **功能**: TransformControls 集成、移动/旋转/缩放模式、工具栏、键盘快捷键 (W/E/R)

### ✅ 任务 4: 实现右键上下文菜单

- **完成日期**: 2025-12-06
- **PR**: #18
- **功能**: UI-Command 绑定系统、场景右键菜单（14个操作）、对象右键菜单、ObjectTree 右键菜单
- **技术**: 数据驱动组件架构、拖拽检测（5px阈值）、Raycaster 对象检测
- **详细文档**: [UICommandSystem.md](./doc/design/UICommandSystem.md)

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
