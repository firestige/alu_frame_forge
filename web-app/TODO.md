# 铝型材框架设计器 - 待办事项

**最后更新**: 2025-11-17

> **说明**：已完成任务（#1-10）的详细历史记录请参考 [开发日志](./doc/DevelopLog.md)

---

## P0 - 最高优先级（立即执行）

_当前无 P0 任务_

---

## P1 - 高优先级（本周完成）

当前聚焦任务：3D 交互基础能力（详见任务 19-22）。

---

### 19. 实现 3D 视角控制

**状态**: ⏳ 待执行

**描述**: 实现标准的 3D 视角控制，支持旋转、平移、缩放。

**技术方案**: 使用 Three.js OrbitControls

**任务列表**:

- [ ] 集成 OrbitControls 到 ThreeRenderer
- [ ] 配置控制参数（旋转速度、缩放范围等）
- [ ] 添加视角预设（正视图、侧视图、俯视图、等轴测）
- [ ] 添加"重置视角"功能
- [ ] 键盘快捷键支持

---

### 20. 实现对象选中功能

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

---

### 21. 实现对象移动和旋转

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

---

### 22. 实现右键上下文菜单

**状态**: ⏳ 待执行

**描述**: 在 3D 场景和对象列表中实现右键菜单。

**技术方案**: 使用已有的 Popover 组件

**任务列表**:

- [ ] 实现场景右键菜单（创建对象、视角控制等）
- [ ] 实现对象右键菜单（删除、复制、隐藏等）
- [ ] 实现对象列表项右键菜单
- [ ] 集成到 DesignerPageUI
- [ ] 添加快捷键提示

---

## P3 - 低优先级（长期规划）

### 11. 实现 ProfileInstanceStrategy（真实型材生成）

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
````

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
