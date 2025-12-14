# 截面数据契约设计评审

**评审日期**: 2025-12-14  
**评审人**: User  
**当前状态**: 🔴 **设计不一致，需要修正**

---

## 📋 问题陈述

用户提出了一个核心问题：

> "如果基于我们定义的数据结构都不能满足要求，那这个数据结构定义的有什么意义？"

**现象**：

- 我们花了大量精力设计 `NormalizedCrossSection` 契约
- 但在实际使用时，还需要手动转换数据格式
- 这说明**契约设计与实际需求脱节**

---

## 🔍 问题根源分析

### 当前架构的割裂

#### 1. **新契约定义** (`NormalizedCrossSection`)

```typescript
// src/core/contract/ProfileCrossSectionContract.ts
export interface NormalizedCrossSection {
  outerPath: string;       // 主轮廓 SVG 路径
  holes: string[];         // 孔洞路径数组
  dimensions: {
    width: number;
    height: number;
    wallThickness: number;
    origin: { type: 'center' | 'corner' };
  };
  geometricProperties?: { area, momentOfInertia };
  annotation?: { ... };
}
```

**特点**：

- ✅ 明确区分主轮廓和孔洞
- ✅ 包含完整尺寸和元数据
- ✅ 支持追溯和审计
- ✅ 消除解析歧义

#### 2. **旧资产接口** (`ProfileAsset.crossSection`)

```typescript
// src/core/asset/types/asset.ts
export interface CrossSection {
  svgPath: string; // 单一路径字符串（无法区分主轮廓和孔洞！）
  width: number;
  height: number;
  wallThickness: number;
  area?: number;
  momentOfInertia?: { Ix; Iy };
}

export interface ProfileAsset {
  crossSection: CrossSection; // ❌ 使用旧接口
  // ...
}
```

**问题**：

- ❌ `svgPath` 是单一字符串，无法表达多路径结构
- ❌ 无法区分主轮廓和孔洞（需要运行时解析）
- ❌ 缺少原点类型信息（center/corner）
- ❌ 缺少追溯元数据

### 架构不一致的根源

```
   生成工具                        资产接口                      策略实现
┌──────────────┐              ┌──────────────┐            ┌──────────────┐
│ prepare-     │  产出         │ ProfileAsset │  读取      │ Profile      │
│ profile-data │─────────────> │              │───────────>│ Instance     │
│              │               │ crossSection │            │ Strategy     │
│              │               │ (旧格式)     │            │              │
└──────────────┘              └──────────────┘            └──────────────┘
        │                              ▲                           │
        │                              │                           │
        │ 生成                         │ 需要转换                  │ 需要
        ▼                              │                           ▼
┌──────────────┐                       │                   ┌──────────────┐
│ Normalized   │  ❌ 不兼容            │                   │ 解析 SVG     │
│ CrossSection │───────────────────────┘                   │ 区分主轮廓   │
│ (新契约)     │                                           │ 和孔洞       │
└──────────────┘                                           └──────────────┘
```

**问题链**：

1. 生成工具产出 `NormalizedCrossSection`（新契约）
2. 但 `ProfileAsset` 使用 `CrossSection`（旧接口）
3. 必须手动转换：`outerPath` → `svgPath`（丢失孔洞信息！）
4. 策略实现又需要解析 `svgPath` 重新区分主轮廓和孔洞

**结果**：绕了一圈回到原点，契约没有发挥作用！

---

## ✅ 正确的设计方案

### 方案 A：完全统一（推荐）

**核心思想**：`ProfileAsset` 直接使用 `NormalizedCrossSection`

```typescript
// src/core/asset/types/asset.ts
import type { NormalizedCrossSection } from '@/core/contract/ProfileCrossSectionContract';

export interface ProfileAsset extends Asset {
  type: typeof AssetType.PROFILE;

  /** 截面数据（使用标准化契约格式） */
  crossSection: NormalizedCrossSection; // ✅ 直接使用契约

  material: MaterialProperties;
  lengthConstraints: { min; max; default; step };
  // ...
}
```

**优势**：

- ✅ 零转换：生成工具产出的数据直接可用
- ✅ 类型安全：TypeScript 完全支持
- ✅ 语义清晰：outerPath + holes 一目了然
- ✅ 扩展性强：未来可添加更多元数据

**策略实现**：

```typescript
// src/core/object/strategies/ProfileInstanceStrategy.ts
createSceneObject(asset: ProfileAsset, options): SceneObject {
  const crossSection = asset.crossSection;  // NormalizedCrossSection

  // ✅ 直接使用契约数据，无需解析
  const outerShape = SVGPathParser.parse(crossSection.outerPath);
  const holeShapes = crossSection.holes.map(h => SVGPathParser.parse(h));

  // ✅ 明确的原点处理
  const origin = crossSection.dimensions.origin;

  // 创建拉伸几何体...
}
```

**数据流**：

```
生成工具 ──> NormalizedCrossSection ──> ProfileAsset.crossSection ──> 策略实现
         (契约格式)                   (直接存储)              (直接使用)
```

---

### 方案 B：兼容过渡（保留旧数据）

如果需要保持对旧数据的兼容性：

```typescript
export interface ProfileAsset extends Asset {
  /** 截面数据（新格式） */
  crossSection: NormalizedCrossSection;

  /** @deprecated 旧格式，仅用于兼容旧数据 */
  legacyCrossSection?: CrossSection;
}
```

**迁移策略**：

1. 新数据：只填 `crossSection`（NormalizedCrossSection）
2. 旧数据：同时填 `crossSection` 和 `legacyCrossSection`
3. 读取：优先使用 `crossSection`，回退到 `legacyCrossSection`
4. 逐步淘汰 `legacyCrossSection`

---

## 📊 对比：修正前 vs 修正后

| 维度           | 当前设计（割裂）                          | 修正后设计（统一）                 |
| -------------- | ----------------------------------------- | ---------------------------------- |
| **类型一致性** | ❌ CrossSection vs NormalizedCrossSection | ✅ 统一使用 NormalizedCrossSection |
| **数据转换**   | ❌ 需要手动转换（outerPath→svgPath）      | ✅ 零转换，直接使用                |
| **孔洞表达**   | ❌ 丢失孔洞信息，需要运行时解析           | ✅ holes[] 明确表达                |
| **原点类型**   | ❌ 缺失，需要猜测或硬编码                 | ✅ origin.type 明确指定            |
| **元数据追溯** | ❌ 无追溯信息                             | ✅ annotation 完整记录             |
| **工具集成**   | ❌ 工具产出与接口不匹配                   | ✅ 工具产出直接可用                |
| **开发效率**   | ❌ 写转换代码，调试解析逻辑               | ✅ 直接使用，专注业务逻辑          |

---

## 🎯 修正方案实施

### 1. 修改资产类型定义

```typescript
// src/core/asset/types/asset.ts

import type { NormalizedCrossSection } from '@/core/contract/ProfileCrossSectionContract';

// ❌ 删除旧的 CrossSection 接口
// export interface CrossSection { ... }

/**
 * 铝型材素材
 */
export interface ProfileAsset extends Asset {
  type: typeof AssetType.PROFILE;

  /** 系列标识（20系列、30系列等） */
  series: string;

  /** 截面数据（使用标准化契约格式） */
  crossSection: NormalizedCrossSection; // ✅ 直接使用契约

  /** 材料属性 */
  material: MaterialProperties;

  /** 长度约束 */
  lengthConstraints: {
    min: number;
    max: number;
    default: number;
    step: number;
  };

  /** 支持的加工操作 */
  supportedOperations: MachiningOpType[];

  /** 元数据 */
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
  };
}
```

### 2. 更新策略实现

```typescript
// src/core/object/strategies/ProfileInstanceStrategy.ts

createSceneObject(asset: ProfileAsset, options): SceneObject {
  const { crossSection } = asset;  // NormalizedCrossSection

  // ✅ 直接使用契约数据
  const outerShape = SVGPathParser.parse(crossSection.outerPath);
  const holeShapes = crossSection.holes.map(path => SVGPathParser.parse(path));

  // ✅ 使用标准尺寸
  const { width, height, wallThickness } = crossSection.dimensions;

  // ✅ 使用几何属性
  const area = crossSection.geometricProperties?.area || 0;

  // 创建拉伸几何体...
  const extrusionParams: ExtrusionParams = {
    outerShape,
    holeShapes,
    length,
    targetSize: width,
    material: this.convertMaterial(asset.material),
    // ...
  };

  // ...
}
```

### 3. 更新生成工具输出

```typescript
// scripts/prepare-profile-data.mjs

function generateTypeScriptCode(normalizedData, config) {
  return `
import type { ProfileAsset } from '@/core/asset/types/asset';
import type { NormalizedCrossSection } from '@/core/contract/ProfileCrossSectionContract';
import { AssetType, AssetSource } from '@/core/asset/types/enums';

export const profile${name}Normalized: NormalizedCrossSection = ${JSON.stringify(normalizedData, null, 2)};

export const profile${name}Asset: ProfileAsset = {
  id: 'profile-${name}',
  name: '${name}型材',
  type: AssetType.PROFILE,
  source: AssetSource.BUILTIN,
  series: '${series}',
  description: '${width}x${height}mm ${material}铝型材',
  
  crossSection: profile${name}Normalized,  // ✅ 直接使用契约
  
  material: { ... },
  lengthConstraints: { ... },
  supportedOperations: [...],
  metadata: { ... }
};
  `;
}
```

---

## 📝 修正清单

- [ ] **修改资产类型定义**
  - [ ] 删除旧的 `CrossSection` 接口
  - [ ] 修改 `ProfileAsset.crossSection` 类型为 `NormalizedCrossSection`
- [ ] **更新策略实现**
  - [ ] `ProfileInstanceStrategy.createSceneObject` 直接使用 `crossSection.outerPath` 和 `holes`
  - [ ] 移除旧的 `svgPath` 解析逻辑
- [ ] **更新生成工具**
  - [ ] `prepare-profile-data.mjs` 直接输出 `ProfileAsset` 格式
  - [ ] 确保 `crossSection` 字段是 `NormalizedCrossSection` 类型
- [ ] **更新已有型材数据**
  - [ ] `src/data/profiles/20-series.ts` 等旧文件迁移为新格式
  - [ ] 或添加适配器处理旧格式数据
- [ ] **更新文档**
  - [ ] `ProfileCrossSectionContract-README.md` 说明契约的实际使用
  - [ ] `Architecture.md` 更新数据流图

---

## 🎓 设计原则总结

这次问题暴露了一个重要的设计原则：

> **契约驱动设计（Contract-Driven Design）的核心是：契约应该是系统的真理来源，而不是装饰品。**

### 反模式（❌）：

- 定义契约，但实际接口不使用
- 需要在契约格式和实际格式之间转换
- 契约和实现脱节

### 正确模式（✅）：

- 契约即接口：系统直接使用契约格式
- 零转换：生成工具产出契约，消费者直接使用
- 单一真理源：契约是数据格式的唯一定义

---

## 💡 用户的反馈价值

用户这个质疑非常关键，它揭示了：

1. **设计的自洽性**：如果设计的数据结构不能直接使用，说明设计有问题
2. **工具链的一致性**：生成工具 → 数据格式 → 消费代码 必须无缝衔接
3. **契约的实用性**：契约不是文档，而是系统的核心数据结构

**结论**：应该立即修正，让 `ProfileAsset` 直接使用 `NormalizedCrossSection`。

---

**下一步行动**：用户确认修正方案后，实施上述修改清单。
