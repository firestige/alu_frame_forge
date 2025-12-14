# 截面归一化系统设计文档

**文档版本**: 1.0  
**创建日期**: 2025-12-14  
**设计状态**: 规划中

---

## 1. 问题定义

### 1.1 当前架构缺陷

**问题描述**：当前 SVG 多路径解析采用"顺序依赖"策略：

- 第一个闭合路径（`M...Z`）被视为外轮廓（需要拉伸）
- 其余闭合路径被视为孔洞（需要挖空）

**风险点**：

1. **CAD 软件导出差异**：不同软件（AutoCAD、Fusion 360、Inkscape）导出的 SVG 路径顺序不一致
2. **用户手写 SVG**：无法保证用户遵循特定书写约定
3. **编辑器重排**：某些 SVG 编辑器可能自动优化路径顺序
4. **调试困难**：渲染结果错误时难以定位是路径数据问题还是解析逻辑问题

### 1.2 设计目标

**核心原则**：

> "不依赖隐式约定，用户明确指定语义"

**具体目标**：

1. 建立标准化的截面数据格式（`NormalizedCrossSection`）
2. 提供交互式工具让用户标注路径语义（主轮廓 vs 孔洞）
3. 支持混合存储策略（预置硬编码 + 用户上传数据库）
4. 预留未来扩展能力（自动检测、智能定位）

---

## 2. 架构方案

### 2.1 数据格式设计

#### 2.1.1 核心数据结构

```typescript
/**
 * 归一化的截面数据格式
 * 明确区分主轮廓和孔洞，去除解析时的歧义
 */
interface NormalizedCrossSection {
  /** 主轮廓路径（必须唯一） */
  outerPath: string;

  /** 孔洞路径列表（可有多个） */
  holes: string[];

  /** 尺寸元数据 */
  dimensions: {
    /** 截面宽度（mm） */
    width: number;

    /** 截面高度（mm） */
    height: number;

    /** 中心点 X 坐标（相对于 outerPath） */
    centerX: number;

    /** 中心点 Y 坐标（相对于 outerPath） */
    centerY: number;
  };

  /** 标注信息（用于追溯和审计） */
  annotation?: {
    /** 原始文件名 */
    originalFileName: string;

    /** 标注者（用户名或系统标识） */
    annotatedBy: string;

    /** 标注时间 */
    annotatedAt: Date;

    /** 是否由自动检测生成（未来扩展） */
    autoDetected?: boolean;

    /** 自动检测置信度（0-1，未来扩展） */
    confidence?: number;
  };
}
```

#### 2.1.2 Asset 数据模型更新

```typescript
// src/domain/Asset.ts

interface AluminumExtrusionAsset {
  id: string;
  name: string;
  description?: string;

  /** 归一化的截面数据（替代原来的 svg 字段） */
  crossSection: NormalizedCrossSection;

  /** 其他参数... */
  parameters: {
    length: { min: number; max: number; default: number };
    // ...
  };
}
```

#### 2.1.3 向后兼容策略

```typescript
// 支持旧格式自动检测并标记需要迁移
interface LegacyAluminumExtrusionAsset {
  id: string;
  name: string;
  svg: string; // 旧格式

  /** 迁移标记 */
  needsNormalization?: boolean;
}

// 迁移工具函数
function detectLegacyAsset(asset: any): asset is LegacyAluminumExtrusionAsset {
  return 'svg' in asset && !('crossSection' in asset);
}
```

### 2.2 模块划分

#### 模块关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      Library Page (库页面)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CrossSectionEditorModal (截面编辑模态窗)            │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │ SVG Upload  │→ │ Path Viewer  │→ │ Annotator │  │   │
│  │  └─────────────┘  └──────────────┘  └───────────┘  │   │
│  │         ↓                  ↓                ↓       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │        AssetNormalizer Service               │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │  NormalizedCrossSection Data  │
              └───────────────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │    Designer Rendering         │
              │  (ThreeGeometryAdapter)       │
              └───────────────────────────────┘
```

#### 模块1: SVG 分析服务 `SVGAnalyzer`

**职责**：解析 SVG 并提取所有闭合路径

**位置**：`src/core/geometry/SVGAnalyzer.ts`

```typescript
export interface ClosedPath {
  /** 路径的 SVG path 数据（单个 M...Z 序列） */
  pathData: string;

  /** 边界框 */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };

  /** 面积（用于未来自动检测） */
  area: number;

  /** 唯一标识（用于 UI 选择） */
  id: string;
}

export interface SVGAnalysisResult {
  /** 检测到的所有闭合路径 */
  paths: ClosedPath[];

  /** 原始 SVG viewBox */
  viewBox: { width: number; height: number };
}

export class SVGAnalyzer {
  /**
   * 检测所有闭合路径
   * 通过识别 M 命令定位子路径，Z 命令确认闭合
   */
  detectClosedPaths(svgPath: string): ClosedPath[];

  /**
   * 分析单个路径的几何信息
   * 计算边界框、面积、质心等
   */
  analyzeGeometry(pathData: string): GeometryInfo;

  /**
   * [STUB] 自动分类算法（未来扩展）
   * 基于面积、包含关系等启发式规则
   */
  autoClassify(paths: ClosedPath[]): AutoClassification;
}
```

**实现策略**：

- 复用现有 `SVGPathParser` 的路径解析逻辑
- 扩展边界框和面积计算能力
- 自动分类功能标记为 STUB（未来实现）

#### 模块2: 截面编辑器 UI `CrossSectionEditorModal`

**职责**：提供交互式标注工具

**位置**：`src/features/library/components/CrossSectionEditorModal.tsx`

```typescript
interface CrossSectionEditorModalProps {
  /** 当前编辑的 Asset（可选，新建时为空） */
  asset?: AluminumExtrusionAsset;

  /** 是否显示模态窗 */
  open: boolean;

  /** 关闭回调 */
  onClose: () => void;

  /** 保存回调 */
  onSave: (normalizedData: NormalizedCrossSection) => void;
}

export function CrossSectionEditorModal(props: CrossSectionEditorModalProps) {
  // 1. SVG 上传区
  // 2. 路径可视化预览（Canvas 2D 渲染）
  // 3. 路径列表（显示面积、边界框）
  // 4. 选择工具：
  //    - 单选：选择主轮廓（高亮绿色）
  //    - 多选：选择孔洞（高亮红色）
  // 5. 尺寸输入（width, height, centerX, centerY）
  // 6. 预览按钮（调用 ThreeGeometryAdapter 临时渲染）
  // 7. 保存按钮
}
```

**UI 设计草图**：

```
┌────────────────────────────────────────────────┐
│  创建/编辑截面 - 2020 型材                     │
├────────────────────────────────────────────────┤
│ 1. 上传 SVG                                    │
│   [选择文件] 或 拖拽到此处                     │
│                                                │
│ 2. 路径预览                                    │
│   ┌──────────────────────┐                    │
│   │   Canvas 2D 渲染     │  ← 显示所有路径   │
│   │   (可缩放/平移)      │     不同颜色区分   │
│   └──────────────────────┘                    │
│                                                │
│ 3. 路径标注                                    │
│   ┌──────────────────────────────────────┐   │
│   │ ○ 路径 1  面积: 356²   [选为主轮廓]  │   │
│   │ ○ 路径 2  面积: 44²    [选为孔洞]    │   │
│   └──────────────────────────────────────┘   │
│                                                │
│ 4. 尺寸设置                                    │
│   宽度: [20] mm   高度: [20] mm               │
│   中心 X: [0] mm   中心 Y: [0] mm             │
│                                                │
│ 5. 操作                                        │
│   [预览 3D]  [保存]  [取消]                   │
└────────────────────────────────────────────────┘
```

#### 模块3: 归一化服务 `AssetNormalizer`

**职责**：生成和验证归一化数据

**位置**：`src/core/asset/AssetNormalizer.ts`

```typescript
export class AssetNormalizer {
  /**
   * 从用户标注生成归一化格式
   */
  normalize(
    outerPathId: string,
    holePathIds: string[],
    allPaths: ClosedPath[],
    dimensions: Dimensions,
    metadata?: AnnotationMetadata
  ): NormalizedCrossSection {
    const outer = allPaths.find(p => p.id === outerPathId);
    const holes = allPaths.filter(p => holePathIds.includes(p.id));

    return {
      outerPath: outer.pathData,
      holes: holes.map(h => h.pathData),
      dimensions,
      annotation: metadata,
    };
  }

  /**
   * 验证归一化数据的完整性
   */
  validate(data: NormalizedCrossSection): ValidationResult {
    // 检查：
    // 1. outerPath 必须是有效的闭合路径
    // 2. holes 中所有路径必须闭合
    // 3. dimensions 必须为正数
    // 4. holes 的 bbox 必须在 outerPath 的 bbox 内（可选，严格模式）
  }

  /**
   * [STUB] 从旧格式迁移
   */
  migrateFromLegacy(
    asset: LegacyAluminumExtrusionAsset
  ): AluminumExtrusionAsset {
    // 未来实现：尝试自动检测或标记需要人工标注
    throw new Error('Migration requires manual annotation');
  }
}
```

### 2.3 数据存储策略

#### 2.3.1 混合模式设计

```typescript
// 策略接口
interface CrossSectionStorage {
  save(data: NormalizedCrossSection): Promise<void>;
  load(assetId: string): Promise<NormalizedCrossSection>;
  list(): Promise<AssetMetadata[]>;
}

// 预置数据存储（硬编码在代码中）
class PresetCrossSectionStorage implements CrossSectionStorage {
  // 数据直接来自 src/data/profiles/*.ts
  // 编译时打包，无需运行时加载
}

// 用户数据存储（IndexedDB，未来扩展）
class UserCrossSectionStorage implements CrossSectionStorage {
  // [STUB] 当前阶段不实现
  // 未来使用 IndexedDB 或后端 API
}

// 组合策略
class HybridCrossSectionStorage implements CrossSectionStorage {
  constructor(
    private preset: PresetCrossSectionStorage,
    private user: UserCrossSectionStorage
  ) {}

  async load(assetId: string): Promise<NormalizedCrossSection> {
    // 优先从预置加载
    try {
      return await this.preset.load(assetId);
    } catch {
      // 回退到用户数据
      return await this.user.load(assetId);
    }
  }
}
```

#### 2.3.2 预置数据示例

```typescript
// src/data/profiles/20-series.ts

export const profile2020Normalized: NormalizedCrossSection = {
  outerPath: 'M344.82,123.28v-8.9h11.57V27.19c0-14.74-11.95-26.69...',
  holes: ['M178.44,222.93c-24.57,0-44.49-19.92-44.49-44.49s19.92-44.49...'],
  dimensions: {
    width: 20,
    height: 20,
    centerX: 0,
    centerY: 0,
  },
  annotation: {
    originalFileName: '2020.svg',
    annotatedBy: 'system',
    annotatedAt: new Date('2025-12-14'),
    autoDetected: false,
  },
};

export const series20Profiles: AluminumExtrusionAsset[] = [
  {
    id: 'profile-2020',
    name: '2020',
    description: '20x20mm 标准型材',
    crossSection: profile2020Normalized,
    parameters: {
      length: { min: 100, max: 3000, default: 500 },
    },
  },
];
```

---

## 3. 实施计划

### 3.1 MVP 阶段（必须完成）

#### Phase 1: 数据格式和核心服务（1-2天）

- [ ] 定义 `NormalizedCrossSection` 接口
- [ ] 更新 `AluminumExtrusionAsset` 数据模型
- [ ] 实现 `SVGAnalyzer.detectClosedPaths()`
- [ ] 实现 `AssetNormalizer.normalize()`
- [ ] 实现 `AssetNormalizer.validate()`

#### Phase 2: UI 组件开发（2-3天）

- [ ] 创建 `CrossSectionEditorModal` 骨架
- [ ] 实现 SVG 文件上传功能
- [ ] 实现 Canvas 2D 路径可视化
- [ ] 实现路径选择交互（主轮廓/孔洞标注）
- [ ] 实现尺寸输入表单
- [ ] 集成 3D 预览功能

#### Phase 3: 数据迁移和集成（1天）

- [ ] 手动标注现有预置型材（2020, 3030, 4040 等）
- [ ] 生成归一化数据文件
- [ ] 更新 `ThreeGeometryAdapter` 读取归一化格式
- [ ] 移除旧的顺序依赖解析逻辑

#### Phase 4: 测试和文档（1天）

- [ ] 单元测试：`SVGAnalyzer`, `AssetNormalizer`
- [ ] 集成测试：完整编辑流程
- [ ] E2E 测试：从上传到渲染
- [ ] 更新用户文档

### 3.2 STUB 特性（未来扩展）

#### 自动检测算法（Phase 5, 未来）

```typescript
// src/core/geometry/SVGAutoClassifier.ts

interface AutoClassification {
  outerCandidate: ClosedPath;
  holeCandidates: ClosedPath[];
  confidence: number; // 0-1
  reasoning: string; // 解释决策依据
}

class SVGAutoClassifier {
  /**
   * 基于几何特征自动分类路径
   * 启发式规则：
   * 1. 面积最大的是外轮廓
   * 2. 被包含的是孔洞
   * 3. 检查拓扑一致性
   */
  classify(paths: ClosedPath[]): AutoClassification {
    // 1. 按面积排序
    const sorted = [...paths].sort((a, b) => b.area - a.area);
    const outerCandidate = sorted[0];

    // 2. 检查包含关系
    const holes = sorted
      .slice(1)
      .filter(p => this.isContainedIn(p.bbox, outerCandidate.bbox));

    // 3. 计算置信度
    const confidence = this.calculateConfidence(outerCandidate, holes, paths);

    return { outerCandidate, holeCandidates: holes, confidence };
  }

  private isContainedIn(inner: BBox, outer: BBox): boolean {
    return (
      inner.minX >= outer.minX &&
      inner.maxX <= outer.maxX &&
      inner.minY >= outer.minY &&
      inner.maxY <= outer.maxY
    );
  }

  private calculateConfidence(
    outer: ClosedPath,
    holes: ClosedPath[],
    allPaths: ClosedPath[]
  ): number {
    // 启发式规则：
    // - 如果只有1个路径：置信度 100%
    // - 如果外轮廓面积 > 所有孔洞面积总和的5倍：置信度 90%
    // - 如果所有孔洞都被包含：置信度 +10%
    // - 否则：置信度 50%（需要人工确认）
  }
}
```

#### 用户数据存储（Phase 6, 未来）

```typescript
// src/core/asset/storage/IndexedDBStorage.ts

class UserCrossSectionStorage {
  private db: IDBDatabase;

  async save(assetId: string, data: NormalizedCrossSection): Promise<void> {
    const transaction = this.db.transaction(['crossSections'], 'readwrite');
    const store = transaction.objectStore('crossSections');
    await store.put({ id: assetId, data, updatedAt: new Date() });
  }

  async load(assetId: string): Promise<NormalizedCrossSection> {
    const transaction = this.db.transaction(['crossSections'], 'readonly');
    const store = transaction.objectStore('crossSections');
    const result = await store.get(assetId);
    return result?.data;
  }
}
```

#### 智能坐标系定位（Phase 7, 未来）

**待讨论问题**：

1. **对称型材**（如 2020）：原点放在几何中心
   - 自动检测：边界框中心即可
2. **异形型材**（如 L 型、T 型）：原点放在功能基准面
   - 可能方案：
     - A. 让用户手动拖动原点到合适位置
     - B. 提供预设（左下角、质心、最长边中点等）
     - C. 根据型材类型自动选择策略
3. **连接件型材**：原点放在配合基准
   - 需要专门的标注工具（标记配合孔位置）

**决策点**：

- MVP 阶段：默认使用几何中心，手动覆盖
- 未来：根据型材分类提供智能建议

---

## 4. 风险与缓解

| 风险                      | 影响 | 概率 | 缓解措施                              |
| ------------------------- | ---- | ---- | ------------------------------------- |
| SVG 解析复杂度超预期      | 高   | 中   | 复用现有 SVGPathParser，渐进式增强    |
| UI 交互设计不符合用户习惯 | 中   | 中   | 参考 Inkscape/Figma 的路径选择交互    |
| 预置数据迁移工作量大      | 低   | 高   | 当前仅 3-5 个预置型材，手动标注可接受 |
| 自动检测算法准确率不足    | 低   | 低   | MVP 不依赖自动检测，作为辅助功能      |
| 原点定位策略难以统一      | 中   | 高   | 保留为待讨论问题，MVP 使用几何中心    |

---

## 5. 成功指标

### 5.1 功能性指标

- [ ] 用户可在 5 分钟内完成一个截面的标注
- [ ] 归一化数据通过 100% 的验证测试
- [ ] 现有所有预置型材完成迁移且渲染正确

### 5.2 技术指标

- [ ] SVGAnalyzer 单元测试覆盖率 > 80%
- [ ] AssetNormalizer 单元测试覆盖率 > 90%
- [ ] E2E 测试覆盖完整编辑流程

### 5.3 可维护性指标

- [ ] 新增型材无需修改核心解析逻辑
- [ ] 代码审查通过（无硬编码、无魔法值）
- [ ] 文档完整（API 文档 + 用户指南）

---

## 6. 相关资源

### 6.1 参考资料

- [SVG Path Specification](https://www.w3.org/TR/SVG/paths.html)
- [Three.js Shape and Path](https://threejs.org/docs/#api/en/extras/core/Shape)
- [Inkscape Path Operations](https://inkscape-manuals.readthedocs.io/en/latest/path-operations.html)

### 6.2 相关设计文档

- [CoreArchitecture.md](./CoreArchitecture.md) - 核心架构设计
- [StorageSystem.md](./StorageSystem.md) - 存储系统设计
- [RenderingSystem.md](./RenderingSystem.md) - 渲染系统设计

### 6.3 实现文件索引

实施后更新：

- 数据模型：`src/domain/Asset.ts`
- 分析服务：`src/core/geometry/SVGAnalyzer.ts`
- 归一化服务：`src/core/asset/AssetNormalizer.ts`
- UI 组件：`src/features/library/components/CrossSectionEditorModal.tsx`
- 预置数据：`src/data/profiles/*.ts`

---

**文档维护**：

- 阶段性更新实施进度
- 记录设计决策和取舍
- 同步代码实现和文档描述
