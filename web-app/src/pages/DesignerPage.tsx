import * as React from 'react'
import { use3DViewer } from "../hooks/use3DViewer";

const DesignerPage: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { resetCamera } = use3DViewer({
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
        <h2 className="text-lg font-semibold">3D 视图</h2>
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