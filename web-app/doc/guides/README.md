# 开发指南

**最后更新**: 2025-11-21

本目录包含所有开发相关的规范和指南文档。

---

## 📚 文档索引

### [Workflow.md](./Workflow.md)

**协同工作流规范**

- 硬性规则
- 会话启动流程
- Git 提交规范
- 文档同步机制

### [GitAutomation.md](./GitAutomation.md)

**Git 自动化脚本使用指南**

- 脚本安装和配置
- 工作流程自动化
- 常见问题解答

### [Testing.md](./Testing.md)

**测试计划与策略**

- 测试策略（单元测试、E2E 测试）
- 覆盖率目标
- 模块级测试计划

---

## 🚀 快速开始

### 新成员入门

1. 阅读 [Workflow.md](./Workflow.md) 了解工作流规范
2. 配置 [GitAutomation.md](./GitAutomation.md) 中的自动化脚本
3. 查看 [Testing.md](./Testing.md) 了解测试要求

### 日常开发

```bash
# 1. 开始新任务
./scripts/new-feature.sh <任务编号> <描述>

# 2. 开发和提交
git add .
git commit -m "feat: 功能描述"

# 3. 完成任务
./scripts/finish-feature.sh

# 4. 合并 PR
./scripts/merge-pr.sh

# 5. 清理分支
./scripts/cleanup-feature.sh
```

---

## 📖 相关文档

- [文档中心](../README.md) - 完整文档导航
- [架构总览](../Architecture.md) - 项目整体架构
- [开发日志](../DevelopLog.md) - 开发历史记录

---

**维护**: 更新任何指南文档时，请同步更新此 README
