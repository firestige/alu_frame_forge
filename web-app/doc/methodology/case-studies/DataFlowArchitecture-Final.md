# 数据流架构设计（最终版）

**文档状态**: ✅ 架构确定  
**创建时间**: 2025-12-15  
**版本**: v2.0

## 问题回顾

之前的设计将数据验证和转换放在了错误的层：

- ❌ 工具脚本 (`prepare-profile-data.mjs`) 负责 SVG 转换
- ❌ Strategy 层完全信任数据，无验证
- ❌ 导致渲染失败（只显示圆棒）

根本原因：**混淆了"抽象层正确性"和"渲染层正确性"**

## 正确的职责划分

### 1. Library 层（用户交互）

**职责**：

- 帮助用户识别 SVG 中的闭合面特征
- 让用户选择需要拉伸的面
- 调用 AssetService 完成导入

**不负责**：

- ❌ 数据转换
- ❌ 路径验证
- ❌ 方向规范化

### 2. AssetService 层（抽象层）

**职责**：

```typescript
// 新增核心方法
convertSVGToCrossSection(svgContent: string, options?: {
  outerPathIndex?: number;  // 用户选择的外轮廓
  holeIndices?: number[];   // 用户选择的孔洞
}): NormalizedCrossSection;

// 验证方法
validateClosedPath(pathData: string): boolean;
validateNoSelfIntersection(pathData: string): boolean;
```

**保证**：

- ✅ 路径闭合（数学层面）
- ✅ 格式正确（符合 `NormalizedCrossSection`）
- ✅ 无自交叉（可选）

**不保证**：

- ❌ 渲染器特定的方向要求（如 Three.js 的 CCW/CW）
- ❌ 渲染器特定的数据结构（如 THREE.Shape）

**数据结构**（抽象层）：

```typescript
interface NormalizedCrossSection {
  outerPath: string; // SVG path data，保证闭合
  holes: string[]; // SVG path data[]，每个保证闭合
}
```

### 3. Strategy 层（渲染器适配）

**职责**：

```typescript
// ProfileInstanceStrategy.ts
private parseSVGWithHoles(
  outerPath: string,
  holes: string[]
): IShape {
  // 1. 解析为 SVGPath
  const svgData = loader.parse(svg);

  // 2. 尝试两种方向，选择面积更大的
  const shapeCCW = paths[0].toShapes(true)[0];
  const shapeCW = paths[0].toShapes(false)[0];
  const shape = selectLargerArea(shapeCCW, shapeCW);

  // 3. 处理孔洞，验证方向
  for (const holePath of holePaths) {
    const hole = holePath.toShapes(true)[0];

    // 验证方向：孔洞必须与外轮廓相反
    if (!isOppositeDirection(hole, shape)) {
      reverseHoleDirection(hole);
    }

    shape.holes.push(hole);
  }

  return shape;
}
```

**保证**：

- ✅ 符合 Three.js 的方向要求
- ✅ 生成正确的 THREE.Shape
- ✅ 处理 SVGLoader 的边界情况

**来源**：从 App.tsx 的正确实现学习

## 完整数据流

```
┌─────────────────────────────┐
│ 1. Library 页面              │
│    - 用户上传 SVG            │
│    - 识别闭合面特征           │
│    - 用户选择外轮廓和孔洞      │
└──────────┬──────────────────┘
           │ (SVG + 用户选择)
           ↓
┌─────────────────────────────┐
│ 2. AssetService              │
│  ┌─────────────────────────┐ │
│  │ convertSVGToCrossSection│ │
│  │  - SVGLoader 解析       │ │
│  │  - 提取选中的路径        │ │
│  │  - 验证闭合性           │ │
│  │  - 转为 path data       │ │
│  └─────────────────────────┘ │
│           ↓                  │
│  NormalizedCrossSection      │
│  {                           │
│    outerPath: "M...",        │
│    holes: ["M..."]           │
│  }                           │
└──────────┬──────────────────┘
           │ (存储到 ProfileAsset)
           ↓
┌─────────────────────────────┐
│ 3. Designer 查询             │
│    asset.crossSection        │
└──────────┬──────────────────┘
           │ (NormalizedCrossSection)
           ↓
┌─────────────────────────────┐
│ 4. ProfileInstanceStrategy   │
│  ┌─────────────────────────┐ │
│  │ parseSVGWithHoles       │ │
│  │  - SVGLoader 解析       │ │
│  │  - 面积对比选方向        │ │
│  │  - 验证孔洞方向          │ │
│  │  - 必要时反转           │ │
│  └─────────────────────────┘ │
│           ↓                  │
│  THREE.Shape                 │
└──────────┬──────────────────┘
           │
           ↓
     Three.js 渲染
```

## 为什么 Strategy 需要验证？

### 抽象层 vs 渲染层的差异

| 层次                      | 关注点     | 保证内容           |
| ------------------------- | ---------- | ------------------ |
| **AssetService (抽象层)** | 几何正确性 | 路径闭合、无自交叉 |
| **Strategy (渲染层)**     | 渲染正确性 | 方向关系、拓扑结构 |

### Three.js 的特殊要求

Three.js `ExtrudeGeometry` 要求：

- 外轮廓和孔洞的**环绕方向相反**
- 使用 `ShapeUtils.area()` 判断方向（正/负）

但是：

- `SVGLoader.toShapes(isCCW)` 的行为**不稳定**
- 同样的 path data，在不同情况下可能产生不同方向

因此：

```typescript
// ❌ 错误做法：信任 toShapes 参数
const shape = path.toShapes(true)[0]; // 假设是 CCW

// ✅ 正确做法：运行时验证
const shapeCCW = path.toShapes(true)[0];
const shapeCW = path.toShapes(false)[0];
const shape =
  Math.abs(ShapeUtils.area(shapeCCW.getPoints())) >
  Math.abs(ShapeUtils.area(shapeCW.getPoints()))
    ? shapeCCW
    : shapeCW;
```

## 预置数据处理

### 当前方案（错误）

```bash
# 独立工具脚本
scripts/prepare-profile-data.mjs
  ↓
src/data/profiles/2020-normalized.json
  ↓
AssetService 直接读取
```

**问题**：

- 工具脚本和 AssetService 逻辑重复
- 难以维护一致性

### 新方案（正确）

```typescript
// AssetService 统一处理
class AssetService {
  // 用户导入时使用
  async importProfileFromSVG(file: File): Promise<ProfileAsset>;

  // 预置数据使用（内部调用同样的转换逻辑）
  async loadPresetProfile(name: string): Promise<ProfileAsset> {
    const svg = await fetch(`/assets/profiles/${name}.svg`);
    return this.importProfileFromSVG(svg);
  }
}
```

**优势**：

- ✅ 单一转换逻辑
- ✅ 预置数据和用户数据走同样流程
- ✅ 易于维护和测试

## 实施计划

### Phase 1: AssetService 添加 SVG 转换

```typescript
// src/core/asset/AssetService.ts

convertSVGToCrossSection(
  svgContent: string,
  options?: {
    outerPathIndex?: number;
    holeIndices?: number[];
  }
): NormalizedCrossSection {
  // 1. SVGLoader 解析
  const loader = new SVGLoader();
  const svgData = loader.parse(svgContent);

  // 2. 提取路径
  const outerIndex = options?.outerPathIndex ?? 0;
  const outerPath = this.extractPathData(svgData.paths[outerIndex]);

  const holes = (options?.holeIndices ?? []).map(i =>
    this.extractPathData(svgData.paths[i])
  );

  // 3. 验证闭合
  this.validateClosedPath(outerPath);
  holes.forEach(h => this.validateClosedPath(h));

  return { outerPath, holes };
}

private extractPathData(svgPath: SVGPath): string {
  // 从 SVGPath 提取 path data 字符串
  // 保持原始方向（不做修改）
}

private validateClosedPath(pathData: string): boolean {
  // 验证路径以 M 开始，以 Z 结束
  // 可选：验证起点终点重合
}
```

### Phase 2: ProfileInstanceStrategy 恢复验证

```typescript
// src/core/object/strategies/ProfileInstanceStrategy.ts

private parseSVGWithHoles(
  outerPath: string,
  holes: string[]
): IShape {
  // 参考 App.tsx 的正确实现
  // 1. 面积对比选外轮廓方向
  // 2. 孔洞方向验证和修正
  // 3. 组装 THREE.Shape
}
```

### Phase 3: 移除工具脚本

- 删除 `scripts/prepare-profile-data.mjs`
- 预置数据改为运行时转换（或构建时使用 AssetService）

## 架构验证

### 单一职责原则

- ✅ Library: 用户交互
- ✅ AssetService: 抽象层数据管理
- ✅ Strategy: 渲染器适配

### 依赖方向

```
Library → AssetService ← Designer
              ↓
         ProfileAsset
              ↓
          Strategy → ThreeJS
```

### 信任边界

- Library 信任用户输入（需验证）
- AssetService 提供已验证的抽象层数据
- Strategy 信任抽象层数据，但需适配渲染器

## 总结

**核心原则**：

1. AssetService 保证"几何正确性"（抽象层）
2. Strategy 保证"渲染正确性"（渲染层）
3. 两层关注点不同，各司其职

**关键实现**：

1. AssetService 添加 `convertSVGToCrossSection`
2. Strategy 从 App.tsx 学习验证逻辑
3. 统一预置数据和用户数据的处理流程

这样设计后：

- ✅ 职责清晰
- ✅ 易于测试
- ✅ 易于扩展（支持其他渲染器）
- ✅ 数据流可追溯
