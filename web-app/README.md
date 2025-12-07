# 铝型材框架设计器 (Alu Frame Forge)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.171-blue.svg)](https://threejs.org/)

基于 Web 的 3D CAD 工具，专注于铝型材框架结构的快速设计、组装和工程导出。

---

## ✨ 核心特性

- 🎨 **所见即所得** - 实时 3D 渲染，直观的交互体验
- 🚀 **快速建模** - 从素材库拖拽组装，无需从零建模
- 📐 **参数化设计** - 智能参数系统，支持实时调整
- 💾 **自动保存** - 多层持久化策略（内存 → localStorage → 云端）
- 🎯 **事件驱动** - 松耦合架构，易于扩展
- 🔧 **渲染器抽象** - 支持多种 3D 引擎（当前 Three.js）

---

## 🎬 功能展示

### 已实现功能 ✅

- ✅ 核心架构（分层架构、CoreServiceProvider、事件总线）
- ✅ 素材管理系统（Asset Registry、参数化模型）
- ✅ 对象管理系统（ObjectManager、场景序列化）
- ✅ 渲染系统（IRenderer 抽象、Three.js 实现、RenderSyncService）
- ✅ 自动保存服务（防抖 + 最小间隔控制）
- ✅ 状态管理（Context Provider + Zustand）
- ✅ UI 组件库（Tailwind CSS 4.0 + Framer Motion）
- ✅ 测试体系（Vitest 单元测试 + Playwright E2E）
- ✅ Git 工作流自动化脚本

### 开发中功能 🚧

- 🚧 3D 视角控制（OrbitControls 集成）
- 🚧 对象选中和高亮
- 🚧 对象移动和旋转（TransformControls）
- 🚧 右键上下文菜单

### 计划中功能 📋

- 📋 真实型材生成（SVG Path 解析 + ExtrudeGeometry）
- 📋 紧固件和连接件参数化生成
- 📋 加工操作（打孔、切角、攻丝、槽口）
- 📋 工程管理器（ProjectManager）
- 📋 多人协作、工程导出、材质库

---

## 🛠️ 技术栈

### 核心技术

- **前端框架**: React 19 + TypeScript 5.7
- **构建工具**: Vite 6
- **3D 渲染**: Three.js 0.171
- **UI 样式**: Tailwind CSS 4.0 + Framer Motion
- **状态管理**: Context API + Zustand + mitt

### 开发工具

- **测试**: Vitest 4.0 + Playwright + React Testing Library
- **代码质量**: ESLint + cSpell
- **CI/CD**: GitHub Actions
- **文档检查**: markdownlint + 自定义元信息校验

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173)

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

---

## 📚 文档导航

### 快速入门

- 🚪 [文档中心](./doc/README.md) - 完整文档导航（**推荐入口**）
- ⚡ [快速上下文](./doc/ArchitecturePrompt.md) - 5 分钟了解项目（AI Copilot 友好）
- 📖 [架构总览](./doc/Architecture.md) - 项目整体架构设计

### 设计文档

| 文档                                                 | 内容                                              |
| ---------------------------------------------------- | ------------------------------------------------- |
| [CoreArchitecture](./doc/design/CoreArchitecture.md) | 分层架构、CoreServiceProvider、事件驱动、策略模式 |
| [UIDesign](./doc/design/UIDesign.md)                 | 主题系统、Framer Motion、组件库                   |
| [StateManagement](./doc/design/StateManagement.md)   | Context Provider、Zustand、usePersistentState     |
| [StorageSystem](./doc/design/StorageSystem.md)       | AutoSaveService、三层持久化、SceneIO              |
| [RenderingSystem](./doc/design/RenderingSystem.md)   | 渲染器抽象、Three.js 实现                         |

### 开发指南

| 文档                                        | 内容                 |
| ------------------------------------------- | -------------------- |
| [工作流规范](./doc/guides/Workflow.md)      | 协同工作流、Git 规则 |
| [Git 自动化](./doc/guides/GitAutomation.md) | 自动化脚本使用       |
| [测试计划](./doc/guides/Testing.md)         | 测试策略、覆盖率目标 |

### 项目管理

- [TODO.md](./TODO.md) - 待办任务跟踪
- [开发日志](./doc/DevelopLog.md) - 已完成任务历史

---

## 🏗️ 项目结构

```text
web-app/
├── src/
│   ├── core/                  # 核心业务逻辑层
│   │   ├── asset/            # 素材管理
│   │   ├── object/           # 对象管理
│   │   ├── renderer/         # 渲染器抽象
│   │   └── services/         # 核心服务
│   ├── features/             # 功能模块层
│   │   ├── designer/         # 设计器功能
│   │   └── library/          # 素材库功能
│   ├── components/           # 通用 UI 组件
│   ├── layouts/              # 布局组件
│   ├── pages/                # 页面组件
│   └── stores/               # 全局状态
├── doc/                      # 📚 项目文档
│   ├── README.md            # 文档中心
│   ├── design/              # 设计文档
│   ├── guides/              # 开发指南
│   └── api/                 # API 参考
├── scripts/                  # 🔧 自动化脚本
│   ├── new-feature.sh       # 创建 feature 分支
│   ├── finish-feature.sh    # 推送并创建 PR
│   ├── merge-pr.sh          # 自动合并 PR
│   └── cleanup-feature.sh   # 清理本地分支
└── e2e/                      # E2E 测试
```

---

## 🤝 贡献指南

### 开发工作流

1. **开始新任务**

   ```bash
   ./scripts/new-feature.sh <任务编号> <描述>
   ```

2. **开发和提交**

   ```bash
   git add .
   git commit -m "feat: 功能描述"
   ```

3. **完成任务并创建 PR**

   ```bash
   ./scripts/finish-feature.sh
   ```

4. **合并 PR**

   ```bash
   ./scripts/merge-pr.sh
   ```

5. **清理本地分支**

   ```bash
   ./scripts/cleanup-feature.sh
   ```

详细规范请查看 [工作流规范](./doc/guides/Workflow.md)

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具更新

---

## 📊 项目进度

查看 [TODO.md](./TODO.md) 了解当前开发进度和计划任务。

**当前里程碑**: 3D 交互基础能力（视角控制、对象选中、移动旋转）

---

## 📄 许可证

MIT License

---

## 🔗 相关资源

- [GitHub 仓库](https://github.com/firestige/alu_frame_forge)
- [问题反馈](https://github.com/firestige/alu_frame_forge/issues)
- [完整文档](./doc/README.md)

---

**维护者**: [@firestige](https://github.com/firestige)
