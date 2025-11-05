import * as React from 'react'
import { use3DViewer } from "../hooks/use3DViewer";
import * as THREE from "three";

const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { resetCamera, getScene } = use3DViewer({
    containerRef,
    backgroundColor: 0x1a1a1a,
    cameraPosition: { x: 5, y: 5, z: 5 },
    orbitControls: {
      enableDamping: true,
      dampingFactor: 0.05,
      minDistance: 2,
      maxDistance: 20,
    },
  });

  const addCube = React.useCallback(() => {
    console.log("Adding cube");
    console.log(getScene());
    const scene = getScene();
    console.log(scene);
    if (!scene) return;

    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x007bff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    );
    console.log(cube);
    scene.add(cube);
  },[getScene]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
        <h2 className="text-lg font-semibold">3D 视图</h2>
        <button
          onClick={addCube}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          添加立方体
        </button>
        <button
          onClick={resetCamera}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          重置视角
        </button>
      </div>
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

export default DesignerPage