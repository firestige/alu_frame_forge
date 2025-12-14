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

---

## 未来改进计划（可选需求）

> **状态**: 📋 待规划  
> **优先级**: P2（非必需，但有价值）  
> **目标版本**: v2.1+

### 1. 类型安全增强

**当前状态**:

```typescript
// ProfileInstanceStrategy.parseSVGWithHoles
private parseSVGWithHoles(outerPath: string, holes: string[]): IShape {
  // ...
  return shape as unknown as IShape; // 类型转换略显生硬
}
```

**问题分析**:

- `IShape` 是抽象几何接口，但实际返回的是 `THREE.Shape`（Three.js 特定类型）
- 使用 `as unknown as IShape` 强制转换，虽然能工作但类型安全性较弱
- 如果未来需要支持其他渲染器（如 Babylon.js），需要不同的 Shape 实现

**改进方案**:

```typescript
// 创建适配器类，显式包装 THREE.Shape
// src/core/renderer/threejs/adapters/ThreeShapeAdapter.ts

import * as THREE from 'three';
import type { IShape, ICurve } from '@/core/geometry/types';

export class ThreeShapeAdapter implements IShape {
  constructor(private threeShape: THREE.Shape) {}

  get curves(): ICurve[] {
    return this.threeShape.curves.map(c => this.adaptCurve(c));
  }

  get isClosed(): boolean {
    return true; // THREE.Shape 总是闭合的
  }

  getThreeShape(): THREE.Shape {
    return this.threeShape;
  }

  private adaptCurve(threeCurve: any): ICurve {
    // 将 THREE.Curve 转换为 ICurve
  }
}

// 使用方式
private parseSVGWithHoles(outerPath: string, holes: string[]): IShape {
  const threeShape = ... // 生成 THREE.Shape
  return new ThreeShapeAdapter(threeShape); // 显式适配
}
```

**收益**:

- ✅ 类型安全性增强，编译时错误检测
- ✅ 为多渲染器支持做准备
- ✅ 更清晰的抽象层/实现层边界

**成本**:

- 需要创建额外的适配器类
- 轻微的运行时性能开销（对象包装）

**决策建议**:

- 如果项目确定只使用 Three.js → 当前方案足够
- 如果计划支持多渲染器 → 实施适配器模式

### 2. 文档完善 - 架构决策记录

**建议**: 在 `doc/design/CoreArchitecture.md` 中添加"三层职责划分"章节

```markdown
## X. 三层职责划分（数据流架构）

### X.1 核心原则

不同层级对"数据正确性"的关注点不同：

| 层次             | 职责       | 保证内容           | 不保证内容     |
| ---------------- | ---------- | ------------------ | -------------- |
| **Library**      | 用户交互   | 特征识别、用户选择 | 数据转换、验证 |
| **AssetService** | 抽象层验证 | 路径闭合、格式正确 | 渲染器特定要求 |
| **Strategy**     | 渲染器适配 | 方向关系、拓扑结构 | 抽象层正确性   |

### X.2 关键洞察

**为什么 Strategy 需要验证？**

虽然 AssetService 已验证路径闭合，但 Strategy 仍需验证，原因：

1. **渲染器 API 不稳定**: `SVGLoader.toShapes(isCCW)` 行为不确定
2. **关注点不同**: AssetService 保证"数学正确"，Strategy 保证"渲染正确"
3. **容错性**: 数据契约定义期望，但消费方必须保留验证能力

### X.3 反面案例

参见: `doc/methodology/case-studies/DataFlowArchitecture-Final.md`

**Phase 5-6 失败**: 过度信任契约，移除 Strategy 验证 → 渲染退化（只显示圆棒）
```

**收益**:

- ✅ 核心架构决策有明确文档支撑
- ✅ 未来开发者能快速理解设计意图
- ✅ 避免重复犯错（如"过度简化"）

**实施优先级**: P1（建议尽快完成）

### 3. SVGLoader 稳定性研究

**背景**:
当前实现通过"面积对比"来判断方向，这是对 `SVGLoader.toShapes(isCCW)` 不稳定行为的 workaround。

**研究方向**:

1. **Three.js 版本差异**: 不同版本的 SVGLoader 行为是否一致？
2. **路径复杂度影响**: 简单矩形 vs 复杂带圆弧路径，行为是否相同？
3. **SVG 规范遵循度**: 如果 SVG 严格遵循规范（如明确 `fill-rule`），是否能稳定？

**潜在优化**:

```typescript
// 如果研究发现可以预测 toShapes() 行为
private parseSVGWithHoles(outerPath: string, holes: string[]): IShape {
  // 根据路径特征选择正确的 isCCW 参数
  const isCCW = this.predictWindingOrder(outerPath);
  const shape = svgPath.toShapes(isCCW)[0];

  // 减少不必要的面积计算
  // ...
}
```

**收益**:

- ⚡ 性能优化（减少重复 toShapes 调用）
- 📖 更好的代码可读性

**成本**:

- 需要深入研究 Three.js 源码
- 需要大量测试用例验证

**决策建议**:

- 当前方案稳定可靠，优先级 P3
- 仅在性能成为瓶颈时考虑优化

### 4. 单元测试覆盖率提升

**当前状态**:

- ✅ `AssetService.svg-conversion.test.ts`: 4 个测试用例
- ⚠️ `ProfileInstanceStrategy`: 无专门测试

**建议新增**:

```typescript
// src/core/object/strategies/__tests__/ProfileInstanceStrategy.test.ts

describe('ProfileInstanceStrategy', () => {
  describe('parseSVGWithHoles', () => {
    it('should handle CCW outer path with CW holes', () => {
      // 测试正常情况
    });

    it('should reverse hole direction if same as outer', () => {
      // 测试孔洞方向修正
    });

    it('should select larger area for outer path', () => {
      // 测试面积对比逻辑
    });
  });

  describe('createSceneObject', () => {
    it('should create profile with correct length', () => {
      // 测试参数传递
    });
  });
});
```

**收益**:

- ✅ 防止回归（避免再次出现"只显示圆棒"问题）
- ✅ 文档化预期行为
- ✅ 更快的错误定位

**实施优先级**: P2（建议在 v2.1 实施）

---

## 变更记录

### v2.0 (2025-12-15)

- ✅ 实施三层职责划分
- ✅ AssetService 添加 `convertSVGToCrossSection` 方法
- ✅ ProfileInstanceStrategy 恢复验证逻辑
- ✅ 移除 `scripts/prepare-profile-data.mjs`
- ✅ 架构合规性验证通过（10/10）
- ✅ 新增未来改进计划章节

### v1.0 (2025-12-14)

- 初始设计（存在过度简化问题）
