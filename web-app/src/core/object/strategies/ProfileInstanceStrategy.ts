import type { InstanceStrategy } from './InstanceStrategy';
import type { ProfileAsset, AnyAsset } from '../../asset/types/asset';
import type {
  SceneObject,
  SceneObjectCreateOptions,
  ExtrudedProfileGeometry,
} from '../types/scene-object';
import { AssetType } from '../../asset/types/enums';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as THREE from 'three';
import type { MaterialProperties } from '@/core/geometry/types';
import type {
  IRenderer,
  ExtrusionParams,
} from '@/core/renderer/renderer-types';
import type { IShape } from '@/core/geometry/types';

/**
 * 型材实例化策略
 * 负责将型材素材转换为场景对象
 *
 * 核心逻辑：
 * 1. 使用截面 + 长度参数生成拉伸几何体
 * 2. 创建简化的渲染网格（用于性能优化）
 * 3. 创建完整的计算几何（用于 FEA）
 * 4. 支持加工操作的应用
 */
export class ProfileInstanceStrategy implements InstanceStrategy {
  /**
   * 渲染器引用
   * 用于创建拉伸网格
   */
  private renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  canHandle(asset: AnyAsset): boolean {
    return asset.type === AssetType.PROFILE;
  }

  createSceneObject(
    asset: AnyAsset,
    options: SceneObjectCreateOptions
  ): SceneObject {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ProfileInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const profileAsset = asset as ProfileAsset;

    // 🔍 Debug: 检查资产数据结构
    console.log('[ProfileInstanceStrategy] 🔍 Asset data check:', {
      assetId: asset.id,
      assetName: asset.name,
      hasCrossSection: !!profileAsset.crossSection,
      crossSectionKeys: profileAsset.crossSection
        ? Object.keys(profileAsset.crossSection)
        : 'undefined',
      crossSectionValue: profileAsset.crossSection,
    });

    if (!profileAsset.crossSection) {
      throw new Error(`ProfileAsset ${asset.id} missing crossSection data`);
    }

    if (!profileAsset.crossSection.outerPath) {
      throw new Error(
        `ProfileAsset ${asset.id} missing crossSection.outerPath`
      );
    }

    const length =
      (options.userParams.length as number) ||
      profileAsset.lengthConstraints?.default ||
      1000;

    console.log('[ProfileInstanceStrategy] Creating profile:', {
      assetId: asset.id,
      assetName: asset.name,
      outerPath: profileAsset.crossSection.outerPath.substring(0, 50) + '...',
      holes: profileAsset.crossSection.holes.length,
      length,
      userParams: options.userParams,
    });

    // 生成唯一 ID
    const id = this.generateId();

    // 1. 使用 SVGLoader 正确解析 SVG 路径（包含孔洞方向修正）
    const shape = this.parseSVGWithHoles(
      profileAsset.crossSection.outerPath,
      profileAsset.crossSection.holes
    );

    console.log('[ProfileInstanceStrategy] ✅ SVG解析完成:', {
      curves: shape.curves?.length,
      holes: shape.holes?.length,
    });

    // 2. 转换材质属性（明显的铝合金银色）
    const materialProps: MaterialProperties = {
      type: 'metal',
      color: 0xd4d4d4, // 明亮的铝合金银色，便于观察
      metalness: 0.8,
      roughness: 0.2,
    };

    // 3. 创建拉伸参数
    const extrusionParams: ExtrusionParams = {
      shape,
      length,
      targetSize: profileAsset.crossSection.dimensions.width, // 使用契约的 dimensions.width
      material: materialProps,
      transform: options.transform,
      userData: {
        objectId: id,
        assetId: asset.id,
      },
    };

    // 4. 创建渲染网格
    const meshHandle = this.renderer.createExtrudedMesh(extrusionParams);
    const visualMesh = meshHandle.nativeObject;

    // 🔍 记录几何体尺寸信息
    if (visualMesh && 'geometry' in visualMesh) {
      const geometry = (visualMesh as any).geometry;
      if (geometry && geometry.computeBoundingBox) {
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        if (bbox) {
          const size = {
            x: bbox.max.x - bbox.min.x,
            y: bbox.max.y - bbox.min.y,
            z: bbox.max.z - bbox.min.z,
          };
          console.log('[ProfileInstanceStrategy] 🎯 创建对象几何体信息:', {
            'BoundingBox(米)': bbox,
            '尺寸(米)': size,
            '尺寸(毫米)': {
              x: size.x * 1000,
              y: size.y * 1000,
              z: size.z * 1000,
            },
            '输入参数length(毫米)': length,
            截面outerPath:
              profileAsset.crossSection.outerPath.substring(0, 50) + '...',
            截面holes数量: profileAsset.crossSection.holes.length,
          });
        }
      }
    }

    // 创建计算几何（完整版）
    const computeGeometry: ExtrudedProfileGeometry = {
      type: 'extruded_profile',
      crossSection: profileAsset.crossSection.outerPath, // 使用 outerPath
      length,
      machiningOps: options.machiningOps || [],
      material: profileAsset.material,
    };

    // 计算质量（密度 * 体积）
    const area = profileAsset.crossSection.geometricProperties?.area || 0; // 使用契约的 geometricProperties
    const volume = area * length; // mm³
    const mass = (profileAsset.material.density * volume) / 1e9; // kg

    const sceneObject: SceneObject = {
      id,
      name: options.name || `${profileAsset.name}_${Date.now()}`,
      assetId: asset.id,
      assetSource: asset.source,
      assetType: asset.type,
      transform: {
        position: options.transform?.position || { x: 0, y: 0, z: 0 },
        rotation: options.transform?.rotation || {
          x: 0,
          y: 0,
          z: 0,
          order: 'XYZ',
        },
        scale: options.transform?.scale || { x: 1, y: 1, z: 1 },
      },
      userParams: {
        length,
        ...options.userParams,
      },
      machiningOps: options.machiningOps || [],
      visual: {
        mesh: visualMesh,
        isVisible: true,
      },
      compute: {
        geometry: computeGeometry,
        material: profileAsset.material,
        connections: [],
        mass,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    return sceneObject;
  }

  updateGeometry(sceneObject: SceneObject, asset: AnyAsset): void {
    if (!this.canHandle(asset)) {
      throw new Error(
        `ProfileInstanceStrategy cannot handle asset: ${asset.type}`
      );
    }

    const profileAsset = asset as ProfileAsset;
    const length = sceneObject.userParams.length as number;

    // 1. 解析 SVG 路径（使用契约数据，包含孔洞处理）
    const shape = this.parseSVGWithHoles(
      profileAsset.crossSection.outerPath,
      profileAsset.crossSection.holes
    );

    console.log('[ProfileInstanceStrategy] 🔄 updateGeometry - 解析形状完成:', {
      curves: shape.curves?.length,
      holes: shape.holes?.length,
    });

    // 2. 转换材质属性（与创建时保持一致）
    const materialProps: MaterialProperties = {
      type: 'metal',
      color: 0xd4d4d4, // 明亮的铝合金银色
      metalness: 0.8,
      roughness: 0.2,
    };

    // 3. 创建拉伸参数
    const extrusionParams: ExtrusionParams = {
      shape,
      length,
      targetSize: profileAsset.crossSection.dimensions.width, // 使用契约的 dimensions.width
      material: materialProps,
      transform: sceneObject.transform,
      userData: {
        objectId: sceneObject.id,
        assetId: asset.id,
      },
    };

    // 4. 重新生成渲染网格
    const meshHandle = this.renderer.createExtrudedMesh(extrusionParams);
    const newMesh = meshHandle.nativeObject;

    console.log('[ProfileInstanceStrategy] 🔄 updateGeometry - 新网格已生成:', {
      objectId: sceneObject.id,
      length,
      meshType: newMesh?.constructor?.name,
    });

    // 更新视觉模型
    sceneObject.visual.mesh = newMesh;

    // 更新计算几何
    const computeGeom = sceneObject.compute.geometry as ExtrudedProfileGeometry;
    computeGeom.length = length;
    computeGeom.machiningOps = sceneObject.machiningOps;

    // 重新计算质量
    const area = profileAsset.crossSection.geometricProperties?.area || 0; // 使用契约的 geometricProperties
    const volume = area * length;
    sceneObject.compute.mass = (profileAsset.material.density * volume) / 1e9;

    // 更新时间戳
    sceneObject.metadata.updatedAt = new Date();
  }

  private generateId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 解析 SVG 路径（适配 Three.js 渲染器）
   *
   * 职责：
   * - 接收抽象层数据（AssetService 已验证闭合性）
   * - 转换为 Three.js 特定的数据结构
   * - 验证并修正渲染器特定的方向要求
   *
   * Three.js 要求：
   * - 外轮廓和孔洞的环绕方向必须相反
   * - 使用 ShapeUtils.area() 判断方向（正/负）
   *
   * 为什么需要运行时验证？
   * - SVGLoader.toShapes(isCCW) 的行为不稳定
   * - 同样的 path data 可能产生不同方向的结果
   * - 抽象层只保证闭合，不保证渲染器特定要求
   *
   * @param outerPath - 外轮廓SVG路径（抽象层保证闭合）
   * @param holes - 孔洞SVG路径数组（抽象层保证闭合）
   * @returns IShape 对象（传递给 ThreeGeometryAdapter）
   */
  private parseSVGWithHoles(outerPath: string, holes: string[]): IShape {
    // 构建完整的 SVG 字符串
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <path d="${outerPath}"/>
        ${holes.map((hole: string) => `<path d="${hole}"/>`).join('')}
      </svg>
    `;

    // 使用 SVGLoader 解析
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);

    if (svgData.paths.length === 0) {
      throw new Error('SVG parsing failed: no paths found');
    }

    // ========== 外轮廓：尝试两种方向，选择面积更大的 ==========
    const outerSvgPath = svgData.paths[0];
    const shapesAsCCW = outerSvgPath.toShapes(true);
    const shapesAsCW = outerSvgPath.toShapes(false);

    let shape: THREE.Shape;
    if (shapesAsCCW.length > 0 && shapesAsCW.length > 0) {
      const areaCCW = THREE.ShapeUtils.area(shapesAsCCW[0].getPoints());
      const areaCW = THREE.ShapeUtils.area(shapesAsCW[0].getPoints());

      console.log('[ProfileInstanceStrategy] 📐 外轮廓面积对比:', {
        CCW: Math.abs(areaCCW).toFixed(2),
        CW: Math.abs(areaCW).toFixed(2),
      });

      // 选择面积的绝对值更大的作为外轮廓
      shape =
        Math.abs(areaCCW) > Math.abs(areaCW) ? shapesAsCCW[0] : shapesAsCW[0];
    } else {
      shape = shapesAsCCW.length > 0 ? shapesAsCCW[0] : shapesAsCW[0];
    }

    if (!shape) {
      throw new Error('Failed to extract outer shape from SVG');
    }

    const outerArea = THREE.ShapeUtils.area(shape.getPoints());
    console.log('[ProfileInstanceStrategy] ✅ 外轮廓解析完成:', {
      curves: shape.curves?.length,
      area: outerArea.toFixed(2),
      direction: outerArea > 0 ? 'CCW' : 'CW',
    });

    // 清空 toShapes 自动添加的孔洞
    shape.holes = [];

    // ========== 孔洞：验证方向，确保与外轮廓相反 ==========
    if (svgData.paths.length > 1) {
      for (let i = 1; i < svgData.paths.length; i++) {
        const holePath = svgData.paths[i];
        const holeShapes = holePath.toShapes(true);

        if (holeShapes.length > 0) {
          const hole = holeShapes[0];
          const holeArea = THREE.ShapeUtils.area(hole.getPoints());

          console.log(`[ProfileInstanceStrategy] 🔍 孔洞 ${i}:`, {
            curves: hole.curves?.length,
            area: Math.abs(holeArea).toFixed(2),
            direction: holeArea > 0 ? 'CCW' : 'CW',
          });

          // 验证方向：孔洞必须与外轮廓相反
          // 如果 area 符号相同，说明方向相同，需要反转
          if (holeArea > 0 === outerArea > 0) {
            console.log(
              `[ProfileInstanceStrategy] ⚠️ 孔洞 ${i} 方向与外轮廓相同，需要反转`
            );

            // 反转孔洞方向
            hole.curves.reverse();
            hole.curves.forEach((curve: any) => {
              if ('v1' in curve && 'v2' in curve) {
                const temp = curve.v1;
                curve.v1 = curve.v2;
                curve.v2 = temp;
              }
            });

            console.log(`[ProfileInstanceStrategy] ✅ 孔洞 ${i} 方向已反转`);
          }

          shape.holes.push(hole);
        }
      }
    }

    console.log('[ProfileInstanceStrategy] 🎉 SVG解析完成:', {
      外轮廓curves: shape.curves?.length,
      孔洞数量: shape.holes?.length,
    });

    // 返回 THREE.Shape（ThreeGeometryAdapter 会识别并直接使用）
    return shape as unknown as IShape;
  }
}
