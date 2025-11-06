# 2025-11-6
由于类 CAD 编辑器需要的功能模块远超我一开始的想象，不得不对原有的扁平目录结构进行重构，改为多层目录结构以便更好地组织代码。新的目录结构如下：

```
src/
  pages/
    `DesignerPage.tsx`
    `LibraryPage.tsx`
  features/
    designer/
      `index.ts`                 # feature 对外导出
      ui/
        `DesignerCanvas.tsx`
        `DesignerToolbar.tsx`
      hooks/
        `useDesignerState.ts`
      services/
        `designerService.ts`    # 基于 core 服务的高层逻辑
      models/
        `Profile.ts`
    library/
      `index.ts`
      ui/
        `LibraryPage.tsx`
        `LibraryToolbar.tsx`
      hooks/
        `useAssetsLibrary.ts`
      assets/
        `components/`           # 预览、列表、编辑 UI
      services/
        `libraryService.ts`
  core/
    renderer/
      `ThreeRenderer.ts`        # Three.js 渲染器适配器、场景/相机管理
      `renderer-types.ts`
    object/
      `ObjectManager.ts`        # 管理场景实体的增删改查
      entities/
        `Asset.ts`              # 实体类/轻量封装（非全局 .d.ts）
        `SceneObject.ts`
    services/
      `storage.ts`              # 本地/后端持久化抽象
      `eventBus.ts`
  domain/
    `Asset.ts`                  # 纯类型/接口导出（module .ts）
    `User.ts`
  components/
    `AppBar/`
      `AppBar.tsx`
      `AppBarLinks.tsx`
      `StatusButtons.tsx`
    `IconButton.tsx`
  hooks/
    `useFetch.ts`
    `useDebounce.ts`
  utils/
    `format.ts`
    `validators.ts`
  types/
    `index.ts`                  # 全局小范围类型汇总（尽量少用全局声明）
  assets/
    `models/`
    `textures/`
  tests/
    `core/`
    `features/`
  index.tsx
```
重构后的目录结构将不同功能模块划分到 `features` 目录下，每个功能模块内部再细分为 UI 组件、hooks、服务、模型等子目录，便于维护和扩展。核心渲染和对象管理逻辑则集中在 `core` 目录中，保持清晰的职责分离。