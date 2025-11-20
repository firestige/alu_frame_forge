# 📚 项目文档中心

> 铝型材框架设计器（Alu Frame Forge）完整文档导航

**最后更新**: 2025-11-21

---

## 🚀 快速开始

### 新成员入门（5分钟）

1. **了解项目** → [ArchitecturePrompt.md](./ArchitecturePrompt.md) - 快速上下文
2. **开始开发** → [guides/Workflow.md](./guides/Workflow.md) - 工作流规范
3. **使用工具** → [guides/GitAutomation.md](./guides/GitAutomation.md) - Git 自动化脚本

### AI Copilot 入口

- [ArchitecturePrompt.md](./ArchitecturePrompt.md) - 建立项目上下文的最佳入口

---

## 📖 核心文档

### 架构设计

| 文档                                             | 用途                       | 更新日期   |
| ------------------------------------------------ | -------------------------- | ---------- |
| [Architecture.md](./Architecture.md)             | 项目总览、技术栈、模块索引 | 2025-11-21 |
| [ArchitecturePrompt.md](./ArchitecturePrompt.md) | 快速上下文（AI 友好）      | 2025-11-21 |

### 设计子系统（design/）

| 文档                                                | 主要内容                                          | 更新日期   |
| --------------------------------------------------- | ------------------------------------------------- | ---------- |
| [CoreArchitecture.md](./design/CoreArchitecture.md) | 分层架构、CoreServiceProvider、事件驱动、策略模式 | 2025-11-21 |
| [UIDesign.md](./design/UIDesign.md)                 | 主题系统、Framer Motion、组件库、响应式设计       | 2025-11-21 |
| [StateManagement.md](./design/StateManagement.md)   | Context Provider、Zustand、usePersistentState     | 2025-11-21 |
| [StorageSystem.md](./design/StorageSystem.md)       | AutoSaveService、三层持久化、SceneIO              | 2025-11-21 |
| [RenderingSystem.md](./design/RenderingSystem.md)   | 渲染器抽象、Three.js 实现、RenderSyncService      | 2025-11-21 |

---

## 🛠️ 开发指南（guides/）

### 工作流与规范

| 文档                                          | 用途                                   | 更新日期   |
| --------------------------------------------- | -------------------------------------- | ---------- |
| [Workflow.md](./guides/Workflow.md)           | 协同工作流规范、Git 规则、文档同步机制 | 2025-11-21 |
| [GitAutomation.md](./guides/GitAutomation.md) | Git 自动化脚本使用指南                 | 2025-11-21 |
| [Testing.md](./guides/Testing.md)             | 测试策略、覆盖率目标、测试计划         | 2025-11-21 |

### 开发工具

| 工具                      | 用途                 | 位置                 |
| ------------------------- | -------------------- | -------------------- |
| `new-feature.sh`          | 创建 feature 分支    | `scripts/`           |
| `finish-feature.sh`       | 推送并创建 PR        | `scripts/`           |
| `merge-pr.sh`             | 自动 squash merge PR | `scripts/`           |
| `cleanup-feature.sh`      | 清理本地分支         | `scripts/`           |
| `list-prs.sh`             | 查看所有 PR          | `scripts/`           |
| `verify-doc-metadata.mjs` | 文档元信息校验       | `scripts/doc-check/` |

---

## 📝 项目管理

| 文档                             | 用途                         | 更新日期   |
| -------------------------------- | ---------------------------- | ---------- |
| [../TODO.md](../TODO.md)         | 待办任务跟踪（优先级、状态） | 2025-11-21 |
| [DevelopLog.md](./DevelopLog.md) | 已完成任务的详细历史记录     | 2025-11-21 |

---

## 📚 API 参考

| 文档                                             | 用途              | 状态      |
| ------------------------------------------------ | ----------------- | --------- |
| [CommandReference.md](./api/CommandReference.md) | 命令系统 API 参考 | ⚠️ 待审查 |

---

## 🗄️ 存档文档

历史版本和已废弃文档存放在 [\_archive/](./_archive/) 目录，仅供参考。

| 文档                                | 归档原因                     | 归档日期   |
| ----------------------------------- | ---------------------------- | ---------- |
| AssetManagementArchitecture-v1.0.md | 已整合到 CoreArchitecture.md | 2025-11-21 |
| DesignerArchitecture-v1.0.md        | 已整合到 CoreArchitecture.md | 2025-11-21 |
| Model-vs-SceneObject-Analysis.md    | 架构演进分析，历史参考       | 2025-11-21 |
| Architecture-full-v1.md             | 原始完整架构文档             | 2025-11-21 |
| Architecture-v1.0-original.md       | 原始版本备份                 | 2025-11-21 |

---

## 📌 文档维护规范

### 元信息格式

所有活跃文档必须包含：

```markdown
# 文档标题

**最后更新**: YYYY-MM-DD
**文档版本**: X.Y（可选）
**状态**: Active/Archived/Draft
```

### 更新规则

1. **修改文档时**：更新"最后更新"日期
2. **重大变更时**：增加版本号
3. **废弃文档时**：移至 `_archive/` 并在文档中心更新状态

### 质量检查

运行文档元信息校验：

```bash
node scripts/doc-check/verify-doc-metadata.mjs
```

---

## 📐 文档体系结构

```
项目文档体系
│
├─ 📖 了解项目（Architecture）
│   ├─ 快速上下文 → ArchitecturePrompt.md（5分钟）
│   ├─ 项目总览 → Architecture.md（20分钟）
│   └─ 深入子系统 → design/（按需）
│
├─ 🛠️ 开发指南（guides/）
│   ├─ 工作流规范 → Workflow.md
│   ├─ Git 自动化 → GitAutomation.md
│   └─ 测试计划 → Testing.md
│
├─ 📝 项目管理（Management）
│   ├─ 任务跟踪 → TODO.md
│   └─ 开发日志 → DevelopLog.md
│
└─ 📚 API 参考（Reference）
    └─ 命令系统 → api/CommandReference.md
```

---

## 🔗 外部资源

- [GitHub 仓库](https://github.com/firestige/alu_frame_forge)
- [项目看板](https://github.com/firestige/alu_frame_forge/projects)

---

**文档问题反馈**: 在 GitHub Issues 中标记 `documentation` 标签
