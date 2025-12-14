/**
 * AnchorGizmo - 閿氱偣鍙鍖栫粍浠?
 *
 * 鑱岃矗锛?
 * 1. 娓叉煋閿氱偣鐨?3D 鏍囪锛堜笉鍚岀被鍨嬩娇鐢ㄤ笉鍚屾牱寮忥級
 * 2. 鏀寔楂樹寒鏄剧ず锛坔over/selection锛?
 * 3. 鑷姩鏍规嵁璺濈璋冩暣鍙鎬у拰澶у皬
 *
 * 璁捐鍘熷垯锛?
 * - 浣跨敤 Three.js InstancedMesh 浼樺寲鎬ц兘锛堟敮鎸佸ぇ閲忛敋鐐癸級
 * - 閿氱偣鏍峰紡涓庣被鍨嬪叧鑱旓紙end=sphere, corner=box, center=diamond锛?
 * - 灞忓箷绌洪棿鎭掑畾澶у皬锛堣繎澶ц繙灏忚ˉ鍋匡級
 *
 * @module core/renderer/gizmos
 */

import * as THREE from 'three';
import type { AnchorPoint, AnchorType } from '@/core/anchor/types';

/**
 * 閿氱偣鏍峰紡閰嶇疆
 */
export interface AnchorStyle {
  /** 鍑犱綍浣撶被鍨?*/
  geometry: 'sphere' | 'box' | 'cone' | 'torus';

  /** 鍩虹棰滆壊 */
  color: number;

  /** 楂樹寒棰滆壊 */
  highlightColor: number;

  /** 鍩虹澶у皬锛堜笘鐣屽崟浣嶏級 */
  size: number;

  /** 涓嶉€忔槑搴?*/
  opacity: number;
}

/**
 * 閿氱偣 Gizmo 閰嶇疆
 */
export interface AnchorGizmoConfig {
  /** 鏄惁鍚敤 */
  enabled: boolean;

  /** 鍙璺濈闃堝€硷紙涓栫晫鍗曚綅锛?*/
  visibilityThreshold: number;

  /** 鏄惁浣跨敤灞忓箷绌洪棿鎭掑畾澶у皬 */
  screenSpaceSizing: boolean;

  /** 鍚勭被鍨嬮敋鐐圭殑鏍峰紡 */
  styles: Record<AnchorType, AnchorStyle>;
}

/**
 * 榛樿鏍峰紡閰嶇疆
 */
const DEFAULT_STYLES: Record<AnchorType, AnchorStyle> = {
  end: {
    geometry: 'sphere',
    color: 0xff4444, // 绾㈣壊 - 绔偣
    highlightColor: 0xff8888,
    size: 0.3,
    opacity: 0.8,
  },
  midpoint: {
    geometry: 'box',
    color: 0x44ff44, // 缁胯壊 - 涓偣
    highlightColor: 0x88ff88,
    size: 0.25,
    opacity: 0.7,
  },
  corner: {
    geometry: 'box',
    color: 0x4444ff, // 钃濊壊 - 瑙掔偣
    highlightColor: 0x8888ff,
    size: 0.25,
    opacity: 0.7,
  },
  center: {
    geometry: 'cone',
    color: 0xffaa00, // 姗欒壊 - 涓績鐐?
    highlightColor: 0xffcc44,
    size: 0.35,
    opacity: 0.8,
  },
  snap: {
    geometry: 'torus',
    color: 0x00ffff, // 闈掕壊 - 鍚搁檮鐐?
    highlightColor: 0x44ffff,
    size: 0.2,
    opacity: 0.6,
  },
};

/**
 * 閿氱偣 Gizmo
 */
export class AnchorGizmo {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: AnchorGizmoConfig;

  /** 閿氱偣缁勶紙鍖呭惈鎵€鏈夐敋鐐规爣璁帮級 */
  private anchorGroup: THREE.Group;

  /** 閿氱偣 Mesh 鏄犲皠锛堟寜绫诲瀷锛?*/
  private anchorMeshes: Map<AnchorType, THREE.InstancedMesh>;

  /** 閿氱偣瀹炰緥鏄犲皠锛堥敋鐐笽D 鈫?瀹炰緥绱㈠紩锛?*/
  private anchorInstances: Map<
    string,
    { type: AnchorType; instanceIndex: number }
  >;

  /** 楂樹寒鐨勯敋鐐?ID */
  private highlightedAnchorId: string | null = null;

  /** 鍑犱綍浣撶紦瀛?*/
  private geometryCache: Map<AnchorStyle['geometry'], THREE.BufferGeometry>;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    config?: Partial<AnchorGizmoConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.config = {
      enabled: true,
      visibilityThreshold: 50,
      screenSpaceSizing: true,
      styles: DEFAULT_STYLES,
      ...config,
    };

    this.anchorGroup = new THREE.Group();
    this.anchorGroup.name = 'AnchorGizmos';
    this.scene.add(this.anchorGroup);

    this.anchorMeshes = new Map();
    this.anchorInstances = new Map();
    this.geometryCache = new Map();

    this.initializeGeometries();
  }

  /**
   * 鍒濆鍖栧嚑浣曚綋缂撳瓨
   *
   * @private
   */
  private initializeGeometries(): void {
    this.geometryCache.set('sphere', new THREE.SphereGeometry(1, 16, 12));
    this.geometryCache.set('box', new THREE.BoxGeometry(1, 1, 1));
    this.geometryCache.set('cone', new THREE.ConeGeometry(0.7, 1.5, 8));
    this.geometryCache.set('torus', new THREE.TorusGeometry(1, 0.3, 8, 16));
  }

  /**
   * 鍒涘缓閿氱偣瀹炰緥鍖?Mesh
   *
   * @param type - 閿氱偣绫诲瀷
   * @param maxInstances - 鏈€澶у疄渚嬫暟
   * @private
   */
  private createInstancedMesh(
    type: AnchorType,
    maxInstances: number
  ): THREE.InstancedMesh {
    const style = this.config.styles[type];
    const geometry = this.geometryCache.get(style.geometry)!;

    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: style.opacity,
      depthTest: true,
      depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    mesh.name = `AnchorGizmo-${type}`;
    mesh.frustumCulled = false; // 閬垮厤鍓旈櫎闂

    this.anchorGroup.add(mesh);
    return mesh;
  }

  /**
   * 璁剧疆閿氱偣闆嗗悎
   *
   * @param anchors - 閿氱偣鏁扮粍
   */
  setAnchors(anchors: AnchorPoint[]): void {
    if (!this.config.enabled) {
      return;
    }

    // 娓呯┖鐜版湁瀹炰緥
    this.clearAnchors();

    // 鎸夌被鍨嬪垎缁?
    const anchorsByType = new Map<AnchorType, AnchorPoint[]>();
    for (const anchor of anchors) {
      if (!anchorsByType.has(anchor.type)) {
        anchorsByType.set(anchor.type, []);
      }
      anchorsByType.get(anchor.type)!.push(anchor);
    }

    // 涓烘瘡绉嶇被鍨嬪垱寤哄疄渚嬪寲 Mesh
    for (const [type, typeAnchors] of anchorsByType.entries()) {
      const mesh = this.createInstancedMesh(type, typeAnchors.length);
      this.anchorMeshes.set(type, mesh);

      const style = this.config.styles[type];
      const matrix = new THREE.Matrix4();
      const scale = new THREE.Vector3(style.size, style.size, style.size);

      // 璁剧疆姣忎釜瀹炰緥鐨勫彉鎹?
      for (let i = 0; i < typeAnchors.length; i++) {
        const anchor = typeAnchors[i];
        const position = new THREE.Vector3(
          anchor.position.x,
          anchor.position.y,
          anchor.position.z
        );

        matrix.compose(position, new THREE.Quaternion(), scale);
        mesh.setMatrixAt(i, matrix);

        // 璁板綍瀹炰緥鏄犲皠
        this.anchorInstances.set(anchor.id, { type, instanceIndex: i });
      }

      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * 楂樹寒閿氱偣
   *
   * @param anchorId - 閿氱偣 ID
   */
  highlightAnchor(anchorId: string | null): void {
    // 鍙栨秷涔嬪墠鐨勯珮浜?
    if (this.highlightedAnchorId) {
      this.setAnchorColor(this.highlightedAnchorId, false);
    }

    this.highlightedAnchorId = anchorId;

    // 璁剧疆鏂扮殑楂樹寒
    if (anchorId) {
      this.setAnchorColor(anchorId, true);
    }
  }

  /**
   * 璁剧疆閿氱偣棰滆壊
   *
   * @param anchorId - 閿氱偣 ID
   * @param highlighted - 鏄惁楂樹寒
   * @private
   */
  private setAnchorColor(anchorId: string, highlighted: boolean): void {
    const instance = this.anchorInstances.get(anchorId);
    if (!instance) {
      return;
    }

    const mesh = this.anchorMeshes.get(instance.type);
    if (!mesh) {
      return;
    }

    const style = this.config.styles[instance.type];
    const color = new THREE.Color(
      highlighted ? style.highlightColor : style.color
    );

    // 璁剧疆瀹炰緥棰滆壊
    mesh.setColorAt(instance.instanceIndex, color);
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 鏇存柊閿氱偣浣嶇疆
   *
   * @param anchorId - 閿氱偣 ID
   * @param position - 鏂颁綅缃?
   */
  updateAnchorPosition(anchorId: string, position: THREE.Vector3): void {
    const instance = this.anchorInstances.get(anchorId);
    if (!instance) {
      return;
    }

    const mesh = this.anchorMeshes.get(instance.type);
    if (!mesh) {
      return;
    }

    const style = this.config.styles[instance.type];
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3(style.size, style.size, style.size);

    matrix.compose(position, new THREE.Quaternion(), scale);
    mesh.setMatrixAt(instance.instanceIndex, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 娓呯┖鎵€鏈夐敋鐐?
   */
  clearAnchors(): void {
    // 绉婚櫎鎵€鏈?Mesh
    for (const mesh of this.anchorMeshes.values()) {
      this.anchorGroup.remove(mesh);
      mesh.dispose();
    }

    this.anchorMeshes.clear();
    this.anchorInstances.clear();
    this.highlightedAnchorId = null;
  }

  /**
   * 鏇存柊 Gizmo锛堟瘡甯ц皟鐢級
   *
   * 鐢ㄤ簬瀹炵幇灞忓箷绌洪棿鎭掑畾澶у皬绛夊姩鎬佹晥鏋?
   */
  update(): void {
    if (!this.config.enabled || !this.config.screenSpaceSizing) {
      return;
    }

    // 璁＄畻鐩告満璺濈骞惰皟鏁村ぇ灏忥紙鍙€夊疄鐜帮級
    // 褰撳墠绠€鍖栫増鏈細鍥哄畾澶у皬
  }

  /**
   * 鎷惧彇閿氱偣锛堝皠绾挎娴嬶級
   *
   * @param raycaster - Three.js 灏勭嚎鎶曞皠鍣?
   * @returns 鎷惧彇鍒扮殑閿氱偣 ID锛屽鏋滄病鏈夊垯杩斿洖 null
   */
  raycast(raycaster: THREE.Raycaster): string | null {
    const intersects: Array<{ anchorId: string; distance: number }> = [];

    // 瀵规瘡绉嶇被鍨嬬殑 InstancedMesh 杩涜灏勭嚎妫€娴?
    for (const [type, mesh] of this.anchorMeshes.entries()) {
      const meshIntersects = raycaster.intersectObject(mesh, false);

      for (const intersect of meshIntersects) {
        if (intersect.instanceId !== undefined) {
          // 鎵惧埌瀵瑰簲鐨勯敋鐐?ID
          for (const [anchorId, instance] of this.anchorInstances.entries()) {
            if (
              instance.type === type &&
              instance.instanceIndex === intersect.instanceId
            ) {
              intersects.push({ anchorId, distance: intersect.distance });
              break;
            }
          }
        }
      }
    }

    // 杩斿洖鏈€杩戠殑閿氱偣
    if (intersects.length > 0) {
      intersects.sort((a, b) => a.distance - b.distance);
      return intersects[0].anchorId;
    }

    return null;
  }

  /**
   * 璁剧疆鍙鎬?
   *
   * @param visible - 鏄惁鍙
   */
  setVisible(visible: boolean): void {
    this.anchorGroup.visible = visible;
  }

  /**
   * 鏇存柊閰嶇疆
   *
   * @param config - 鏂伴厤缃?
   */
  updateConfig(config: Partial<AnchorGizmoConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 閿€姣?Gizmo
   */
  dispose(): void {
    this.clearAnchors();
    this.scene.remove(this.anchorGroup);

    // 閲婃斁鍑犱綍浣?
    for (const geometry of this.geometryCache.values()) {
      geometry.dispose();
    }
    this.geometryCache.clear();
  }
}
