/**
 * ObjectManager 使用示例
 *
 * 这个文件演示了如何使用 ObjectManager 服务来管理 3D 场景中的实体
 */

import * as THREE from 'three';
import {
  ObjectManager,
  ModelType,
  ConstraintType,
  type ICollisionDetector,
  type IConstraintSolver,
  type Model,
  type CollisionInfo,
  type Constraint,
} from './ObjectManager';

// ==================== 示例 1: 基础使用 ====================

export function example1_BasicUsage() {
  // 创建场景
  const scene = new THREE.Scene();

  // 创建 ObjectManager 实例
  const objectManager = new ObjectManager(scene);

  // 从素材库创建模型
  const profile1 = objectManager.createModelFromAsset('alu_profile_20x20', {
    name: '底部横梁',
    position: new THREE.Vector3(0, 0, 0),
    parameters: {
      length: 2000, // 2米长
    },
  });

  console.log('创建的模型:', profile1);

  // 获取所有模型
  const allModels = objectManager.getAllModels();
  console.log('场景中的模型数量:', allModels.length);

  // 根据类型获取模型
  const profiles = objectManager.getModelsByType(ModelType.ALUMINUM_PROFILE);
  console.log('铝型材数量:', profiles.length);

  return objectManager;
}

// ==================== 示例 2: 参数化调整 ====================

export function example2_ParametricAdjustment() {
  const scene = new THREE.Scene();
  const objectManager = new ObjectManager(scene);

  // 创建一个铝型材
  const profile = objectManager.createModelFromAsset('alu_profile_40x40', {
    name: '立柱',
    parameters: {
      length: 1000,
    },
  });

  console.log('初始长度:', profile.parameters.length);

  // 拉伸到 1.5 米
  objectManager.stretchModel(profile.id, 1500);
  console.log('拉伸后长度:', profile.parameters.length);

  // 创建一个面板
  const panel = objectManager.createModelFromAsset('acrylic_panel', {
    name: '侧面板',
    parameters: {
      width: 500,
      height: 800,
      thickness: 3,
    },
  });

  // 调整面板尺寸
  objectManager.resizeFace(panel.id, 600, 1000);
  console.log('调整后的尺寸:', panel.parameters);

  return objectManager;
}

// ==================== 示例 3: 素材库管理 ====================

export function example3_AssetLibrary() {
  const objectManager = new ObjectManager();

  // 获取所有预制素材
  const allAssets = objectManager.getAllPrebuiltAssets();
  console.log('素材库中的模型数量:', allAssets.length);

  allAssets.forEach(asset => {
    console.log(`- ${asset.name} (${asset.type}): ${asset.description}`);
  });

  // 根据类型获取素材
  const profiles = objectManager.getPrebuiltAssetsByType(
    ModelType.ALUMINUM_PROFILE
  );
  console.log(
    '铝型材素材:',
    profiles.map(a => a.name)
  );

  // 注册自定义素材
  objectManager.registerPrebuiltAsset({
    id: 'custom_bracket',
    name: '自定义支架',
    type: ModelType.CUSTOM,
    description: '特殊形状的支架',
    createGeometry: params => {
      const size = (params.width || 50) / 1000;
      return new THREE.CylinderGeometry(size / 2, size / 2, size, 16);
    },
    defaultMaterial: new THREE.MeshStandardMaterial({
      color: 0xff6600,
      metalness: 0.6,
      roughness: 0.4,
    }),
    defaultParameters: {
      width: 50,
    },
  });

  // 使用自定义素材创建模型
  const bracket = objectManager.createModelFromAsset('custom_bracket');
  console.log('自定义支架已创建:', bracket);

  return objectManager;
}

// ==================== 示例 4: 碰撞检测 ====================

// 模拟碰撞检测器实现
class MockCollisionDetector implements ICollisionDetector {
  detectCollisions(models: Model[]): CollisionInfo[] {
    const collisions: CollisionInfo[] = [];

    // 简单的 AABB 碰撞检测示例
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const modelA = models[i];
        const modelB = models[j];

        // 这里应该实现真实的碰撞检测算法
        // 现在只是模拟
        const distance = modelA.position.distanceTo(modelB.position);
        if (distance < 0.5) {
          collisions.push({
            modelA: modelA.id,
            modelB: modelB.id,
            isColliding: true,
            penetrationDepth: 0.5 - distance,
          });
        }
      }
    }

    return collisions;
  }

  checkCollision(modelA: Model, modelB: Model): CollisionInfo {
    const distance = modelA.position.distanceTo(modelB.position);
    return {
      modelA: modelA.id,
      modelB: modelB.id,
      isColliding: distance < 0.5,
      penetrationDepth: distance < 0.5 ? 0.5 - distance : 0,
    };
  }
}

export function example4_CollisionDetection() {
  const scene = new THREE.Scene();
  const collisionDetector = new MockCollisionDetector();
  const objectManager = new ObjectManager(scene, collisionDetector);

  // 创建两个模型
  const model1 = objectManager.createModelFromAsset('alu_profile_20x20', {
    name: '模型1',
    position: new THREE.Vector3(0, 0, 0),
  });

  const model2 = objectManager.createModelFromAsset('alu_profile_20x20', {
    name: '模型2',
    position: new THREE.Vector3(0.3, 0, 0), // 距离很近
  });

  // 检测所有碰撞
  const allCollisions = objectManager.detectAllCollisions();
  console.log('检测到的碰撞:', allCollisions);

  // 检测两个特定模型的碰撞
  const collision = objectManager.checkCollisionBetween(model1.id, model2.id);
  console.log('模型1和模型2的碰撞:', collision);

  return objectManager;
}

// ==================== 示例 5: 约束管理 ====================

// 模拟约束求解器实现
class MockConstraintSolver implements IConstraintSolver {
  private constraints: Map<string, Constraint> = new Map();

  addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
    console.log(`约束 ${constraint.id} 已添加到求解器`);
  }

  removeConstraint(constraintId: string): void {
    this.constraints.delete(constraintId);
    console.log(`约束 ${constraintId} 已从求解器移除`);
  }

  solve(models: Model[]): void {
    console.log(`求解 ${this.constraints.size} 个约束...`);

    // 这里应该实现真实的约束求解算法
    // 例如：固定约束、对齐约束等
    this.constraints.forEach(constraint => {
      if (!constraint.isActive) return;

      switch (constraint.type) {
        case ConstraintType.FIXED:
          // 固定某个模型的位置
          break;
        case ConstraintType.ALIGN:
          // 对齐两个模型
          break;
        case ConstraintType.DISTANCE:
          // 保持两个模型之间的距离
          break;
        // ... 其他约束类型
      }
    });

    console.log('约束求解完成');
  }

  validateConstraint(constraint: Constraint): boolean {
    // 验证约束是否有效
    if (constraint.modelIds.length < 1) {
      console.warn('约束至少需要一个模型');
      return false;
    }

    return true;
  }
}

export function example5_ConstraintManagement() {
  const scene = new THREE.Scene();
  const constraintSolver = new MockConstraintSolver();
  const objectManager = new ObjectManager(scene, undefined, constraintSolver);

  // 创建几个模型
  const base = objectManager.createModelFromAsset('alu_profile_40x40', {
    name: '基座',
    position: new THREE.Vector3(0, 0, 0),
  });

  const column = objectManager.createModelFromAsset('alu_profile_40x40', {
    name: '立柱',
    position: new THREE.Vector3(0, 0.5, 0),
  });

  // 添加固定约束 - 固定基座位置
  objectManager.addConstraint({
    id: 'fix_base',
    type: ConstraintType.FIXED,
    modelIds: [base.id],
    parameters: {
      position: base.position.clone(),
    },
    isActive: true,
  });

  // 添加对齐约束 - 立柱与基座对齐
  objectManager.addConstraint({
    id: 'align_column_to_base',
    type: ConstraintType.ALIGN,
    modelIds: [column.id, base.id],
    parameters: {
      axis: 'y', // 沿 Y 轴对齐
    },
    isActive: true,
  });

  // 求解约束
  objectManager.solveConstraints();

  // 获取所有约束
  const allConstraints = objectManager.getAllConstraints();
  console.log('场景中的约束数量:', allConstraints.length);

  // 获取与某个模型相关的约束
  const columnConstraints = objectManager.getConstraintsByModel(column.id);
  console.log('立柱相关的约束:', columnConstraints);

  return objectManager;
}

// ==================== 示例 6: 场景导入导出 ====================

export function example6_ImportExport() {
  const scene = new THREE.Scene();
  const objectManager = new ObjectManager(scene);

  // 创建一个框架结构
  objectManager.createModelFromAsset('alu_profile_40x40', {
    name: '底部横梁1',
    position: new THREE.Vector3(-0.5, 0, 0.5),
    parameters: { length: 1000 },
  });

  objectManager.createModelFromAsset('alu_profile_40x40', {
    name: '底部横梁2',
    position: new THREE.Vector3(0.5, 0, 0.5),
    parameters: { length: 1000 },
  });

  objectManager.createModelFromAsset('acrylic_panel', {
    name: '前面板',
    position: new THREE.Vector3(0, 0.5, 0),
    parameters: { width: 1000, height: 1000 },
  });

  // 导出场景数据
  const sceneData = objectManager.exportScene();
  console.log('导出的场景数据:', JSON.stringify(sceneData, null, 2));

  // 保存到文件或发送到服务器
  // localStorage.setItem('scene', JSON.stringify(sceneData));

  // 清空场景
  objectManager.clear();
  console.log('场景已清空，模型数量:', objectManager.getAllModels().length);

  // 导入场景数据
  objectManager.importScene(sceneData);
  console.log('场景已导入，模型数量:', objectManager.getAllModels().length);

  return objectManager;
}

// ==================== 示例 7: 完整工作流 ====================

export function example7_CompleteWorkflow() {
  console.log('===== 完整工作流示例 =====\n');

  const scene = new THREE.Scene();
  const collisionDetector = new MockCollisionDetector();
  const constraintSolver = new MockConstraintSolver();
  const objectManager = new ObjectManager(
    scene,
    collisionDetector,
    constraintSolver
  );

  // 1. 从素材库创建框架
  console.log('步骤 1: 创建框架');
  const frame = {
    base1: objectManager.createModelFromAsset('alu_profile_40x40', {
      name: '基座横梁1',
      position: new THREE.Vector3(-0.5, 0, 0.5),
      parameters: { length: 1000 },
    }),
    base2: objectManager.createModelFromAsset('alu_profile_40x40', {
      name: '基座横梁2',
      position: new THREE.Vector3(0.5, 0, 0.5),
      parameters: { length: 1000 },
    }),
    column1: objectManager.createModelFromAsset('alu_profile_40x40', {
      name: '立柱1',
      position: new THREE.Vector3(-0.5, 0.5, 0.5),
      parameters: { length: 1000 },
      rotation: new THREE.Euler(0, 0, Math.PI / 2),
    }),
    column2: objectManager.createModelFromAsset('alu_profile_40x40', {
      name: '立柱2',
      position: new THREE.Vector3(0.5, 0.5, 0.5),
      parameters: { length: 1000 },
      rotation: new THREE.Euler(0, 0, Math.PI / 2),
    }),
  };

  console.log(
    '框架创建完成，共',
    objectManager.getAllModels().length,
    '个模型\n'
  );

  // 2. 参数化调整
  console.log('步骤 2: 调整立柱高度');
  objectManager.stretchModel(frame.column1.id, 1500);
  objectManager.stretchModel(frame.column2.id, 1500);
  console.log('立柱高度已调整为 1500mm\n');

  // 3. 添加面板和连接件
  console.log('步骤 3: 添加面板和连接件');
  const panel = objectManager.createModelFromAsset('acrylic_panel', {
    name: '前面板',
    position: new THREE.Vector3(0, 0.75, 0),
    parameters: { width: 1000, height: 1500 },
  });

  const connector1 = objectManager.createModelFromAsset('corner_connector', {
    name: '连接件1',
    position: new THREE.Vector3(-0.5, 0, 0.5),
  });

  console.log('面板和连接件已添加\n');

  // 4. 碰撞检测
  console.log('步骤 4: 检测碰撞');
  const collisions = objectManager.detectAllCollisions();
  if (collisions.length > 0) {
    console.log('警告: 检测到', collisions.length, '个碰撞');
    collisions.forEach(c => {
      console.log(`- 模型 ${c.modelA} 与 ${c.modelB} 发生碰撞`);
    });
  } else {
    console.log('无碰撞\n');
  }

  // 5. 添加约束
  console.log('步骤 5: 添加约束');
  objectManager.addConstraint({
    id: 'align_columns',
    type: ConstraintType.PARALLEL,
    modelIds: [frame.column1.id, frame.column2.id],
    parameters: {},
    isActive: true,
  });

  objectManager.addConstraint({
    id: 'distance_bases',
    type: ConstraintType.DISTANCE,
    modelIds: [frame.base1.id, frame.base2.id],
    parameters: { distance: 1.0 },
    isActive: true,
  });

  console.log('约束已添加\n');

  // 6. 求解约束
  console.log('步骤 6: 求解约束');
  objectManager.solveConstraints();
  console.log('');

  // 7. 导出场景
  console.log('步骤 7: 导出场景');
  const exportData = objectManager.exportScene();
  console.log('场景数据已导出');
  console.log('- 模型数量:', exportData.models.length);
  console.log('- 约束数量:', exportData.constraints.length);
  console.log('- 导出时间:', exportData.exportedAt);

  return objectManager;
}

// ==================== 运行示例 ====================

// 你可以取消注释来运行特定示例：
// example1_BasicUsage();
// example2_ParametricAdjustment();
// example3_AssetLibrary();
// example4_CollisionDetection();
// example5_ConstraintManagement();
// example6_ImportExport();
// example7_CompleteWorkflow();
