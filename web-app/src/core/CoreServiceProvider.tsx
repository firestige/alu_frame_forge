import * as React from 'react';
import { ObjectManager } from './object';
import { AssetService } from './asset';
import { designerEventBus } from './services/eventBus';
import { AutoSaveService } from './services/AutoSaveService';

/**
 * Core 层服务接口
 *
 * 包含应用级别的核心服务，在整个应用生命周期内持久存在
 * 不受路由切换影响
 */
export interface CoreServices {
  /**
   * 对象管理器 - 管理场景中的所有对象
   */
  objectManager: ObjectManager;

  /**
   * 资产服务 - 管理素材模板（型材、紧固件、连接件等）
   */
  assetService: AssetService;

  /**
   * 事件总线 - 全局事件通信
   */
  eventBus: typeof designerEventBus;

  /**
   * 自动保存服务 - 监听变更并自动保存
   */
  autoSave: AutoSaveService | null;
}

/**
 * Core 服务 Context
 */
const CoreServiceContext = React.createContext<CoreServices | null>(null);

/**
 * CoreServiceProvider Props
 */
export interface CoreServiceProviderProps {
  children: React.ReactNode;
}

/**
 * CoreServiceProvider - 应用级服务容器
 *
 * 职责：
 * 1. 在应用启动时创建 Core 层服务（单例）
 * 2. 初始化 AutoSaveService，监听 ObjectManager 变更
 * 3. 通过 Context 向下传递服务实例
 * 4. 确保服务在路由切换时不被销毁
 *
 * 架构原则：
 * - Core 层服务在应用级别创建，不在 Features/Pages 层创建
 * - 使用 useRef 保证单例，整个应用生命周期只创建一次
 * - 服务实例不会因为路由切换而销毁
 *
 * 使用场景：
 * - 在 main.tsx 中包裹 RouterProvider
 * - 子组件通过 useCoreServices() Hook 访问服务
 *
 * @example
 * ```tsx
 * // main.tsx
 * <CoreServiceProvider>
 *   <RouterProvider router={routes} />
 * </CoreServiceProvider>
 *
 * // DesignerPage.tsx
 * const { objectManager, assetService, autoSave } = useCoreServices();
 * ```
 */
export const CoreServiceProvider: React.FC<CoreServiceProviderProps> = ({
  children,
}) => {
  // 使用 useRef 保证单例
  // React 18 StrictMode 会重复渲染，但 useRef 保证只创建一次
  const servicesRef = React.useRef<CoreServices | null>(null);
  const autoSaveRef = React.useRef<AutoSaveService | null>(null);

  if (!servicesRef.current) {
    console.log('[CoreServiceProvider] 初始化 Core 层服务（应用级单例）');

    // 创建 Core 层服务实例
    const objectManager = new ObjectManager();
    const assetService = new AssetService();

    servicesRef.current = {
      objectManager,
      assetService,
      eventBus: designerEventBus,
      autoSave: null, // 稍后在 useEffect 中初始化
    };

    console.log('[CoreServiceProvider] Core 层服务初始化完成');
  }

  // 初始化 AutoSaveService（依赖 servicesRef 创建后）
  React.useEffect(() => {
    if (autoSaveRef.current || !servicesRef.current) return;

    console.log('[CoreServiceProvider] 初始化自动保存服务');

    // 获取项目 ID 的函数
    // 使用闭包访问，避免循环依赖问题
    let projectStoreImported = false;
    let getProjectIdFn: (() => string | undefined) | null = null;

    const getProjectId = () => {
      // 延迟加载 store
      if (!projectStoreImported) {
        import('@/features/designer/stores').then(
          ({ useDesignerProjectStore }) => {
            getProjectIdFn = () =>
              useDesignerProjectStore.getState().projectId ?? undefined;
            projectStoreImported = true;
          }
        );
      }

      // 如果 store 已加载，调用函数获取 projectId
      return getProjectIdFn?.() ?? undefined;
    };

    // 创建 AutoSaveService
    autoSaveRef.current = new AutoSaveService(
      servicesRef.current.objectManager,
      getProjectId,
      {
        saveDelay: 3000, // 3秒防抖
        minSaveInterval: 30000, // 30秒最小间隔
        enableCloudSave: false, // 暂不启用云端保存
      }
    );

    // 更新 servicesRef
    servicesRef.current.autoSave = autoSaveRef.current;

    console.log('[CoreServiceProvider] 自动保存服务初始化完成');

    return () => {
      // 清理 AutoSaveService
      if (autoSaveRef.current) {
        autoSaveRef.current.dispose();
        autoSaveRef.current = null;
      }
    };
  }, []);

  return (
    <CoreServiceContext.Provider value={servicesRef.current}>
      {children}
    </CoreServiceContext.Provider>
  );
};

/**
 * useCoreServices - 访问 Core 层服务的 Hook
 *
 * 从 Context 中获取 Core 层服务实例
 *
 * @throws {Error} 如果在 CoreServiceProvider 外部使用
 *
 * @example
 * ```tsx
 * const { objectManager, assetService, eventBus, autoSave } = useCoreServices();
 *
 * // 使用 objectManager
 * objectManager.addObject(sceneObject);
 *
 * // 使用 assetService
 * const profiles = assetService.getProfilesBySeries('20-series');
 *
 * // 使用 eventBus
 * eventBus.emit('command:create:cube', undefined);
 *
 * // 使用 autoSave
 * autoSave?.saveNow(); // 手动触发保存
 * autoSave?.on('autosave:saved', ({ timestamp }) => {
 *   console.log('已保存:', timestamp);
 * });
 * ```
 */
export function useCoreServices(): CoreServices {
  const context = React.useContext(CoreServiceContext);

  if (!context) {
    throw new Error(
      'useCoreServices must be used within CoreServiceProvider. ' +
        'Make sure to wrap your app with <CoreServiceProvider> in main.tsx'
    );
  }

  return context;
}
