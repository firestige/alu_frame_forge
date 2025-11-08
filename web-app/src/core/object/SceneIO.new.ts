import type { SceneObject } from './types/scene-object';
import type { MachiningOperation } from './types/machining';
import type { Connection } from './types/scene-object';

/**
 * 工程文件格式
 * 轻量级，只存储素材引用和参数
 */
export interface ProjectFileFormat {
  version: string;
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    modifiedAt: string;
    author?: string;
  };
  objects: Array<{
    id: string;
    name: string;
    assetId: string;
    assetSource: string;
    assetType: string;
    transform: {
      position: [number, number, number];
      rotation: [number, number, number, string];
      scale: [number, number, number];
    };
    userParams: Record<string, unknown>;
    machiningOps: MachiningOperation[];
  }>;
  connections?: Connection[];
}

/**
 * CAD 导出格式
 * 完整的几何和材料数据，用于 FEA 分析
 */
export interface CADExportFormat {
  version: string;
  units: string; // "mm", "m", etc.
  metadata: {
    exportedAt: string;
    projectName: string;
  };
  objects: Array<{
    id: string;
    name: string;
    type: string; // geometry type
    geometry: unknown; // 完整几何描述
    material?: {
      name: string;
      yieldStrength?: number;
      density?: number;
      elasticModulus?: number;
    };
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
    };
    mass?: number;
  }>;
  connections: Array<{
    type: string;
    objects: [string, string];
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * 项目序列化器
 * 负责将场景对象序列化为工程文件格式
 */
export class ProjectSerializer {
  /**
   * 序列化场景对象为工程文件
   */
  serialize(
    sceneObjects: SceneObject[],
    metadata: {
      name: string;
      description?: string;
      author?: string;
    }
  ): ProjectFileFormat {
    const now = new Date().toISOString();

    return {
      version: '1.0.0',
      metadata: {
        ...metadata,
        createdAt: now,
        modifiedAt: now,
      },
      objects: sceneObjects.map(obj => ({
        id: obj.id,
        name: obj.name,
        assetId: obj.assetId,
        assetSource: obj.assetSource,
        assetType: obj.assetType,
        transform: {
          position: [
            obj.transform.position.x,
            obj.transform.position.y,
            obj.transform.position.z,
          ],
          rotation: [
            obj.transform.rotation.x,
            obj.transform.rotation.y,
            obj.transform.rotation.z,
            obj.transform.rotation.order,
          ],
          scale: [
            obj.transform.scale.x,
            obj.transform.scale.y,
            obj.transform.scale.z,
          ],
        },
        userParams: obj.userParams,
        machiningOps: obj.machiningOps,
      })),
      connections: this.extractConnections(sceneObjects),
    };
  }

  /**
   * 反序列化工程文件
   * 返回对象数据数组，需要通过 ModelFactory 重新实例化
   */
  deserialize(data: ProjectFileFormat): Array<{
    assetId: string;
    options: {
      name: string;
      userParams: Record<string, unknown>;
      machiningOps: MachiningOperation[];
      transform: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number; order: string };
        scale: { x: number; y: number; z: number };
      };
    };
  }> {
    return data.objects.map(obj => ({
      assetId: obj.assetId,
      options: {
        name: obj.name,
        userParams: obj.userParams,
        machiningOps: obj.machiningOps,
        transform: {
          position: {
            x: obj.transform.position[0],
            y: obj.transform.position[1],
            z: obj.transform.position[2],
          },
          rotation: {
            x: obj.transform.rotation[0],
            y: obj.transform.rotation[1],
            z: obj.transform.rotation[2],
            order: obj.transform.rotation[3] as
              | 'XYZ'
              | 'YXZ'
              | 'ZXY'
              | 'ZYX'
              | 'YZX'
              | 'XZY',
          },
          scale: {
            x: obj.transform.scale[0],
            y: obj.transform.scale[1],
            z: obj.transform.scale[2],
          },
        },
      },
    }));
  }

  /**
   * 导出为 JSON 字符串
   */
  toJSON(data: ProjectFileFormat, pretty = true): string {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * 从 JSON 字符串解析
   */
  fromJSON(json: string): ProjectFileFormat {
    return JSON.parse(json) as ProjectFileFormat;
  }

  /**
   * 提取所有连接关系
   */
  private extractConnections(sceneObjects: SceneObject[]): Connection[] {
    const connections: Connection[] = [];
    sceneObjects.forEach(obj => {
      obj.compute.connections.forEach(conn => {
        connections.push(conn);
      });
    });
    return connections;
  }
}

/**
 * CAD 导出器
 * 负责将场景对象导出为 CAD/FEA 格式
 */
export class CADExporter {
  /**
   * 导出场景对象为 CAD 格式
   */
  export(sceneObjects: SceneObject[], projectName: string): CADExportFormat {
    return {
      version: '1.0.0',
      units: 'mm',
      metadata: {
        exportedAt: new Date().toISOString(),
        projectName,
      },
      objects: sceneObjects.map(obj => ({
        id: obj.id,
        name: obj.name,
        type: obj.compute.geometry.type,
        geometry: obj.compute.geometry,
        material: obj.compute.material,
        transform: {
          position: [
            obj.transform.position.x,
            obj.transform.position.y,
            obj.transform.position.z,
          ],
          rotation: [
            obj.transform.rotation.x,
            obj.transform.rotation.y,
            obj.transform.rotation.z,
          ],
        },
        mass: obj.compute.mass,
      })),
      connections: sceneObjects.flatMap(obj =>
        obj.compute.connections.map(conn => ({
          type: conn.type,
          objects: [obj.id, conn.targetObjectId] as [string, string],
          parameters: conn.parameters,
        }))
      ),
    };
  }

  /**
   * 导出为 JSON 字符串
   */
  toJSON(data: CADExportFormat, pretty = true): string {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }
}
