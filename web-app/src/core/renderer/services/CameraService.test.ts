import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CameraService } from '@/core/renderer/services/CameraService';
import { CameraPreset } from '@/core/renderer/renderer-types';
import type { CameraController } from '@/core/renderer/threejs/CameraController';

// Mock CameraController
const createMockCameraController = (): CameraController => {
  return {
    animateToPosition: vi.fn().mockResolvedValue(undefined),
    getObjectBoundingBox: vi.fn(),
    focusOnBoundingBox: vi.fn(),
    setScene: vi.fn(),
  } as unknown as CameraController;
};

// Mock eventBus
vi.mock('@/core/services/eventBus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CameraService', () => {
  let cameraService: CameraService;
  let mockController: CameraController;

  beforeEach(() => {
    mockController = createMockCameraController();
    cameraService = new CameraService(mockController, 10);
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该以等轴测视角初始化', () => {
      const currentView = cameraService.getCurrentView();
      expect(currentView.preset).toBe(CameraPreset.ISOMETRIC);
    });

    it('应该正确设置默认距离', () => {
      const currentView = cameraService.getCurrentView();
      const distance = Math.sqrt(
        currentView.position.x ** 2 +
          currentView.position.y ** 2 +
          currentView.position.z ** 2
      );
      expect(distance).toBeCloseTo(10, 1);
    });
  });

  describe('setViewPreset', () => {
    it('应该切换到正视图', async () => {
      await cameraService.setViewPreset(CameraPreset.FRONT, false);

      expect(mockController.animateToPosition).toHaveBeenCalledWith(
        { x: 0, y: 0, z: 10 },
        { x: 0, y: 0, z: 0 },
        undefined,
        0
      );
    });

    it('应该使用动画切换视角', async () => {
      await cameraService.setViewPreset(CameraPreset.TOP, true);

      expect(mockController.animateToPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 10, z: 0 }),
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        600
      );
    });

    it('应该更新当前视角状态', async () => {
      await cameraService.setViewPreset(CameraPreset.RIGHT, false);

      expect(cameraService.isPresetActive(CameraPreset.RIGHT)).toBe(true);
      expect(cameraService.isPresetActive(CameraPreset.FRONT)).toBe(false);
    });
  });

  describe('reset', () => {
    it('应该重置到等轴测视角', async () => {
      // 先切换到其他视角
      await cameraService.setViewPreset(CameraPreset.FRONT, false);
      expect(cameraService.isPresetActive(CameraPreset.FRONT)).toBe(true);

      // 重置
      await cameraService.reset(false);

      expect(cameraService.isPresetActive(CameraPreset.ISOMETRIC)).toBe(true);
    });
  });

  describe('状态持久化', () => {
    it('应该保存当前视角到 localStorage', async () => {
      await cameraService.setViewPreset(CameraPreset.LEFT, false);

      const saved = localStorage.getItem('designer.currentView');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.preset).toBe(CameraPreset.LEFT);
    });

    it('应该从 localStorage 加载保存的视角', () => {
      // 模拟保存的视角
      const savedView = {
        position: { x: -10, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        preset: CameraPreset.LEFT,
        name: '左视图',
      };
      localStorage.setItem('designer.currentView', JSON.stringify(savedView));

      // 创建新实例并加载
      const newService = new CameraService(mockController, 10);
      newService.loadSavedView();

      expect(mockController.animateToPosition).toHaveBeenCalledWith(
        savedView.position,
        savedView.target,
        undefined,
        0
      );
    });
  });

  describe('getAllPresets', () => {
    it('应该返回所有26个预设', () => {
      const presets = cameraService.getAllPresets();
      expect(presets).toHaveLength(26);
    });

    it('应该包含6个面视图', () => {
      const presets = cameraService.getAllPresets();
      const facePresets = presets.filter(p =>
        [
          CameraPreset.FRONT,
          CameraPreset.BACK,
          CameraPreset.LEFT,
          CameraPreset.RIGHT,
          CameraPreset.TOP,
          CameraPreset.BOTTOM,
        ].includes(p.preset)
      );
      expect(facePresets).toHaveLength(6);
    });

    it('应该包含等轴测视图', () => {
      const presets = cameraService.getAllPresets();
      const isoPreset = presets.find(p => p.preset === CameraPreset.ISOMETRIC);
      expect(isoPreset).toBeDefined();
      expect(isoPreset?.name).toBe('等轴测');
    });
  });
});
