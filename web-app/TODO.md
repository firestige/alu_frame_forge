# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-12-14

> **说明**：已完成任务的详细历史记录请参考 [开发日志](./doc/DevelopLog.md)

---

## P0 - 最高优先级（立即执行）

### SVG 截面归一化系统 - 架构设计与实施规划

**状态**: 📋 规划中

**优先级**: P0（架构基础）

**背景问题**:
当前 SVG 多路径解析依赖书写顺序（第一个闭合路径=外轮廓，其余=孔洞），但不同 CAD 软件导出顺序不一致，用户手写 SVG 可能随意排序，导致渲染结果不可预测。

**核心目标**:
建立标准化的截面数据格式和交互式标注工具，让用户明确指定哪些路径是主轮廓、哪些是孔洞。

**详细方案**: 见 [CrossSectionNormalization 设计文档](./doc/design/CrossSectionNormalization.md)

**MVP 范围**（当前阶段必须完成）:

- ✅ 定义 `NormalizedCrossSection` 数据格式
- ✅ 型材库页面增加截面编辑模态窗
- ✅ SVG 可视化预览（显示所有检测到的闭合路径）
- ✅ 用户手动标注工具（点击选择主轮廓和孔洞）
- ✅ 生成归一化数据并保存
- ✅ 更新现有预置型材数据为归一化格式

**STUB 特性**（未来扩展，当前不实现）:

- 🔲 用户上传 SVG 并存储到数据库（当前仅支持预置硬编码）
- 🔲 自动检测算法（面积计算、包含关系判断、置信度评分）
- 🔲 智能坐标系原点定位（异形型材支持）

**待讨论问题**:

- [ ] 坐标系原点策略：对称型材放中心，异形型材如何处理？
- [ ] 归一化后的坐标单位统一为 mm（已确定）

---

## P1 - 高优先级（本周完成）

### 5. 参数化编辑能力（属性面板 + 对话框）

**状态**: ⏳ 进行中

**优先级**: P0（核心功能）

**描述**: 实现型材长度等参数的交互式编辑，支持 CAD 风格的参数修改体验。

**详细方案**: 见分析报告（2025-12-15）

**MVP 范围**（当前阶段）:

- [ ] **PropertyPanel 参数编辑**（P0）
  - [ ] NumberInput 组件（支持 min/max/step/unit）
  - [ ] PropertyEditor 通用编辑器
  - [ ] 集成到 PropertyPanel，userParams 可编辑
  - [ ] 连接 ObjectManager.updateUserParams

- [ ] **右键菜单参数对话框**（P1）
  - [ ] Dialog 模态对话框组件（基于 Headless UI）
  - [ ] ParameterEditDialog 参数编辑对话框
  - [ ] 上下文菜单添加"编辑参数"菜单项
  - [ ] 替换 ModelEditorService 的 prompt() 实现

**技术要求**:

- 遵守分层架构：UI → Features → Core
- 使用 EventBus 命令系统（command:model:updateUserParams）
- 基于 Tailwind CSS + Framer Motion
- 支持参数约束验证（来自 ProfileAsset.lengthConstraints）

**STUB 特性**（未来迭代，当前不实现）:

- 🔲 **二步放置交互**（P2 - 未来迭代）
  - ExtrusionGizmo（端面拖拽手柄 + 尺寸标注）
  - TwoStepPlacementController（定位 → 设置长度）
  - LengthInputOverlay（浮动数值输入）
  - AxisConstraint（沿轴向约束拖拽）
  - 预计工作量：4-5 天
  - 详细设计：见 doc/\_temp/ParametricGeometryGeneration.md

- 🔲 Slider 滑块输入（快速调整）
- 🔲 UnitInput 单位转换（mm/cm/m）
- 🔲 参数依赖关系处理（如宽度变化时高度联动）

**待讨论问题**:

- [ ] 参数验证失败时的用户反馈方式？（Toast vs 行内错误提示）
- [ ] 是否需要"撤销"按钮恢复修改？（Ctrl+Z vs 对话框取消）
- [ ] 实时预览 vs 确认后更新？（性能考量）

---

### 6. 实现 ProfileInstanceStrategy（真实型材生成）

**状态**: ✅ 已完成

**优先级**: P1（高优先级）

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

### 9. 加工操作实现

**状态**: ⏳ 待执行

**优先级**: P1（高优先级）

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

### 13. 锚点与约束系统

**状态**: 🚧 进行中 (Phase 1-5 完成 ✅)

**优先级**: P1（高优先级）

**描述**: 实现 CAD 级别的锚点系统和约束系统，支持精确建模和智能对齐。

**背景**:

专业 CAD/建模工具的核心功能之一是锚点（Anchor Point）和约束（Constraint）系统。没有这些功能，用户只能手动精确定位对象，体验极差。本系统将提供：

- 自动识别关键锚点（端点、中点、中心等）
- 智能吸附（Snapping）功能
- 对象间约束关系管理
- 可视化对齐辅助

**核心功能**:

1. **锚点系统（Anchor System）**
   - 自动锚点：端点、中点、中心点、四分点
   - 几何锚点：面中心、边中点、顶点
   - 自定义锚点：用户定义的特殊位置
   - 锚点可视化：悬停时显示锚点标记

2. **吸附功能（Snapping）**
   - 锚点吸附：移动对象时自动吸附到附近锚点
   - 网格吸附：按照固定网格间距吸附
   - 角度吸附：旋转时按固定角度增量吸附
   - 距离吸附：保持固定距离关系
   - 吸附阈值配置：可调整吸附敏感度

3. **约束系统（Constraint System）**
   - 距离约束：固定两个对象间的距离
   - 角度约束：固定两个对象间的角度
   - 对齐约束：平行、垂直、共线、共面
   - 同心约束：两个对象共享中心点
   - 约束可视化：显示约束关系和尺寸标注

4. **对齐辅助（Alignment Guides）**
   - 智能辅助线：拖动时显示对齐参考线
   - 距离标注：实时显示对象间距离
   - 角度标注：实时显示旋转角度
   - 多对象对齐：批量对齐选中的对象

5. **约束求解器（Constraint Solver）**
   - 自动计算满足约束的位置和姿态
   - 冲突检测：识别相互冲突的约束
   - 优先级管理：处理约束优先级

**技术方案**:

```typescript
// 锚点定义
interface AnchorPoint {
  id: string;
  type: 'vertex' | 'edge-midpoint' | 'face-center' | 'object-center' | 'custom';
  position: Vector3;
  normal?: Vector3; // 法向量（用于面锚点）
  objectId: string;
  metadata?: Record<string, unknown>;
}

// 约束定义
interface Constraint {
  id: string;
  type: 'distance' | 'angle' | 'parallel' | 'perpendicular' | 'concentric';
  objects: string[]; // 涉及的对象ID
  parameters: {
    distance?: number;
    angle?: number;
    axis?: Vector3;
  };
  priority: number; // 约束优先级
  enabled: boolean;
}

// 吸附配置
interface SnappingConfig {
  enabled: boolean;
  anchorSnap: boolean;
  gridSnap: boolean;
  angleSnap: boolean;
  snapThreshold: number; // 像素阈值
  gridSize: number;
  angleIncrement: number; // 度数
}

// 核心服务
class AnchorService {
  // 从对象提取锚点
  extractAnchors(object: SceneObject): AnchorPoint[];

  // 查找附近的锚点
  findNearbyAnchors(position: Vector3, threshold: number): AnchorPoint[];

  // 计算吸附位置
  calculateSnapPosition(position: Vector3, config: SnappingConfig): Vector3;
}

class ConstraintService {
  // 添加约束
  addConstraint(constraint: Constraint): void;

  // 求解约束
  solve(): boolean;

  // 验证约束
  validate(): ConstraintValidationResult;
}
```

**任务列表**:

**Phase 1: 锚点系统基础** ✅ 完成

- [x] 设计锚点数据结构和接口
- [x] 实现 AnchorService 核心服务
- [x] 实现锚点提取算法（端点、中点、中心）
- [ ] 实现锚点可视化组件（3D标记）
- [ ] 集成到 ThreeRenderer

**Phase 2: 吸附功能** ⏳ 部分完成

- [x] 实现锚点吸附算法
- [ ] 实现网格吸附功能
- [ ] 实现角度吸附功能
- [ ] 添加吸附配置界面
- [ ] 集成到 TransformControls 交互

**Phase 3: 约束系统** ✅ 完成

- [x] 设计约束数据结构
- [x] 实现 ConstraintService 核心服务
- [x] 实现距离约束
- [x] 实现角度约束
- [x] 实现对齐约束（平行、垂直）
- [x] 实现约束求解器（基础版本）

**Phase 4: 可视化辅助** ⏳ 待执行

- [ ] 实现智能辅助线渲染
- [ ] 实现距离标注显示
- [ ] 实现角度标注显示
- [ ] 实现约束关系可视化
- [ ] 添加对齐工具栏

**Phase 5: Features 层集成** ✅ 完成

- [x] 实现 AnchorManager Facade
- [x] 实现 ConstraintManager Facade
- [x] EventBus 集成（Core → Features）
- [x] 编写集成测试
- [ ] 实现 UI 组件（AssemblyPanel, ConstraintInspector）

**Phase 6: 高级功能** ⏳ 待执行

- [ ] 优化约束求解器性能
- [x] 实现约束冲突检测
- [x] 添加约束优先级管理
- [ ] 实现批量对齐工具
- [ ] 添加吸附音效和触觉反馈

**实现进度**:

- ✅ **Geometry Abstraction Layer** (12 tests)
  - core/geometry/types.ts - IShape, ICurve, MaterialProperties
  - core/geometry/SVGPathParser.ts - 320 lines, renderer-independent
  - core/renderer/threejs/adapters/ThreeGeometryAdapter.ts - IShape→THREE.Shape
  - core/renderer/threejs/adapters/ThreeMaterialFactory.ts - MaterialProperties→THREE.Material

- ✅ **Anchor System** (11 tests)
  - core/anchor/types.ts - AnchorType, AnchorPoint interface
  - core/anchor/AnchorService.ts - Map-based storage, callback pattern
  - Methods: generateAnchors, findNearestAnchor, findAnchorsInRadius, updateAnchorsAfterTransform

- ✅ **Constraint System** (16 tests)
  - core/constraint/types.ts - 6 constraint types (fixed-joint, point-to-point, axis-align, sliding-joint, angle, distance)
  - core/constraint/ConstraintService.ts - Priority-based solving, conflict detection
  - Methods: addConstraint, removeConstraint, solveConstraints, validateConstraint

- ✅ **Features Layer Integration** (15 tests)
  - features/designer/services/AnchorManager.ts - Facade + EventBus integration
  - features/designer/services/ConstraintManager.ts - Facade + Observer pattern
  - EventBus events: state:anchor:_, state:constraint:_, command:assembly:\*

**测试覆盖**: 54/72 tests passing (75% complete)

**任务列表**:

- [ ] 实现智能辅助线渲染
- [ ] 实现距离标注显示
- [ ] 实现角度标注显示
- [ ] 实现约束关系可视化
- [ ] 添加对齐工具栏

**Phase 5: 高级功能**

- [ ] 优化约束求解器性能
- [ ] 实现约束冲突检测
- [ ] 添加约束优先级管理
- [ ] 实现批量对齐工具
- [ ] 添加吸附音效和触觉反馈

**参考案例**:

- [Blender Snapping](https://docs.blender.org/manual/en/latest/editors/3dview/controls/snapping.html) - 强大的吸附系统
- [SketchUp Inference Engine](https://help.sketchup.com/en/article/3000124) - 智能推理引擎
- [Fusion 360 Constraints](https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-F2D8C97B-D99F-4F1D-9B6E-7F7E8F8F8F8F) - 约束系统
- [FreeCAD Sketcher](https://wiki.freecad.org/Sketcher_Workbench) - 参数化约束

**技术依赖**:

- Three.js - 3D 渲染和几何计算
- 线性代数库 - 约束求解（可选：使用现有的求解器库）
- EventBus - 锚点和约束事件通知

**前置条件**:

- TransformControls 系统已实现（任务3 ✅）
- 真实3D对象生成（任务5，同步开发）

**参考文档**: [CoreArchitecture.md](./doc/design/CoreArchitecture.md)、[RenderingSystem.md](./doc/design/RenderingSystem.md)

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
