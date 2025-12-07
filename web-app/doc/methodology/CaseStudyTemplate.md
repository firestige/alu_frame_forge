# 案例提取模板

**最后更新**: 2025-12-07

---

## 📋 使用说明

本模板用于从 [DevelopLog.md](../DevelopLog.md) 提取典型的 Human-AI 协作案例，规范化记录协作过程和方法论洞察。

**提取原则**：

- ✅ 选择有代表性的案例（架构纠错、设计决策、问题发现）
- ✅ 记录完整的协作过程（问题 → 方案 → 纠错 → 最终方案）
- ✅ 提炼方法论洞察（可复用的经验）

**案例类型**：

- **架构纠错**：AI 输出违反架构约束，人类引导纠正
- **设计决策**：多个方案选择，人类权衡利弊做出决策
- **问题发现**：AI 发现隐藏问题或提出改进建议
- **渐进式重构**：分阶段重构，逐步改进架构

---

## 📄 案例模板

---

# 案例标题

> 用一句话描述问题或任务

## 基本信息

- **日期**: YYYY-MM-DD
- **任务编号**: #X
- **案例类型**: 架构纠错 / 设计决策 / 问题发现 / 渐进式重构
- **相关模块**: 列出涉及的模块（如 RenderingSystem, PlacementController）
- **参与者**: 人类角色 + AI 模型（如 GitHub Copilot + Claude Sonnet 4.5）

---

## 问题描述

**背景**：

- 描述任务背景或问题场景
- 说明为什么需要做这件事

**现象**：

- 具体的问题表现（如报错信息、异常行为）
- 用户影响或开发痛点

**示例代码**（如适用）：

```typescript
// 问题代码示例
```

---

## AI 行为

**初始方案**：

- AI 提出的初步设计或实现方案
- AI 的推理过程和理由

**实施过程**：

- AI 如何实现（关键代码片段）
- AI 遇到的问题或困难

**示例代码**：

```typescript
// AI 初始实现的代码
```

---

## 人类干预

**问题发现**：

- 人类如何发现 AI 输出有问题？
- 使用了什么工具或方法？（如代码审查、运行测试、分析日志）

**根因分析**：

- 问题的根本原因是什么？
- 为什么 AI 会犯这个错误？

**引导纠正**：

- 人类如何向 AI 解释问题？
- 使用了什么 Prompt 或沟通策略？

**示例 Prompt**：

> "这里违反了架构原则：Implementation 层不应该直接使用 EventBus。请改用回调函数，通过 IRenderer 接口向上报告状态。"

---

## 最终方案

**设计调整**：

- 最终采用的方案
- 与初始方案的差异

**实施细节**：

- 关键代码变更
- 架构改进

**示例代码**：

```typescript
// 最终正确的实现
```

---

## 协作洞察

### 方法论价值

**体现了什么方法论要点**：

- 这个案例展示了哪些协作原则？
- 对其他项目有什么启发？

**示例**：

- ✅ 文档化约束的重要性（ArchitecturePrompt.md 中定义的原则）
- ✅ 分阶段审查的价值（及时发现问题）
- ✅ Prompt 工程技巧（如何清晰表达架构约束）

---

### 预防措施

**如何在未来避免类似问题**：

- 更新文档（在 ArchitecturePrompt.md 添加约束）
- 改进 Prompt 模板
- 增加自动化检查

**示例**：

- [ ] 在 ArchitecturePrompt.md 添加 "Implementation 层不使用 EventBus" 约束
- [ ] 创建 ESLint 规则检测 EventBus 误用
- [ ] 更新代码审查清单

---

### Prompt 优化

**可以添加到 ArchitecturePrompt 的约束**：

- 提炼出的硬性约束
- 设计模式建议
- 常见错误模式

**示例**：

```markdown
## 通信原则（新增）

1. **UI ↔ Feature/Core**：通过 EventBus 双向通信
2. **Core Interface ↔ Implementation**：通过直接调用 + 回调函数
3. **Implementation 层不应该**：
   - ❌ 直接导入 eventBus
   - ❌ 直接发布状态事件
   - ❌ 知道业务层的事件系统
```

---

## 成果验证

**功能验证**：

- [ ] 功能测试通过
- [ ] 单元测试覆盖
- [ ] 无 TypeScript 错误

**架构验证**：

- [ ] 符合分层架构原则
- [ ] 符合设计模式
- [ ] 无架构违规

**文档更新**：

- [ ] TODO.md 状态更新
- [ ] DevelopLog.md 记录
- [ ] ArchitecturePrompt.md 更新（如需要）

---

## 附录

### 相关文档

- [开发日志 #X](../DevelopLog.md#x)
- [架构文档](../design/XXX.md)

### 参考资料

- 相关技术文档链接
- 外部参考案例

---

**案例作者**: XXX  
**审查人**: XXX  
**创建日期**: YYYY-MM-DD  
**最后更新**: YYYY-MM-DD

---

## 📝 填写示例

以下是一个填写完整的案例示例，供参考：

---

# PlacementController 架构纠错 - 移除 Three.js 依赖

> Implementation 层误用 EventBus，违反架构分层原则

## 基本信息

- **日期**: 2025-12-05
- **任务编号**: #3
- **案例类型**: 架构纠错
- **相关模块**: PlacementController, ThreeTransformController, EventBus
- **参与者**: 人类架构师 + Claude Sonnet 4.5

---

## 问题描述

**背景**：

在实现 Task #3（对象变换功能）时，发现 `ThreeTransformController`（Implementation 层）直接使用了 `EventBus` 发布状态事件，违反了分层通信原则。

**现象**：

```typescript
// ❌ 问题：Implementation 层直接依赖 EventBus
import { publishState } from '@/core/services/eventBus';

private onDraggingChanged = (event): void => {
  publishState('state:transform:draggingChanged', { dragging: true });
}
```

**违反的架构原则**：

根据架构文档，通信原则是：

1. **UI ↔ Feature/Core**：通过 EventBus 双向通信
2. **Core Interface ↔ Implementation**：通过直接调用 + 回调函数

---

## AI 行为

**初始方案**：

AI 在实现 TransformController 时，为了向上层报告状态（如拖拽开始/结束），直接导入并使用了 EventBus。

**推理过程**：

- AI 看到其他模块使用 EventBus 通信
- AI 认为 EventBus 是通用的通信机制
- AI 未意识到 Implementation 层的特殊性（应与业务层隔离）

---

## 人类干预

**问题发现**：

人类在代码审查时发现 `import { publishState }` 出现在 `threejs/` 目录下的文件中，意识到这违反了架构隔离原则。

**根因分析**：

- Implementation 层应该是 **技术实现细节**，不应知道业务层的事件系统
- 如果 Implementation 层依赖 EventBus，则难以替换渲染引擎（如切换到 Babylon.js）
- 正确做法是通过 **回调函数** 向上层报告状态

**引导纠正**：

人类向 AI 解释：

> "Implementation 层不应该直接使用 EventBus。这违反了架构分层原则。
>
> 正确做法：
>
> 1. 在 ITransformController 接口定义回调函数
> 2. ThreeTransformController 通过回调向上报告状态
> 3. Feature 层（TransformService）设置回调并发布 EventBus 事件
>
> 这样 Implementation 层保持纯粹，不知道业务层的存在。"

---

## 最终方案

**接口定义**：

```typescript
// ITransformController 接口
export interface ITransformController {
  // ✅ 回调函数（向上报告状态）
  onDraggingChanged?: (dragging: boolean) => void;
  onTransformCompleted?: (data: TransformData) => void;
}
```

**Implementation 层**：

```typescript
// ThreeTransformController.ts
export class ThreeTransformController implements ITransformController {
  public onDraggingChanged?: (dragging: boolean) => void;

  private handleDraggingChanged = (event): void => {
    const dragging = Boolean(event.value);
    // ✅ 通过回调向上层报告（不直接用 EventBus）
    this.onDraggingChanged?.(dragging);
  };
}
```

**Feature 层**：

```typescript
// TransformService.ts
private setupControllerCallbacks(): void {
  const controller = this.renderer.getTransformController();

  // ✅ 在 Feature 层设置回调，这里发布 EventBus 事件
  controller.onDraggingChanged = (dragging: boolean) => {
    publishState('state:transform:draggingChanged', { dragging });
  };
}
```

---

## 协作洞察

### 方法论价值

- ✅ **文档化约束的重要性**：如果 ArchitecturePrompt.md 中明确说明 "Implementation 层不使用 EventBus"，AI 可能不会犯错
- ✅ **代码审查的价值**：及时发现架构违规，避免技术债累积
- ✅ **清晰沟通的重要性**：向 AI 解释 "为什么" 而不只是 "怎么做"

---

### 预防措施

- [x] 在 ArchitecturePrompt.md 添加 "Implementation 层不使用 EventBus" 约束
- [ ] 创建 ESLint 规则检测 EventBus 在 `threejs/` 目录下的误用
- [ ] 更新代码审查清单，增加 "Implementation 层依赖检查"

---

### Prompt 优化

**添加到 ArchitecturePrompt.md**：

```markdown
## 通信原则

Implementation 层（如 `threejs/` 目录）不应该：

- ❌ 直接导入 eventBus
- ❌ 直接发布状态事件
- ❌ 知道业务层的事件系统

正确做法：

- ✅ 通过回调函数向上层报告状态
- ✅ Feature 层设置回调并发布事件
```

---

## 成果验证

- [x] 功能正常，Gizmo 正确显示和交互
- [x] 无 TypeScript 类型错误
- [x] 架构一致性得到保证
- [x] DevelopLog.md 已记录

---

## 附录

### 相关文档

- [开发日志 Task #3](../DevelopLog.md#task-3-架构重构---回调模式替代-eventbus)
- [CoreArchitecture.md](../design/CoreArchitecture.md)

---

**案例作者**: 项目团队  
**审查人**: 架构师  
**创建日期**: 2025-12-05  
**最后更新**: 2025-12-07
