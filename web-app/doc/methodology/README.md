# Human-AI 协作方法论文档

**最后更新**: 2025-12-07

---

## 📖 文档概述

本目录记录了"铝型材框架设计器"项目的 **Human-AI 协作工程方法论**，展示如何通过系统化的文档规范和协作流程，引导 AI Copilot 完成复杂的 WebCAD 软件开发。

**核心价值主张**：

- ✅ **可复制**：提炼出通用的人机协作模式
- ✅ **可展示**：作为 AI 工程化能力的证明
- ✅ **可优化**：持续改进协作效率和质量

---

## 🎯 方法论定位

本项目不仅是一个 WebCAD 软件，更是一套 **AI 驱动的工程实践案例**：

- **93%+ 代码由 AI 生成**（GitHub Copilot + Claude Sonnet 4.5）
- **人类主导架构设计**（战略层面）
- **AI 负责实现细节**（战术层面）
- **文档化规则作为协作契约**（可执行的工程规范）

通过本方法论，可以：

1. 向雇主展示 AI 工程化能力
2. 复用到其他项目中
3. 培训新团队成员快速上手 AI 协作

---

## 📚 文档索引

| 文档                                                                  | 用途                              | 状态      |
| --------------------------------------------------------------------- | --------------------------------- | --------- |
| [ProjectAnalysis.md](./ProjectAnalysis.md)                            | 项目价值分析（优势与改进方向）    | ✅ 已完成 |
| [HumanAICollaboration.md](./HumanAICollaboration.md)                  | 协作工程规范详解                  | ✅ 已完成 |
| [CaseStudyTemplate.md](./CaseStudyTemplate.md)                        | 案例提取模板                      | ✅ 已完成 |
| [case-studies/](./case-studies/)                                      | 典型协作案例库                    | 🚧 待填充 |

---

## 🚀 快速开始

### 新手入门（了解方法论）

1. **了解项目价值** → 阅读 [ProjectAnalysis.md](./ProjectAnalysis.md)
2. **学习协作流程** → 阅读 [HumanAICollaboration.md](./HumanAICollaboration.md)
3. **查看真实案例** → 浏览 [case-studies/](./case-studies/) 目录

### 实践应用（复用到新项目）

1. 参考 [HumanAICollaboration.md](./HumanAICollaboration.md) 建立文档体系
2. 使用 [CaseStudyTemplate.md](./CaseStudyTemplate.md) 记录协作案例
3. 定期分析改进协作效率

---

## 🏆 方法论亮点

### 1. 系统化的文档体系

```text
doc/
├── Architecture.md              # AI 上下文入口
├── ArchitecturePrompt.md        # 快速上下文（5分钟）
├── design/                      # 子系统设计文档（5个）
├── guides/                      # 工作流规范（3个）
├── DevelopLog.md                # 开发历史记录
└── methodology/                 # 方法论文档（本目录）
```text

**关键设计**：

- **ArchitecturePrompt.md** 作为 AI 快速建立上下文的入口（Token 优化）
- **分层文档**：总章 + 分册，按需加载
- **元信息校验**：自动化检查文档更新日期

### 2. 工程化的协作流程

- **Feature Branch + Squash Merge** 工作流
- **Conventional Commits** 提交规范
- **自动化 Git 脚本**（new-feature.sh / finish-feature.sh / merge-pr.sh）
- **CI/CD 检查**：文档质量、代码测试、拼写检查

### 3. 架构约束即 Prompt

通过架构文档定义硬性约束，AI 自动遵循：

- **分层架构**：App → Pages → Features → Core（单向依赖）
- **事件驱动**：EventBus 解耦模块
- **策略模式**：支持无限扩展素材类型
- **渲染器抽象**：业务层不依赖 Three.js

**效果**：AI 生成的代码自动符合架构规范，减少返工。

---

## 📊 量化成果（待补充）

| 指标                  | 数值    | 说明                 |
| --------------------- | ------- | -------------------- |
| AI 代码贡献率         | 93%+    | GitHub Copilot 统计  |
| 文档覆盖率            | 100%    | 核心模块均有设计文档 |
| 架构一致性            | 100%    | 所有代码符合规范     |
| 测试覆盖率（目标）    | 75%+    | 单元测试 + E2E 测试  |
| 平均开发效率提升      | 3-5x    | 对比传统开发         |
| AI 返工率（架构纠错） | < 5%    | 文档化约束降低错误率 |

---

## 🔗 相关资源

### 项目文档

- [项目总览](../Architecture.md)
- [快速上下文](../ArchitecturePrompt.md)
- [工作流规范](../guides/Workflow.md)
- [开发日志](../DevelopLog.md)

### 外部资源

- [GitHub 仓库](https://github.com/firestige/alu_frame_forge)
- [在线演示](https://alu-frame-forge.vercel.app)（待部署）

---

## 🤝 贡献指南

欢迎补充新的协作案例：

1. 从 [DevelopLog.md](../DevelopLog.md) 找到有价值的协作记录
2. 使用 [CaseStudyTemplate.md](./CaseStudyTemplate.md) 填写案例
3. 提交 PR 到 `doc/methodology/case-studies/` 目录

---

## 📝 维护说明

- **定期更新**：完成新任务后及时记录方法论洞察
- **案例沉淀**：每完成 3-5 个任务，提取 1 个典型案例
- **量化统计**：每月更新成果数据（代码量、效率提升等）

---

**文档版本**: 1.0  
**维护者**: 项目团队  
**最后审查**: 2025-12-07
