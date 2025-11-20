# 测试计划

**最后更新**: 2025-11-21  
**文档位置**: `doc/guides/Testing.md`

> **相关文档**:
>
> - [架构总览](../Architecture.md) - 第 7 章：测试策略
> - [工作流规范](./Workflow.md) - 测试流程要求
> - [文档中心](../README.md) - 完整文档导航

---

## 1. 测试策略

### 1.1 测试金字塔

```
        /\
       /E2E\         少量端到端测试（关键用户流程）
      /------\
     /  集成  \       中等数量集成测试（模块协作）
    /----------\
   /   单元测试  \    大量单元测试（核心逻辑）
  /--------------\
```

**比例目标**：单元测试 70% / 集成测试 20% / E2E 测试 10%

### 1.2 测试优先级

| 优先级 | 测试范围                                    | 覆盖率目标 |
| ------ | ------------------------------------------- | ---------- |
| P0     | 核心业务逻辑（ObjectManager、AssetService） | 90%+       |
| P1     | 事件系统、状态管理                          | 80%+       |
| P2     | UI 组件、工具函数                           | 70%+       |
| P3     | 边缘场景、UI 交互细节                       | 60%+       |

**总体目标**：代码覆盖率达到 **75%**

---

## 2. 单元测试计划

### 2.1 测试框架

- **框架**：Vitest（与 Vite 原生集成，性能优异）
- **断言库**：Vitest 内置（兼容 Jest API）
- **Mock 工具**：Vitest vi
- **覆盖率**：c8/istanbul

### 2.2 核心模块测试清单

#### 2.2.1 Core/Object 模块

**ObjectManager**（`src/core/object/ObjectManager.ts`）

- ✅ P0 - 创建对象
- ✅ P0 - 删除对象
- ✅ P0 - 更新对象属性
- ✅ P0 - 查询对象（按 ID、类型）
- ✅ P0 - 策略注册与调用
- ✅ P1 - 事件发布验证
- ⚠️ P2 - 错误处理（无效 ID、重复 ID）

**ModelFactory**（`src/core/object/ModelFactory.ts`）

- ✅ P0 - 策略注册
- ✅ P0 - 根据 AssetType 选择策略
- ⚠️ P1 - 未注册类型错误处理

**SceneIO**（`src/core/object/SceneIO.ts`）

- ✅ P0 - 序列化场景数据
- ✅ P0 - 反序列化场景数据
- ⚠️ P1 - 版本兼容性验证
- ⚠️ P2 - 损坏数据处理

#### 2.2.2 Core/Asset 模块

**AssetRegistry**（`src/core/asset/AssetRegistry.ts`）

- ✅ P0 - 注册 Asset
- ✅ P0 - 查询 Asset（按 ID、类型）
- ✅ P0 - 批量注册
- ⚠️ P1 - 重复 ID 验证

**AssetService**（`src/core/asset/AssetService.ts`）

- ✅ P0 - 加载本地 Asset 数据
- ✅ P0 - 按类型分组
- ⚠️ P1 - 数据格式验证

#### 2.2.3 Core/Renderer 模块

**RaycasterService**（`src/core/renderer/threejs/RaycasterService.ts`）

- ✅ P0 - NDC 坐标转射线
- ✅ P0 - 场景对象相交检测
- ✅ P0 - 工作平面相交计算
- ⚠️ P2 - 边界情况（相机为 null、空场景）

**PreviewManager**（`src/core/renderer/threejs/PreviewManager.ts`）

- ✅ P1 - 创建预览对象
- ✅ P1 - 更新预览位置
- ✅ P1 - 清除预览
- ⚠️ P2 - 材质正确应用

#### 2.2.4 Services 模块

**eventBus**（`src/core/services/eventBus.ts`）

- ✅ P0 - 订阅事件
- ✅ P0 - 发布事件
- ✅ P0 - 取消订阅
- ✅ P1 - 多订阅者通知
- ⚠️ P2 - 事件参数类型验证

**queryService**（`src/core/services/queryService.ts`）

- ✅ P1 - 按条件过滤对象
- ✅ P1 - 按类型查询
- ⚠️ P2 - 复杂查询组合

**storage**（`src/core/services/storage.ts`）

- ✅ P0 - 保存数据到 localStorage
- ✅ P0 - 读取数据
- ✅ P0 - 删除数据
- ⚠️ P1 - 存储空间不足处理
- ⚠️ P2 - 数据损坏恢复

#### 2.2.5 Feature/Designer 模块

**ModelCreationService**（`src/features/designer/services/ModelCreationService.ts`）

- ✅ P0 - 创建型材
- ✅ P0 - 参数验证
- ⚠️ P1 - 默认参数应用
- ⚠️ P2 - 创建失败回滚

**ModelEditorService**（`src/features/designer/services/ModelEditorService.ts`）

- ✅ P0 - 更新对象属性
- ✅ P0 - 删除对象
- ⚠️ P1 - 批量操作
- ⚠️ P2 - 撤销/重做（如已实现）

**AutoSaveService**（`src/features/designer/services/AutoSaveService.ts`）

- ✅ P0 - 防抖保存
- ✅ P0 - 三层持久化逻辑
- ✅ P1 - 状态通知（saving/saved/error）
- ⚠️ P2 - 保存失败重试

---

## 3. 组件测试计划

### 3.1 测试框架

- **框架**：Vitest + React Testing Library
- **工具**：`@testing-library/user-event`（用户交互模拟）

### 3.2 组件测试清单

#### 3.2.1 通用组件（src/components）

**Button 组件**

- ✅ P1 - 渲染正确文本
- ✅ P1 - 点击事件触发
- ✅ P1 - disabled 状态
- ⚠️ P2 - 不同变体样式

**Popover 组件**

- ✅ P1 - 打开/关闭
- ✅ P1 - 定位正确
- ✅ P1 - 点击外部关闭
- ⚠️ P2 - 键盘导航（ESC 关闭）

**Toolbar 组件**

- ✅ P1 - 渲染工具按钮
- ✅ P1 - 按钮点击事件
- ⚠️ P2 - 动态加载型材数据

#### 3.2.2 Designer 功能组件

**ObjectList**

- ✅ P1 - 渲染对象列表
- ✅ P1 - 选中对象高亮
- ✅ P1 - 删除按钮触发事件
- ⚠️ P2 - 空列表提示

**PropertyPanel**

- ✅ P1 - 显示对象属性
- ✅ P1 - 属性编辑触发更新
- ⚠️ P2 - 多选对象显示

**AutoSaveIndicator**

- ✅ P1 - 显示保存状态
- ✅ P1 - 自动隐藏逻辑
- ⚠️ P2 - 错误状态显示

---

## 4. 集成测试计划

### 4.1 测试范围

集成测试验证多个模块协同工作的场景。

### 4.2 测试场景

#### 4.2.1 对象创建流程

1. Toolbar 点击型材 → 发布命令
2. PlacementController 接收命令 → 进入放置模式
3. 用户点击确认 → ModelCreationService 创建对象
4. ObjectManager 添加对象 → 发布事件
5. UI 更新列表 + 3D 场景渲染

**验证点**：

- ✅ 命令正确传递
- ✅ 状态正确更新
- ✅ 对象正确创建
- ✅ UI 正确响应

#### 4.2.2 对象编辑流程

1. PropertyPanel 修改属性
2. ModelEditorService 更新对象
3. ObjectManager 触发更新事件
4. 3D 场景重新渲染

**验证点**：

- ✅ 属性正确更新
- ✅ 事件正确发布
- ✅ 渲染正确同步

#### 4.2.3 自动保存流程

1. 对象创建/修改触发脏标记
2. AutoSaveService 防抖定时器触发
3. 数据保存到 localStorage
4. UI 显示保存状态

**验证点**：

- ✅ 防抖逻辑正确
- ✅ 数据正确持久化
- ✅ 状态指示器正确更新

#### 4.2.4 路由切换数据保持

1. DesignerPage 创建对象
2. 切换到 LibraryPage
3. 返回 DesignerPage
4. 对象仍存在且可交互

**验证点**：

- ✅ 数据正确保存
- ✅ 数据正确恢复
- ✅ 渲染正确同步

---

## 5. E2E 测试计划

### 5.1 测试框架

- **框架**：Playwright（跨浏览器支持）
- **浏览器**：Chromium、Firefox、WebKit
- **视口**：桌面（1920x1080）、平板（768x1024）

### 5.2 关键用户流程

#### 5.2.1 型材创建流程（P0）

**步骤**：

1. 打开设计器页面
2. 点击 Toolbar 中的型材
3. 在 3D 场景中移动鼠标
4. 点击确认放置
5. 验证对象列表中出现新对象
6. 验证 3D 场景中显示物体

**断言**：

- 预览正确显示
- 对象创建成功
- 列表同步更新

#### 5.2.2 对象编辑流程（P0）

**步骤**：

1. 创建型材对象
2. 在对象列表中点击选中
3. 在 PropertyPanel 修改长度
4. 验证 3D 场景中物体更新
5. 刷新页面验证持久化

**断言**：

- 属性编辑生效
- 视觉正确更新
- 数据持久化成功

#### 5.2.3 自动保存验证（P1）

**步骤**：

1. 创建对象
2. 等待 2 秒（防抖时间）
3. 验证 AutoSaveIndicator 显示"已保存"
4. 刷新页面
5. 验证对象仍存在

**断言**：

- 自动保存触发
- UI 状态正确
- 数据恢复正确

#### 5.2.4 路由切换流程（P1）

**步骤**：

1. 在 DesignerPage 创建对象
2. 切换到 LibraryPage
3. 返回 DesignerPage
4. 验证对象仍存在
5. 验证可正常编辑

**断言**：

- 数据保持
- 状态恢复
- 功能正常

#### 5.2.5 多对象操作（P2）

**步骤**：

1. 创建 3 个型材
2. 在列表中选择第 2 个
3. 删除选中对象
4. 验证列表更新
5. 验证 3D 场景更新

**断言**：

- 多对象管理
- 删除正确
- UI 同步

---

## 6. 测试环境

### 6.1 本地开发环境

- **Node.js**：v20.x
- **浏览器**：Chrome 最新版
- **运行命令**：
  - `npm run test` - 运行所有测试
  - `npm run test:unit` - 仅单元测试
  - `npm run test:e2e` - 仅 E2E 测试
  - `npm run test:coverage` - 生成覆盖率报告

### 6.2 CI 环境（GitHub Actions）

- **触发条件**：
  - 所有 Pull Request
  - main 分支推送
  - 手动触发（workflow_dispatch）

- **测试矩阵**：
  - Node.js 20.x
  - Playwright 浏览器：Chromium、Firefox

- **工件输出**：
  - 覆盖率报告（HTML）
  - E2E 测试截图/视频（失败时）
  - 测试结果汇总

---

## 7. 测试规范

### 7.1 命名约定

- **单元测试**：`<模块名>.test.ts` 或 `<组件名>.test.tsx`
- **集成测试**：`<功能名>.integration.test.ts`
- **E2E 测试**：`<流程名>.spec.ts`

### 7.2 测试结构

```typescript
describe('模块/组件名', () => {
  describe('功能描述', () => {
    it('应该执行预期行为', () => {
      // Arrange - 准备
      // Act - 执行
      // Assert - 断言
    });
  });
});
```

### 7.3 Mock 策略

- **单元测试**：Mock 所有外部依赖
- **集成测试**：仅 Mock 边界依赖（如网络请求、浏览器 API）
- **E2E 测试**：不使用 Mock

### 7.4 测试数据

- **Fixture**：在 `src/__tests__/fixtures/` 目录下
- **工厂函数**：`src/__tests__/factories/` - 生成测试数据
- **Mock 数据**：`src/__tests__/mocks/` - Mock 实现

---

## 8. 覆盖率目标

### 8.1 模块级目标

| 模块              | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 | 行覆盖率 |
| ----------------- | ---------- | ---------- | ---------- | -------- |
| core/object       | 90%        | 85%        | 90%        | 90%      |
| core/asset        | 85%        | 80%        | 85%        | 85%      |
| core/renderer     | 75%        | 70%        | 75%        | 75%      |
| core/services     | 85%        | 80%        | 85%        | 85%      |
| features/designer | 80%        | 75%        | 80%        | 80%      |
| components        | 70%        | 65%        | 70%        | 70%      |

### 8.2 项目整体目标

- **语句覆盖率**：75%+
- **分支覆盖率**：70%+
- **函数覆盖率**：75%+
- **行覆盖率**：75%+

---

## 9. 实施优先级

### 第一阶段（本次任务）

- ✅ 配置测试框架
- ✅ 创建示例测试
- ✅ 配置 CI 工作流
- ✅ 建立测试基础设施

### 第二阶段（后续任务）

- ⏳ 编写核心模块单元测试（P0）
- ⏳ 编写关键流程集成测试
- ⏳ 编写主要 E2E 测试

### 第三阶段（持续优化）

- ⏳ 提升覆盖率至目标水平
- ⏳ 补充边缘场景测试
- ⏳ 性能测试
- ⏳ 可访问性测试

---

## 10. 维护与更新

- **测试审查**：所有 PR 必须包含相应测试
- **覆盖率监控**：CI 失败条件 - 覆盖率下降超过 2%
- **定期审查**：每月检查失效测试和维护成本
- **文档同步**：测试计划随功能变更更新

---

**维护说明**：本文档应随测试体系演进持续更新，新增测试场景、调整覆盖率目标等变更应及时反映。
