# 重构快速开始指南

## 📖 背景

**问题**: ObjectManager (~900行) 与 Renderer 强耦合，导致难以测试和维护。

**目标**: 通过事件总线解耦，RenderSyncService 建立同步关联。

## 🎯 核心架构变更

### Before（当前）
```
ObjectManager
├── 持有 renderer: IRenderer
├── Model.renderObject: unknown
└── 直接操作渲染器
```

### After（目标）
```
ObjectManager (纯数据) → EventBus → RenderSyncService → Renderer
                                            ↓
                                    维护 modelId ↔ renderObject 映射
```

## 📋 执行计划

### Phase 1: ObjectManager 拆分 (8 个步骤)
拆分 900 行巨型文件为 8 个职责清晰的模块

### Phase 2: ObjectManager 解耦 (6 个步骤)
移除 renderer 依赖，添加事件发布

### Phase 3: 事件总线和类型 (3 个步骤)
完善 EventBus，定义领域模型

### Phase 4: RenderSyncService (7 个步骤)
创建核心同步服务

### Phase 5-8: 服务、Hooks、UI 改造
自顶向下更新所有依赖

## 🚦 当前状态

**进度**: 准备开始 Phase 1  
**状态**: ✅ 检查点文档已创建，等待确认

## 🔄 如何恢复会话

如果会话中断，提供：
1. `doc/RefactoringProgress.md` (完整计划)
2. `doc/Checkpoint-PhaseX.md` (最新检查点)
3. 当前进度说明

## 📁 关键文件位置

- 主文档: `doc/RefactoringProgress.md`
- 检查点: `doc/Checkpoint-Phase*.md`
- 源代码: `src/core/object/ObjectManager.ts` (待拆分)

---

**准备就绪**: 等待用户确认后开始 Phase 1 🚀
