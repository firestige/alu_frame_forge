import type { ProjectFileFormat } from '@/core/object/SceneIO';

/**
 * 项目查询服务
 *
 * 职责：
 * - 从本地存储或网络加载项目数据
 * - 保存项目数据
 * - 管理最近项目列表
 *
 * 注意：这是纯工具函数，不包含业务逻辑
 */

const STORAGE_PREFIX = 'alu_frame_designer';
const RECENT_PROJECTS_KEY = `${STORAGE_PREFIX}_recent_projects`;
const LAST_PROJECT_KEY = `${STORAGE_PREFIX}_last_project`;

/**
 * 从 localStorage 加载项目
 */
export function loadProjectFromLocalStorage(
  projectId: string
): ProjectFileFormat | null {
  try {
    const key = `${STORAGE_PREFIX}_project_${projectId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
}

/**
 * 保存项目到 localStorage
 */
export function saveProjectToLocalStorage(
  projectId: string,
  data: ProjectFileFormat
): void {
  try {
    const key = `${STORAGE_PREFIX}_project_${projectId}`;
    localStorage.setItem(key, JSON.stringify(data));

    // 更新最近项目列表
    updateRecentProjects(projectId, data.metadata.name);

    // 更新最后打开的项目
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
  }
}

/**
 * 获取最后打开的项目 ID
 */
export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * 更新最近项目列表
 */
function updateRecentProjects(projectId: string, projectName: string): void {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    const recentProjects: Array<{
      id: string;
      name: string;
      timestamp: number;
    }> = data ? JSON.parse(data) : [];

    // 移除重复项
    const filtered = recentProjects.filter(p => p.id !== projectId);

    // 添加到开头
    filtered.unshift({
      id: projectId,
      name: projectName,
      timestamp: Date.now(),
    });

    // 只保留最近 10 个
    const limited = filtered.slice(0, 10);

    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to update recent projects:', error);
  }
}

/**
 * 获取最近项目列表
 */
export function getRecentProjects(): Array<{
  id: string;
  name: string;
  timestamp: number;
}> {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 从网络加载项目（预留接口）
 */
export async function loadProjectFromNetwork(
  _projectId: string
): Promise<ProjectFileFormat | null> {
  // TODO: 实现网络加载逻辑
  console.warn('Network loading not implemented yet');
  return null;
}

/**
 * 保存项目到网络（预留接口）
 */
export async function saveProjectToNetwork(
  _projectId: string,
  _data: ProjectFileFormat
): Promise<void> {
  // TODO: 实现网络保存逻辑
  console.warn('Network saving not implemented yet');
}

/**
 * 统一的项目加载入口
 * 优先从网络加载，失败则从本地加载
 */
export async function loadProject(
  projectId: string
): Promise<ProjectFileFormat | null> {
  // 尝试从网络加载
  const networkData = await loadProjectFromNetwork(projectId);
  if (networkData) {
    return networkData;
  }

  // 降级到本地加载
  return loadProjectFromLocalStorage(projectId);
}

/**
 * 统一的项目保存入口
 * 同时保存到网络和本地
 */
export async function saveProject(
  projectId: string,
  data: ProjectFileFormat
): Promise<void> {
  // 保存到本地（同步）
  saveProjectToLocalStorage(projectId, data);

  // 保存到网络（异步，不阻塞）
  saveProjectToNetwork(projectId, data).catch(error => {
    console.error('Failed to save project to network:', error);
  });
}
