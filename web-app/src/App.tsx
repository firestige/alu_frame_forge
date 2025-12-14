import './App.css';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import profileData from '@/assets/shape/normalized/2020-normalized.json';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // ========== 1. 场景基础设置 ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // 摄像机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ========== 2. 光照 ==========
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // 辅助线
    const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // ========== 测试：简单正方形拉伸 ==========
    console.log('🧪 测试1: 简单正方形拉伸');
    const testSquare = new THREE.Shape();
    testSquare.moveTo(-10, -10);
    testSquare.lineTo(10, -10);
    testSquare.lineTo(10, 10);
    testSquare.lineTo(-10, 10);
    testSquare.lineTo(-10, -10); // 显式回到起点

    const testGeometry = new THREE.ExtrudeGeometry(testSquare, {
      depth: 50,
      bevelEnabled: false,
    });

    const testMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });

    const testMesh = new THREE.Mesh(testGeometry, testMaterial);
    testMesh.position.set(-50, 0, 0); // 放在左边
    scene.add(testMesh);
    console.log('✅ 测试正方体创建完成，应该有完整的端面');

    // ========== 3. 使用 SVGLoader 解析 SVG 路径 ==========
    console.log('🔍 开始解析 2020 型材数据:', profileData);

    // 检查并修复路径闭合
    const outerPath = profileData.outerPath.trim();
    const isOuterClosed = outerPath.endsWith('Z') || outerPath.endsWith('z');
    const normalizedOuterPath = isOuterClosed ? outerPath : outerPath + ' Z';

    console.log('🔍 路径闭合检查:', {
      outerPath末尾: outerPath.slice(-30),
      是否已闭合: isOuterClosed,
      已修复: !isOuterClosed,
    });

    // 创建 SVG 字符串
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <path d="${normalizedOuterPath}"/>
        ${profileData.holes.map((hole: string) => `<path d="${hole}"/>`).join('')}
      </svg>
    `;

    // 使用 SVGLoader 实例
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);

    console.log('📊 SVG 解析结果:', {
      paths: svgData.paths.length,
      path0SubPaths: svgData.paths[0]?.subPaths.length,
    });

    if (svgData.paths.length === 0) {
      console.error('❌ SVG 路径解析失败');
      return;
    }

    // 提取外轮廓 - 使用 toShapes(false) 避免自动孔洞识别
    const outerSvgPath = svgData.paths[0];

    // 尝试两种方向，看哪个是外轮廓
    const shapesAsCCW = outerSvgPath.toShapes(true); // 逆时针为外轮廓
    const shapesAsCW = outerSvgPath.toShapes(false); // 顺时针为外轮廓

    console.log('🔍 Shape方向测试:', {
      CCW_shapes: shapesAsCCW.length,
      CW_shapes: shapesAsCW.length,
    });

    // 使用面积判断哪个是外轮廓（外轮廓面积应该更大）
    let shape: THREE.Shape;
    if (shapesAsCCW.length > 0 && shapesAsCW.length > 0) {
      const areaCCW = THREE.ShapeUtils.area(shapesAsCCW[0].getPoints());
      const areaCW = THREE.ShapeUtils.area(shapesAsCW[0].getPoints());

      console.log('📐 面积对比:', {
        CCW: Math.abs(areaCCW),
        CW: Math.abs(areaCW),
      });

      // 选择面积的绝对值更大的作为外轮廓
      shape =
        Math.abs(areaCCW) > Math.abs(areaCW) ? shapesAsCCW[0] : shapesAsCW[0];
    } else {
      shape = shapesAsCCW.length > 0 ? shapesAsCCW[0] : shapesAsCW[0];
    }

    console.log('✅ 外轮廓解析成功:', {
      curves: shape.curves.length,
      area: THREE.ShapeUtils.area(shape.getPoints()),
    });

    // 清空已有的孔洞（toShapes可能自动添加了）
    shape.holes = [];

    // 手动添加孔洞（从 svgData.paths 获取）
    if (svgData.paths.length > 1) {
      for (let i = 1; i < svgData.paths.length; i++) {
        const holePath = svgData.paths[i];
        const holeShapes = holePath.toShapes(true);
        if (holeShapes.length > 0) {
          // 孔洞需要是顺时针方向（与外轮廓相反）
          const hole = holeShapes[0];
          const holeArea = THREE.ShapeUtils.area(hole.getPoints());

          console.log(`🔍 孔洞 ${i} 面积:`, holeArea);

          // 确保孔洞方向正确（应该与外轮廓相反）
          if (holeArea > 0 === THREE.ShapeUtils.area(shape.getPoints()) > 0) {
            console.log(`  ⚠️ 孔洞方向与外轮廓相同，需要反转`);
            // 反转孔洞方向
            hole.curves.reverse();
            hole.curves.forEach(curve => {
              if ('v1' in curve && 'v2' in curve) {
                const temp = (curve as any).v1;
                (curve as any).v1 = (curve as any).v2;
                (curve as any).v2 = temp;
              }
            });
          }

          shape.holes.push(hole);
          console.log(`✅ 添加孔洞 ${i}:`, {
            holeCurves: hole.curves.length,
          });
        }
      }
    }

    // ========== 4. 计算 SVG 边界并缩放到实际尺寸 ==========
    const box = new THREE.Box2();
    shape.curves.forEach(curve => {
      const points = curve.getPoints(10);
      points.forEach(p => box.expandByPoint(p));
    });

    const svgWidth = box.max.x - box.min.x;
    const svgHeight = box.max.y - box.min.y;
    const targetSize = profileData.dimensions.width; // 20mm

    // 缩放比例
    const scale = targetSize / Math.max(svgWidth, svgHeight);
    console.log('📐 尺寸转换:', {
      svgSize: { width: svgWidth.toFixed(2), height: svgHeight.toFixed(2) },
      targetSize: targetSize + 'mm',
      scale: scale.toFixed(6),
    });

    // 应用缩放和居中
    const centerX = (box.min.x + box.max.x) / 2;
    const centerY = (box.min.y + box.max.y) / 2;

    const transform = new THREE.Matrix3()
      .translate(-centerX, -centerY) // 先居中
      .scale(scale, -scale); // 缩放并翻转 Y 轴（SVG 坐标系与 Three.js 不同）

    // 创建变换后的 Shape
    const transformedShape = new THREE.Shape();

    // 变换外轮廓的所有点并构建闭合路径
    const allPoints: THREE.Vector2[] = [];
    shape.curves.forEach(curve => {
      const points = curve.getPoints(50);
      points.forEach(p => {
        allPoints.push(p.clone().applyMatrix3(transform));
      });
    });

    console.log('📍 外轮廓总点数:', allPoints.length);

    // 一次性设置所有点，确保路径连续
    if (allPoints.length > 0) {
      transformedShape.moveTo(allPoints[0].x, allPoints[0].y);
      for (let i = 1; i < allPoints.length; i++) {
        transformedShape.lineTo(allPoints[i].x, allPoints[i].y);
      }
      // 显式闭合路径
      transformedShape.closePath();
      console.log('✅ 外轮廓已闭合');
    }

    // 变换孔洞
    shape.holes.forEach((hole, holeIndex) => {
      const holePath = new THREE.Path();
      const holePoints: THREE.Vector2[] = [];

      hole.curves.forEach(curve => {
        const points = curve.getPoints(50);
        points.forEach(p => {
          holePoints.push(p.clone().applyMatrix3(transform));
        });
      });

      console.log(`📍 孔洞 ${holeIndex + 1} 点数:`, holePoints.length);

      if (holePoints.length > 0) {
        holePath.moveTo(holePoints[0].x, holePoints[0].y);
        for (let i = 1; i < holePoints.length; i++) {
          holePath.lineTo(holePoints[i].x, holePoints[i].y);
        }
        holePath.closePath(); // 显式闭合孔洞
        transformedShape.holes.push(holePath);
        console.log(`✅ 孔洞 ${holeIndex + 1} 已闭合`);
      }
    });

    console.log('✅ Shape 变换完成');

    // ========== 测试2: 直接用SVG解析的原始Shape（不变换） ==========
    console.log('🧪 测试2: 直接拉伸SVG原始Shape');
    const rawTestGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 5,
      bevelEnabled: false,
    });
    const rawTestMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
    const rawTestMesh = new THREE.Mesh(rawTestGeometry, rawTestMaterial);
    rawTestMesh.position.set(50, 0, 0); // 放在右边
    rawTestMesh.scale.set(0.1, 0.1, 0.1); // 缩小以便观察
    scene.add(rawTestMesh);
    console.log('✅ SVG原始Shape测试完成（绿色）');

    // ========== 5. 创建拉伸几何体 ==========
    const extrudeSettings = {
      depth: 50, // 50mm 长度
      bevelEnabled: false,
      steps: 1, // 确保生成端面
      bevelThickness: 0,
      bevelSize: 0,
      bevelSegments: 1,
    };

    const geometry = new THREE.ExtrudeGeometry(
      transformedShape,
      extrudeSettings
    );
    geometry.computeVertexNormals(); // 重新计算法线

    console.log('✅ ExtrudeGeometry 创建完成:', {
      vertices: geometry.attributes.position.count,
      faces: geometry.index ? geometry.index.count / 3 : 0,
      hasNormals: !!geometry.attributes.normal,
    });

    // 材质 - 双面渲染确保能看到端面
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5,
      side: THREE.DoubleSide, // 确保双面渲染
    });

    const mesh = new THREE.Mesh(geometry, material);

    // 添加线框辅助调试
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const wireframe = new THREE.LineSegments(
      wireframeGeometry,
      wireframeMaterial
    );
    wireframe.rotation.x = Math.PI / 2; // 与主体保持一致

    // 旋转使其水平放置（拉伸方向为 Z 轴）
    mesh.rotation.x = Math.PI / 2;

    scene.add(mesh);
    scene.add(wireframe); // 添加线框到场景

    console.log('✅ 型材网格和线框已添加到场景');

    // ========== 6. 渲染循环 ==========
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ========== 7. 窗口调整 ==========
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ========== 8. 清理 ==========
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-screen h-screen">
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded">
        <h2 className="text-lg font-bold mb-2">2020 型材测试</h2>
        <p>使用 2020-normalized.json 数据</p>
        <p>拉伸长度: 50mm</p>
        <p>打开控制台查看详细日志</p>
      </div>
    </div>
  );
}

export default App;
