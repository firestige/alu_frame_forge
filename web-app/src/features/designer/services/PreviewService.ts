// 目标：在场景中显示待放置模型的预览（位置、朝向、可见性）。
// 职责：创建/复用预览物体（可由 AssetFactory 提供），更新 transform、样式（半透明/颜色）并管理资源释放。
// 方法：showPreview(mesh), updateTransform(pos, quat), hide(), dispose().
export class PreviewService {}
