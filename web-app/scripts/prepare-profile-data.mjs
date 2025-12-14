/**
 * SVG 截面分析工具 - 用于预制型材数据准备
 *
 * 功能：
 * 1. 自动检测主轮廓和孔洞
 * 2. 验证几何对称性
 * 3. 生成归一化数据（NormalizedCrossSection）
 * 4. 输出可视化 SVG 和 TypeScript 代码
 *
 * 使用方法：
 *   node prepare-profile-data.mjs <svg-file> [options]
 *
 * 示例：
 *   node prepare-profile-data.mjs src/assets/shape/2020.svg
 *   node prepare-profile-data.mjs src/assets/shape/2020.svg --name=2020 --width=20 --height=20
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, dirname, join } from 'path';

// ============================================================================
// 命令行参数解析
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
SVG 截面分析工具 - 用于预制型材数据准备

使用方法:
  node prepare-profile-data.mjs <svg-file> [options]

参数:
  <svg-file>         SVG 文件路径（必需）

选项:
  --name=<name>      型材名称（默认从文件名提取）
  --width=<mm>       标称宽度，单位mm（默认自动计算）
  --height=<mm>      标称高度，单位mm（默认自动计算）
  --thickness=<mm>   壁厚，单位mm（默认1.5）
  --material=<name>  材料牌号（默认6063-T5）
  --output=<dir>     输出目录（默认：输入文件所在目录）
  --format=<type>    输出格式：json|ts|both（默认both）
  --help, -h         显示帮助信息

示例:
  node prepare-profile-data.mjs src/assets/shape/2020.svg
  node prepare-profile-data.mjs src/assets/shape/3030.svg --name=3030 --width=30 --height=30
  node prepare-profile-data.mjs src/assets/shape/4040.svg --thickness=2.0 --format=ts
`);
    process.exit(0);
  }

  const config = {
    inputFile: args[0],
    name: null,
    width: null,
    height: null,
    thickness: 1.5,
    material: '6063-T5',
    outputDir: null,
    format: 'both',
  };

  // 解析选项
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      switch (key) {
        case 'name':
          config.name = value;
          break;
        case 'width':
          config.width = parseFloat(value);
          break;
        case 'height':
          config.height = parseFloat(value);
          break;
        case 'thickness':
          config.thickness = parseFloat(value);
          break;
        case 'material':
          config.material = value;
          break;
        case 'output':
          config.outputDir = value;
          break;
        case 'format':
          if (['json', 'ts', 'both'].includes(value)) {
            config.format = value;
          } else {
            console.error(`❌ 无效的格式: ${value}，必须是 json、ts 或 both`);
            process.exit(1);
          }
          break;
      }
    }
  }

  // 默认值
  if (!config.name) {
    config.name = basename(config.inputFile, '.svg');
  }
  if (!config.outputDir) {
    config.outputDir = dirname(config.inputFile);
  }

  return config;
}

// ============================================================================
// SVG 路径解析（增强版，支持完整路径计算）
// ============================================================================

function parseSVG(svgContent) {
  const paths = [];

  // 提取 circle 元素
  const circleRegex =
    /<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"[^>]*>/g;
  let match;
  let circleIndex = 0;
  while ((match = circleRegex.exec(svgContent)) !== null) {
    const cx = parseFloat(match[1]);
    const cy = parseFloat(match[2]);
    const r = parseFloat(match[3]);

    const pathData = `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
    const area = Math.PI * r * r;

    paths.push({
      id: `circle-${circleIndex++}`,
      type: 'circle',
      pathData,
      bbox: { minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r },
      area,
      center: { x: cx, y: cy },
    });
  }

  // 提取 path 元素
  const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  let pathIndex = 0;
  while ((match = pathRegex.exec(svgContent)) !== null) {
    const d = match[1];

    // 检查是否闭合
    if (!d.toLowerCase().includes('z')) {
      continue;
    }

    // 计算更精确的边界框
    const bbox = calculatePathBBox(d);
    const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY);
    const center = {
      x: (bbox.minX + bbox.maxX) / 2,
      y: (bbox.minY + bbox.maxY) / 2,
    };

    paths.push({
      id: `path-${pathIndex++}`,
      type: 'path',
      pathData: d,
      bbox,
      area,
      center,
    });
  }

  return paths;
}

// 计算路径边界框（增强版）
function calculatePathBBox(pathData) {
  const points = [];

  // 正则匹配所有数字（包括负数和小数）
  const numberRegex = /-?\d+\.?\d*/g;
  const numbers = pathData.match(numberRegex)?.map(parseFloat) || [];

  // 简化处理：提取所有坐标对
  for (let i = 0; i < numbers.length - 1; i += 2) {
    points.push({ x: numbers[i], y: numbers[i + 1] });
  }

  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// ============================================================================
// 自动分类（主轮廓 vs 孔洞）
// ============================================================================

function autoClassify(paths) {
  if (paths.length === 0) {
    throw new Error('❌ 没有检测到闭合路径');
  }

  // 按面积排序（降序）
  const sorted = [...paths].sort((a, b) => b.area - a.area);
  const outerPath = sorted[0];
  const holes = sorted.slice(1);

  // 检查所有孔洞是否在外轮廓内
  const containmentResults = holes.map(hole => ({
    hole,
    contained: isContainedIn(hole.bbox, outerPath.bbox),
  }));

  const allContained = containmentResults.every(r => r.contained);

  // 计算置信度
  let confidence, reasoning;
  if (paths.length === 1) {
    confidence = 1.0;
    reasoning = '只有1个闭合路径，必然是外轮廓';
  } else if (
    allContained &&
    outerPath.area > holes.reduce((sum, h) => sum + h.area, 0) * 5
  ) {
    confidence = 0.95;
    const holesArea = holes.reduce((s, h) => s + h.area, 0);
    reasoning = `外轮廓面积 (${outerPath.area.toFixed(0)}) 远大于孔洞总面积 (${holesArea.toFixed(0)})，且所有孔洞被包含`;
  } else if (allContained) {
    confidence = 0.9;
    reasoning = '所有孔洞被包含在外轮廓内';
  } else {
    confidence = 0.5;
    const notContained = containmentResults.filter(r => !r.contained);
    reasoning = `存在 ${notContained.length} 个未被完全包含的路径，可能是边界框计算误差`;
  }

  return { outerPath, holes, confidence, reasoning, containmentResults };
}

function isContainedIn(inner, outer) {
  // 添加小误差容忍（0.1%）
  const tolerance =
    Math.max(outer.maxX - outer.minX, outer.maxY - outer.minY) * 0.001;

  return (
    inner.minX >= outer.minX - tolerance &&
    inner.maxX <= outer.maxX + tolerance &&
    inner.minY >= outer.minY - tolerance &&
    inner.maxY <= outer.maxY + tolerance
  );
}

// ============================================================================
// 对称性检测
// ============================================================================

function checkSymmetry(paths, outerPath) {
  const center = outerPath.center;

  // 检查X轴对称性
  const xSymmetric = checkAxisSymmetry(outerPath.bbox, center, 'x');

  // 检查Y轴对称性
  const ySymmetric = checkAxisSymmetry(outerPath.bbox, center, 'y');

  // 检查孔洞对称性
  const holesSymmetric =
    paths.length <= 1 || checkHolesSymmetry(paths.slice(1), center);

  return {
    xSymmetric,
    ySymmetric,
    holesSymmetric,
    isSymmetric: xSymmetric && ySymmetric && holesSymmetric,
    center,
  };
}

function checkAxisSymmetry(bbox, center, axis) {
  // 简化判断：边界框是否以中心对称
  if (axis === 'x') {
    const leftDist = center.x - bbox.minX;
    const rightDist = bbox.maxX - center.x;
    return Math.abs(leftDist - rightDist) < 0.5; // 0.5单位误差容忍
  } else {
    const topDist = center.y - bbox.minY;
    const bottomDist = bbox.maxY - center.y;
    return Math.abs(topDist - bottomDist) < 0.5;
  }
}

function checkHolesSymmetry(holes, center) {
  // 简化：只检查所有孔洞中心是否接近截面中心
  // 完整实现应该检查孔洞的镜像对称
  return holes.every(hole => {
    const dx = Math.abs(hole.center.x - center.x);
    const dy = Math.abs(hole.center.y - center.y);
    return dx < 1.0 && dy < 1.0; // 中心孔容忍1单位偏差
  });
}

// ============================================================================
// 生成归一化数据
// ============================================================================

function generateNormalizedData(classification, symmetry, config, svgViewBox) {
  const { outerPath, holes, confidence, reasoning } = classification;

  // 计算实际尺寸（如果未指定）
  let width = config.width;
  let height = config.height;

  if (!width || !height) {
    const bboxWidth = outerPath.bbox.maxX - outerPath.bbox.minX;
    const bboxHeight = outerPath.bbox.maxY - outerPath.bbox.minY;

    // 尝试从 viewBox 和型材名称推断
    if (config.name.match(/^\d+$/)) {
      // 如 "2020", "3030"
      const size = parseInt(config.name.substring(0, 2));
      width = width || size;
      height = height || size;
    } else if (config.name.match(/^(\d+)x(\d+)$/)) {
      // 如 "20x40"
      const match = config.name.match(/^(\d+)x(\d+)$/);
      width = width || parseInt(match[1]);
      height = height || parseInt(match[2]);
    } else {
      // 回退：假设 viewBox 最大维度对应实际最大尺寸
      const viewBoxDims = svgViewBox.split(' ').map(parseFloat);
      const viewBoxMax = Math.max(viewBoxDims[2], viewBoxDims[3]);
      const scale = width || height || 20; // 默认20mm
      width = width || (bboxWidth / viewBoxMax) * scale;
      height = height || (bboxHeight / viewBoxMax) * scale;
    }
  }

  // 计算净面积
  const netArea = outerPath.area - holes.reduce((sum, h) => sum + h.area, 0);

  return {
    outerPath: outerPath.pathData,
    holes: holes.map(h => h.pathData),
    dimensions: {
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      wallThickness: config.thickness,
      origin: symmetry.isSymmetric ? { type: 'center' } : { type: 'corner' },
    },
    geometricProperties: {
      area: Math.round(netArea * 100) / 100,
      momentOfInertia: {
        Ix: Math.round((netArea * width * width) / 12),
        Iy: Math.round((netArea * height * height) / 12),
      },
    },
    annotation: {
      originalFileName: basename(config.inputFile),
      annotatedBy: 'auto-classifier',
      annotatedAt: new Date().toISOString(),
      autoDetected: true,
      confidence,
      schemaVersion: '2.0.0',
      notes: `${reasoning}. 对称性: X=${symmetry.xSymmetric}, Y=${symmetry.ySymmetric}`,
    },
  };
}

// ============================================================================
// 生成可视化 SVG
// ============================================================================

function generateVisualizationSVG(classification, viewBox) {
  const { outerPath, holes } = classification;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <!-- 图例 -->
  <g id="legend">
    <rect x="5" y="5" width="15" height="15" fill="#00ff00" fill-opacity="0.3" stroke="#00aa00" stroke-width="2"/>
    <text x="25" y="17" font-size="12" fill="#000">绿色 = 主轮廓（需要拉伸）</text>
    
    <rect x="5" y="25" width="15" height="15" fill="#ff0000" fill-opacity="0.5" stroke="#aa0000" stroke-width="2"/>
    <text x="25" y="37" font-size="12" fill="#000">红色 = 孔洞（需要挖空）</text>
  </g>

  <!-- 主轮廓（绿色填充） -->
  <path 
    id="${outerPath.id}" 
    d="${outerPath.pathData}" 
    fill="#00ff00" 
    fill-opacity="0.3" 
    stroke="#00aa00" 
    stroke-width="2"
  />

${holes
  .map(
    hole => `  <!-- 孔洞: ${hole.id} -->
  <path 
    id="${hole.id}" 
    d="${hole.pathData}" 
    fill="#ff0000" 
    fill-opacity="0.5" 
    stroke="#aa0000" 
    stroke-width="2"
  />
`
  )
  .join('')}
</svg>`;
}

// ============================================================================
// 生成 TypeScript 代码
// ============================================================================

function generateTypeScriptCode(normalizedData, config) {
  const varName = `profile${config.name.replace(/[^a-zA-Z0-9]/g, '')}Normalized`;

  return `// ${config.name} 型材归一化截面数据
// 由 prepare-profile-data.mjs 自动生成于 ${new Date().toISOString().split('T')[0]}

import type { ProfileAsset } from '@/core/asset/types/asset';
import type { NormalizedCrossSection } from '@/core/contract/ProfileCrossSectionContract';
import { AssetType, AssetSource } from '@/core/asset/types/enums';

export const ${varName}: NormalizedCrossSection = ${JSON.stringify(normalizedData, null, 2)};

export const profile${config.name.replace(/[^a-zA-Z0-9]/g, '')}Asset: ProfileAsset = {
  id: 'profile-${config.name.toLowerCase()}',
  name: '${config.name}型材',
  type: AssetType.PROFILE,
  source: AssetSource.BUILTIN,
  series: '${Math.floor(normalizedData.dimensions.width / 10) * 10}-series',
  description: '${normalizedData.dimensions.width}x${normalizedData.dimensions.height}mm ${config.material}铝型材',
  
  crossSection: ${varName},
  
  material: {
    name: '${config.material}',
    yieldStrength: 160,
    density: 2700,
    elasticModulus: 69000,
    poissonRatio: 0.33,
  },
  
  lengthConstraints: {
    min: 100,
    max: 3000,
    default: 500,
    step: 50,
  },
  
  supportedOperations: ['drilling', 'cutting', 'tapping'],
  
  metadata: {
    createdAt: '${new Date().toISOString()}',
    updatedAt: '${new Date().toISOString()}',
    tags: ['standard', '${normalizedData.dimensions.origin.type === 'center' ? 'symmetric' : 'asymmetric'}', '${Math.floor(normalizedData.dimensions.width / 10) * 10}-series']
  }
};
`;
}

// ============================================================================
// 主流程
// ============================================================================

async function main() {
  console.log('🔧 SVG 截面分析工具 v2.0\n');
  console.log('━'.repeat(60));

  const config = parseArgs();

  // 1. 读取 SVG
  console.log(`\n📄 读取 SVG: ${config.inputFile}`);
  let svgContent;
  try {
    svgContent = readFileSync(config.inputFile, 'utf-8');
  } catch (err) {
    console.error(`❌ 无法读取文件: ${err.message}`);
    process.exit(1);
  }

  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  console.log(`   ViewBox: ${viewBox}`);

  // 2. 解析路径
  console.log(`\n📋 步骤 1: 检测闭合路径`);
  const paths = parseSVG(svgContent);
  console.log(`   找到 ${paths.length} 个闭合路径:`);
  paths.forEach(p => {
    console.log(
      `     - ${p.id} (${p.type}): 面积 ${p.area.toFixed(0)}, 中心 (${p.center.x.toFixed(1)}, ${p.center.y.toFixed(1)})`
    );
  });

  // 3. 自动分类
  console.log(`\n🤖 步骤 2: 自动分类`);
  const classification = autoClassify(paths);
  console.log(`   主轮廓: ${classification.outerPath.id}`);
  console.log(`   孔洞: ${classification.holes.length} 个`);
  classification.holes.forEach(h => {
    const result = classification.containmentResults.find(
      r => r.hole.id === h.id
    );
    const status = result?.contained ? '✅' : '⚠️';
    console.log(`     ${status} ${h.id}`);
  });
  console.log(`   置信度: ${(classification.confidence * 100).toFixed(0)}%`);
  console.log(`   ${classification.reasoning}`);

  // 4. 对称性检测
  console.log(`\n🔍 步骤 3: 对称性检测`);
  const symmetry = checkSymmetry(paths, classification.outerPath);
  console.log(`   X轴对称: ${symmetry.xSymmetric ? '✅' : '❌'}`);
  console.log(`   Y轴对称: ${symmetry.ySymmetric ? '✅' : '❌'}`);
  console.log(`   孔洞对称: ${symmetry.holesSymmetric ? '✅' : '❌'}`);
  console.log(`   整体对称: ${symmetry.isSymmetric ? '✅ 是' : '❌ 否'}`);
  console.log(
    `   建议原点: ${symmetry.isSymmetric ? 'center（中心）' : 'corner（左下角）'}`
  );

  // 5. 生成归一化数据
  console.log(`\n📦 步骤 4: 生成归一化数据`);
  const normalizedData = generateNormalizedData(
    classification,
    symmetry,
    config,
    viewBox
  );
  console.log(`   型材名称: ${config.name}`);
  console.log(
    `   尺寸: ${normalizedData.dimensions.width} x ${normalizedData.dimensions.height} mm`
  );
  console.log(`   壁厚: ${normalizedData.dimensions.thickness} mm`);
  console.log(
    `   净面积: ${normalizedData.geometricProperties.area.toFixed(2)} mm²`
  );
  console.log(`   原点类型: ${normalizedData.dimensions.origin.type}`);

  // 6. 保存文件
  console.log(`\n💾 步骤 5: 保存文件`);

  const baseName = config.name;

  // 确保输出目录存在
  const analysisDir = join(config.outputDir, 'analysis');
  const normalizedDir = join(config.outputDir, 'normalized');
  const profilesDir = join(
    process.cwd(),
    'src',
    'data',
    'profiles',
    'generated'
  );

  mkdirSync(analysisDir, { recursive: true });
  mkdirSync(normalizedDir, { recursive: true });
  mkdirSync(profilesDir, { recursive: true });

  // 可视化 SVG - 保存到 analysis 子目录
  const visualSVG = generateVisualizationSVG(classification, viewBox);
  const visualPath = join(analysisDir, `${baseName}-analysis.svg`);
  writeFileSync(visualPath, visualSVG, 'utf-8');
  console.log(`   ✅ 可视化 SVG: ${visualPath}`);

  // JSON 格式 - 保存到 normalized 子目录
  if (config.format === 'json' || config.format === 'both') {
    const jsonPath = join(normalizedDir, `${baseName}-normalized.json`);
    writeFileSync(jsonPath, JSON.stringify(normalizedData, null, 2), 'utf-8');
    console.log(`   ✅ JSON 数据: ${jsonPath}`);
  }

  // TypeScript 格式 - 保存到 src/data/profiles/generated
  if (config.format === 'ts' || config.format === 'both') {
    const tsCode = generateTypeScriptCode(normalizedData, config);
    const tsPath = join(profilesDir, `${baseName}-profile.ts`);
    writeFileSync(tsPath, tsCode, 'utf-8');
    console.log(`   ✅ TypeScript 代码: ${tsPath}`);
  }

  // 7. 总结
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`\n✨ 分析完成！\n`);
  console.log(`📊 摘要:`);
  console.log(
    `   型材: ${config.name} (${normalizedData.dimensions.width}x${normalizedData.dimensions.height}mm)`
  );
  console.log(`   路径: 主轮廓 1 个, 孔洞 ${classification.holes.length} 个`);
  console.log(`   对称: ${symmetry.isSymmetric ? '是' : '否'}`);
  console.log(`   置信: ${(classification.confidence * 100).toFixed(0)}%`);

  if (classification.confidence < 0.9) {
    console.log(`\n⚠️  警告: 自动分类置信度较低，建议人工检查:`);
    console.log(`   1. 打开 ${visualPath} 查看标注是否正确`);
    console.log(`   2. 绿色区域应为主轮廓，红色区域应为孔洞`);
    console.log(`   3. 如有错误，请手动调整生成的数据文件`);
  }

  console.log(`\n💡 下一步:`);
  console.log(`   1. 查看可视化文件验证标注: ${visualPath}`);
  if (config.format === 'ts' || config.format === 'both') {
    console.log(`   2. 将 TypeScript 代码复制到型材数据文件`);
    console.log(`   3. 根据需要调整材料属性和长度约束`);
  }
  console.log(``);
}

main().catch(err => {
  console.error(`\n❌ 错误: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
