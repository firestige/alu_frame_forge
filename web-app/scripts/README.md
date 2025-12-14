# 型材数据准备工具

## 📋 概述

`prepare-profile-data.mjs` 是用于将 SVG 格式的铝型材截面图转换为规范化数据的自动化工具。该工具可以：

- 🔍 **自动检测**截面的主轮廓和孔洞
- 🎯 **对称性分析**并选择合适的原点类型
- 📐 **计算几何属性**（面积、惯性矩等）
- 🎨 **生成可视化 SVG** 用于人工验证
- 📦 **输出标准化数据**（JSON 和 TypeScript）

## 🗂️ 目录结构

```
web-app/
├── src/
│   ├── assets/shape/              # 原始 SVG 文件
│   │   ├── 2020.svg               # 型材截面矢量图
│   │   ├── 3030.svg
│   │   ├── analysis/              # 生成的可视化 SVG（用于验证）
│   │   │   └── 2020-analysis.svg  # 绿色=主轮廓，红色=孔洞
│   │   └── normalized/            # 生成的归一化 JSON 数据
│   │       └── 2020-normalized.json
│   └── data/profiles/
│       ├── preset/                # 手工编写的型材定义（未来）
│       └── generated/             # 工具生成的 TypeScript 代码
│           └── 2020-profile.ts    # 可直接导入使用
└── scripts/
    ├── prepare-profile-data.mjs   # 数据准备工具
    └── README.md                  # 本文档
```

## 🚀 快速开始

### 基本用法

```bash
# 最简单：自动推断所有参数
node scripts/prepare-profile-data.mjs src/assets/shape/2020.svg

# 生成的文件：
# - src/assets/shape/analysis/2020-analysis.svg
# - src/assets/shape/normalized/2020-normalized.json
# - src/data/profiles/generated/2020-profile.ts
```

### 带参数使用

```bash
# 指定尺寸和壁厚
node scripts/prepare-profile-data.mjs src/assets/shape/3030.svg \
  --width=30 \
  --height=30 \
  --thickness=2.0

# 指定材料和输出格式
node scripts/prepare-profile-data.mjs src/assets/shape/4040.svg \
  --material=6061-T6 \
  --format=ts

# 只生成 JSON（不生成 TypeScript）
node scripts/prepare-profile-data.mjs src/assets/shape/2040.svg \
  --width=20 \
  --height=40 \
  --format=json
```

## 📖 命令行参数

### 必需参数

| 参数         | 说明         | 示例                        |
| ------------ | ------------ | --------------------------- |
| `<svg-file>` | SVG 文件路径 | `src/assets/shape/2020.svg` |

### 可选参数

| 参数                | 说明             | 默认值           | 示例                 |
| ------------------- | ---------------- | ---------------- | -------------------- |
| `--name=<name>`     | 型材名称         | 从文件名提取     | `--name=2020`        |
| `--width=<mm>`      | 标称宽度（毫米） | 自动计算         | `--width=20`         |
| `--height=<mm>`     | 标称高度（毫米） | 自动计算         | `--height=20`        |
| `--thickness=<mm>`  | 壁厚（毫米）     | `1.5`            | `--thickness=2.0`    |
| `--material=<name>` | 材料牌号         | `6063-T5`        | `--material=6061-T6` |
| `--output=<dir>`    | 输出目录         | 输入文件所在目录 | `--output=./output`  |
| `--format=<type>`   | 输出格式         | `both`           | `json`/`ts`/`both`   |
| `--help`, `-h`      | 显示帮助信息     | -                | -                    |

## 🔍 工作流程

### 1. 路径检测

工具会自动检测 SVG 中的所有闭合路径：

- `<path>` 元素（必须包含 `Z` 命令）
- `<circle>` 元素（自动转换为路径格式）

### 2. 自动分类

根据面积大小和包含关系分类：

- **主轮廓**：面积最大的路径
- **孔洞**：被主轮廓包含的较小路径

**置信度评估**：

- 🟢 **100%**：只有一个路径
- 🟢 **95%**：主轮廓面积 > 孔洞总面积 × 5 且所有孔洞被包含
- 🟡 **90%**：所有孔洞被包含
- 🔴 **50%**：存在未被包含的路径（可能是边界框计算误差）

### 3. 对称性检测

自动检测 X 轴和 Y 轴对称性：

- ✅ **对称型材**：自动使用 `center` 原点（几何中心）
- ❌ **非对称型材**：使用 `corner` 原点（左下角）

### 4. 数据生成

生成三种格式的输出：

#### a) 可视化 SVG

- **位置**：`src/assets/shape/analysis/{name}-analysis.svg`
- **用途**：人工验证自动分类是否正确
- **标注**：
  - 🟢 **绿色**（半透明）= 主轮廓（需要拉伸的实体）
  - 🔴 **红色**（半透明）= 孔洞（需要挖空的部分）

#### b) 归一化 JSON

- **位置**：`src/assets/shape/normalized/{name}-normalized.json`
- **用途**：数据交换、备份、调试
- **格式**：符合 `NormalizedCrossSection` 契约

#### c) TypeScript 代码

- **位置**：`src/data/profiles/generated/{name}-profile.ts`
- **用途**：可直接导入到代码中使用
- **内容**：
  - `profile{Name}Normalized: NormalizedCrossSection` - 截面数据
  - `profile{Name}Asset: ProfileAsset` - 完整型材资产（含材料、约束等）

## 📊 输出数据结构

### NormalizedCrossSection

```typescript
{
  outerPath: string,              // 主轮廓 SVG 路径
  holes: string[],                // 孔洞路径数组
  dimensions: {
    width: number,                // 标称宽度（mm）
    height: number,               // 标称高度（mm）
    wallThickness: number,        // 壁厚（mm）
    origin: {
      type: 'center' | 'corner'   // 原点类型
    }
  },
  geometricProperties: {
    area: number,                 // 净面积（mm²）
    momentOfInertia: {
      Ix: number,                 // X轴惯性矩（mm⁴）
      Iy: number                  // Y轴惯性矩（mm⁴）
    }
  },
  annotation: {
    originalFileName: string,     // 原始文件名
    annotatedBy: string,          // 标注者（'auto-classifier'）
    annotatedAt: string,          // 标注时间（ISO 8601）
    autoDetected: boolean,        // 是否自动检测
    confidence: number,           // 置信度（0-1）
    schemaVersion: string,        // 数据模式版本
    notes: string                 // 附加说明
  }
}
```

## ✅ 验证流程

### 1. 运行工具

```bash
node scripts/prepare-profile-data.mjs src/assets/shape/2020.svg
```

### 2. 检查控制台输出

观察工具的分析结果：

```
🔍 步骤 3: 对称性检测
   X轴对称: ✅
   Y轴对称: ✅
   孔洞对称: ✅
   整体对称: ✅ 是
   建议原点: center（中心）

📦 步骤 4: 生成归一化数据
   型材名称: 2020
   尺寸: 20 x 20 mm
   壁厚: 1.5 mm
   净面积: 104800.38 mm²
   原点类型: center
```

### 3. 验证可视化 SVG

打开 `src/assets/shape/analysis/2020-analysis.svg`：

- ✅ 绿色区域是否覆盖了主轮廓？
- ✅ 红色区域是否只覆盖了孔洞？
- ❌ 如有错误，需要手动调整数据或修改原始 SVG

### 4. 使用生成的代码

```typescript
// 在代码中导入
import { profile2020Asset } from '@/data/profiles/generated/2020-profile';

// 使用型材数据
const asset = profile2020Asset;
console.log(asset.crossSection.dimensions); // { width: 20, height: 20, ... }
```

## ⚠️ 注意事项

### SVG 要求

1. **必须是闭合路径**
   - `<path>` 元素必须以 `Z` 结尾
   - `<circle>` 元素会自动转换为闭合路径

2. **坐标系统**
   - 建议使用标准 SVG 坐标系（左上角为原点）
   - viewBox 应该包含完整的截面图形

3. **单位一致性**
   - SVG 内部坐标是任意单位
   - 通过 `--width` 和 `--height` 指定实际物理尺寸（毫米）

### 自动分类限制

1. **边界框计算**
   - 当前使用简化算法，可能对复杂曲线有误差
   - 如果置信度 < 90%，务必人工验证可视化 SVG

2. **包含判断**
   - 仅检查边界框包含关系，不检查实际几何包含
   - 对于复杂凹形轮廓可能误判

3. **对称性检测**
   - 仅检查边界框对称性和孔洞中心位置
   - 不验证路径的镜像对称性

### 手动调整

如果自动分类有误，可以：

1. 直接编辑生成的 JSON 文件
2. 手动调整生成的 TypeScript 代码
3. 修改原始 SVG（调整路径顺序、添加标识等）

## 🎯 典型使用场景

### 场景 1：批量处理预制型材

```bash
# 批量处理所有 20 系列型材
for file in src/assets/shape/20*.svg; do
  node scripts/prepare-profile-data.mjs "$file"
done
```

### 场景 2：自定义非标型材

```bash
# 处理非标型材，指定所有参数
node scripts/prepare-profile-data.mjs src/assets/shape/custom-profile.svg \
  --name=CustomProfile \
  --width=25 \
  --height=35 \
  --thickness=1.8 \
  --material=6061-T6
```

### 场景 3：仅生成验证图

```bash
# 只生成 JSON 用于验证，不生成 TypeScript
node scripts/prepare-profile-data.mjs src/assets/shape/test.svg \
  --format=json
```

## 🤖 AI 使用指南

当 AI 助手需要处理型材数据时：

### 1. 检查现有数据

```typescript
// 检查是否已有生成的型材数据
// 位置：src/data/profiles/generated/{name}-profile.ts
```

### 2. 运行工具生成新数据

```bash
# 使用 run_in_terminal 工具
node scripts/prepare-profile-data.mjs src/assets/shape/{name}.svg [options]
```

### 3. 验证生成结果

- 读取控制台输出，检查对称性和置信度
- 如果置信度 < 90%，提醒用户验证可视化 SVG
- 读取生成的 TypeScript 文件确认数据正确性

### 4. 集成到代码

- 将生成的 TypeScript 文件导入到型材库模块
- 如果需要，创建索引文件聚合所有型材

### 示例 AI 工作流

```typescript
// 1. 用户请求："帮我准备 3030 型材的数据"

// 2. AI 检查文件是否存在
// file_search: src/assets/shape/3030.svg

// 3. AI 运行工具
// run_in_terminal: node scripts/prepare-profile-data.mjs src/assets/shape/3030.svg --width=30 --height=30

// 4. AI 读取生成的文件
// read_file: src/data/profiles/generated/3030-profile.ts

// 5. AI 确认并告知用户
// "✅ 已生成 3030 型材数据，对称性检测通过，置信度 95%"
```

## 📝 数据契约

本工具生成的数据严格遵循 `ProfileCrossSectionContract` 契约：

- **契约定义**：`src/core/contract/ProfileCrossSectionContract.ts`
- **契约文档**：`doc/design/ProfileCrossSectionContract-README.md`
- **架构设计**：`doc/design/CrossSectionNormalization.md`

所有生成的数据都经过以下验证：

- ✅ 路径格式正确（SVG 路径字符串）
- ✅ 尺寸数据完整（宽、高、壁厚）
- ✅ 原点类型有效（center/corner）
- ✅ 几何属性合理（面积 > 0）
- ✅ 注释元数据完整（时间戳、版本号等）

## 🔧 故障排除

### 问题：工具找不到闭合路径

**原因**：SVG 路径未闭合（缺少 `Z` 命令）

**解决**：

1. 在 SVG 编辑器中检查路径是否闭合
2. 手动在路径数据末尾添加 `Z`

### 问题：置信度过低（< 50%）

**原因**：边界框计算误差，孔洞看似不在轮廓内

**解决**：

1. 打开可视化 SVG 人工验证
2. 如果标注正确，可忽略置信度警告
3. 如果标注错误，检查 SVG 路径顺序

### 问题：对称性检测错误

**原因**：SVG 坐标系不标准，或存在微小偏差

**解决**：

1. 在 SVG 编辑器中对齐几何中心
2. 手动编辑生成的 JSON，修改 `origin.type`

### 问题：尺寸推断不准确

**原因**：型材命名不规范，无法从文件名推断

**解决**：

1. 使用 `--width` 和 `--height` 显式指定尺寸
2. 重命名 SVG 文件为标准格式（如 `2020.svg`, `2040.svg`）

## 📚 相关文档

- [ProfileCrossSectionContract 契约文档](../doc/design/ProfileCrossSectionContract-README.md)
- [截面归一化架构设计](../doc/design/CrossSectionNormalization.md)
- [核心架构文档](../doc/Architecture.md)

## 🆘 获取帮助

```bash
# 查看完整帮助信息
node scripts/prepare-profile-data.mjs --help
```

---

**最后更新**：2025-12-14  
**工具版本**：2.0  
**契约版本**：2.0.0
