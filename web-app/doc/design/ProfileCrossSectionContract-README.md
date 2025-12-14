# 型材截面数据契约 v2.0

**创建日期**: 2025-12-14  
**状态**: 已定稿

---

## 1. 契约概述

### 1.1 目的

定义**型材库（Library）**和**设计器（Designer）**之间关于铝型材截面的标准化数据格式，确保：

1. ✅ **明确语义**：用户显式指定哪些路径是主轮廓、哪些是孔洞
2. ✅ **消除歧义**：不依赖 SVG 路径书写顺序
3. ✅ **向前兼容**：支持未来扩展（几何属性、自动检测等）
4. ✅ **可追溯**：记录数据来源和处理过程

### 1.2 核心数据流

```
┌─────────────┐                    ┌──────────────┐
│ 型材库      │  ProfileAsset      │  设计器       │
│ (Library)   │ ─────────────────> │  (Designer)  │
│             │  (crossSection)    │              │
└─────────────┘                    └──────────────┘
       │                                  │
       │ 保存/加载                         │ 读取/渲染
       ↓                                  ↓
┌──────────────────────────────────────────────────┐
│         NormalizedCrossSection                   │
│  ┌────────────────────────────────────────┐     │
│  │ outerPath: "M..." (主轮廓)             │     │
│  │ holes: ["M...", "M..."] (孔洞)         │     │
│  │ dimensions: { width, height, ... }     │     │
│  │ geometricProperties: { area, I, ... }  │     │
│  │ annotation: { by, at, ... }            │     │
│  └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

---

## 2. 核心数据结构

### 2.1 NormalizedCrossSection（契约核心）

```typescript
interface NormalizedCrossSection {
  outerPath: string; // 主轮廓（SVG path，必须闭合）
  holes: string[]; // 孔洞列表（每个必须闭合）
  dimensions: {
    width: number; // 标称宽度 (mm)
    height: number; // 标称高度 (mm)
    wallThickness: number; // 壁厚 (mm)
    origin: OriginDefinition; // 原点定义
  };
  geometricProperties?: {
    // [可选] 结构计算参数
    area: number;
    momentOfInertia: { Ix; Iy };
    sectionModulus?: { Wx; Wy };
    centroid?: { x; y };
  };
  annotation?: {
    // [可选] 追溯信息
    originalFileName: string;
    annotatedBy: string;
    annotatedAt: string;
    autoDetected?: boolean;
    confidence?: number;
    schemaVersion?: string;
  };
}
```

**关键约定**：

| 字段                      | 必填 | 约定                                                      |
| ------------------------- | ---- | --------------------------------------------------------- |
| `outerPath`               | ✅   | 必须是闭合路径（`M...Z`），坐标单位 mm                    |
| `holes`                   | ✅   | 数组（可为空），每个元素必须闭合，坐标系与 outerPath 一致 |
| `dimensions.width/height` | ✅   | 标称尺寸，用于快速检查和缩放                              |
| `dimensions.origin`       | ✅   | 默认 `{type: 'center'}`（对称型材）                       |
| `geometricProperties`     | ❌   | 仅用于结构计算，不影响渲染                                |
| `annotation`              | ❌   | 推荐填写，用于数据追溯                                    |

### 2.2 OriginDefinition（原点定义）

```typescript
type OriginDefinition =
  | { type: 'center' } // 原点在几何中心（默认，适用于对称型材）
  | { type: 'corner' } // 原点在左下角 (minX, minY)
  | { type: 'custom'; customOffset: { x; y } }; // 自定义原点
```

**决策规则**：

- **对称型材**（如 2020、3030）：使用 `center`
- **异形型材**（如 L 型）：待讨论，当前默认 `center`
- **连接件**：未来扩展为 `custom`

---

## 3. Asset 层契约（型材库）

### 3.1 ProfileAsset（完整数据）

```typescript
interface ProfileAsset {
  // 基础信息
  id: string;
  name: string;
  series: string;
  description?: string;
  thumbnailUrl?: string;

  // 几何数据（契约核心）
  crossSection: NormalizedCrossSection;

  // 材料属性
  material: {
    name: string;
    yieldStrength: number;
    density: number;
    elasticModulus: number;
    // ...
  };

  // 参数约束
  lengthConstraints: {
    min: number;
    max: number;
    default: number;
    step?: number;
  };

  // 元数据
  supportedOperations?: string[];
  metadata?: { createdAt, updatedAt, tags, ... };
}
```

**职责**：

- 型材库负责管理和持久化 ProfileAsset
- 预置型材硬编码在 `src/data/profiles/*.ts`
- 用户上传型材存储在数据库（未来扩展）

### 3.2 存储策略（混合模式）

| 来源         | 存储方式                 | 实现状态 |
| ------------ | ------------------------ | -------- |
| **预置型材** | 硬编码在 TypeScript 文件 | ✅ MVP   |
| **用户上传** | IndexedDB / 后端 API     | 🔲 STUB  |

---

## 4. SceneObject 层契约（设计器）

### 4.1 CrossSectionReference（引用方式）

设计器中的 SceneObject **不直接存储完整截面数据**，而是通过引用：

```typescript
interface CrossSectionReference {
  assetId: string; // 引用的 ProfileAsset ID
  instanceParams: {
    length: number; // 用户设置的长度
    machiningOps?: MachiningOperation[]; // 加工操作
  };
  cachedCrossSection?: NormalizedCrossSection; // [可选] 性能缓存
}
```

**设计理由**：

- ✅ **节省空间**：避免重复存储相同截面数据
- ✅ **统一更新**：修改 Asset 后所有实例自动更新
- ✅ **支持缓存**：可选的本地缓存提高性能

### 4.2 数据同步策略

```
ProfileAsset 更新
     │
     ├─> 清除 SceneObject.cachedCrossSection
     └─> 重新渲染所有引用该 Asset 的对象
```

---

## 5. 验证规则

### 5.1 必须通过的验证

| 验证项         | 检查内容                                              |
| -------------- | ----------------------------------------------------- |
| **路径闭合性** | `outerPath` 和所有 `holes` 必须以 `Z` 结束            |
| **孔洞包含性** | 所有 holes 的边界框必须在 outerPath 边界框内          |
| **尺寸一致性** | `dimensions.width/height` 与实际路径边界框匹配        |
| **原点合法性** | `origin.type` 必须是 'center' \| 'corner' \| 'custom' |
| **材料完整性** | `material.{name, density, yieldStrength}` 必须存在    |

### 5.2 可选的警告

| 警告项               | 检查内容                                      |
| -------------------- | --------------------------------------------- |
| **几何属性缺失**     | `geometricProperties` 未填写（影响结构计算）  |
| **标注信息缺失**     | `annotation` 未填写（影响数据追溯）           |
| **自动检测低置信度** | `annotation.confidence < 0.5`（建议人工复核） |

---

## 6. 版本兼容性

### 6.1 当前版本（v2.0）

- ✅ 支持 `NormalizedCrossSection` 格式
- ✅ 支持三种原点类型（center/corner/custom）
- ✅ 支持几何属性和标注信息

### 6.2 旧版本迁移（v1.x → v2.0）

**旧格式**：

```typescript
interface LegacyProfileAsset {
  id: string;
  name: string;
  svg: string; // 单个 SVG path，未区分主轮廓和孔洞
}
```

**迁移策略**：

1. **检测旧格式**：`'svg' in asset && !('crossSection' in asset)`
2. **标记需要处理**：`asset.needsNormalization = true`
3. **迁移方式**：
   - 自动检测（如果 `confidence > 0.9`）
   - 或提示用户手动标注

**迁移工具**（未来实现）：

```typescript
function migrateToV2(oldAsset: LegacyProfileAsset): ProfileAsset {
  // 1. 解析 SVG 获取所有子路径
  // 2. 尝试自动分类
  // 3. 如果置信度低，返回 needsAnnotation=true
}
```

---

## 7. 实施检查清单

### 7.1 型材库侧（Library）

- [ ] 创建 `CrossSectionEditorModal` 组件
- [ ] 实现 SVG 上传和路径检测
- [ ] 实现交互式标注工具（选择主轮廓/孔洞）
- [ ] 实现数据验证器（`CrossSectionValidator`）
- [ ] 更新 AssetService 保存/加载逻辑
- [ ] 迁移现有预置型材数据

### 7.2 设计器侧（Designer）

- [ ] 更新 `ThreeGeometryAdapter` 读取 `NormalizedCrossSection`
- [ ] 移除旧的顺序依赖解析逻辑
- [ ] 实现 `CrossSectionReference` 缓存机制
- [ ] 更新 SceneObject 创建流程
- [ ] 添加截面数据同步监听

### 7.3 测试

- [ ] 单元测试：验证器（路径闭合、孔洞包含）
- [ ] 单元测试：数据迁移工具
- [ ] 集成测试：完整编辑流程（上传→标注→保存→渲染）
- [ ] E2E 测试：从型材库拖拽到设计器

---

## 8. 示例数据

### 8.1 简单型材（2020，无孔洞）

```typescript
const profile2020: ProfileAsset = {
  id: 'profile-2020',
  name: '2020',
  series: '20-series',
  crossSection: {
    outerPath: 'M-10,-10 L10,-10 L10,10 L-10,10 Z',
    holes: [], // 无孔洞
    dimensions: {
      width: 20,
      height: 20,
      wallThickness: 1.5,
      origin: { type: 'center' },
    },
  },
  material: {
    name: '6063-T5',
    density: 2700,
    yieldStrength: 160,
    elasticModulus: 69000,
  },
  lengthConstraints: { min: 100, max: 3000, default: 500 },
};
```

### 8.2 复杂型材（带圆形中心孔）

```typescript
const profile2020WithHole: ProfileAsset = {
  id: 'profile-2020-hole',
  name: '2020（中心孔）',
  series: '20-series',
  crossSection: {
    outerPath: 'M-10,-10 L10,-10 L10,10 L-10,10 Z',
    holes: [
      // 中心圆孔（SVG arc 命令）
      'M-3,0 A3,3 0 1,0 3,0 A3,3 0 1,0 -3,0 Z',
    ],
    dimensions: {
      width: 20,
      height: 20,
      wallThickness: 1.5,
      origin: { type: 'center' },
    },
    geometricProperties: {
      area: 372, // 400 - π*3² ≈ 372 mm²
      momentOfInertia: { Ix: 11500, Iy: 11500 },
    },
    annotation: {
      originalFileName: '2020.svg',
      annotatedBy: 'system',
      annotatedAt: '2025-12-14T00:00:00Z',
      autoDetected: false,
      schemaVersion: '2.0.0',
    },
  },
  material: {
    name: '6063-T5',
    density: 2700,
    yieldStrength: 160,
    elasticModulus: 69000,
  },
  lengthConstraints: { min: 100, max: 3000, default: 500 },
};
```

---

## 9. 相关文档

- 详细设计：[CrossSectionNormalization.md](./CrossSectionNormalization.md)
- 实现代码：`src/core/contract/ProfileCrossSectionContract.ts`
- 验证器：`src/core/asset/AssetNormalizer.ts`（待实现）
- SVG 分析：`src/core/geometry/SVGAnalyzer.ts`（待实现）

---

## 10. 变更日志

| 版本 | 日期       | 变更内容                                     |
| ---- | ---------- | -------------------------------------------- |
| 2.0  | 2025-12-14 | 首次发布，引入 `NormalizedCrossSection` 格式 |
| 1.x  | -          | 旧格式（单一 `svg` 字段，已废弃）            |

---

**文档维护者**: AI Copilot  
**审核状态**: 待团队审核  
**下一步**: 开始实施 MVP（Phase 1: 数据格式和核心服务）
