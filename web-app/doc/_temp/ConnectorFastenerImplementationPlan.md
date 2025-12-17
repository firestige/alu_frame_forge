# 连接件/紧固件子系统实施计划

**用途**：供本迭代及后续会话快速回溯上下文，聚焦“连接件/紧固件设计骨架”落地进度。
**关联文档**：[doc/design/ConnectorFastenerSystem.md](../design/ConnectorFastenerSystem.md)

---

## 1. 阶段划分

| 阶段              | 目标                                                                                                                    | 主要输出                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| P0 设计冻结       | 完成架构/数据决策、验收范围、测试策略                                                                                   | 已完成：设计文档、双模型衔接说明、标准 vs 定制策略          |
| P1 数据结构落地   | 在 `core/asset/types` 内新增 `ConnectorAssetV2`、`FastenerAssetV2`、`ConnectorHole`、`ContactFace`、`ThreadSpec` 等接口 | TypeScript 类型 + 单元测试草稿                              |
| P2 策略骨架       | 新增 `ConnectorInstanceStrategy`、`FastenerInstanceStrategy`（仅 primitives + compute 占位）并注册至 `ModelFactory`     | ✅ 已完成：策略类、注册代码、最小 smoke test                |
| P3 STUB & Catalog | 建立 `src/data/connectors/*`、`src/data/fasteners/*` STUB 资产；导入 `fastenerSpecCatalog`、`connectorSpecCatalog`      | ✅ 已完成：2020 L 型角件、ISO4014 M5×16/M5×20；文档示例同步 |
| P4 锚点/约束联调  | AnchorService 识别连接件孔/面锚点；编写示例场景脚本验证约束求解                                                         | ✅ 已完成：Vitest 集成测试 + 场景 A 剧本（基础锚点验证）    |
| P5 可选扩展       | 评估参数化定制、导入转换器 PoC                                                                                          | 决策记录/Prototype                                          |

---

## 2. 详细任务清单（甘特化粒度）

### 2.1 类型与数据层

1. **定义核心类型**（`core/asset/types`）
   - `ConnectorAssetV2`, `ConnectorFunctionalData`, `ConnectorHole`, `ContactFace`, `SlideChannel`
   - `FastenerAssetV2`, `FastenerFunctionalData`, `FastenerSpecCatalogEntry`, `ThreadSpec`
   - `SceneObject.compute.connector/fastener` 扩展接口
2. **更新 AssetRegistry**
   - 支持加载 connector/fastener 资产集合
   - 校验字段（孔径、法向、compatibleSeries）
3. **编写类型级单测**
   - 使用 `tsd` 或类型守卫验证关键结构

### 2.2 策略实现

1. `ConnectorInstanceStrategy`
   - 输入：`ConnectorAssetV2`
   - 输出：`SceneObject` (visual primitives 转换 → RenderSyncService；functional → compute)
   - 调用 `AnchorService.registerFromSceneObject`
2. `FastenerInstanceStrategy`
   - 输入：`FastenerAssetV2`
   - 生成简化视觉（杆体、头部、驱动凹槽占位）
   - compute 写入 `threadAxis`, `clampRange`, `headClearanceVolume`
3. `ModelFactory` 注册 & Feature 层冒烟测试

### 2.3 Catalog & STUB

1. **目录结构**
   - `src/data/fasteners/catalog/iso4014.ts`
   - `src/data/connectors/catalog/l_brackets.ts`
2. **STUB 资产**
   - `connector.l_bracket.2020.stub.ts`
   - `fastener.iso4014.m5x20.stub.ts`
3. **加载逻辑**
   - AssetService 暴露 `loadConnectorAssets()`, `loadFastenerAssets()`

### 2.4 锚点与测试 ✅

1. **AnchorService 扩展**（已完成）
   - 新增 `CONNECTOR_HOLE`, `CONNECTOR_FACE` 锚点类型
   - 实现 `generateConnectorAnchors` 从 `ConnectorComputeData` 读取孔位/接触面
   - 局部坐标→世界坐标转换（简化版：仅平移，旋转待完善）
   - 单元测试：验证 L-bracket 生成 6 孔 + 2 面锚点
2. **Constraint 场景脚本**（已完成基础验证）
   - 场景 A（双型材 + L 角件）锚点生成与坐标转换验证
   - 测试文件：`src/core/anchor/__tests__/scenario-a.test.ts`
   - 待补充：约束求解器集成（ConstraintService 完善后）
3. **Vitest 测试**（已完成）
   - ✅ 锚点数量正确（6 孔 + 2 面）
   - ✅ 世界坐标变换正确
   - ⏳ 视觉 Mesh 创建（待 P5 RenderSyncService 集成）
   - ⏳ 约束求解收敛（待 ConstraintService）

### 2.5 未来扩展预留

1. **参数化定制模板**
   - 设计 `ConnectorParamSchema`，允许 UI 提交少量参数派生资产
2. **导入转换组件 PoC**
   - 输入：GLB + 附件 JSON
   - 输出：`ConnectorAsset`
   - 校验：metadata completeness、法向一致、孔径范围

---

## 3. 依赖与风控

| 依赖项                 | 说明                                          | 缓解策略                         |
| ---------------------- | --------------------------------------------- | -------------------------------- |
| AnchorService 当前 API | 需确认是否已有 `registerFromSceneObject` 钩子 | 若缺失则先实现基础版本并写单测   |
| Constraint Solver 精度 | 场景 A 要求 ±2mm                              | 允许临时容差参数；必要时记录缺陷 |
| 数据来源               | catalog 初期以手动录入为主                    | 先录入最小集合，后续可脚本化爬取 |

---

## 4. 交付物清单

- 设计文档（已完成）：`doc/design/ConnectorFastenerSystem.md`
- 实施计划（本文档）
- TypeScript 类型实现 + 策略类 + STUB 数据
- 示例场景脚本 & 测试报告
- 后续：导入转换器方案说明（可在 `_temp/` 继续迭代）

---

## 5. P4 完成状态

**已完成**：

- ✅ AnchorService 扩展：支持 CONNECTOR_HOLE / CONNECTOR_FACE 类型
- ✅ 连接件锚点生成：从 ConnectorComputeData 读取孔位/接触面并转换到世界坐标
- ✅ 单元测试：验证 L-bracket 生成 6 孔 + 2 面（`AnchorService.test.ts`）
- ✅ 场景 A 集成测试：双型材 + L 角件装配锚点验证（`scenario-a.test.ts`）
- ✅ 数据一致性修正：L-bracket 通孔位置、M5×16 资产补齐

**待后续**：

- ⏳ 完整矩阵变换（含旋转）实现
- ⏳ ConstraintService 集成与求解器验证
- ⏳ RenderSyncService 与视觉 Mesh 创建集成
- ⏳ P5 可选扩展（参数化定制、导入转换器 PoC）

## 6. 下一步行动

1. ~~P1：类型文件~~ ✅
2. ~~P2：策略骨架~~ ✅
3. ~~P3：STUB 数据 & catalog~~ ✅
4. ~~P4：锚点集成~~ ✅
5. **P5（可选）**：参数化定制模板 / 导入转换器 PoC / 约束求解器完善
