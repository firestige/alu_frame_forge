# Designer 模块架构重构说明

## 架构概览

Designer 模块采用三层架构，通过事件总线实现解耦：

```
┌─────────────────────────────────────────────────────────────┐
│                       UI 层（React）                          │
│                 features/designer/ui/                        │
│           DesignerPageUI, Toolbar, ControlPanel             │
└───────────────────┬─────────────────────────────────────────┘
                    │ 通过 props 传递回调
                    │ 通过事件总线发送命令
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   事件总线（mitt）                            │
│                 core/services/eventBus.ts                   │
│         命令事件（command:*）+ 状态事件（state:*）            │
└───────────┬───────────────────────────┬─────────────────────┘
            │                           │
            ▼                           ▼
┌────────────────────────┐  ┌─────────────────────────────────┐
│   实体对象管理器        │  │      3D 渲染器抽象层            │
│ core/object/           │  │   core/renderer/                │
│ ObjectManager          │  │   IRenderer 接口                │
│                        │  │                                 │
│ - 管理场景对象         │  │   - 场景管理                    │
│ - 参数化调整           │  │   - 相机控制                    │
│ - 碰撞检测（规划）     │  │   - 渲染循环                    │
│ - 约束求解（规划）     │  │   - 射线检测                    │
└────────────────────────┘  └────────────┬────────────────────┘
            │                            │
            │                            ▼
            │                 ┌─────────────────────────────┐
            │                 │   ThreeJS 具体实现          │
            │                 │ core/renderer/threejs/      │
            │                 │                             │
            │                 │ - SceneManager             │
            │                 │ - CameraController         │
            │                 │ - ObjectRenderer           │
            └─────────────────│ - RaycasterService         │
                              └─────────────────────────────┘
```

## 核心设计原则

### 1. 职责分离

- **实体管理器（ObjectManager）**：负责业务逻辑层的对象管理，不直接依赖渲染库
  - 使用通用的 3D 数据结构（Vector3, Euler 等）
  - 通过原生场景对象（getNativeScene）与渲染器交互
  - 专注于业务逻辑：参数化、约束、碰撞检测等

- **渲染器抽象层（IRenderer）**：定义与渲染库无关的接口
  - 只包含当前需要的核心功能
  - 提供场景、相机、射线检测等基础能力
  - 通过句柄（RenderHandle）隐藏具体实现

- **UI 层（React 组件）**：纯表示层
  - 通过 props 接收数据和回调
  - 通过事件总线发送命令
  - 不直接调用渲染器或实体管理器

### 2. 事件驱动解耦

使用 mitt 作为事件总线，实现 UI 和业务逻辑的解耦：

```typescript
// UI 层发送命令
sendCommand('command:create:cube', undefined);
sendCommand('command:camera:reset', undefined);
sendCommand('command:model:delete', modelId);

// 服务层监听命令
onCommand('command:create:cube', () => {
  modelCreationService.createCube();
});

// 服务层发布状态
publishState('state:model:created', { modelId, type });

// UI 层监听状态
onState('state:model:created', ({ modelId, type }) => {
  // 更新 UI
});
```

### 3. 渐进式重构

当前保留核心接口，不需要立即实现所有功能：

- ✅ 已定义：渲染器抽象接口（`IRenderer`）
- ✅ 已定义：事件总线和命令/状态事件
- 🔄 进行中：ThreeJS 实现按职责拆分
- ⏳ 待实现：碰撞检测接口（暂不依赖 ThreeJS）
- ⏳ 待实现：约束求解接口（暂不依赖 ThreeJS）

## 目录结构

```
src/
├── core/
│   ├── renderer/              # 渲染器抽象层
│   │   ├── renderer-types.ts  # 核心接口定义
│   │   ├── threejs/           # ThreeJS 具体实现
│   │   │   ├── SceneManager.ts        # 场景管理
│   │   │   ├── CameraController.ts    # 相机控制
│   │   │   ├── ObjectRenderer.ts      # 对象渲染
│   │   │   ├── RaycasterService.ts    # 射线检测
│   │   │   └── ThreeRenderer.ts       # 主入口（组合上述模块）
│   │   └── index.ts           # 统一导出
│   ├── object/                # 实体对象管理
│   │   ├── ObjectManager.ts
│   │   └── entities/
│   └── services/              # 核心服务
│       ├── eventBus.ts        # 事件总线
│       └── storage.ts
└── features/
    └── designer/
        ├── hooks/             # 业务逻辑 hooks
        ├── services/          # 业务服务
        └── ui/                # UI 组件（纯表示层）
```

## 下一步工作

1. ✅ 定义渲染器抽象接口
2. ✅ 创建事件总线
3. 🔄 拆分 ThreeJS 实现到独立模块
4. ⏳ 重构 use3DViewer 使用新接口
5. ⏳ 重构服务层使用事件总线
6. ⏳ 验证重构结果

## 优势

1. **易于测试**：各层职责清晰，可独立测试
2. **易于替换**：渲染器可替换为其他 3D 库
3. **易于扩展**：通过事件总线添加新功能
4. **低耦合**：UI 层不依赖具体实现
5. **渐进式**：可以逐步迁移，不影响现有功能
