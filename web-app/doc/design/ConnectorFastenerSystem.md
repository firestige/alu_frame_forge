# 连接件与紧固件系统设计

**状态**: 草稿

**最后更新**: 2025-12-16  
**维护者**: AI Copilot

---

## 1. 目标与定位

连接件/紧固件子系统提供验证「型材 + 连接件 + 紧固件」闭环所需的最小骨架，用于打通锚点与约束系统的最后阶段。

**核心目标**：

1. 定义严格的数据契约（视觉/功能分离、STUB 精度规则）。
2. 提供可在场景图中实例化的策略骨架，并向既有服务暴露锚点几何。
3. 给出示例资产（2020 系列 L 型角件、M5×20 螺栓）及验证场景，证明求解器可锁定真实装配。
4. 建立覆盖锚点提取、约束求解、视觉/计算一致性的测试矩阵。

---

## 2. 范围与非目标

| 范围内事项                                                    | 范围外事项                                |
| ------------------------------------------------------------- | ----------------------------------------- |
| `ConnectorAssetV2` / `FastenerAssetV2` 及其依赖类型的数据契约 | 连接件/紧固件 UI 编辑工具                 |
| 实例化策略骨架（仅使用基础几何体）                            | 高模 CAD 网格或制造导出                   |
| STUB 规范与首批样例资产                                       | 完整的连接件目录                          |
| 验证场景及期望求解器行为                                      | Gizmo / 可视化层（Task #13 Phase 6 负责） |

---

## 3. 分层架构概览

```
┌──────────────────────────────────────────────┐
│ UI Layer (DesignerPage, AssemblyPanel TBD)   │
│  - Issues creation commands (command:asset:add)
│  - Displays scene state                                      │
└────────────────────┬─────────────────────────┘
                     │ commands/events
┌────────────────────┴─────────────────────────┐
│ Features Layer                                 │
│  - ObjectManager, AssetService facades         │
│  - AnchorManager & ConstraintManager           │
│  - ModelFactory (strategy registry)            │
└────────────────────┬─────────────────────────┘
                     │ strategy resolution
┌────────────────────┴─────────────────────────┐
│ Core Layer                                       │
│  - Connector/Fastener Instance Strategies        │
│  - Asset definitions + registries                │
│  - Anchor/Constraint Services                    │
└────────────────────┬─────────────────────────┘
                     │ visual primitives / compute metadata
┌────────────────────┴─────────────────────────┐
│ Renderer Layer (ThreeRenderer implementation)   │
│  - Consumes visual primitives from strategies   │
│  - Renders gizmos once Task #13 Phase 6 resumes  │
└──────────────────────────────────────────────┘
```

关键原则：

- **视觉 / 功能分离**：视觉模型仅由简化 primitives 组成；功能模型保存孔、接触面、滑槽、螺纹轴等权威位姿，供计算层消费。
- **统一使用 V2 资产**：仅保留双模型体系的 `ConnectorAssetV2` / `FastenerAssetV2`，不再维护旧版本。
- **策略注册**：通过 `ModelFactory` 注册，沿用 `ProfileInstanceStrategy` 的扩展机制。

---

## 4. 数据契约

### 4.1 连接件资产族

- `ConnectorAssetV2`
  - 身份：id、name、connectorType、compatibleSeries[]、material
  - `visual`: `ConnectorVisualModel`
    - `type`: `"simplified" | "customMesh"`（MVP 仅使用 simplified）
    - `simplified.primitives[]`: 带局部变换的 box / cylinder / plate 描述
  - `functional`: `ConnectorFunctionalData`
    - `contactFaces[]`: 位置 + 法向 + 尺寸，用于面面约束
    - `holes[]`: 参见 `ConnectorHole`
    - `slides[]`: （可选）滑槽定义
    - `mass`, `centerOfMass`

- `ConnectorHole`
  - id、role（`PROFILE_ATTACHMENT`、`FASTENER_PASS_THROUGH` 等）
  - localPosition（Vector3, mm）
  - axis（Vector3）
  - diameter
  - depth（通孔为负值）
  - `threadSpec?`
  - reference anchors（暴露给 AnchorService）

- `ContactFace`
  - id、平面法向、基准点、宽高、配合规则（如 "mate:profile-end"）

### 4.2 紧固件资产族

- `FastenerAssetV2`
  - 身份：id、name、fastenerType（bolt/nut/screw/t-nut）
  - `visual`: 简化 primitives（杆体圆柱 + 头部棱柱）
  - `functional`
    - `threadSpec`: `ThreadSpec`（标准、螺距、名义直径、公差）
    - `length`, `headHeight`, `headWidth`
    - `passThroughDiameter`
    - `engagementDepth`

- `ThreadSpec`
  - 标准（ISO、UNC 等）、标识（"M5"）、螺距、公差等级

### 4.3 STUB 数据规范

- 文件命名：`src/data/connectors/{slug}.stub.ts`、`src/data/fasteners/{slug}.stub.ts`
- 头部注释：`/** 🔴 STUB DATA - 精度 ±2mm，待替换为真实规格 */`
- 视觉 primitives 使用中心坐标系（mm）
- 功能数据需注明测量来源（示例：「假设距边缘 5mm，参考 80/20 #4112 数据表」）

### 4.4 紧固件规格目录与视觉策略（新增决策）

- **只支持预置标准件**：紧固件全部来源于内建规格目录，按照 `标准 + 尺寸代码 + 材质` 组合（如 `ISO4014-M5x20-8.8`）。不开放用户上传模型，避免校验和兼容性负担。
- **Catalog 数据结构**：
  ```ts
  interface FastenerSpecCatalogEntry {
    key: 'ISO4014-M5x20-8.8';
    standard: 'ISO4014';
    sizeCode: 'M5';
    length: 20;
    headType: 'hex' | 'socket' | 'slotted' | 'phillips' | 'torx';
    headWidth: number; // across flats or diameter
    headHeight: number;
    shankDiameter: number;
    threadPitch: number;
    threadLength: number;
    driveType?: 'hex' | 'slot' | 'cross' | 'torx';
    tolerance: { length: number; diameter: number };
  }
  ```
- **FastenerAssetV2 扩展**：资产引用 catalog entry (`specKey`) 并补充兼容性语义，如 `compatibleProfiles`, `recommendedConnectorFamilies`, `material`, `finish`。资产层生成视觉 primitives 与 `functional` 字段（`threadSpec`, `clampRange`, `torqueRecommendations`）。
- **视觉表现原则**：视觉模型只需帮助用户辨识头型与驱动方式，使用 box/cylinder/凹槽 primitives 组合即可（例如内六角=圆柱头 + 六边形凹槽，一字/十字=在头面上减 boolean 体，T 型螺帽=扁平盒体 + 导向突起）。目标精度 ±10%，追求形态可辨而非尺寸严丝合缝。
- **Compute 层准确性**：`SceneObject.compute.fastener` 保存来自 catalog 的真实尺寸（螺杆直径、螺纹有效长、头部包络、threadAxis、clampRange、torqueLimit 等），供 AnchorService、ConstraintManager、未来干涉/FEA 使用。Visual 与 Compute 相互独立：即便视觉简化，也能依赖 compute 数据完成高精度分析。
- **扩展路径**：当需要更高保真视觉或仿真数据时，只需追加新的 catalog 字段（如 `headProfileVertices`、`preloadForce`）。策略与文档保持双模型接口不变。

### 4.5 连接件规格策略与定制扩展

- **双轨模型**：
  1. **标准库轨道**：与紧固件类似，维护 `ConnectorSpecCatalogEntry`（示例字段：`id`, `family`, `profileSeries`, `wings`, `thickness`, `holePattern`, `supportedFasteners`, `mass`）。资产层引用 catalog 并生成 primitives + 功能数据，适合 L 型角件、三维角码、端面连接块等常见部件。
  2. **参数化定制轨道**：对于“在标准基础上微调孔距/翼长/开槽”的需求，提供受控参数模板。用户通过 UI 只输入若干标量，由系统重新生成 visual/compute 数据，确保锚点与质量属性仍可推导。
- **完全自定义导入（Future）**：考虑到后续要实现干涉检测、辅助装配和 FEA，必须在早期定义导入要求：
  - 允许上传轻量化几何（GLB/STEP → 预处理）但必须附带结构化 metadata：`contactFaces`, `holes`, `slides`, `massProperties`。没有这些数据的模型无法参与锚点/约束求解。
  - 导入流程需提供质量校验（法向统一、孔径范围、兼容紧固件列表）。文档需描述最小可行字段，以便未来实现时直接复用。
- **短期实现策略**：当前迭代暂不实现自由导入，但 `ConnectorAsset.functional` 与 `SceneObject.compute.connector` 已按可扩展 Schema 设计（数组形式 + 可选字段）。新增导入方式只需按照 Schema 写入对应数据即可，不影响现有标准件。
- **视觉/功能关系**：即使视觉层是“占位符”，Compute 层必须保持准确，才能在未来切换到干涉检测和辅助装配模式。标准与定制轨道共用同一 Compute Schema，避免后续做迁移。
- **导入流程决策**：未来若开放自定义连接件导入，新增的只是一个“数据转换组件”：负责解析用户几何/元数据 → 产出符合 `ConnectorAssetV2` Schema 的 `visual.primitives` 与 `functional`（孔、面、massProperties 等）。转换成功后直接走既有 AssetRegistry / ModelFactory / Strategy / AnchorService 流程，无需重写核心层。

---

## 5. 与双模型体系的衔接

参考 [Architecture.md](../Architecture.md#35-双模型系统) 与 [Model-vs-SceneObject-Analysis.md](../_archive/Model-vs-SceneObject-Analysis.md) 的定义，连接件 / 紧固件策略必须一次性产出 `SceneObject.visual` 与 `SceneObject.compute` 两个分层模型。

### 5.1 VisualModel 生成规范

- 仅使用 `visual.primitives` 描述的 box/cylinder 组合，策略在实例化时将其转换为抽象 `GeometryData`，再交由 `RenderSyncService` 与 `IRenderer` 创建 Mesh。
- `SceneObject.visual.mesh` 始终由 RenderSyncService 填充，策略只负责返回 primitives + 局部变换矩阵；禁止直接 new THREE.Mesh。
- LOD：若 future 版本支持 `visual.lodLevel`，策略需将不同精度 primitives 存入 `visual.lods[]`，但 MVP 仅维护单一分辨率。

### 5.2 ComputeModel 承载信息

- `SceneObject.compute.connector` / `.fastener` 使用如下结构：
  ```ts
  interface ConnectorComputeModel extends ComputeModel {
    connector: {
      holes: ConnectorHoleCompute[];
      contactFaces: ContactFaceCompute[];
      slides?: SlideChannel[];
      mass: number;
    };
  }
  ```
- 所有功能数据（孔位、法向、螺纹轴、滑槽）以 **局部坐标** 存储在 compute 层，AnchorService 在注册时通过 `Transform` 转换到世界空间。
- `FastenerComputeModel` 必须暴露 `threadAxis`, `clampLength`, `headClearanceVolume` 等字段，供未来结构分析或防碰撞算法使用，即使当前仅作为占位。

### 5.3 与 Anchor/Constraint 服务的接口

- 策略实例化后调用 `AnchorService.registerFromSceneObject(sceneObject)`：
  - 读取 `compute.connector.holes` → 生成 `HoleAnchor`（用于点/轴约束）。
  - 读取 `compute.connector.contactFaces` → 生成 `FaceAnchor`（用于面贴合）。
  - Fastener 轴线可注册为 `AxisAnchor`，允许校验螺栓与孔的同轴度。
- ConstraintManager 不感知视觉模型，只消费 `anchorId` + `SceneObject.compute` 提供的几何元数据，保持与既有 Profile 流程一致。

### 5.4 与 RenderSyncService 的职责分界

- 策略返回 `visual.primitives` + `materialHints`，ObjectManager 创建 `SceneObject` 后触发 `object:added`。
- RenderSyncService 监听该事件，读取 primitives -> 构造 Mesh -> 填写 `SceneObject.visual.mesh` 并添加到场景。
- compute 信息完全不经过渲染层，避免 Three.js 类型泄漏，实现真正的视觉/功能分离。

---

## 6. 数据流与调用链

### 5.1 资产注册

1. STUB module exports `ConnectorAssetV2`/`FastenerAssetV2` objects.
2. AssetService `loadBuiltinAssets()` (or dedicated `loadConnectorAssets()`) registers them into `AssetRegistry`.
3. Library UI queries AssetService to display new assets.

### 5.2 场景实例化

1. User drags L-bracket asset from Library → Designer canvas.
2. `command:model:create` triggers ModelFactory.
3. ModelFactory selects `ConnectorInstanceStrategy` via `canHandle(asset)`.
4. Strategy responsibilities:
   - Build visual Group using `visual.primitives` (box & cylinder meshes)
   - Populate `SceneObject.compute.connector` (functional data snapshot)
   - Generate anchor definitions for each hole/contact face (passed to AnchorService)
   - Emit metadata for ConstraintManager (hole ids, slide ids)
5. ObjectManager stores the `SceneObject`. RenderSyncService syncs the visual mesh into ThreeRenderer.

### 5.3 锚点与约束管线

```
ConnectorInstanceStrategy -> AnchorService.generateAnchors(sceneObject)
                           -> anchors stored in Map<objectId>
                           -> AnchorManager emits 'state:anchor:updated'
User selects anchors -> ConstraintManager.addConstraint()
                      -> ConstraintService (existing solver) consumes functional geometry
```

### 5.4 紧固件流程

- Fastener assets primarily serve visualization + traceability but still expose functional dimensions (thread axis, head clearance).
- When assembly logic adds a fastener:
  1. Strategy instantiates simple shaft/head geometry.
  2. Provides compute metadata (thread axis, clamping length) for future structural calculations.
  3. Optional anchors (tip, head center) allow constraints if required (e.g., bolt-to-hole alignment validation).

---

## 7. 示例场景

### 场景 A – L 型角件直角装配

| 步骤 | 操作                                                                                  | 期望结果                                 |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | 添加 Profile A (2020) 长 500mm                                                        | 端点锚点可用                             |
| 2    | 添加 Profile B 长 300mm                                                               | 同上                                     |
| 3    | 添加 L 型角件 STUB                                                                    | SceneObject 暴露 4 个孔锚点 + 2 个面锚点 |
| 4    | 添加点对点约束：bracket.holeA1 → profileA.endBack，bracket.holeB1 → profileB.endFront | 求解器将两根型材吸附到角件               |
| 5    | 添加两颗 M5 螺栓                                                                      | 作为视觉占位，必要时校验锚点             |

Acceptance: solver resolves within tolerance, anchor queries show bracket + profiles aligned, no manual adjustments.

### 场景 B – 滑动连接预研（后续）

- Uses `slides[]` definition to align a connector channel with a profile slot.
- Not part of MVP but data contract supports it.

---

## 8. 测试策略

| 层级       | 类型     | 关注点                                                            |
| ---------- | -------- | ----------------------------------------------------------------- |
| Core       | 单测     | `generateAnchors()` 返回所有孔/面的准确位置与类型                 |
| Core       | 单测     | `SceneObject.compute` 可读取螺纹轴、长度等紧固件元数据            |
| Features   | 集成     | ModelFactory 选中正确策略，SceneObject 同时带 visual/compute 数据 |
| Features   | 集成     | AnchorManager 在实例化后立刻收到连接件锚点                        |
| Constraint | 场景测试 | 执行角件装配约束，结果 `satisfied=true` 且变换正确                |
| Rendering  | 冒烟     | 视觉 primitives 正常渲染且按对象分组                              |

Test harness can leverage existing Vitest setup with synthetic assets.

---

## 9. 验收标准

1. **数据**：连接件 / 紧固件资产暴露 Anchor/Constraint 所需的完整功能数据（孔、面、螺纹轴）。
2. **策略**：实例化同时产出简化视觉网格与 compute 载荷，且不向外泄露 Three.js 类型。
3. **锚点**：AnchorService 能自动注册连接件孔锚点并可在 UI 中选择。
4. **场景**：执行场景 A 时，两根型材可在 ±2mm 精度内与角件对齐。
5. **文档**：本文档 + TODO 足以说明流程，本迭代不覆盖额外 UI。

---

## 10. 待确认问题

1. STUB 资产长期是否单独放置到 `data/connectors/_stub`？
2. 紧固件是否默认导出锚点，还是仅在测试需求中启用？
3. `slides[]` 语义如何暴露给 ConstraintManager（新增命令或重用 axis-align）？
4. 是否需要轻量 Assembly Helper API 以脚本化场景 A？

答案并非当前骨架的阻塞，但扩充资产库前应落实。
